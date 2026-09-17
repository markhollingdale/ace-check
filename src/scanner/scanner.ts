import type {
  Device,
  PageSummary,
  ProgressUpdate,
  ScanConfig,
  ScanItem,
  ScanMetadata,
} from '../types.js';
import { devicesForConfig, resolveMaxPages } from '../config.js';
import { discoverUrls } from '../crawler/crawler.js';
import { detectTemplate } from '../analyser/templates.js';
import { parseLighthouse, runtimeErrorMessage } from '../lighthouse/parser.js';
import { LighthouseRunner, type LighthouseError } from '../lighthouse/runner.js';
import { analyse } from '../analyser/analyser.js';
import { logScanError } from '../log.js';
import { generateAiReport, type ReportInput } from '../reports/markdown.js';
import { generateHtmlReport } from '../reports/html.js';
import { generateJsonReport } from '../reports/json.js';
import {
  listPageSlugs,
  newScanId,
  readMetadata,
  readPageSummary,
  slugifyUrl,
  uniqueSlug,
  writeHtmlReport,
  writeIssues,
  writeLighthouse,
  writeMetadata,
  writePageSummary,
  writeReleaseResult,
  writeReportFile,
  writeSummary,
} from '../storage/storage.js';
import { buildRelease } from '../audit/release.js';

export interface RunCallbacks {
  onProgress: (update: ProgressUpdate) => void;
  shouldCancel: () => boolean;
}

export interface RunResult {
  metadata: ScanMetadata;
  pages: PageSummary[];
}

type ProgressEmitter = (
  update: Omit<ProgressUpdate, 'scanId' | 'items'>,
) => void;

function makeEmitter(
  callbacks: RunCallbacks,
  scanId: string,
  items: ScanItem[],
): ProgressEmitter {
  return (update) => {
    callbacks.onProgress({
      ...update,
      scanId,
      items: items.map((i) => ({ ...i })),
    });
  };
}

const TEMPLATE_PRIORITY: Record<string, number> = {
  homepage: 100,
  search: 80,
  category: 70,
  location: 60,
  event: 55,
  venue: 55,
  product: 50,
  article: 45,
  tag: 40,
  author: 40,
  other: 10,
};

function pathDepth(url: string): number {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).length;
  } catch {
    return 0;
  }
}

function representativeSelection(urls: string[], limit: number): string[] {
  if (urls.length <= limit) return urls;

  const withMeta = urls
    .map((url) => ({ url, template: detectTemplate(url) }))
    .sort((a, b) => {
      const pa = TEMPLATE_PRIORITY[a.template] ?? 10;
      const pb = TEMPLATE_PRIORITY[b.template] ?? 10;
      if (pa !== pb) return pb - pa;
      return pathDepth(a.url) - pathDepth(b.url);
    });

  const selected: string[] = [];
  const seenTemplates = new Set<string>();

  for (const m of withMeta) {
    if (selected.length >= limit) break;
    if (!seenTemplates.has(m.template)) {
      selected.push(m.url);
      seenTemplates.add(m.template);
    }
  }
  for (const m of withMeta) {
    if (selected.length >= limit) break;
    if (!selected.includes(m.url)) selected.push(m.url);
  }

  return selected;
}

export function selectUrls(urls: string[], config: ScanConfig): string[] {
  const maxPages = resolveMaxPages(config);

  const home = urls.find((u) => {
    try {
      return new URL(u).pathname === '/' || new URL(u).pathname === '';
    } catch {
      return false;
    }
  });
  const rest = urls.filter((u) => u !== home);

  let chosen: string[];
  if (config.mode === 'quick') {
    chosen = representativeSelection(urls, maxPages);
  } else if (config.mode === 'full') {
    chosen = urls.slice(0, maxPages);
  } else {
    const ordered = home ? [home, ...rest] : rest;
    chosen = ordered.slice(0, maxPages);
  }

  return chosen;
}

async function runLighthousePages(
  urls: string[],
  config: ScanConfig,
  scanId: string,
  callbacks: RunCallbacks,
  items: ScanItem[],
  emit: ProgressEmitter,
): Promise<PageSummary[]> {
  // Lighthouse runs are serialised in-process. Concurrent runs collide on the
  // global `performance` mark names that Lighthouse's logger (via marky) uses,
  // causing "performance mark has not been set" crashes. A single Chrome
  // instance is reused for every page, and the `concurrency` setting is
  // applied to the crawler (see discoverUrls) rather than to Lighthouse.
  const runner = new LighthouseRunner();
  const devices = devicesForConfig(config.device);
  const multi = devices.length > 1;
  const totalRuns = urls.length * devices.length;

  const pages: PageSummary[] = [];
  const usedSlugs = new Set<string>();
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let itemIndex = 0;

  try {
    await runner.launch();
  } catch (err) {
    const classified = err as LighthouseError;
    for (const item of items) {
      if (item.kind === 'page') item.status = 'failed';
    }
    const message = classified?.message || 'Chrome could not be started.';
    emit({
      status: 'failed',
      phase: 'scanning',
      discovered: urls.length,
      scanned: 0,
      succeeded: 0,
      failed: 0,
      total: totalRuns,
      message,
    });
    throw new Error(message);
  }

  try {
    for (const url of urls) {
      if (callbacks.shouldCancel()) break;
      const template = detectTemplate(url);
      const baseSlug = slugifyUrl(url);

      for (const device of devices) {
        if (callbacks.shouldCancel()) break;
        const slug = multi
          ? uniqueSlug(`${baseSlug}-${device}`, usedSlugs)
          : uniqueSlug(baseSlug, usedSlugs);

        const item = items[itemIndex];
        itemIndex++;
        if (item) item.status = 'running';

        emit({
          status: 'scanning',
          phase: 'scanning',
          discovered: urls.length,
          scanned: completed,
          succeeded,
          failed,
          total: totalRuns,
          currentUrl: url,
        });

        const page = await runSinglePage(
          runner,
          url,
          slug,
          device,
          template,
          config,
          scanId,
        );

        await writePageSummary(scanId, page);
        pages.push(page);
        completed++;
        if (page.status === 'ok') succeeded++;
        else failed++;

        if (item) item.status = page.status === 'ok' ? 'done' : 'failed';
      }
    }
  } finally {
    await runner.close().catch(() => undefined);
  }

  emit({
    status: 'scanning',
    phase: 'scanning',
    discovered: urls.length,
    scanned: completed,
    succeeded,
    failed,
    total: totalRuns,
  });

  return pages;
}

export async function runScan(
  config: ScanConfig,
  callbacks: RunCallbacks,
  scanIdOverride?: string,
): Promise<RunResult> {
  const scanId = scanIdOverride || newScanId();
  const timestamp = new Date().toISOString();

  const metadata: ScanMetadata = {
    scanId,
    url: config.url,
    codebasePath: config.codebasePath,
    timestamp,
    mode: config.mode,
    device: config.device,
    status: config.url ? 'discovering' : 'analysing',
    config,
    pagesDiscovered: 0,
    pagesScanned: 0,
    pagesSucceeded: 0,
    pagesFailed: 0,
  };

  await writeMetadata(scanId, metadata);

  const items: ScanItem[] = [];
  const emit = makeEmitter(callbacks, scanId, items);

  let pages: PageSummary[] = [];

  if (config.url) {
    emit({
      status: 'discovering',
      phase: 'discovering',
      discovered: 0,
      scanned: 0,
      succeeded: 0,
      failed: 0,
      total: 0,
      message: 'Discovering URLs',
    });

    const crawl = await discoverUrls(config, {
      onProgress: (message) => {
        emit({
          status: 'discovering',
          phase: 'discovering',
          discovered: 0,
          scanned: 0,
          succeeded: 0,
          failed: 0,
          total: 0,
          message,
        });
      },
    });

    const selected = selectUrls(crawl.urls, config);
    const devices = devicesForConfig(config.device);

    for (const url of selected) {
      const base = slugifyUrl(url);
      for (const device of devices) {
        items.push({
          key: `${base}-${device}`,
          label: `${base} - ${device}`,
          kind: 'page',
          status: 'pending',
        });
      }
    }
    if (config.codebasePath) {
      items.push({
        key: 'code-checks',
        label: 'Code checks',
        kind: 'code',
        status: 'pending',
      });
    }

    metadata.pagesDiscovered = crawl.urls.length;
    metadata.pagesScanned = selected.length;
    metadata.status = 'scanning';
    await writeMetadata(scanId, metadata);

    if (callbacks.shouldCancel()) {
      metadata.status = 'cancelled';
      await writeMetadata(scanId, metadata);
      return { metadata, pages: [] };
    }

    pages = await runLighthousePages(
      selected,
      config,
      scanId,
      callbacks,
      items,
      emit,
    );

    const okUrls = new Set(
      pages.filter((p) => p.status === 'ok').map((p) => p.url),
    );
    metadata.pagesSucceeded = okUrls.size;
    metadata.pagesFailed = selected.length - okUrls.size;

    if (callbacks.shouldCancel()) {
      metadata.status = 'cancelled';
      metadata.durationMs = Date.now() - new Date(timestamp).getTime();
      await writeMetadata(scanId, metadata);
      return { metadata, pages };
    }

    emit({
      status: 'analysing',
      phase: 'analysing',
      discovered: crawl.urls.length,
      scanned: pages.length,
      succeeded: metadata.pagesSucceeded,
      failed: metadata.pagesFailed,
      total: pages.length,
      message: 'Analysing results',
    });

    const { summary, issues } = analyse({
      scanId,
      url: config.url,
      timestamp,
      mode: config.mode,
      device: config.device,
      pagesDiscovered: crawl.urls.length,
      pages,
    });

    await writeSummary(scanId, summary);
    await writeIssues(scanId, issues);

    emit({
      status: 'reporting',
      phase: 'reporting',
      discovered: crawl.urls.length,
      scanned: pages.length,
      succeeded: metadata.pagesSucceeded,
      failed: metadata.pagesFailed,
      total: pages.length,
      message: 'Generating reports',
    });

    const reportInput: ReportInput = { metadata, summary, issues, pages };
    await writeReportFile(scanId, 'ai-audit.md', generateAiReport(reportInput));
    await writeReportFile(scanId, 'report.html', generateHtmlReport(reportInput));
    await writeReportFile(scanId, 'report.json', generateJsonReport(reportInput));
  }

  if (config.codebasePath) {
    const codeItem = items.find((i) => i.kind === 'code');
    if (!codeItem) {
      items.push({
        key: 'code-checks',
        label: 'Code checks',
        kind: 'code',
        status: 'pending',
      });
    }
    const item = items.find((i) => i.kind === 'code');
    if (item) item.status = 'running';

    emit({
      status: 'analysing',
      phase: 'analysing',
      discovered: metadata.pagesDiscovered,
      scanned: metadata.pagesScanned,
      succeeded: metadata.pagesSucceeded,
      failed: metadata.pagesFailed,
      total: metadata.pagesScanned,
      message: 'Running code checks',
    });

    try {
      const release = await buildRelease({
        codebasePath: config.codebasePath,
        scanId,
      });

      await writeReleaseResult(scanId, release);
      await writeReportFile(scanId, 'release.md', release.report.markdown);
      await writeReportFile(scanId, 'release-ai.md', release.report.aiMarkdown);

      if (item) item.status = 'done';
    } catch (err) {
      if (item) item.status = 'failed';
      throw err;
    }
  }

  metadata.status = 'done';
  metadata.durationMs = Date.now() - new Date(timestamp).getTime();
  await writeMetadata(scanId, metadata);

  emit({
    status: 'done',
    phase: 'done',
    discovered: metadata.pagesDiscovered,
    scanned: metadata.pagesScanned,
    succeeded: metadata.pagesSucceeded,
    failed: metadata.pagesFailed,
    total: metadata.pagesScanned,
    message: 'Scan complete',
  });

  return { metadata, pages };
}

export { TEMPLATE_PRIORITY };

async function runSinglePage(
  runner: LighthouseRunner,
  url: string,
  slug: string,
  device: Device,
  template: string,
  config: ScanConfig,
  scanId: string,
): Promise<PageSummary> {
  let page: PageSummary | null = null;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts && page == null) {
    attempt++;
    try {
      const outcome = await runner.run(url, device);
      await writeLighthouse(scanId, slug, outcome.lhr);

      const runtimeError = runtimeErrorMessage(outcome.lhr);
      if (runtimeError) {
        await logScanError(
          `scan ${scanId} page ${url} [${device}] lighthouse runtime error`,
          new Error(runtimeError),
        );
        page = failedPage(slug, url, device, template, runtimeError);
        page.hasLighthouseJson = true;
        continue;
      }

      const parsed = parseLighthouse(outcome.lhr);
      if (outcome.html) await writeHtmlReport(scanId, slug, outcome.html);

      page = {
        slug,
        url,
        device,
        template,
        scores: parsed.scores,
        metrics: parsed.metrics,
        issues: parsed.issues,
        status: 'ok',
        timestamp: new Date().toISOString(),
        hasLighthouseJson: true,
        hasHtmlReport: !!outcome.html,
      };
    } catch (err) {
      const classified = err as LighthouseError;
      if (classified?.kind === 'network' || classified?.kind === 'timeout') {
        continue;
      }
      await logScanError(
        `scan ${scanId} page ${url} [${device}]`,
        err,
      );
      page = failedPage(
        slug,
        url,
        device,
        template,
        classified?.message || String(err),
      );
    }
  }

  if (page == null) {
    page = failedPage(slug, url, device, template, 'Scan cancelled or timed out.');
  }
  return page;
}

function failedPage(
  slug: string,
  url: string,
  device: Device,
  template: string,
  error: string,
): PageSummary {
  return {
    slug,
    url,
    device,
    template,
    scores: {
      performance: null,
      accessibility: null,
      'best-practices': null,
      seo: null,
    },
    metrics: {
      lcp: null,
      cls: null,
      inp: null,
      fcp: null,
      tbt: null,
      speedIndex: null,
      totalByteWeight: null,
      requestCount: null,
    },
    issues: [],
    status: 'failed',
    error,
    timestamp: new Date().toISOString(),
    hasLighthouseJson: false,
    hasHtmlReport: false,
  };
}

export async function retryFailedPages(
  scanId: string,
  callbacks: RunCallbacks,
): Promise<RunResult> {
  const metadata = await readMetadata(scanId);
  if (!metadata) throw new Error('Scan not found');

  const slugs = await listPageSlugs(scanId);
  const pages: PageSummary[] = [];
  for (const slug of slugs) {
    const page = await readPageSummary(scanId, slug);
    if (page) pages.push(page);
  }

  const failedPages = pages.filter((p) => p.status === 'failed');
  const runner = new LighthouseRunner();
  await runner.launch();

  let processed = 0;

  try {
    for (const failed of failedPages) {
      if (callbacks.shouldCancel()) break;

      callbacks.onProgress({
        scanId,
        status: 'scanning',
        phase: 'scanning',
        discovered: failedPages.length,
        scanned: processed,
        succeeded: 0,
        failed: 0,
        total: failedPages.length,
        currentUrl: failed.url,
      });

      const retried = await runSinglePage(
        runner,
        failed.url,
        failed.slug,
        failed.device,
        failed.template,
        metadata.config,
        scanId,
      );

      await writePageSummary(scanId, retried);

      const existingIdx = pages.findIndex((p) => p.slug === retried.slug);
      if (existingIdx >= 0) pages[existingIdx] = retried;

      processed++;
      callbacks.onProgress({
        scanId,
        status: 'scanning',
        phase: 'scanning',
        discovered: failedPages.length,
        scanned: processed,
        succeeded: processed,
        failed: 0,
        total: failedPages.length,
        currentUrl: failed.url,
      });
    }
  } finally {
    await runner.close().catch(() => undefined);
  }

  const { summary, issues } = analyse({
    scanId,
    url: metadata.url,
    timestamp: metadata.timestamp,
    mode: metadata.mode,
    device: metadata.device,
    pagesDiscovered: metadata.pagesDiscovered,
    pages,
  });

  await writeSummary(scanId, summary);
  await writeIssues(scanId, issues);

  const reportInput: ReportInput = { metadata, summary, issues, pages };
  await writeReportFile(scanId, 'ai-audit.md', generateAiReport(reportInput));
  await writeReportFile(scanId, 'report.html', generateHtmlReport(reportInput));
  await writeReportFile(scanId, 'report.json', generateJsonReport(reportInput));

  const okUrls = new Set(
    pages.filter((p) => p.status === 'ok').map((p) => p.url),
  );
  metadata.pagesSucceeded = okUrls.size;
  metadata.pagesFailed = metadata.pagesScanned - okUrls.size;
  metadata.status = 'done';
  await writeMetadata(scanId, metadata);

  return { metadata, pages };
}
