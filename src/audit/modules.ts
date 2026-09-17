import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { AuditModule } from '../types.js';
import { MODULE_CATALOG } from './module-catalog.js';

export function auditsBaseDir(cwd: string = process.cwd()): string {
  return path.resolve(cwd, 'audits');
}

export interface ReviewDir {
  number: number;
  dirName: string;
  dir: string;
}

export function listReviewDirs(base: string): ReviewDir[] {
  const reviewsDir = path.join(base, 'reviews');
  if (!existsSync(reviewsDir)) return [];
  const result: ReviewDir[] = [];
  for (const entry of readdirSync(reviewsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = /^(\d+)-(.+)$/.exec(entry.name);
    if (!match) continue;
    result.push({
      number: Number(match[1]),
      dirName: entry.name,
      dir: path.join(reviewsDir, entry.name),
    });
  }
  return result;
}

export function discoverModules(cwd: string = process.cwd()): AuditModule[] {
  const base = auditsBaseDir(cwd);
  const dirs = listReviewDirs(base);
  const modules: AuditModule[] = [];
  for (const entry of MODULE_CATALOG) {
    const dir = dirs.find((d) => d.number === entry.number);
    if (!dir) continue;
    const doc = path.join(dir.dir, `${dir.dirName}.md`);
    if (!existsSync(doc)) continue;
    modules.push({
      number: entry.number,
      title: entry.title,
      prefix: entry.prefix,
      category: entry.category,
      domain: entry.domain,
      doc,
      requiresCodebase: true,
      consumesWebScan: entry.consumesWebScan,
    });
  }
  return modules;
}
