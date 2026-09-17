import type { Finding, Severity } from '../types.js';
import { CATALOG_BY_PREFIX } from './module-catalog.js';

export function extractField(block: string, field: string): string {
  const lines = block.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === `## ${field}`) {
      const out: string[] = [];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('## ') || t === '---') break;
        out.push(lines[i]);
        i++;
      }
      return out.join('\n').trim();
    }
    i++;
  }
  return '';
}

export function mapSeverity(raw: string): Severity {
  const t = raw.trim().toLowerCase();
  if (t.startsWith('critical')) return 'critical';
  if (t.startsWith('high')) return 'high';
  if (t.startsWith('medium')) return 'medium';
  if (t.startsWith('low')) return 'low';
  return 'info';
}

export function extractFiles(text: string): string[] {
  const re = /([\w./@()+-]+\.(?:tsx?|jsx?|mjs|cjs|json|css|scss|sql))(?::\d+)?/g;
  const files = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) files.add(m[1]);
  return [...files].slice(0, 10);
}

export function correlationKeysForText(text: string): string[] {
  const keys = new Set<string>();
  const t = text.toLowerCase();
  if (t.includes('image')) keys.add('image-optimization');
  if (t.includes('largest contentful') || t.includes('lcp')) keys.add('lcp');
  if (t.includes('layout shift') || t.includes('cls')) keys.add('cls');
  if (t.includes('contrast')) keys.add('contrast');
  if (
    t.includes('unused javascript') ||
    t.includes('unused css') ||
    t.includes('bundle') ||
    t.includes('render-blocking')
  ) {
    keys.add('bundle-size');
  }
  return [...keys];
}

export function parseReviewReport(markdown: string): Finding[] {
  const findings: Finding[] = [];
  const matches = [...markdown.matchAll(/^##\s+([A-Z][A-Z0-9]{1,6}-\d+)\s*$/gm)];

  for (let idx = 0; idx < matches.length; idx++) {
    const m = matches[idx];
    const id = m[1];
    const start = m.index ?? 0;
    const end =
      idx + 1 < matches.length
        ? (matches[idx + 1].index ?? markdown.length)
        : markdown.length;
    const block = markdown.slice(start, end);

    const severityRaw = extractField(block, 'Severity');
    const categoryRaw = extractField(block, 'Category');
    const problem = extractField(block, 'Problem');
    const why = extractField(block, 'Why It Matters');
    const recommendation = extractField(block, 'Recommendation');
    const effort = extractField(block, 'Estimated Fix Time');

    const prefix = id.split('-')[0];
    const entry = CATALOG_BY_PREFIX[prefix];

    findings.push({
      id,
      source: 'review',
      moduleNumber: entry?.number,
      prefix,
      category: entry?.category ?? prefix.toLowerCase(),
      domain: entry?.domain ?? 'UNKNOWN',
      severity: mapSeverity(severityRaw),
      confidence: 'Medium',
      title: categoryRaw || `${prefix} finding`,
      description: problem || why || categoryRaw,
      evidence: { proof: 'possible' },
      recommendation: recommendation || undefined,
      effort: effort || undefined,
      correlationKeys: correlationKeysForText(`${categoryRaw} ${problem}`),
      affectedFiles: extractFiles(problem),
      status: 'detected',
    });
  }

  return findings;
}
