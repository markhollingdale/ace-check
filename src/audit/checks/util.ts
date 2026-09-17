import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Finding, Severity } from '../../types.js';

export const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  'out',
  'build',
  'coverage',
  'scans',
  '.acecheck',
  '.turbo',
  '.cache',
]);

export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function listFiles(
  dir: string,
  opts: { extensions?: Set<string>; maxFiles?: number } = {},
): Promise<string[]> {
  const { extensions, maxFiles = 5000 } = opts;
  const results: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        if (extensions && !extensions.has(path.extname(entry.name))) continue;
        results.push(full);
        if (results.length >= maxFiles) return results;
      }
    }
  }
  return results;
}

export async function listEnvFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile() && entry.name.startsWith('.env')) {
        results.push(full);
      }
    }
  }
  return results;
}

export function relativePath(filePath: string, base: string): string {
  const rel = path.relative(base, filePath);
  return rel === '' ? filePath : rel;
}

let findingCounter = 0;

export function makeFinding(input: {
  prefix: string;
  category: string;
  domain: string;
  severity: Severity;
  title: string;
  description: string;
  evidence: { file?: string; line?: number; proof: 'confirmed' | 'likely' | 'possible' };
  recommendation?: string;
  correlationKeys?: string[];
}): Finding {
  findingCounter += 1;
  return {
    id: `${input.prefix}-${String(findingCounter).padStart(3, '0')}`,
    source: 'static',
    prefix: input.prefix,
    category: input.category,
    domain: input.domain,
    severity: input.severity,
    confidence: 'High',
    title: input.title,
    description: input.description,
    evidence: {
      file: input.evidence.file,
      line: input.evidence.line,
      proof: input.evidence.proof,
    },
    recommendation: input.recommendation,
    correlationKeys: input.correlationKeys ?? [],
    status: 'detected',
  };
}
