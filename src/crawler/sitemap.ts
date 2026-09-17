import { XMLParser } from 'fast-xml-parser';

export interface SitemapDiscovery {
  urls: string[];
  sitemapIndexes: number;
  sitemapFiles: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  trimValues: true,
});

function extractLocNodes(node: unknown): unknown[] {
  const locs: unknown[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        if (key === 'loc' && typeof val === 'string') {
          locs.push(val);
        } else if (key === 'sitemap' && typeof val === 'string') {
          locs.push(val);
        } else {
          walk(val);
        }
      }
    }
  };
  walk(node);
  return locs;
}

export async function parseSitemapXml(
  xml: string,
): Promise<string[]> {
  const doc = parser.parse(xml);
  return extractLocNodes(doc)
    .map((l) => String(l).trim())
    .filter(Boolean);
}

export async function fetchAndParseSitemap(
  url: string,
  userAgent: string,
  timeoutMs = 20_000,
): Promise<string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'application/xml,text/xml,text/plain,*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return parseSitemapXml(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverFromSitemaps(
  sitemapUrls: string[],
  userAgent: string,
  timeoutMs = 20_000,
  maxSitemaps = 50,
): Promise<SitemapDiscovery> {
  const urls = new Set<string>();
  const visited = new Set<string>();
  let sitemapFiles = 0;
  let sitemapIndexes = 0;

  const queue = [...sitemapUrls];

  while (queue.length > 0 && visited.size < maxSitemaps) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const parsed = await fetchAndParseSitemap(current, userAgent, timeoutMs);
    if (!parsed || parsed.length === 0) continue;

    sitemapFiles++;

    for (const entry of parsed) {
      if (/\.xml(\?|$)/i.test(entry)) {
        sitemapIndexes++;
        queue.push(entry);
      } else {
        urls.add(entry);
      }
    }
  }

  return { urls: [...urls], sitemapIndexes, sitemapFiles };
}
