import type {
  DomainVerdict,
  Finding,
  FindingDisposition,
  ReleaseGate,
  ReleaseVerdict,
  Severity,
} from '../types.js';
import { groupFindings } from './groups.js';

export function effectiveSeverity(
  f: Finding,
): 'critical' | 'high' | 'medium' | 'low' {
  let s: Severity = f.severity;
  if (f.confidence === 'Low') {
    if (s === 'critical') s = 'high';
    else if (s === 'high') s = 'medium';
  }
  if (s === 'info') return 'low';
  return s;
}

/** Dispositions that must not fail the release gate. */
const NON_BLOCKING_DISPOSITIONS = new Set<FindingDisposition>([
  'expected',
  'third-party',
  'not-actionable',
]);

function emptyDispositions(): Record<FindingDisposition, number> {
  return {
    genuine: 0,
    expected: 0,
    'third-party': 0,
    'not-actionable': 0,
    'needs-investigation': 0,
  };
}

const VERDICT_ORDER: Record<ReleaseVerdict, number> = {
  FAIL: 0,
  WARN: 1,
  PASS: 2,
};

export function buildReleaseGate(findings: Finding[]): ReleaseGate {
  // Collapse derivations first, so a symptom family is one defect, not eight.
  const { findings: grouped, groups } = groupFindings(findings);

  const dispositions = emptyDispositions();
  for (const f of grouped) {
    const disposition = f.disposition ?? 'genuine';
    dispositions[disposition]++;
  }

  // Only primary, genuine findings are counted as defects. Derived symptoms and
  // intentional/third-party/not-actionable findings are reported, not gated.
  const counted = grouped.filter(
    (f) =>
      f.groupRole !== 'derived' &&
      !NON_BLOCKING_DISPOSITIONS.has(f.disposition ?? 'genuine'),
  );

  const domains = new Map<
    string,
    { critical: number; high: number; medium: number; low: number }
  >();

  for (const f of counted) {
    if (f.severity === 'info') continue;
    const eff = effectiveSeverity(f);
    const d = domains.get(f.domain) ?? { critical: 0, high: 0, medium: 0, low: 0 };
    if (eff === 'critical') d.critical++;
    else if (eff === 'high') d.high++;
    else if (eff === 'medium') d.medium++;
    else d.low++;
    domains.set(f.domain, d);
  }

  const domainVerdicts: DomainVerdict[] = [...domains.entries()].map(
    ([domain, counts]) => {
      const verdict: ReleaseVerdict =
        counts.critical > 0 ? 'FAIL' : counts.high > 0 ? 'WARN' : 'PASS';
      return { domain, verdict, ...counts };
    },
  );

  domainVerdicts.sort(
    (a, b) =>
      VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
      a.domain.localeCompare(b.domain),
  );

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of counted) {
    if (f.severity !== 'info') severityCounts[f.severity]++;
  }

  let status: ReleaseGate['status'];
  if (findings.length === 0) status = 'UNKNOWN';
  else if (counted.length === 0) status = 'READY';
  else if (domainVerdicts.some((d) => d.verdict === 'FAIL')) status = 'NOT_READY';
  else if (domainVerdicts.some((d) => d.verdict === 'WARN')) status = 'CONDITIONAL';
  else status = 'READY';

  return { status, domains: domainVerdicts, severityCounts, dispositions, groups };
}
