import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getComparison, getProject, listRuns } from '../lib/api';
import type { Project, Run, ScanComparison } from '../lib/types';
import { CATEGORY_LABELS } from '../lib/types';
import { formatDate } from '../lib/format';
import { Crumb, PageHeader } from '../components/Shell';
import {
  Card,
  EmptyState,
  Panel,
  SeverityBadge,
  Spinner,
  cn,
  selectClass,
} from '../components/ui';

export function ComparePage() {
  const { id = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [current, setCurrent] = useState('');
  const [previous, setPrevious] = useState('');
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [snap, runList] = await Promise.all([
          getProject(id),
          listRuns(id),
        ]);
        setProject(snap.project);
        const withWeb = runList.filter((r) => r.webScanId);
        setRuns(withWeb);
        if (withWeb[0]) setCurrent(withWeb[0].id);
        if (withWeb[1]) setPrevious(withWeb[1].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load runs.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!current || !previous || current === previous) {
      setComparison(null);
      return;
    }
    getComparison(current, previous)
      .then(setComparison)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not compare.'),
      );
  }, [current, previous]);

  const runLabel = useMemo(() => {
    const map = new Map(runs.map((r) => [r.id, r]));
    return (rid: string) => {
      const r = map.get(rid);
      return r ? `${r.label} · ${formatDate(r.startedAt)}` : rid;
    };
  }, [runs]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading…
      </div>
    );
  }

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={project?.name ?? id} />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">Compare</span>
          </span>
        }
        title="Compare runs"
        description="Track whether the site is improving between audits."
      />

      {error && (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </Card>
      )}

      {runs.length < 2 ? (
        <EmptyState
          title="Not enough runs to compare"
          hint="You need at least two runs that included the web-quality stage."
        />
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <label className="text-sm text-muted">Current</label>
            <select
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={cn(selectClass, 'rounded-xl bg-black/30 px-3 py-2 text-sm')}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {runLabel(r.id)}
                </option>
              ))}
            </select>
            <span className="text-muted">vs</span>
            <label className="text-sm text-muted">Previous</label>
            <select
              value={previous}
              onChange={(e) => setPrevious(e.target.value)}
              className={cn(selectClass, 'rounded-xl bg-black/30 px-3 py-2 text-sm')}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {runLabel(r.id)}
                </option>
              ))}
            </select>
          </Card>

          {comparison && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel title="Score changes">
                <div className="space-y-2">
                  {comparison.scores.map((s) => (
                    <div
                      key={s.category}
                      className="flex items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2"
                    >
                      <span className="text-sm text-ink-soft">
                        {CATEGORY_LABELS[s.category]}
                      </span>
                      <span className="flex items-center gap-3 text-sm">
                        <span className="text-muted">{s.previous ?? '-'}</span>
                        <span className="text-muted">→</span>
                        <span className="text-ink">{s.current ?? '-'}</span>
                        <Delta value={s.change} />
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Issue changes">
                <IssueGroup title="New" items={comparison.new} tone="text-rose-300" />
                <IssueGroup
                  title="Worsened"
                  items={comparison.worsened}
                  tone="text-orange-300"
                />
                <IssueGroup
                  title="Improved"
                  items={comparison.improved}
                  tone="text-emerald-300"
                />
                <IssueGroup
                  title="Fixed"
                  items={comparison.fixed}
                  tone="text-emerald-300"
                />
                <IssueGroup
                  title="Persisted"
                  items={comparison.persisted}
                  tone="text-amber-300"
                />
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">-</span>;
  const tone =
    value > 0 ? 'text-emerald-300' : value < 0 ? 'text-rose-300' : 'text-muted';
  return (
    <span className={cn('w-12 text-right font-medium', tone)}>
      {value > 0 ? '+' : ''}
      {Math.round(value)}
    </span>
  );
}

function IssueGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: ScanComparison['new'];
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h4 className={cn('mb-1.5 text-xs font-semibold uppercase tracking-wide', tone)}>
        {title} · {items.length}
      </h4>
      <ul className="space-y-1">
        {items.slice(0, 12).map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm text-ink-soft">
            <SeverityBadge severity={i.currentSeverity as never} />
            <span className="truncate">{i.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
