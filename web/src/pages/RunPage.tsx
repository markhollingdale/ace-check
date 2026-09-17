import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getRun,
  getRunProgress,
  getPages,
  getProject,
  runStage as runStageApi,
  setFindingStatus,
} from '../lib/api';
import type {
  FindingStatus,
  PageSummary,
  Project,
  RunSnapshot,
  StageId,
  StageProgress,
} from '../lib/types';
import { formatDate, formatDuration } from '../lib/format';
import { Crumb, PageHeader } from '../components/Shell';
import { VerdictBanner } from '../components/Verdict';
import { StagePipeline } from '../components/StagePipeline';
import { FindingsList } from '../components/FindingsList';
import {
  Button,
  Card,
  EmptyState,
  Panel,
  ProgressBar,
  Spinner,
  Tabs,
  cn,
} from '../components/ui';

const RUNNING = new Set(['pending', 'running']);

export function RunPage() {
  const { id = '', runId = '' } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('stages');
  const [busyStage, setBusyStage] = useState<StageId | null>(null);
  const [pages, setPages] = useState<PageSummary[]>([]);

  const load = useCallback(async () => {
    try {
      const [snap, proj] = await Promise.all([
        getRun(id, runId),
        getProject(id),
      ]);
      setSnapshot(snap);
      setProject(proj.project);
      setError(null);
      return snap;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load run.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, runId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const running = snapshot ? RUNNING.has(snapshot.run.status) : true;

  useEffect(() => {
    if (!running) return;
    let stopped = false;
    const poll = async () => {
      try {
        const p = await getRunProgress(id, runId);
        if (stopped) return;
        setProgress(p);
        if (RUNNING.has(p.status)) {
          setTimeout(poll, 1200);
        } else {
          await load();
        }
      } catch {
        if (!stopped) setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      stopped = true;
    };
  }, [running, id, runId, load]);

  const onStatus = async (findingId: string, status: FindingStatus) => {
    if (!project?.targets.codebasePath) return;
    await setFindingStatus(project.targets.codebasePath, findingId, status);
    await load();
  };

  const onRunStage = async (stageId: StageId) => {
    setBusyStage(stageId);
    try {
      await runStageApi(id, runId, stageId);
      setTimeout(() => {
        load();
        setBusyStage(null);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run stage.');
      setBusyStage(null);
    }
  };

  const openPages = async (scanId: string) => {
    try {
      setPages(await getPages(scanId));
    } catch {
      setPages([]);
    }
  };

  useEffect(() => {
    if (tab === 'pages' && snapshot?.run.webScanId && pages.length === 0) {
      openPages(snapshot.run.webScanId);
    }
  }, [tab, snapshot, pages.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading run…
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error ?? 'Run not found.'}
      </Card>
    );
  }

  const { run, findings, gate, nextActions } = snapshot;
  const stages = progress?.stages ?? run.stages;
  const current = stages.find((s) => s.status === 'running');
  const completed = stages.filter((s) =>
    ['passed', 'findings', 'failed', 'skipped'].includes(s.status),
  ).length;
  const pct = Math.round((completed / Math.max(1, stages.length)) * 100);

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={project?.name ?? id} />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">Run</span>
          </span>
        }
        title={`${run.label} run`}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>{formatDate(run.startedAt)}</span>
            {run.durationMs != null && (
              <span>{formatDuration(run.durationMs)}</span>
            )}
            <span className="capitalize">{run.status}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${id}/findings`)}
            >
              All findings
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${id}/report`)}
            >
              Release report
            </Button>
          </>
        }
      />

      {RUNNING.has(run.status) ? (
        <Panel
          title="Audit in progress"
          action={
            <span className="text-xs text-muted">
              {completed}/{stages.length} stages
            </span>
          }
        >
          <div className="mb-4">
            <ProgressBar value={pct} />
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
              {current
                ? `${current.label} - ${progress?.message || 'working…'}`
                : progress?.message || 'Starting…'}
            </p>
          </div>
          <StagePipeline stages={stages} runningStageId={current?.id} />
        </Panel>
      ) : (
        <VerdictBanner
          gate={gate}
          runLabel={`${run.label} · ${formatDate(run.startedAt)}`}
        />
      )}

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'stages', label: 'Stages', count: stages.length },
          { id: 'findings', label: 'Findings', count: findings.length },
          ...(run.webScanId
            ? [{ id: 'pages', label: 'Pages', count: pages.length || undefined }]
            : []),
          { id: 'actions', label: 'Next actions', count: nextActions.length },
        ]}
      />

      {tab === 'stages' && (
        <Panel bodyClassName="py-4">
          <StagePipeline
            stages={stages}
            onRunStage={onRunStage}
            onOpenStage={() => navigate(`/projects/${id}/findings`)}
            busyStageId={busyStage}
            runningStageId={current?.id}
          />
        </Panel>
      )}

      {tab === 'findings' && (
        <FindingsList
          findings={findings}
          projectId={id}
          onStatusChange={project?.targets.codebasePath ? onStatus : undefined}
        />
      )}

      {tab === 'pages' &&
        (pages.length === 0 ? (
          <EmptyState title="No page data" hint="This run had no web scan." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Page</th>
                  <th className="px-5 py-3 font-medium">Template</th>
                  <th className="px-5 py-3 font-medium">Device</th>
                  <th className="px-5 py-3 text-right font-medium">Perf</th>
                  <th className="px-5 py-3 text-right font-medium">A11y</th>
                  <th className="px-5 py-3 text-right font-medium">SEO</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr
                    key={page.slug}
                    className="border-b border-line/60 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/projects/${id}/runs/${runId}/pages/${page.slug}`}
                        className="font-mono text-xs text-ink-soft hover:text-accent hover:underline"
                      >
                        {page.url}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{page.template}</td>
                    <td className="px-5 py-3 text-muted">{page.device}</td>
                    <Score value={page.scores.performance} />
                    <Score value={page.scores.accessibility} />
                    <Score value={page.scores.seo} />
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}

      {tab === 'actions' && (
        <Panel>
          {nextActions.length === 0 ? (
            <EmptyState title="No open actions" />
          ) : (
            <ol className="space-y-2">
              {nextActions.map((a) => (
                <li
                  key={a.findingId}
                  className="rounded-xl border border-line bg-white/[0.02] p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted">#{a.rank}</span>
                    <span className="text-sm font-medium text-ink">{a.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{a.recommendation}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  );
}

function Score({ value }: { value: number | null }) {
  const tone =
    value == null
      ? 'text-muted'
      : value >= 90
        ? 'text-emerald-300'
        : value >= 70
          ? 'text-amber-300'
          : 'text-rose-300';
  return (
    <td className={cn('px-5 py-3 text-right font-medium', tone)}>
      {value == null ? '-' : Math.round(value)}
    </td>
  );
}
