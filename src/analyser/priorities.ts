import type { Category, Severity } from '../types.js';

const CRITICAL_AUDITS = new Set<string>([
  'color-contrast',
  'html-has-lang',
  'document-title',
  'no-vulnerable-libraries',
]);

const HIGH_AUDITS = new Set<string>([
  'uses-optimized-images',
  'uses-responsive-images',
  'modern-image-formats',
  'render-blocking-resources',
  'render-blocking-insight',
  'unused-javascript',
  'unused-css-rules',
  'legacy-javascript',
  'total-byte-weight',
  'network-requests',
  'uses-long-cache-ttl',
  'uses-text-compression',
  'mainthread-work-breakdown',
  'bootup-time',
  'dom-size',
  'largest-contentful-paint-element',
  'is-crawlable',
  'link-name',
  'button-name',
  'input-button-name',
  'label',
  'image-alt',
  'accesskeys',
  'aria-allowed-attr',
  'aria-command-name',
  'aria-hidden-body',
  'aria-hidden-focus',
  'aria-input-field-name',
  'aria-meter-name',
  'aria-progressbar-name',
  'aria-required-attr',
  'aria-valid-attr-value',
  'aria-valid-attr',
  'http-status-code',
  'canonical',
  'redirects-http',
]);

const MEDIUM_AUDITS = new Set<string>([
  'third-party-summary',
  'offscreen-images',
  'uses-rel-preconnect',
  'uses-http2',
  'timing-budget',
  'total-tap-targets',
  'tap-targets',
  'target-size',
  'aria-prohibited-attr',
  'heading-order',
  'meta-description',
  'link-text',
  'hreflang',
  'font-size',
  'meta-viewport',
  'structured-data',
  'plugins',
  'viewport',
  'duplicate-id',
]);

/**
 * Audits whose natural Lighthouse score overstates their release impact. The
 * cap is applied last, so coverage or bundle-size floors cannot lift them.
 */
const SEVERITY_CAPS: Record<string, Severity> = {
  'valid-source-maps': 'low',
  'legacy-javascript': 'low',
  'legacy-javascript-insight': 'low',
  'speed-index': 'low',
  'bf-cache': 'low',
  redirects: 'low',
  'network-dependency-tree-insight': 'low',
  'document-latency-insight': 'low',
  'forced-reflow-insight': 'low',
  'lcp-breakdown-insight': 'low',
  'cls-culprits-insight': 'low',
  'image-delivery-insight': 'low',
  'is-crawlable': 'medium',
  'heading-order': 'medium',
  'target-size': 'medium',
};

const ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function maxSeverity(a: Severity, b: Severity): Severity {
  return ORDER[a] >= ORDER[b] ? a : b;
}

function bump(severity: Severity, levels: number): Severity {
  const current = ORDER[severity];
  const target = Math.min(5, current + levels);
  const entry = (Object.entries(ORDER) as [Severity, number][]).find(
    ([, v]) => v === target,
  );
  return entry ? entry[0] : severity;
}

export interface SeverityInput {
  auditId: string;
  category: Category;
  baseSeverity: Severity;
  score: number | null;
  affectedCount: number;
  totalPages: number;
  avgNumericValue: number | null;
  unitHint: 'bytes' | 'ms' | 'count' | null;
}

export function assignSeverity(input: SeverityInput): Severity {
  let severity: Severity = input.baseSeverity;

  if (CRITICAL_AUDITS.has(input.auditId)) severity = maxSeverity(severity, 'critical');
  else if (HIGH_AUDITS.has(input.auditId)) severity = maxSeverity(severity, 'high');
  else if (MEDIUM_AUDITS.has(input.auditId)) severity = maxSeverity(severity, 'medium');

  if (input.category === 'accessibility' && input.score === 0) {
    severity = maxSeverity(severity, 'high');
  }

  const coverage =
    input.totalPages > 0 ? input.affectedCount / input.totalPages : 0;

  // Coverage is a hint, not a doubling bonus. A widespread issue is more
  // important, but must not manufacture a critical out of a symptom.
  if (coverage >= 0.7) severity = bump(severity, 1);
  else if (coverage <= 0.05) severity = bump(severity, -1);

  if (input.unitHint === 'bytes' && input.avgNumericValue != null) {
    if (input.avgNumericValue >= 1_000_000) severity = maxSeverity(severity, 'high');
    else if (input.avgNumericValue >= 300_000) severity = maxSeverity(severity, 'medium');
  }

  if (input.unitHint === 'ms' && input.avgNumericValue != null) {
    if (input.avgNumericValue >= 2_000) severity = maxSeverity(severity, 'medium');
  }

  // Only the curated set may be critical; everything else tops out at high.
  if (!CRITICAL_AUDITS.has(input.auditId) && severity === 'critical') {
    severity = 'high';
  }

  const cap = SEVERITY_CAPS[input.auditId];
  if (cap && ORDER[severity] > ORDER[cap]) severity = cap;

  return severity;
}

export function compareSeverity(a: Severity, b: Severity): number {
  return ORDER[b] - ORDER[a];
}

export function unitHintForAudit(auditId: string): 'bytes' | 'ms' | 'count' | null {
  if (auditId === 'total-byte-weight') return 'bytes';
  if (auditId === 'uses-optimized-images') return 'bytes';
  if (auditId === 'uses-responsive-images') return 'bytes';
  if (auditId === 'modern-image-formats') return 'bytes';
  if (auditId === 'render-blocking-resources') return 'ms';
  if (auditId === 'bootup-time') return 'ms';
  if (auditId === 'mainthread-work-breakdown') return 'ms';
  if (auditId === 'dom-size') return 'count';
  if (auditId === 'network-requests') return 'count';
  return null;
}
