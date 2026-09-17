import { useEffect, useState } from 'react';
import { getComparison, listScans } from '../lib/api';
import type { ScanComparison, ScanMetadata } from '../lib/types';
import { formatDate } from '../lib/format';
import { Card, EmptyState, Spinner } from './ui';

export function CompareTab({ scanId }: { scanId: string }) {
  const [scans, setScans] = useState<ScanMetadata[]>([]);
  const [otherId, setOtherId] = useState<string>('');
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listScans().then((all) => setScans(all.filter((s) => s.scanId !== scanId)));
  }, [scanId]);

  const run = async (id: string) => {
    setOtherId(id);
    setLoading(true);
    try {
      const c = await getComparison(scanId, id);
      setComparison(c);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Compare with a previous scan
        </h3>
        {scans.length === 0 ? (
          <p className="text-sm text-slate-500">
            No other scans available to compare against.
          </p>
        ) : (
          <select
            value={otherId}
            onChange={(e) => run(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select a scan…</option>
            {scans.map((s) => (
              <option key={s.scanId} value={s.scanId}>
                {s.scanId} — {formatDate(s.timestamp)} — {s.pagesScanned} pages
              </option>
            ))}
          </select>
        )}
      </Card>

      {loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Spinner /> Comparing…
        </div>
      )}

      {comparison && (
        <>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Scores</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {comparison.scores.map((s) => (
                <div
                  key={s.category}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm text-slate-500">
                      {s.previous ?? '—'}
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="text-lg font-semibold text-slate-800">
                      {s.current ?? '—'}
                    </span>
                    {s.change != null && (
                      <span
                        className={`text-xs font-semibold ${
                          s.change > 0
                            ? 'text-emerald-700'
                            : s.change < 0
                              ? 'text-red-700'
                              : 'text-slate-500'
                        }`}
                      >
                        {s.change > 0 ? '+' : ''}
                        {s.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <IssueList title="Fixed" issues={comparison.fixed} tone="emerald" />
            <IssueList title="New" issues={comparison.new} tone="red" />
            <IssueList
              title="Improved"
              issues={comparison.improved}
              tone="emerald"
            />
            <IssueList
              title="Worsened"
              issues={comparison.worsened}
              tone="red"
            />
          </div>
        </>
      )}
    </div>
  );
}

function IssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: ScanComparison['fixed'];
  tone: 'emerald' | 'red';
}) {
  if (issues.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
        <EmptyState title={`Nothing ${title.toLowerCase()}`} />
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        {title}{' '}
        <span
          className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            tone === 'emerald'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {issues.length}
        </span>
      </h3>
      <ul className="space-y-1.5">
        {issues.map((i) => (
          <li key={i.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-slate-700">{i.title}</span>
            <span className="ml-2 shrink-0 text-xs text-slate-500">
              {i.previousCount > 0 && `${i.previousCount} → `}
              {i.currentCount} pages
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
