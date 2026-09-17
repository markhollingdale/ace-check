import { launch, type LaunchedChrome } from 'chrome-launcher';
import lighthouse, { type Flags } from 'lighthouse';
import type { Device } from '../types.js';

export interface LighthouseOutcome {
  lhr: unknown;
  html: string | null;
}

export interface LighthouseError {
  kind: 'chrome' | 'timeout' | 'network' | 'unknown';
  message: string;
  raw: string;
}

/**
 * Whether a raw Lighthouse/Chrome message indicates the browser instance is in
 * a bad state. These are recoverable by restarting Chrome, so callers use this
 * to decide between retrying and giving up.
 */
export function isChromeFailure(raw: string): boolean {
  return /internal chrome error|performance mark has not been set|target closed|session closed|websocket|protocol error|chrome.*(not found|could not|failed)|ENOENT|spawn/i.test(
    raw,
  );
}

function classifyError(err: unknown): LighthouseError {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (isChromeFailure(raw)) {
    return {
      kind: 'chrome',
      message:
        'Chrome became unresponsive and was restarted. Retrying the page.',
      raw,
    };
  }
  if (/timeout|timed out/i.test(raw)) {
    return { kind: 'timeout', message: 'The page took too long to respond.', raw };
  }
  if (
    /DNS|ENOTFOUND|ECONNREFUSED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_INTERNET|network|socket/i.test(
      raw,
    )
  ) {
    return {
      kind: 'network',
      message: 'The page could not be reached over the network.',
      raw,
    };
  }
  return { kind: 'unknown', message: raw, raw };
}

function lighthouseFlags(device: Device, port: number): Flags {
  const isMobile = device === 'mobile';
  return {
    port,
    // JSON is our source of truth; the HTML report is kept so findings can link
    // straight to the relevant audit section (the report anchors by audit id).
    output: ['json', 'html'],
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: isMobile ? 'mobile' : 'desktop',
    screenEmulation: {
      mobile: isMobile,
      width: isMobile ? 360 : 1350,
      height: isMobile ? 640 : 940,
      deviceScaleFactor: isMobile ? 3 : 1,
      disabled: false,
    },
    throttlingMethod: 'simulate',
    maxWaitForFcp: 30_000,
    maxWaitForLoad: 45_000,
  };
}

export interface LighthouseRunnerOptions {
  /** Hard limit for a single page run, so a wedged Chrome cannot hang a scan. */
  runTimeoutMs?: number;
  /** Recycle the browser after this many runs; long sessions degrade. */
  restartEveryRuns?: number;
}

const DEFAULT_RUN_TIMEOUT_MS = 90_000;
const DEFAULT_RESTART_EVERY = 12;

function timeoutError(ms: number): LighthouseError {
  return {
    kind: 'timeout',
    message: `Lighthouse exceeded ${Math.round(ms / 1000)}s on this page. Chrome was restarted.`,
    raw: 'lighthouse run timeout',
  };
}

export class LighthouseRunner {
  private chrome: LaunchedChrome | null = null;
  private closed = false;
  private disposed = false;
  private restarting: Promise<void> | null = null;
  private runsSinceRestart = 0;
  private readonly runTimeoutMs: number;
  private readonly restartEveryRuns: number;

  constructor(options: LighthouseRunnerOptions = {}) {
    this.runTimeoutMs = options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
    this.restartEveryRuns = options.restartEveryRuns ?? DEFAULT_RESTART_EVERY;
  }

  async launch(): Promise<void> {
    if (this.disposed) return;
    this.closed = false;
    this.runsSinceRestart = 0;
    try {
      this.chrome = await launch({
        chromeFlags: [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-extensions',
        ],
      });
    } catch (err) {
      throw classifyError(err);
    }
  }

  get isReady(): boolean {
    return this.chrome !== null && !this.closed;
  }

  /**
   * Recycle the browser. Long Lighthouse sessions leave the renderer dirty,
   * which shows up as "performance mark has not been set" and internal Chrome
   * errors on later pages. Concurrent calls share one restart.
   */
  async restart(): Promise<void> {
    if (this.disposed) return;
    if (!this.restarting) {
      this.restarting = (async () => {
        await this.killChrome();
        await this.launch();
      })().finally(() => {
        this.restarting = null;
      });
    }
    return this.restarting;
  }

  private async killChrome(): Promise<void> {
    const chrome = this.chrome;
    this.chrome = null;
    if (!chrome) return;
    try {
      await chrome.kill();
    } catch {
      /* the process may already be gone */
    }
  }

  async run(url: string, device: Device): Promise<LighthouseOutcome> {
    // A restart may still be in flight from a timeout or a previous failure.
    if (this.restarting) await this.restarting.catch(() => undefined);

    if (!this.chrome || this.closed) {
      throw {
        kind: 'chrome',
        message: 'Chrome is not running.',
        raw: 'Chrome instance not launched',
      } as LighthouseError;
    }

    if (this.runsSinceRestart >= this.restartEveryRuns) {
      await this.restart().catch(() => undefined);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const runnerResult = await Promise.race([
        lighthouse(url, lighthouseFlags(device, this.chrome.port)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            // A wedged run would otherwise hang the whole scan forever.
            void this.restart().catch(() => undefined);
            reject(timeoutError(this.runTimeoutMs));
          }, this.runTimeoutMs);
        }),
      ]);

      if (!runnerResult) {
        throw {
          kind: 'unknown',
          message: 'Lighthouse produced no result.',
          raw: 'Empty lighthouse result',
        } as LighthouseError;
      }

      this.runsSinceRestart += 1;

      // With output: ['json', 'html'] the reports come back in that order, but
      // detect the HTML by content so a flag change cannot silently break this.
      const reports = Array.isArray(runnerResult.report)
        ? runnerResult.report
        : [runnerResult.report];
      const html =
        reports.find(
          (r) => typeof r === 'string' && r.trimStart().startsWith('<'),
        ) ?? null;

      return { lhr: runnerResult.lhr, html };
    } catch (err) {
      const classified =
        err && typeof err === 'object' && 'kind' in err
          ? (err as LighthouseError)
          : classifyError(err);
      if (classified.kind === 'chrome') {
        await this.restart().catch(() => undefined);
      }
      throw classified;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Final teardown. Further runs and restarts are no-ops after this. */
  async close(): Promise<void> {
    this.disposed = true;
    this.closed = true;
    await this.restarting?.catch(() => undefined);
    await this.killChrome();
  }
}

export { classifyError };
