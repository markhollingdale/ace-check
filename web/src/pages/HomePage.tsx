import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteScan, listScans } from '../lib/api';
import type { ScanMetadata } from '../lib/types';
import { formatDate, formatDuration } from '../lib/format';
import { NewScanForm } from '../components/NewScanForm';
import { ProgressPanel } from '../components/ProgressPanel';
import { Button, Card, EmptyState, Spinner } from '../components/ui';

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
  discovering: 'bg-accent-subtle text-accent',
  scanning: 'bg-accent-subtle text-accent',
  analysing: 'bg-accent-subtle text-accent',
  reporting: 'bg-accent-subtle text-accent',
};

export function HomePage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState<{ scanId: string; url: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listScans();
      setScans(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Could not load previous scans.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onStarted = (scanId: string, url: string) => {
    setRunning({ scanId, url });
    setScans([]);
    setLoading(false);
    setLoadError(null);
  };

  const onDone = () => {
    setRunning(null);
    refresh();
    navigate(`/scan/${running?.scanId}`);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this scan?')) return;
    await deleteScan(id);
    refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Website Technical Audit
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Crawl a site, run Lighthouse across the whole thing, and get
            aggregated, AI-ready findings — not hundreds of raw reports.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-xs font-medium text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Performance
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Accessibility
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Best Practices
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            SEO
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-accent-subtle bg-accent-subtle/30 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-accent">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Deep review (AI)
            </p>
            <p className="text-xs text-slate-600">
              16 AI engineering reviews against your code.
            </p>
          </div>
        </div>
        <Link
          to="/ai-reviews"
          className="shrink-0 rounded-lg border border-accent-subtle bg-white px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-subtle"
        >
          AI Reviews →
        </Link>
      </div>

      {running ? (
        <ProgressPanel scanId={running.scanId} onDone={onDone} />
      ) : (
        <NewScanForm onStarted={onStarted} scans={scans} />
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Previous scans
        </h2>
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-8 text-sm text-slate-500">
            <Spinner className="ml-8" /> Loading scans…
          </div>
        ) : loadError ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <p className="text-xs text-slate-500">
              Make sure the local server is running (pnpm dev).
            </p>
            <Button variant="secondary" size="sm" onClick={refresh}>
              Retry
            </Button>
          </Card>
        ) : scans.length === 0 ? (
          <EmptyState
            title="No scans yet"
            hint="Run your first scan above to get started."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2.5 font-medium">URL</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Mode</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Pages</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Duration</th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr
                    key={scan.scanId}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/scan/${scan.scanId}`}
                        className="font-medium text-slate-800 hover:text-accent hover:underline"
                      >
                        {scan.url}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDate(scan.timestamp)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{scan.mode}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {scan.pagesScanned}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[scan.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDuration(scan.durationMs)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(scan.scanId)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
