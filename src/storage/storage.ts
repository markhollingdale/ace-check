import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Issue,
  PageSummary,
  ScanMetadata,
  ScanSummary,
} from '../types.js';

const DEFAULT_SCANS_DIR = path.resolve(process.cwd(), 'scans');

export function scansRoot(): string {
  return process.env.SITE_AUDIT_SCANS_DIR || DEFAULT_SCANS_DIR;
}

export async function ensureScansRoot(): Promise<string> {
  const dir = scansRoot();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function newScanId(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function scanDir(scanId: string): string {
  return path.join(scansRoot(), scanId);
}

export function pageDir(scanId: string, slug: string): string {
  return path.join(scanDir(scanId), 'pages', slug);
}

export function slugifyUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    parsed = new URL('http://placeholder.local/');
  }

  let base = '';
  if (parsed.pathname === '/' || parsed.pathname === '') {
    base = 'homepage';
  } else {
    base = parsed.pathname
      .split('/')
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!base) base = 'page';
  }
  return base;
}

export async function slugFromUrl(
  url: string,
  used: Set<string>,
): Promise<string> {
  const base = slugifyUrl(url);

  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  used.add(`${base}-${i}`);
  return `${base}-${i}`;
}

export function uniqueSlug(base: string, used: Set<string>): string {
  let candidate = base;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${i++}`;
  }
  used.add(candidate);
  return candidate;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Metadata -------------------------------------------------------------

export function metadataPath(scanId: string): string {
  return path.join(scanDir(scanId), 'metadata.json');
}

export async function writeMetadata(
  scanId: string,
  metadata: ScanMetadata,
): Promise<void> {
  await writeJson(metadataPath(scanId), metadata);
}

export async function readMetadata(
  scanId: string,
): Promise<ScanMetadata | null> {
  return readJson<ScanMetadata>(metadataPath(scanId));
}

// Summary --------------------------------------------------------------

export function summaryPath(scanId: string): string {
  return path.join(scanDir(scanId), 'summary.json');
}

export async function writeSummary(
  scanId: string,
  summary: ScanSummary,
): Promise<void> {
  await writeJson(summaryPath(scanId), summary);
}

export async function readSummary(
  scanId: string,
): Promise<ScanSummary | null> {
  return readJson<ScanSummary>(summaryPath(scanId));
}

// Issues ---------------------------------------------------------------

export function issuesPath(scanId: string): string {
  return path.join(scanDir(scanId), 'issues.json');
}

export async function writeIssues(
  scanId: string,
  issues: Issue[],
): Promise<void> {
  await writeJson(issuesPath(scanId), issues);
}

export async function readIssues(scanId: string): Promise<Issue[] | null> {
  return readJson<Issue[]>(issuesPath(scanId));
}

// Pages ----------------------------------------------------------------

export function pageSummaryPath(scanId: string, slug: string): string {
  return path.join(pageDir(scanId, slug), 'summary.json');
}

export async function writePageSummary(
  scanId: string,
  page: PageSummary,
): Promise<void> {
  await writeJson(pageSummaryPath(scanId, page.slug), page);
}

export async function readPageSummary(
  scanId: string,
  slug: string,
): Promise<PageSummary | null> {
  return readJson<PageSummary>(pageSummaryPath(scanId, slug));
}

export function lighthousePath(scanId: string, slug: string): string {
  return path.join(pageDir(scanId, slug), 'lighthouse.json');
}

export async function writeLighthouse(
  scanId: string,
  slug: string,
  raw: unknown,
): Promise<void> {
  await writeJson(lighthousePath(scanId, slug), raw);
}

export async function readLighthouse(
  scanId: string,
  slug: string,
): Promise<unknown | null> {
  return readJson<unknown>(lighthousePath(scanId, slug));
}

export function htmlReportPath(scanId: string, slug: string): string {
  return path.join(pageDir(scanId, slug), 'report.html');
}

export async function writeHtmlReport(
  scanId: string,
  slug: string,
  html: string,
): Promise<void> {
  await mkdir(pageDir(scanId, slug), { recursive: true });
  await writeFile(htmlReportPath(scanId, slug), html, 'utf8');
}

export async function readHtmlReport(
  scanId: string,
  slug: string,
): Promise<string | null> {
  try {
    return await readFile(htmlReportPath(scanId, slug), 'utf8');
  } catch {
    return null;
  }
}

// Release (code check) -------------------------------------------------

export function releasePath(scanId: string): string {
  return path.join(scanDir(scanId), 'release.json');
}

export async function writeReleaseResult(
  scanId: string,
  result: unknown,
): Promise<void> {
  await writeJson(releasePath(scanId), result);
}

export async function readReleaseResult<T = unknown>(
  scanId: string,
): Promise<T | null> {
  return readJson<T>(releasePath(scanId));
}

// Reports --------------------------------------------------------------

export async function writeReportFile(
  scanId: string,
  filename: string,
  content: string,
): Promise<void> {
  const filePath = path.join(scanDir(scanId), filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

export async function readReportFile(
  scanId: string,
  filename: string,
): Promise<string | null> {
  try {
    return await readFile(path.join(scanDir(scanId), filename), 'utf8');
  } catch {
    return null;
  }
}

// Scan listing ---------------------------------------------------------

export async function listScans(): Promise<ScanMetadata[]> {
  const root = scansRoot();
  let entries: Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const metas: ScanMetadata[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const meta = await readMetadata(entry.name);
    if (meta) metas.push(meta);
  }
  metas.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return metas;
}

export async function deleteScan(scanId: string): Promise<void> {
  await rm(scanDir(scanId), { recursive: true, force: true });
}

export async function listPageSlugs(scanId: string): Promise<string[]> {
  const dir = path.join(scanDir(scanId), 'pages');
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export async function readAllPages(scanId: string): Promise<PageSummary[]> {
  const slugs = await listPageSlugs(scanId);
  const pages: PageSummary[] = [];
  for (const slug of slugs) {
    const page = await readPageSummary(scanId, slug);
    if (page) pages.push(page);
  }
  return pages;
}

export function toFilePath(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}
