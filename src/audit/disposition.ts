import type { FindingDisposition, Issue } from '../types.js';
import { summariseEvidenceItems } from './evidence.js';

export interface DispositionResult {
  disposition: FindingDisposition;
  reason?: string;
}

const PRIVATE_PATH =
  /^\/(auth|dashboard|events\/new|account|favorites)(\/|$)/i;

const THIRD_PARTY_HOST =
  /(^|\.)(openstreetmap\.org|googleapis\.com|gstatic\.com|googlesyndication\.com|doubleclick\.net|adtrafficquality\.google)$/i;

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/** Resource URLs referenced by a finding's raw evidence. */
function evidenceUrls(issue: Issue): string[] {
  const urls = new Set<string>();
  for (const example of issue.examples) {
    const url = example.url;
    if (typeof url === 'string') urls.add(url);
  }
  return [...urls];
}

function everyMatched(values: string[], predicate: (value: string) => boolean): boolean {
  return values.length > 0 && values.every(predicate);
}

/**
 * Decide how a web finding should be treated. This keeps intentional choices
 * (private pages excluded from search), third-party resources and
 * not-actionable Lighthouse flags out of the release gate instead of reporting
 * them as defects.
 */
export function classifyIssue(issue: Issue): DispositionResult {
  const auditId = issue.id;

  if (auditId === 'is-crawlable') {
    const paths = issue.affectedUrls.map(pathOf);
    if (everyMatched(paths, (p) => PRIVATE_PATH.test(p))) {
      return {
        disposition: 'expected',
        reason:
          'These pages are private or utility routes and are intentionally excluded from indexing.',
      };
    }
  }

  if (auditId === 'bf-cache') {
    const text = `${issue.description} ${issue.examples
      .map((e) => JSON.stringify(e))
      .join(' ')}`;
    if (/no-store|cachecontrolnostore|not actionable/i.test(text)) {
      return {
        disposition: 'not-actionable',
        reason:
          'Caused by intentional dynamic/auth rendering (cache-control: no-store); Lighthouse marks the reasons not actionable.',
      };
    }
  }

  if (auditId === 'redirects') {
    const paths = issue.affectedUrls.map(pathOf);
    if (
      everyMatched(
        paths,
        (p) => PRIVATE_PATH.test(p) || p.startsWith('/venues'),
      )
    ) {
      return {
        disposition: 'expected',
        reason:
          'Intentional auth gate or canonical /venues redirect, not a defect.',
      };
    }
  }

  if (
    auditId === 'cache-insight' ||
    auditId === 'uses-long-cache-ttl' ||
    auditId === 'image-delivery-insight'
  ) {
    const hosts = evidenceUrls(issue)
      .map(hostOf)
      .filter((h): h is string => Boolean(h));
    if (hosts.length > 0 && hosts.every((h) => THIRD_PARTY_HOST.test(h))) {
      return {
        disposition: 'third-party',
        reason: 'The affected resources are served by a third-party origin.',
      };
    }
  }

  if (
    auditId === 'network-dependency-tree-insight' ||
    auditId === 'document-latency-insight' ||
    auditId === 'forced-reflow-insight'
  ) {
    const summary = summariseEvidenceItems(issue.examples);
    const hasReadable = summary.some(
      (line) => !line.includes('(no readable detail)'),
    );
    if (summary.length === 0 || !hasReadable) {
      return {
        disposition: 'needs-investigation',
        reason:
          'The report did not capture a concrete culprit; inspect the raw Lighthouse JSON/report for this audit.',
      };
    }
  }

  return { disposition: 'genuine' };
}
