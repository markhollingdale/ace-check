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

function classifyError(err: unknown): LighthouseError {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (/ENOENT|spawn|chrome.*(not found|could not|failed)|chrome.*launch/i.test(raw)) {
    return {
      kind: 'chrome',
      message:
        'Chrome could not be started. Check that Chrome/Chromium is installed and available.',
      raw,
    };
  }
  if (/timeout|timed out/i.test(raw)) {
    return { kind: 'timeout', message: 'The page took too long to respond.', raw };
  }
  if (/DNS|ENOTFOUND|ECONNREFUSED|network|socket/i.test(raw)) {
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
    output: 'json',
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

export class LighthouseRunner {
  private chrome: LaunchedChrome | null = null;
  private closed = false;

  async launch(): Promise<void> {
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

  async run(url: string, device: Device): Promise<LighthouseOutcome> {
    if (!this.chrome || this.closed) {
      throw {
        kind: 'chrome',
        message: 'Chrome is not running.',
        raw: 'Chrome instance not launched',
      } as LighthouseError;
    }

    const runnerResult = await lighthouse(
      url,
      lighthouseFlags(device, this.chrome.port),
    );

    if (!runnerResult) {
      throw {
        kind: 'unknown',
        message: 'Lighthouse produced no result.',
        raw: 'Empty lighthouse result',
      } as LighthouseError;
    }

    const html =
      Array.isArray(runnerResult.report) && runnerResult.report.length > 0
        ? runnerResult.report[0]
        : null;

    return { lhr: runnerResult.lhr, html };
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.chrome) {
      try {
        await this.chrome.kill();
      } catch {
        /* ignore */
      }
      this.chrome = null;
    }
  }
}

export { classifyError };
