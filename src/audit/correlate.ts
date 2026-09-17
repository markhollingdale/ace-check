import type { Finding, Issue } from '../types.js';
import { summariseEvidenceItems } from './evidence.js';

export const CORRELATION_KEYS = {
  performance: 'performance',
  accessibility: 'accessibility',
  seo: 'seo',
  lcp: 'lcp',
  cls: 'cls',
  imageOptimization: 'image-optimization',
  contrast: 'contrast',
  bundleSize: 'bundle-size',
} as const;

export type CorrelationKey = (typeof CORRELATION_KEYS)[keyof typeof CORRELATION_KEYS];

export interface CorrelatedGroup {
  key: string;
  webFindingIds: string[];
  codeFindingIds: string[];
  proof: 'confirmed' | 'likely' | 'possible';
}

const DOMAIN_BY_CATEGORY: Record<string, string> = {
  performance: 'PERFORMANCE',
  accessibility: 'ACCESSIBILITY',
  seo: 'SEO',
  'best-practices': 'CODE_QUALITY',
};

export function correlationKeysForIssue(issue: Issue): string[] {
  const keys = new Set<string>([issue.category]);
  const id = issue.id.toLowerCase();
  if (id.includes('image') || id.includes('optimized-images')) {
    keys.add('image-optimization');
  }
  if (id.includes('largest-contentful') || id.includes('lcp')) keys.add('lcp');
  if (id.includes('layout-shift') || id.includes('cls')) keys.add('cls');
  if (id.includes('contrast')) keys.add('contrast');
  if (
    id.includes('unused-javascript') ||
    id.includes('unused-css') ||
    id.includes('total-byte-weight') ||
    id.includes('render-blocking')
  ) {
    keys.add('bundle-size');
  }
  return [...keys];
}

export function issueToFinding(
  issue: Issue,
  opts: { scanId?: string } = {},
): Finding {
  const context: { label: string; value: string }[] = [
    { label: 'Affected pages', value: `${issue.count} / ${issue.totalPages}` },
  ];
  if (issue.devices.length > 0) {
    context.push({ label: 'Devices', value: issue.devices.join(' + ') });
  }
  if (issue.affectedTemplates.length > 0) {
    context.push({
      label: 'Likely templates',
      value: issue.affectedTemplates
        .slice(0, 4)
        .map((t) => `${t.template} (${t.count})`)
        .join(', '),
    });
  }
  if (issue.displayValue) {
    context.push({ label: 'Lighthouse impact', value: issue.displayValue });
  }
  if (issue.avgNumericValue != null) {
    context.push({
      label: 'Average value across pages',
      value: String(Math.round(issue.avgNumericValue)),
    });
  }
  context.push({ label: 'Likely common cause', value: issue.likelyCommonCause });

  const samplePages = issue.affectedUrls.slice(0, 5);
  const evidence = issue.examples.slice(0, 12);

  // `affectedPages` holds the stored page slugs, which is what the Lighthouse
  // report routes are keyed by. Link the first few so a finding points at the
  // exact report section for the pages it affects.
  const links: { label: string; href: string }[] = [];
  if (opts.scanId) {
    for (const slug of issue.affectedPages.slice(0, 5)) {
      links.push({
        label: `Lighthouse report - ${slug}`,
        href: `/api/scans/${opts.scanId}/pages/${slug}/report.html`,
      });
    }
  }

  return {
    id: issue.id,
    source: 'web',
    category: issue.category,
    domain: DOMAIN_BY_CATEGORY[issue.category] ?? 'CODE_QUALITY',
    severity: issue.severity,
    confidence: 'High',
    title: issue.title,
    description: issue.description,
    evidence: {
      url: issue.representativeUrls?.[0],
      auditId: issue.id,
      numericValue: issue.avgNumericValue,
      proof: 'confirmed',
    },
    recommendation: `${issue.likelyCommonCause}${
      samplePages.length > 0
        ? ` Start from these pages: ${samplePages.join(', ')}.`
        : ''
    }`,
    correlationKeys: correlationKeysForIssue(issue),
    affectedPages: issue.affectedUrls,
    status: 'detected',
    context,
    details: evidence.length > 0 ? evidence : undefined,
    detailsSummary:
      evidence.length > 0 ? summariseEvidenceItems(evidence) : undefined,
    links: links.length > 0 ? links : undefined,
  };
}

function correlationProof(
  web: Finding[],
  code: Finding[],
): 'confirmed' | 'likely' | 'possible' {
  const webConfirmed = web.some((f) => f.evidence.proof === 'confirmed');
  const codeHigh = code.some((f) => f.confidence === 'High');
  if (webConfirmed && codeHigh) return 'confirmed';
  if (webConfirmed) return 'likely';
  return 'possible';
}

const PROOF_ORDER: Record<'confirmed' | 'likely' | 'possible', number> = {
  confirmed: 0,
  likely: 1,
  possible: 2,
};

export function correlate(findings: Finding[]): CorrelatedGroup[] {
  const groups = new Map<string, { web: Finding[]; code: Finding[] }>();
  for (const f of findings) {
    for (const key of f.correlationKeys) {
      const g = groups.get(key) ?? { web: [], code: [] };
      if (f.source === 'web') g.web.push(f);
      else g.code.push(f);
      groups.set(key, g);
    }
  }
  const result: CorrelatedGroup[] = [];
  for (const [key, g] of groups) {
    if (g.web.length === 0 || g.code.length === 0) continue;
    result.push({
      key,
      webFindingIds: g.web.map((f) => f.id),
      codeFindingIds: g.code.map((f) => f.id),
      proof: correlationProof(g.web, g.code),
    });
  }
  return result.sort(
    (a, b) =>
      PROOF_ORDER[a.proof] - PROOF_ORDER[b.proof] ||
      a.key.localeCompare(b.key),
  );
}
