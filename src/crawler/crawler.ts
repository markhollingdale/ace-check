import type { ScanConfig } from '../types.js';
import {
  isInternalLink,
  normalizeUrl,
  toAbsoluteUrl,
} from './url.js';
import { fetchRobots, isAllowed } from './robots.js';
import { discoverFromSitemaps } from './sitemap.js';
import { extractLinks } from './links.js';

export const DEFAULT_USER_AGENT =
  'acecheck/0.1 (+https://github.com/ace-check/ace-check)';

export interface CrawlResult {
  urls: string[];
  sitemapUrls: string[];
  sitemapCount: number;
  crawledPages: number;
  robotsFound: boolean;
}

export interface DiscoverCallbacks {
  onProgress?: (message: string) => void;
}

function extractRootSitemaps(robots: { sitemaps: string[] } | null): string[] {
  return robots ? robots.sitemaps : [];
}

async function fetchPage(
  url: string,
  userAgent: string,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('html')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverUrls(
  config: ScanConfig,
  callbacks: DiscoverCallbacks = {},
): Promise<CrawlResult> {
  const base = new URL(config.url);
  const origin = new URL(base.origin);
  const userAgent = config.userAgent || DEFAULT_USER_AGENT;

  let robots = null;
  let robotsFound = false;
  if (config.respectRobots || config.includeSitemap) {
    callbacks.onProgress?.('Fetching robots.txt');
    robots = await fetchRobots(origin.toString(), userAgent, config.timeoutMs);
    robotsFound = !!robots;
  }

  const discovered = new Set<string>();

  // 1. Sitemaps -------------------------------------------------------
  let sitemapUrls: string[] = [];
  let sitemapCount = 0;
  if (config.includeSitemap) {
    const candidates = new Set<string>(extractRootSitemaps(robots));
    candidates.add(`${origin.toString()}sitemap.xml`);
    callbacks.onProgress?.('Parsing sitemaps');
    const result = await discoverFromSitemaps(
      [...candidates],
      userAgent,
      config.timeoutMs,
    );
    sitemapCount = result.sitemapFiles;
    for (const u of result.urls) {
      const normalized = normalizeUrl(
        u,
        origin.toString(),
        config.ignoredQueryParams,
      );
      if (!normalized) continue;
      const parsed = new URL(normalized);
      if (origin.hostname === parsed.hostname) sitemapUrls.push(normalized);
    }
  }

  // 2. Crawl internal links -------------------------------------------
  let crawledPages = 0;
  if (config.includeLinks) {
    const discoveryLimit = Math.max(
      10,
      Math.min(2000, (config.maxPages || 100) * 4),
    );
    const queue: string[] = [origin.toString()];
    const seen = new Set<string>();
    const inFlight = new Set<string>();

    const crawl = async () => {
      while (queue.length > 0 && seen.size < discoveryLimit) {
        const current = queue.shift()!;
        if (seen.has(current)) continue;
        seen.add(current);

        let pathname = '/';
        try {
          pathname = new URL(current).pathname;
        } catch {
          /* ignore */
        }

        if (
          config.respectRobots &&
          robots &&
          !isAllowed(pathname, robots)
        ) {
          continue;
        }

        crawledPages++;
        callbacks.onProgress?.(`Crawling ${current}`);

        const html = await fetchPage(current, userAgent, config.timeoutMs);
        if (!html) continue;

        for (const href of extractLinks(html, current)) {
          const absolute = toAbsoluteUrl(href, new URL(current));
          if (!absolute) continue;
          if (!isInternalLink(href, origin)) continue;
          const normalized = normalizeUrl(
            absolute.toString(),
            origin.toString(),
            config.ignoredQueryParams,
          );
          if (!normalized) continue;
          if (!seen.has(normalized) && !inFlight.has(normalized)) {
            inFlight.add(normalized);
            queue.push(normalized);
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(Math.max(1, config.concurrency || 2), 6) },
      () => crawl(),
    );
    await Promise.all(workers);

    for (const u of seen) {
      const normalized = normalizeUrl(
        u,
        origin.toString(),
        config.ignoredQueryParams,
      );
      if (normalized) discovered.add(normalized);
    }
  }

  // Merge sitemap URLs into discovered set
  for (const u of sitemapUrls) {
    discovered.add(u);
  }

  // Ensure homepage always included
  const home = normalizeUrl(
    origin.toString(),
    origin.toString(),
    config.ignoredQueryParams,
  );
  if (home) discovered.add(home);

  return {
    urls: [...discovered],
    sitemapUrls,
    sitemapCount,
    crawledPages,
    robotsFound,
  };
}
