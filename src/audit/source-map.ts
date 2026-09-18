import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Finding } from '../types.js';
import { SKIP_DIRS } from './checks/util.js';

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
]);

const IGNORED_DIRS = new Set([
  ...SKIP_DIRS,
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
]);

const MAX_FILES = 4000;
const MAX_FILE_BYTES = 400_000;
const MAX_RESULTS = 5;

/** Tokens too generic to localise a component on their own. */
const NOISE_TOKENS = new Set([
  'flex',
  'grid',
  'absolute',
  'relative',
  'hidden',
  'block',
  'inline',
  'sticky',
  'fixed',
  'items',
  'center',
  'text',
  'muted',
  'foreground',
  'background',
  'primary',
  'button',
  'container',
  'group',
  'card',
  'content',
  'span',
  'div',
]);

interface IndexedFile {
  rel: string;
  content: string;
  lower: string;
}

const cache = new Map<string, IndexedFile[]>();

function indexCodebase(codebasePath: string): IndexedFile[] {
  const cached = cache.get(codebasePath);
  if (cached) return cached;

  const files: IndexedFile[] = [];
  const walk = (dir: string): void => {
    if (files.length >= MAX_FILES) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        try {
          if (statSync(full).size > MAX_FILE_BYTES) continue;
          const content = readFileSync(full, 'utf8');
          files.push({
            rel: path.relative(codebasePath, full).split(path.sep).join('/'),
            content,
            lower: content.toLowerCase(),
          });
        } catch {
          // Ignore unreadable/binary files.
        }
      }
    }
  };

  walk(codebasePath);
  cache.set(codebasePath, files);
  return files;
}

interface Hints {
  tokens: string[];
  routes: string[];
}

function extractHints(finding: Finding): Hints {
  const tokens = new Set<string>();
  const routes = new Set<string>();

  for (const text of finding.detailsSummary ?? []) {
    for (const match of text.matchAll(/\.[A-Za-z][A-Za-z0-9_-]{3,}/g)) {
      tokens.add(match[0].slice(1));
    }
    for (const match of text.matchAll(/class(?:Name)?="([^"]+)"/g)) {
      for (const token of match[1].split(/\s+/)) {
        if (token.length >= 4) tokens.add(token);
      }
    }
    for (const match of text.matchAll(/data-slot="([^"]+)"/g)) tokens.add(match[1]);
    for (const match of text.matchAll(/aria-label="([^"]+)"/g)) tokens.add(match[1]);
  }

  const urls = [
    finding.evidence.url,
    ...(finding.affectedPageRefs?.map((p) => p.url) ?? []),
    ...(finding.affectedPages ?? []),
  ];
  for (const url of urls) {
    if (!url) continue;
    try {
      const pathname = new URL(url).pathname;
      for (const segment of pathname.split('/')) {
        if (segment.length >= 3 && !/^\d+$/.test(segment)) routes.add(segment);
      }
    } catch {
      // Not an absolute URL; ignore.
    }
  }

  return {
    tokens: [...tokens]
      .filter((t) => !NOISE_TOKENS.has(t.toLowerCase()))
      .slice(0, 16),
    routes: [...routes].slice(0, 8),
  };
}

/**
 * Heuristic map from a finding to candidate source files. Web findings carry no
 * `affectedFiles` (only the web stage ran), so we search the codebase for the
 * distinctive class names, data-slots, aria labels and route slugs captured in
 * the evidence. The result is a starting point, not a certainty.
 */
export function mapFindingToSource(
  finding: Finding,
  codebasePath?: string,
): string[] {
  if (!codebasePath) return [];
  const files = indexCodebase(codebasePath);
  if (files.length === 0) return [];

  const { tokens, routes } = extractHints(finding);
  if (tokens.length === 0 && routes.length === 0) return [];

  const scores = new Map<string, number>();
  for (const file of files) {
    let score = 0;
    for (const token of tokens) {
      if (file.content.includes(token)) score += 2;
      else if (file.lower.includes(token.toLowerCase())) score += 1;
    }
    const relLower = file.rel.toLowerCase();
    for (const route of routes) {
      if (relLower.includes(route.toLowerCase())) score += 3;
    }
    if (score > 0) scores.set(file.rel, score);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_RESULTS)
    .map(([rel]) => rel);
}

/**
 * Add heuristic candidate source files to each finding and record how they were
 * derived, so a reader knows they are suggestions. Findings that already carry
 * `affectedFiles` (code-stage findings) keep them.
 */
export function enrichFindingSources(
  findings: Finding[],
  codebasePath?: string,
): Finding[] {
  if (!codebasePath) return findings;
  return findings.map((finding) => {
    const candidates = mapFindingToSource(finding, codebasePath);
    if (candidates.length === 0) return finding;
    const merged = [
      ...new Set([...(finding.affectedFiles ?? []), ...candidates]),
    ];
    const existing = finding.context ?? [];
    const hasNote = existing.some(
      (c) => c.label === 'Candidate source files (heuristic)',
    );
    const context = hasNote
      ? existing
      : [
          ...existing,
          {
            label: 'Candidate source files (heuristic)',
            value: candidates.join(', '),
          },
        ];
    return { ...finding, affectedFiles: merged, context };
  });
}
