import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { AuditModule, Finding } from '../types.js';
import { SKIP_DIRS } from './checks/util.js';
import { auditsBaseDir, listReviewDirs } from './modules.js';

interface ReferenceDoc {
  /** Path as the framework refers to it, relative to the audits directory. */
  ref: string;
  content: string;
}

/** Framework documents every review relies on for scoring and formatting. */
const SHARED_FRAMEWORK_DOCS = [
  'README.md',
  'framework/10-readme.md',
  'framework/20-review-framework.md',
] as const;

function readReference(base: string, ref: string): ReferenceDoc | null {
  const full = path.join(base, ref);
  if (!existsSync(full)) return null;
  return { ref, content: readFileSync(full, 'utf8') };
}

function frameworkReferenceDocs(base: string): ReferenceDoc[] {
  return SHARED_FRAMEWORK_DOCS.map((ref) => readReference(base, ref)).filter(
    (doc): doc is ReferenceDoc => doc !== null,
  );
}

function reviewReferenceDocs(base: string): ReferenceDoc[] {
  return listReviewDirs(base)
    .sort((a, b) => a.number - b.number)
    .map((dir) =>
      readReference(base, `reviews/${dir.dirName}/${dir.dirName}.md`),
    )
    .filter((doc): doc is ReferenceDoc => doc !== null);
}

/**
 * Inline the framework documents a prompt references, so it can be pasted into
 * an agent that only sees the project under review (and has no access to the
 * AceCheck repository or its `audits/` directory).
 */
function renderReferenceDocs(docs: ReferenceDoc[]): string {
  if (docs.length === 0) return '';
  const parts: string[] = [
    '## Reference documents (inlined)',
    '',
    'This prompt is self-contained. The AceCheck framework files it relies on are',
    'reproduced below. Wherever a document refers to a path - for example',
    '`framework/20-review-framework.md` or',
    '`../reviews/20-security-analysis/20-security-analysis.md` - use the matching',
    'inline document in this section. Do not try to read these files from disk; they',
    'are not part of the project under review.',
    '',
  ];
  for (const doc of docs) {
    parts.push(`<reference-document path="${doc.ref}">`);
    parts.push(doc.content.trimEnd());
    parts.push('</reference-document>');
    parts.push('');
  }
  return parts.join('\n');
}

/** Resolve the audits root from a module document path. */
function baseFromDoc(doc: string): string {
  return path.dirname(path.dirname(path.dirname(doc)));
}

export interface ProjectContext {
  name: string;
  stack: string[];
  tree: string[];
  envKeys: string[];
}

function readJson(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildTree(root: string): string[] {
  const lines: string[] = [];
  const walk = (dir: string, depth: number, prefix: string): void => {
    if (depth > 2 || lines.length >= 250) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const sorted = entries
      .filter((e) => !SKIP_DIRS.has(e.name))
      .sort(
        (a, b) =>
          Number(b.isDirectory()) - Number(a.isDirectory()) ||
          a.name.localeCompare(b.name),
      );
    for (const e of sorted) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        lines.push(`${rel}/`);
        walk(path.join(dir, e.name), depth + 1, rel);
      } else {
        lines.push(rel);
      }
    }
  };
  walk(root, 0, '');
  return lines;
}

function listEnvFilesSync(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.isFile() && e.name.startsWith('.env')) {
        out.push(path.join(dir, e.name));
      }
    }
  };
  walk(root);
  return out;
}

export function buildProjectContext(codebasePath: string): ProjectContext {
  const pkg = readJson(path.join(codebasePath, 'package.json'));
  const name =
    typeof pkg?.name === 'string' ? pkg.name : path.basename(codebasePath);

  const stack: string[] = [];
  if (pkg) {
    for (const key of ['dependencies', 'devDependencies'] as const) {
      const deps = pkg[key];
      if (deps && typeof deps === 'object') {
        for (const [n, v] of Object.entries(deps as Record<string, string>)) {
          stack.push(`${n}@${v}`);
        }
      }
    }
  }

  const envKeys: string[] = [];
  const seen = new Set<string>();
  for (const file of listEnvFilesSync(codebasePath)) {
    const content = readFileSync(file, 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq > 0) {
        const k = t.slice(0, eq).trim();
        if (!seen.has(k)) {
          seen.add(k);
          envKeys.push(k);
        }
      }
    }
  }

  return { name, stack, tree: buildTree(codebasePath), envKeys };
}

export function renderContext(ctx: ProjectContext): string {
  const parts: string[] = [`**Project:** ${ctx.name}`];
  if (ctx.stack.length) parts.push(`**Stack:** ${ctx.stack.join(', ')}`);
  if (ctx.envKeys.length) {
    parts.push(
      `**Environment variables (names only):** ${ctx.envKeys.join(', ')}`,
    );
  }
  parts.push('**Structure:**');
  parts.push('```');
  parts.push(ctx.tree.join('\n'));
  parts.push('```');
  return parts.join('\n\n');
}

function renderFindings(findings: Finding[]): string {
  const lines = findings.slice(0, 40).map(
    (f) =>
      `- [${f.severity}] ${f.id} - ${f.title}${
        f.evidence.file ? ` (${f.evidence.file}${f.evidence.line ? `:${f.evidence.line}` : ''})` : ''
      }`,
  );
  return lines.join('\n');
}

export function generateModulePrompt(
  module: AuditModule,
  ctx: ProjectContext,
  webEvidence?: Finding[],
): string {
  const doc = readFileSync(module.doc, 'utf8');
  const sections = [
    `# ${module.title} Review`,
    '',
    'You are auditing a local codebase. Follow the review standard below exactly and produce a report following its Phase 1 (documentation) and Phase 2 (assessment) instructions.',
    '',
    '## Project context (auto-generated)',
    renderContext(ctx),
  ];
  if (module.consumesWebScan && webEvidence?.length) {
    sections.push(
      '## Web-scan evidence (Lighthouse)',
      renderFindings(webEvidence),
    );
  }
  sections.push(renderReferenceDocs(frameworkReferenceDocs(baseFromDoc(module.doc))));
  sections.push('## Review standard', doc);
  return sections.join('\n');
}

export function generateFullSuitePrompt(
  ctx: ProjectContext,
  opts: { cwd?: string; scope?: { number: number; title: string }[] } = {},
): string {
  const cwd = opts.cwd ?? process.cwd();
  const base = auditsBaseDir(cwd);
  const runner = path.join(base, 'runners', 'run-full-suite.md');
  const runnerDoc = existsSync(runner) ? readFileSync(runner, 'utf8') : '';
  const sections = [
    '# Full AI Review Suite',
    '',
    'Run the engineering reviews below in order, then the Summary. Follow the runner exactly.',
    '',
    '## Project context (auto-generated)',
    renderContext(ctx),
  ];
  if (opts.scope && opts.scope.length > 0) {
    sections.push(
      '## Scope (modules to run)',
      opts.scope.map((m) => `- ${m.number} ${m.title}`).join('\n'),
    );
  }
  sections.push(
    renderReferenceDocs([
      ...frameworkReferenceDocs(base),
      ...reviewReferenceDocs(base),
    ]),
  );
  sections.push('## Runner instructions', runnerDoc);
  return sections.filter(Boolean).join('\n');
}
