import { Link } from 'react-router-dom';
import type { Category, Issue, ScanMetadata, ScanSummary } from '../lib/types';
import { CATEGORY_LABELS, DEVICE_LABELS, SEVERITY_LABELS } from '../lib/types';
import { formatBytes, formatMs } from '../lib/format';
import { ScoreRing } from './ScoreRing';
import { Card, SeverityBadge } from './ui';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;
const CATEGORIES: Category[] = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
];

export function OverviewTab({
  metadata,
  summary,
  issues,
}: {
  metadata: ScanMetadata;
  summary: ScanSummary | null;
  issues: Issue[];
}) {
  if (!summary) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No summary available for this scan.
      </div>
    );
  }

  const multi = summary.devices.length > 1;
  const topIssues = issues.slice(0, 6);

  return (
    <div className="space-y-6">
      {summary.devices.map((device) => (
        <div key={device} className="space-y-3">
          {multi && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {DEVICE_LABELS[device]} scores
            </h2>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <Card key={cat} className="flex flex-col items-center py-6">
                <ScoreRing
                  value={summary.deviceScores[device]?.[cat]?.median ?? null}
                  label={CATEGORY_LABELS[cat]}
                />
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Issue summary
        </h2>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_ORDER.map((sev) => {
            const count = summary.issueCounts[sev];
            if (count === 0) return null;
            return (
              <span
                key={sev}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <SeverityBadge severity={sev} />
                <span className="font-semibold text-slate-800">{count}</span>
              </span>
            );
          })}
          {summary.totalIssues === 0 && (
            <span className="text-sm text-emerald-700">
              No issues detected across {summary.pagesSucceeded} pages.
            </span>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Performance metrics (median)
        </h2>
        <div className="space-y-4">
          {summary.devices.map((device) => {
            const m = summary.deviceMetrics[device];
            return (
              <div key={device}>
                {multi && (
                  <div className="mb-2 text-xs font-medium text-slate-500">
                    {DEVICE_LABELS[device]}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="LCP" value={formatMs(m?.lcpMedian ?? null)} />
                  <Metric label="CLS" value={m?.clsMedian != null ? String(m.clsMedian) : '—'} />
                  <Metric label="TBT" value={formatMs(m?.tbtMedian ?? null)} />
                  <Metric label="FCP" value={formatMs(m?.fcpMedian ?? null)} />
                  <Metric label="Speed Index" value={formatMs(m?.speedIndexMedian ?? null)} />
                  <Metric label="Page weight" value={formatBytes(m?.totalByteWeightMedian ?? null)} />
                  <Metric label="Requests" value={m?.requestCountMedian != null ? String(m.requestCountMedian) : '—'} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {topIssues.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Priority issues
            </h2>
            <Link
              to={`/scan/${metadata.scanId}?tab=issues`}
              className="text-xs font-medium text-slate-500 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {topIssues.map((issue) => (
              <Link
                key={issue.id}
                to={`/scan/${metadata.scanId}/issue/${issue.id}`}
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {issue.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {issue.count} / {issue.totalPages} pages
                    {multi &&
                      issue.devices &&
                      issue.devices.length > 0 &&
                      ` · ${issue.devices.map((d) => DEVICE_LABELS[d]).join(' + ')}`}
                  </p>
                </div>
                <SeverityBadge severity={issue.severity} />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
