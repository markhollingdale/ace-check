import { XMLParser } from 'fast-xml-parser';
import type { Finding } from '../../types.js';
import { safeJson } from './exec.js';
import { normaliseSeverity, scannerFinding } from './finding.js';

// --- Playwright JSON reporter ---------------------------------------------

interface PlaywrightResult {
  status?: string;
  error?: { message?: string };
  duration?: number;
}

interface PlaywrightTest {
  status?: string;
  results?: PlaywrightResult[];
}

interface PlaywrightSpec {
  title?: string;
  ok?: boolean;
  file?: string;
  line?: number;
  tests?: PlaywrightTest[];
}

interface PlaywrightSuite {
  title?: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
  suites?: PlaywrightSuite[];
}

function walkPlaywrightSuite(
  suite: PlaywrightSuite,
  out: { spec: PlaywrightSpec; file?: string }[],
): void {
  for (const spec of suite.specs ?? []) {
    out.push({ spec, file: suite.file });
  }
  for (const child of suite.suites ?? []) {
    walkPlaywrightSuite(child, out);
  }
}

function parsePlaywright(report: PlaywrightReport): Finding[] {
  const specs: { spec: PlaywrightSpec; file?: string }[] = [];
  for (const suite of report.suites ?? []) walkPlaywrightSuite(suite, specs);

  const findings: Finding[] = [];
  for (const { spec, file } of specs) {
    if (spec.ok !== false) continue;
    const errorMessage =
      spec.tests?.flatMap((t) => t.results ?? []).find((r) => r.error?.message)
        ?.error?.message ?? 'The test failed.';
    const isTimeout = /timeout/i.test(errorMessage);
    findings.push(
      scannerFinding({
        prefix: 'ABUSE',
        source: 'dynamic',
        category: 'security',
        domain: 'SECURITY',
        severity: 'high',
        confidence: 'High',
        title: spec.title || 'Abuse/authorisation test failed',
        description: `A security-relevant test failed: ${errorMessage.slice(0, 400)}`,
        evidence: { file: spec.file ?? file, line: spec.line, proof: 'confirmed' },
        recommendation:
          'Review the failing abuse/authorisation expectation - a passing suite is required before release.',
        effort: '2h',
        correlationKeys: ['security'],
      }),
    );
    void isTimeout;
  }
  return findings;
}

// --- Burp Suite XML --------------------------------------------------------

interface BurpIssue {
  name?: string;
  severity?: string;
  host?: string | { '#text'?: string };
  path?: string | { '#text'?: string };
  location?: string | { '#text'?: string };
  issueBackground?: string | { '#text'?: string };
  remediationBackground?: string | { '#text'?: string };
  type?: string | { '#text'?: string };
}

function text(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '#text' in (value as object)) {
    return String((value as { '#text'?: unknown })['#text'] ?? '');
  }
  return undefined;
}

function parseBurp(xml: string): Finding[] {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml) as {
    issues?: { issue?: BurpIssue | BurpIssue[] };
  };
  const raw = parsed.issues?.issue;
  if (!raw) return [];
  const issues = Array.isArray(raw) ? raw : [raw];
  return issues.map((issue) =>
    scannerFinding({
      prefix: 'BURP',
      source: 'dynamic',
      category: 'security',
      domain: 'SECURITY',
      severity: normaliseSeverity(text(issue.severity)),
      title: text(issue.name) ?? 'Burp issue',
      description:
        text(issue.issueBackground)?.slice(0, 600) ?? 'Reported by Burp Suite.',
      evidence: {
        url: [text(issue.host), text(issue.path)].filter(Boolean).join(''),
        proof: 'confirmed',
      },
      recommendation:
        text(issue.remediationBackground)?.slice(0, 400) ||
        'Review and remediate the reported issue.',
      correlationKeys: ['security'],
    }),
  );
}

// --- Generic JSON array ----------------------------------------------------

interface GenericFinding {
  title?: string;
  description?: string;
  severity?: string;
  file?: string;
  line?: number;
  url?: string;
  recommendation?: string;
}

function parseGeneric(list: GenericFinding[]): Finding[] {
  return list
    .filter((item) => item && typeof item.title === 'string')
    .map((item) =>
      scannerFinding({
        prefix: 'IMPORT',
        source: 'dynamic',
        category: 'security',
        domain: 'SECURITY',
        severity: normaliseSeverity(item.severity),
        title: item.title ?? 'Imported finding',
        description: item.description ?? '',
        evidence: { file: item.file, line: item.line, url: item.url, proof: 'confirmed' },
        recommendation: item.recommendation,
        correlationKeys: ['security'],
      }),
    );
}

/**
 * Parse an imported report. Supports the Playwright JSON reporter, Burp Suite
 * XML export, and a generic JSON array of `{ title, severity, ... }`.
 */
export function parseImportedReport(text: string): Finding[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('<')) {
    return parseBurp(trimmed);
  }

  const json = safeJson<unknown>(trimmed);
  if (Array.isArray(json)) {
    return parseGeneric(json as GenericFinding[]);
  }
  if (json && typeof json === 'object') {
    const report = json as PlaywrightReport;
    if (report.suites) return parsePlaywright(report);
  }
  return [];
}
