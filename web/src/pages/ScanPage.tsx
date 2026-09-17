import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  getIssues,
  getPages,
  getProgress,
  getScan,
  retryFailed,
} from '../lib/api';
import type {
  Issue,
  PageSummary,
  ScanMetadata,
  ScanSummary,
} from '../lib/types';
import { formatDate, formatDuration } from '../lib/format';
import { ProgressPanel } from '../components/ProgressPanel';
import { OverviewTab } from '../components/OverviewTab';
import { IssuesTab } from '../components/IssuesTab';
import { PagesTab } from '../components/PagesTab';
import { ReportsTab } from '../components/ReportsTab';
import { CompareTab } from '../components/CompareTab';
import { CodeTab } from '../components/CodeTab';
import { Button, Card, Spinner, Tabs } from '../components/ui';

const RUNNING = new Set(['discovering', 'scanning', 'analysing', 'reporting']);

export function ScanPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [metadata, setMetadata] = useState<ScanMetadata | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [detail, issueList, pageList] = await Promise.all([
      getScan(id),
      getIssues(id),
      getPages(id),
    ]);
    setMetadata(detail.metadata);
    setSummary(detail.summary);
    setIssues(issueList);
    setPages(pageList);
    setLoading(false);
    setRunning(RUNNING.has(detail.metadata.status));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().catch(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!running) return;
    let stopped = false;
    const poll = async () => {
      const p = await getProgress(id);
      if (stopped) return;
      if (!RUNNING.has(p.status)) {
        setRunning(false);
        await load();
        return;
      }
      setTimeout(poll, 1000);
    };
    poll();
    return () => {
      stopped = true;
    };
  }, [running, id, load]);

  const onRetry = async () => {
    await retryFailed(id);
    setRunning(true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading scan…
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">Scan not found.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-slate-700 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (running) {
    return (
      <div className="space-y-6">
        <Header metadata={metadata} summary={summary} />
        <ProgressPanel scanId={id} onDone={() => load()} />
      </div>
    );
  }

  const failed = pages.filter((p) => p.status === 'failed').length;

  const hasWeb = Boolean(metadata.url);
  const hasCode = Boolean(metadata.codebasePath);
  const tab = searchParams.get('tab') || (hasWeb ? 'overview' : 'code');

  const tabs: { id: string; label: string; count?: number }[] = [];
  if (hasWeb) {
    tabs.push({ id: 'overview', label: 'Overview' });
    tabs.push({ id: 'issues', label: 'Issues', count: issues.length });
    tabs.push({ id: 'pages', label: 'Pages', count: pages.length });
    tabs.push({ id: 'reports', label: 'Reports' });
    tabs.push({ id: 'compare', label: 'Compare' });
  }
  if (hasCode) tabs.push({ id: 'code', label: 'Code' });

  return (
    <div className="space-y-6">
      <Header metadata={metadata} summary={summary}>
        {failed > 0 && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry {failed} failed page{failed === 1 ? '' : 's'}
          </Button>
        )}
      </Header>

      {failed > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-red-800">
                {failed} page{failed === 1 ? '' : 's'} failed to scan
              </h2>
              <ul className="mt-1.5 space-y-1.5">
                {pages
                  .filter((p) => p.status === 'failed')
                  .map((p) => (
                    <li
                      key={p.slug}
                      className="flex items-start gap-2 text-xs text-red-700"
                    >
                      <span className="truncate font-mono">
                        {p.url} ({p.device})
                      </span>
                      <span className="shrink-0">—</span>
                      <span className="break-words">
                        {p.error || 'unknown error'}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Tabs
        active={tab}
        onChange={(t) => setSearchParams({ tab: t })}
        tabs={tabs}
      />

      {tab === 'overview' && hasWeb && (
        <OverviewTab metadata={metadata} summary={summary} issues={issues} />
      )}
      {tab === 'issues' && hasWeb && <IssuesTab scanId={id} issues={issues} />}
      {tab === 'pages' && hasWeb && <PagesTab scanId={id} pages={pages} />}
      {tab === 'reports' && hasWeb && <ReportsTab scanId={id} />}
      {tab === 'compare' && hasWeb && <CompareTab scanId={id} />}
      {tab === 'code' && hasCode && (
        <CodeTab scanId={id} codebasePath={metadata.codebasePath!} />
      )}
    </div>
  );
}

function Header({
  metadata,
  summary,
  children,
}: {
  metadata: ScanMetadata;
  summary: ScanSummary | null;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {metadata.url || metadata.codebasePath || metadata.scanId}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(metadata.timestamp)}
            {metadata.url && ` · ${metadata.mode}`}
            {metadata.url &&
              ` · ${
                metadata.device === 'both' ? 'Mobile + Desktop' : metadata.device
              }`}
            {metadata.codebasePath && ' · code check'}
            {metadata.durationMs != null &&
              ` · ${formatDuration(metadata.durationMs)}`}
          </p>
          {summary && (
            <p className="mt-1 text-sm text-slate-500">
              {summary.pagesSucceeded} scanned · {summary.pagesFailed} failed ·{' '}
              {summary.pagesDiscovered} discovered
            </p>
          )}
        </div>
        {children}
      </div>
    </Card>
  );
}
