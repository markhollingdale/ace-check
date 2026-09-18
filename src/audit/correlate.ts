import type { Finding, Issue } from '../types.js';
import { summariseEvidenceItems } from './evidence.js';
import { classifyIssue } from './disposition.js';

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

const AUDIT_GUIDANCE: Record<string, string> = {
  'largest-contentful-paint':
    'Find the LCP element on the worst page, then make it discoverable in the initial HTML: render it above the fold, mark it priority/eager, and set an accurate `sizes` attribute.',
  'lcp-discovery-insight':
    'The LCP image is lazy-loaded or missing `fetchpriority="high"`. Pass `priority` to the first-row `next/image` and correct `sizes`.',
  'render-blocking-insight':
    'Identify the blocking stylesheet/script in the evidence, then inline critical CSS or split the per-theme styles out of the global bundle.',
  'unused-javascript':
    'Add a bundle analyser to attribute the named chunk, then `next/dynamic` heavy client-only trees (charts, maps, editors) and move data fetching to server components.',
  'total-blocking-time':
    'TBT is a symptom of the shared client bundle. Reduce hydration work (see unused-javascript) and defer below-the-fold client islands.',
  'max-potential-fid':
    'Long tasks on the main thread; split or defer the chunk named in the evidence.',
  interactive:
    'Main-thread work from the shared bundle; see unused-javascript.',
  'mainthread-work-breakdown':
    'Main-thread work from the shared bundle; see unused-javascript.',
  'bootup-time':
    'JS execution time; attribute the named chunk with a bundle analyser and defer it.',
  'color-contrast':
    'Use the measured foreground/background pair in the evidence. Prefer semantic tokens that invert on dark surfaces rather than raw `text-foreground`/`text-muted-foreground`.',
  'target-size':
    'Give the flagged control a >=24x24 CSS-pixel target (e.g. `size-6`/`min-h-6 min-w-6` plus padding) and keep >=24px spacing.',
  'aria-prohibited-attr':
    'Add a valid role to the flagged element (`role="complementary"`/`region`) or move the accessible name onto a semantics-bearing child.',
  'heading-order':
    'Make the heading sequence descend without skipping levels; render the accordion header as the next level down from the page `h1`.',
  'errors-in-console':
    'The evidence contains the full console message and source location. For CSP violations, extend the specific directive for the blocked origin.',
  'cumulative-layout-shift':
    'Reserve space for the culprits named in the evidence (fixed min-width/height or a same-size skeleton) before async data resolves.',
  'is-crawlable':
    'Confirm whether the flagged pages are meant to be private. If so, this is expected; otherwise remove the `noindex`/blocking directive.',
  'bf-cache':
    'Usually caused by `cache-control: no-store` on dynamic/auth pages. Lighthouse marks the reasons not actionable; accept unless bfcache is a goal.',
  redirects:
    'Check whether each hop is intentional (auth gate or canonical redirect). Update internal links to the canonical target to remove the hop.',
  'cache-insight':
    'The resources are third-party tiles; caching is controlled by the tile provider. Consider a provider with immutable caching or reduce tile requests.',
  'image-delivery-insight':
    'Correct the image `sizes`/quality/source dimensions; third-party tile optimisations are out of your control.',
  'valid-source-maps':
    'Decide the policy: ship source maps (or upload hidden maps to your error tracker). This has no user-facing impact.',
  'legacy-javascript-insight':
    'Low impact (~15 KB of polyfills). Only investigate if very old browsers are not required.',
  'uses-long-cache-ttl':
    'Set long-lived immutable cache headers for hashed first-party assets; third-party origins are out of your control.',
};

function recommendationForIssue(issue: Issue): string {
  const specific = AUDIT_GUIDANCE[issue.id];
  const fallback = issue.likelyCommonCause;
  return specific ? `${specific} ${fallback}` : fallback;
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
  const evidence = issue.examples.slice(0, 20);

  // Per-page device tags stop the same URL appearing twice with no explanation
  // (it was scanned on both mobile and desktop).
  const pageRefs =
    issue.pageDevices && issue.pageDevices.length > 0
      ? issue.pageDevices
      : undefined;

  const { disposition, reason } = classifyIssue(issue);

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
    recommendation: `${recommendationForIssue(issue)}${
      samplePages.length > 0
        ? ` Start from these pages: ${samplePages.join(', ')}.`
        : ''
    }`,
    correlationKeys: correlationKeysForIssue(issue),
    affectedPages: issue.affectedUrls,
    affectedPageRefs: pageRefs,
    disposition,
    dispositionReason: reason,
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
