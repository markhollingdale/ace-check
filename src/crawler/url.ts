import { DEFAULT_IGNORED_QUERY_PARAMS } from '../config.js';

export function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function toHttpUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed);
    return new URL(`https://${trimmed}`);
  } catch {
    return null;
  }
}

export function sameOrigin(a: URL, b: URL): boolean {
  return (
    a.protocol === b.protocol &&
    a.hostname.toLowerCase() === b.hostname.toLowerCase() &&
    a.port === b.port
  );
}

export function normalizeUrl(
  raw: string,
  base: string | undefined,
  ignoredQueryParams: string[] = DEFAULT_IGNORED_QUERY_PARAMS,
): string | null {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  url.hash = '';

  const ignored = new Set(ignoredQueryParams.map((p) => p.toLowerCase()));
  const params = [...url.searchParams.entries()];
  for (const [key] of params) {
    if (ignored.has(key.toLowerCase())) url.searchParams.delete(key);
  }

  url.searchParams.sort();

  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '');
  }
  url.pathname = pathname;

  url.hostname = url.hostname.toLowerCase();

  return url.toString();
}

export function isInternalLink(
  href: string,
  origin: URL,
): boolean {
  try {
    const url = new URL(href, origin);
    return sameOrigin(url, origin);
  } catch {
    return false;
  }
}

export function toAbsoluteUrl(
  href: string,
  base: URL,
): URL | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function extractPathTemplate(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'homepage';
  return segments[0].toLowerCase();
}
