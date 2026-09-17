import type {
  DomainVerdict,
  Finding,
  ProductionStatus,
  ReleaseGate,
  ReleaseVerdict,
  Severity,
} from '../types.js';

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

const VERDICT_ORDER: Record<ReleaseVerdict, number> = {
  FAIL: 0,
  WARN: 1,
  PASS: 2,
};

export function buildReleaseGate(findings: Finding[]): ReleaseGate {
  const domains = new Map<
    string,
    { critical: number; high: number; medium: number; low: number }
  >();

  for (const f of findings) {
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
  for (const f of findings) {
    if (f.severity !== 'info') severityCounts[f.severity]++;
  }

  let status: ProductionStatus;
  if (domainVerdicts.length === 0) status = 'UNKNOWN';
  else if (domainVerdicts.some((d) => d.verdict === 'FAIL')) status = 'NOT_READY';
  else if (domainVerdicts.some((d) => d.verdict === 'WARN')) status = 'CONDITIONAL';
  else status = 'READY';

  return { status, domains: domainVerdicts, severityCounts };
}
