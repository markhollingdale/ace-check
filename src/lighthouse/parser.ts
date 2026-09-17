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
  if (category === 'accessibility' && score === 0) return 'critical';
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

    // Lighthouse "checklist" style audits (e.g. document-latency-insight) put
    // a plain object in details.items rather than an array. Guard against that
    // so a passing/failing checklist audit cannot crash page summarisation.
    const rawItems = audit.details?.items;
    const items = Array.isArray(rawItems) ? rawItems : [];
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
