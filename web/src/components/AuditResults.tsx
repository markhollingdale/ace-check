import { useState } from 'react';
import { setFindingStatus } from '../lib/api';
import type { FindingStatus, ReleaseResult } from '../lib/types';
import { Button, Card, SeverityBadge, cn } from '../components/ui';

const STATUS_STYLE: Record<string, string> = {
  READY: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CONDITIONAL: 'border-amber-200 bg-amber-50 text-amber-800',
  NOT_READY: 'border-red-200 bg-red-50 text-red-800',
  UNKNOWN: 'border-slate-200 bg-slate-50 text-slate-700',
};

const VERDICT_STYLE: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  WARN: 'bg-amber-100 text-amber-700',
  FAIL: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: 'detected', label: 'Detected' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'verified', label: 'Verified' },
];

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function AuditResults({
  result,
  codebasePath,
}: {
  result: ReleaseResult;
  codebasePath: string;
}) {
  const [findings, setFindings] = useState(result.findings);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (id: string, status: FindingStatus) => {
    try {
      await setFindingStatus(codebasePath, id, status);
      setFindings((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result.report.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sorted = [...findings].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <div
        className={cn(
          'rounded-xl border p-6',
          STATUS_STYLE[result.gate.status] ?? STATUS_STYLE.UNKNOWN,
        )}
      >
        <div className="text-xs font-semibold uppercase tracking-wide">
          Production status
        </div>
        <div className="mt-1 text-3xl font-bold">{result.gate.status}</div>
        <div className="mt-2 text-sm">
          Critical {result.gate.severityCounts.critical} · High{' '}
          {result.gate.severityCounts.high} · Medium{' '}
          {result.gate.severityCounts.medium} · Low{' '}
          {result.gate.severityCounts.low}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
          Web: {result.sources?.web ?? 0}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
          Code checks: {result.sources?.static ?? 0}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
          AI review: {result.sources?.review ?? 0}
        </span>
        {(result.sources?.review ?? 0) === 0 && (
          <span className="text-slate-500">
            AI reviews aren't run automatically — see the AI Reviews page.
          </span>
        )}
      </div>

      {result.findings.some((f) => f.prefix === 'MATCH') && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Possible code/site mismatch
          </p>
          <p className="mt-1 text-sm text-amber-700">
            The deployed site doesn't appear to reference this codebase — they
            may be different projects.
          </p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Domain verdicts
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-2.5 font-medium">Domain</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Verdict</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Critical</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">High</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Medium</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Low</th>
            </tr>
          </thead>
          <tbody>
            {result.gate.domains.map((d) => (
              <tr
                key={d.domain}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-5 py-2.5 font-medium text-slate-800">
                  {d.domain}
                </td>
                <td className="px-5 py-2.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      VERDICT_STYLE[d.verdict],
                    )}
                  >
                    {d.verdict}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">
                  {d.critical}
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">
                  {d.high}
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">
                  {d.medium}
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">
                  {d.low}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {result.correlations.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Correlated findings
          </h3>
          <div className="space-y-2">
            {result.correlations.map((c) => (
              <div
                key={c.key}
                className="flex flex-wrap items-start gap-2 text-sm"
              >
                <span
                  className={cn(
                    'mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                    proofStyle(c.proof),
                  )}
                >
                  {c.proof}
                </span>
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                  {c.key}
                </code>
                <span className="text-slate-500">
                  web {c.webFindingIds.join(', ')} ↔ code{' '}
                  {c.codeFindingIds.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Findings</h3>
          <span className="text-xs text-slate-500">
            Mark fixed/verified to drop them from the gate, then re-run.
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {sorted.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  <span className="font-mono text-xs text-slate-500">{f.id}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                    {f.source}
                  </span>
                  {f.evidence.file && (
                    <span className="font-mono text-xs text-slate-500">
                      {f.evidence.file}
                      {f.evidence.line ? `:${f.evidence.line}` : ''}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">{f.title}</p>
                {f.description && (
                  <p className="mt-0.5 text-xs text-slate-500">{f.description}</p>
                )}
              </div>
              <select
                value={f.status}
                onChange={(e) =>
                  updateStatus(f.id, e.target.value as FindingStatus)
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-accent"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Release report
          </h3>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? 'Copied!' : 'Copy Markdown'}
          </Button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
          {result.report.markdown}
        </pre>
      </Card>
    </div>
  );
}

function proofStyle(proof: string): string {
  if (proof === 'confirmed') return 'bg-emerald-100 text-emerald-700';
  if (proof === 'likely') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}
