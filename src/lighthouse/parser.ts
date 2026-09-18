import type {
  Category,
  PageIssue,
  PageMetrics,
  PageScores,
  Severity,
} from '../types.js';

interface LhrCategory {
  score?: number | null;
}

interface LhrAudit {
  id: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number | null;
  displayValue?: string;
  details?: {
    type?: string;
    items?: Record<string, unknown>[];
  };
}

interface Lhr {
  categories?: Record<string, LhrCategory>;
  audits?: Record<string, LhrAudit>;
}

const CATEGORY_KEYS: Record<Category, string> = {
  performance: 'performance',
  accessibility: 'accessibility',
  'best-practices': 'best-practices',
  seo: 'seo',
};

const ISSUE_DISPLAY_MODES = new Set(['numeric', 'binary', 'metricSavings']);

function scoreTo100(score: number | null | undefined): number | null {
  if (score == null) return null;
  return Math.round(score * 100);
}

export function lighthouseBaseSeverity(
  category: Category,
  score: number | null,
): Severity {
  if (score == null) return 'info';
  // A failing audit is a violation, not automatically a release blocker. The
  // analyser floors known-critical audits (contrast, page language, title) and
  // caps known-low-value ones; scoring every a11y audit as critical inflated
  // the critical count.
  if (score === 0) return 'high';
  if (score < 0.5) return 'medium';
  if (score < 0.9) return 'low';
  return 'info';
}

function numericOrNull(audit: LhrAudit): number | null {
  if (audit.numericValue == null) return null;
  return audit.numericValue;
}

function buildAuditCategoryMap(lhr: Lhr): Map<string, Category> {
  const map = new Map<string, Category>();
  if (!lhr.categories) return map;
  for (const category of Object.keys(CATEGORY_KEYS) as Category[]) {
    const key = CATEGORY_KEYS[category];
    const cat = lhr.categories[key];
    if (!cat) continue;
    const refs = (cat as unknown as {
      auditRefs?: { id: string }[];
    }).auditRefs;
    if (!refs) continue;
    for (const ref of refs) map.set(ref.id, category);
  }
  return map;
}

export function extractScores(lhr: unknown): PageScores {
  const data = lhr as Lhr;
  const empty: PageScores = {
    performance: null,
    accessibility: null,
    'best-practices': null,
    seo: null,
  };
  if (!data.categories) return empty;
  return {
    performance: scoreTo100(data.categories.performance?.score),
    accessibility: scoreTo100(data.categories.accessibility?.score),
    'best-practices': scoreTo100(data.categories['best-practices']?.score),
    seo: scoreTo100(data.categories.seo?.score),
  };
}

export function extractMetrics(lhr: unknown): PageMetrics {
  const data = lhr as Lhr;
  const audits = data.audits || {};
  const num = (id: string): number | null => {
    const a = audits[id];
    if (!a || a.numericValue == null) return null;
    return a.numericValue;
  };

  const inp = num('interaction-to-next-paint');

  const networkRequests = audits['network-requests'];
  const requestCount =
    networkRequests?.numericValue ??
    networkRequests?.details?.items?.length ??
    null;

  return {
    lcp: num('largest-contentful-paint'),
    cls: num('cumulative-layout-shift'),
    inp,
    fcp: num('first-contentful-paint'),
    tbt: num('total-blocking-time'),
    speedIndex: num('speed-index'),
    totalByteWeight: num('total-byte-weight'),
    requestCount,
  };
}

const MAX_ITEMS = 20;

/**
 * Metric audits (TBT, LCP, CLS, FCP, speed index) carry a score but no
 * `details.items` - the actual evidence lives in sibling audits. When an audit
 * has no items of its own, borrow the top items from these related audits so a
 * finding can still point at the specific culprits.
 */
const SUPPORTING_AUDITS: Record<string, string[]> = {
  'total-blocking-time': [
    'mainthread-work-breakdown',
    'bootup-time',
    'long-tasks',
  ],
  'max-potential-fid': ['long-tasks', 'bootup-time'],
  interactive: ['mainthread-work-breakdown', 'bootup-time'],
  'largest-contentful-paint': [
    'lcp-breakdown-insight',
    'lcp-discovery-insight',
    'largest-contentful-paint-element',
    'image-delivery-insight',
    'render-blocking-insight',
  ],
  'first-contentful-paint': [
    'render-blocking-insight',
    'document-latency-insight',
    'network-dependency-tree-insight',
  ],
  'speed-index': [
    'render-blocking-insight',
    'unused-javascript',
    'unused-css-rules',
  ],
  'cumulative-layout-shift': ['cls-culprits-insight', 'layout-shifts'],
  'total-byte-weight': [
    'resource-summary',
    'third-parties-insight',
    'duplicated-javascript-insight',
    'network-requests',
  ],
  'unused-javascript': [
    'duplicated-javascript-insight',
    'legacy-javascript-insight',
  ],
  'unused-css-rules': ['render-blocking-insight'],
  'uses-long-cache-ttl': ['cache-insight'],
  'dom-size': ['dom-size-insight'],
  'modern-image-formats': ['image-delivery-insight'],
  'uses-optimized-images': ['image-delivery-insight'],
  'uses-responsive-images': ['image-delivery-insight'],
  'font-display': ['font-display-insight'],
  'third-party-summary': ['third-parties-insight'],
};

function supportingItems(
  audits: Record<string, LhrAudit>,
  auditId: string,
): Record<string, unknown>[] {
  const related = SUPPORTING_AUDITS[auditId];
  if (!related) return [];
  const items: Record<string, unknown>[] = [];
  for (const id of related) {
    const audit = audits[id];
    const raw = audit?.details?.items;
    if (!Array.isArray(raw)) continue;
    for (const item of raw.slice(0, 4)) {
      items.push({ ...item, via: id });
    }
    if (items.length >= MAX_ITEMS) break;
  }
  return items.slice(0, MAX_ITEMS);
}

export function extractIssues(lhr: unknown): PageIssue[] {
  const data = lhr as Lhr;
  if (!data.audits) return [];
  const categoryMap = buildAuditCategoryMap(data);

  const issues: PageIssue[] = [];

  for (const [auditId, audit] of Object.entries(data.audits)) {
    if (!ISSUE_DISPLAY_MODES.has(audit.scoreDisplayMode || '')) continue;
    if (audit.score == null) continue;
    if (audit.score >= 1) continue;

    const category = categoryMap.get(auditId) || 'performance';

    // Lighthouse "checklist" audits (e.g. document-latency-insight) put a plain
    // object in details.items rather than an array. Keep it as a single row so
    // the checklist's label/value pairs become readable evidence instead of
    // being silently dropped.
    const rawItems = audit.details?.items;
    let ownItems: Record<string, unknown>[];
    if (Array.isArray(rawItems)) {
      ownItems = rawItems;
    } else if (rawItems && typeof rawItems === 'object') {
      ownItems = [rawItems as Record<string, unknown>];
    } else {
      ownItems = [];
    }
    // Metric audits have no items of their own; borrow the culprits so the
    // finding has evidence that points at something concrete.
    const items =
      ownItems.length > 0 ? ownItems : supportingItems(data.audits, auditId);
    const capped = items.slice(0, MAX_ITEMS);

    issues.push({
      auditId,
      category,
      title: audit.title || auditId,
      description: audit.description || '',
      score: audit.score,
      numericValue: numericOrNull(audit),
      displayValue: audit.displayValue ?? null,
      itemCount: items.length,
      items: capped,
      baseSeverity: lighthouseBaseSeverity(category, audit.score),
    });
  }

  return issues;
}

export function parseLighthouse(lhr: unknown): {
  scores: PageScores;
  metrics: PageMetrics;
  issues: PageIssue[];
} {
  return {
    scores: extractScores(lhr),
    metrics: extractMetrics(lhr),
    issues: extractIssues(lhr),
  };
}

export function runtimeErrorMessage(lhr: unknown): string | null {
  const data = lhr as { runtimeError?: { message?: string; code?: string } };
  const err = data.runtimeError;
  if (!err) return null;
  return err.message || err.code || 'Lighthouse reported a runtime error.';
}
