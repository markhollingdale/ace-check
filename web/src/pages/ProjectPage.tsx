import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  deleteRuns,
  getProject,
  getStages,
  runStage as runStageApi,
  startRun,
  listRuns,
} from '../lib/api';
import type {
  ProjectSnapshot,
  RunListItem,
  StageDef,
  StageId,
} from '../lib/types';
import { formatBytes, formatDate, formatDuration } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Crumb, PageHeader } from '../components/Shell';
import { VerdictBanner } from '../components/Verdict';
import { StagePipeline } from '../components/StagePipeline';
import { NextActions } from '../components/NextActions';
import {
  Button,
  Card,
  Panel,
  Spinner,
  EmptyState,
  Tabs,
  cn,
} from '../components/ui';

export function ProjectPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStage, setBusyStage] = useState<StageId | null>(null);
  const [starting, setStarting] = useState(false);
  const [tab, setTab] = useState('pipeline');
  const [stageDefs, setStageDefs] = useState<Record<string, StageDef>>({});

  const load = useCallback(async () => {
    try {
      const [snap, runList] = await Promise.all([getProject(id), listRuns(id)]);
      setSnapshot(snap);
      setRuns(runList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load project.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
    getStages()
      .then((defs) =>
        setStageDefs(Object.fromEntries(defs.map((d) => [d.id, d]))),
      )
      .catch(() => setStageDefs({}));
  }, [load]);

  const anyRunning =
    snapshot?.run?.status === 'running' || runs.some((r) => r.status === 'running');

  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, [anyRunning, load]);

  const now = useNow(anyRunning);

  const toggleOne = (runId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  const deletableIds = runs
    .filter((r) => r.status !== 'running')
    .map((r) => r.id);
  const allSelected =
    deletableIds.length > 0 && selected.size === deletableIds.length;
  const selectedRunning = runs.some(
    (r) => selected.has(r.id) && r.status === 'running',
  );

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(deletableIds));
  };

  const removeRuns = async (runIds: string[], describe: string) => {
    if (runIds.length === 0) return;
    if (
      !confirm(
        `Delete ${describe}? This removes the run and its stored Lighthouse data. It cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteRuns(id, runIds);
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete runs.');
    } finally {
      setDeleting(false);
    }
  };

  const onDeleteSelected = () =>
    removeRuns([...selected], `${selected.size} run${selected.size === 1 ? '' : 's'}`);

  const onDeleteOne = (runId: string, label: string) =>
    removeRuns([runId], `the "${label}" run`);

  const onRunAudit = async () => {
    if (!snapshot) return;
    setStarting(true);
    try {
      const run = await startRun(snapshot.project.id, {
        profileId: snapshot.project.profileId,
      });
      navigate(`/projects/${snapshot.project.id}/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start run.');
    } finally {
      setStarting(false);
    }
  };

  const onRunStage = async (stageId: StageId) => {
    if (!snapshot) return;
    setBusyStage(stageId);
    try {
      const latest = snapshot.run;
      if (latest && latest.status !== 'running') {
        await runStageApi(snapshot.project.id, latest.id, stageId);
        await load();
      } else {
        const run = await startRun(snapshot.project.id, { stages: [stageId] });
        navigate(`/projects/${snapshot.project.id}/runs/${run.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run stage.');
    } finally {
      setBusyStage(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading project…
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error ?? 'Project not found.'}
      </Card>
    );
  }

  const { project, run, stages, findings, gate, nextActions } = snapshot;
  const p = project.targets.productionUrl;
  const s = project.targets.stagingUrl;
  const repo = project.targets.codebasePath;

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">{project.name}</span>
          </span>
        }
        title={project.name}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            {p && <span className="text-muted">site {strip(p)}</span>}
            {s && <span className="text-muted">staging {strip(s)}</span>}
            {repo && <span className="text-muted">repo {repo}</span>}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${project.id}/settings`)}
            >
              Settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${project.id}/report`)}
              disabled={!run}
            >
              Release report
            </Button>
            <Button onClick={onRunAudit} disabled={starting || anyRunning}>
              {starting || anyRunning ? 'Running…' : '▶ Run audit'}
            </Button>
          </>
        }
      />

      {gate ? (
        <VerdictBanner
          gate={gate}
          projectName={run?.label}
          runLabel={run ? formatDate(run.startedAt) : undefined}
        />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-sm font-semibold text-ink">No runs yet</div>
            <p className="mt-0.5 text-sm text-muted">
              Start with the {project.profileId} profile - you can re-run
              individual stages afterwards.
            </p>
          </div>
          <Button onClick={onRunAudit} disabled={starting}>
            ▶ Run first audit
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'pipeline', label: 'Stages' },
              { id: 'runs', label: 'Runs', count: runs.length },
            ]}
          />

          {tab === 'pipeline' && (
            <Panel
              title="Stage progression"
              action={
                <span className="text-xs text-muted">
                  {run ? `run ${run.label} · ${run.status}` : 'no run yet'}
                </span>
              }
              bodyClassName="py-4"
            >
              <StagePipeline
                stages={stages}
                defs={stageDefs}
                onRunStage={onRunStage}
                onOpenStage={() =>
                  navigate(`/projects/${project.id}/findings`)
                }
                busyStageId={busyStage}
                currentStageId={run?.stages.find((x) => x.status === 'running')?.id}
                now={now}
                runActive={anyRunning}
              />
            </Panel>
          )}

          {tab === 'runs' &&
            (runs.length === 0 ? (
              <EmptyState title="No runs yet" hint="Run an audit to get started." />
            ) : (
              <Card className="overflow-hidden">
                {selected.size > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white/[0.03] px-5 py-2.5">
                    <span className="text-xs text-muted">
                      {selected.size} selected ·{' '}
                      {formatBytes(
                        runs
                          .filter((r) => selected.has(r.id))
                          .reduce((n, r) => n + r.bytes, 0),
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedRunning && (
                        <span className="text-xs text-amber-300">
                          running runs are skipped
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelected(new Set())}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={onDeleteSelected}
                        disabled={deleting}
                      >
                        {deleting
                          ? 'Deleting...'
                          : `Delete ${selected.size} run${
                              selected.size === 1 ? '' : 's'
                            }`}
                      </Button>
                    </div>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="w-10 px-5 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all runs"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate =
                                selected.size > 0 && !allSelected;
                            }
                          }}
                          onChange={toggleAll}
                          className="h-4 w-4 accent-emerald-500"
                        />
                      </th>
                      <th className="px-5 py-3 font-medium">Run</th>
                      <th className="px-5 py-3 font-medium">Started</th>
                      <th className="px-5 py-3 font-medium">Duration</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Findings</th>
                      <th className="px-5 py-3 text-right font-medium">Size</th>
                      <th className="px-5 py-3 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => {
                      const isRunning = r.status === 'running';
                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            'border-b border-line/60 last:border-0 hover:bg-white/[0.03]',
                            selected.has(r.id) && 'bg-white/[0.03]',
                          )}
                        >
                          <td className="px-5 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Select run ${r.label}`}
                              checked={selected.has(r.id)}
                              disabled={isRunning}
                              onChange={() => toggleOne(r.id)}
                              className="h-4 w-4 accent-emerald-500 disabled:opacity-30"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <Link
                              to={`/projects/${project.id}/runs/${r.id}`}
                              className="font-medium text-ink-soft hover:text-accent hover:underline"
                            >
                              {r.label}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-muted">
                            {formatDate(r.startedAt)}
                          </td>
                          <td className="px-5 py-3 text-muted">
                            {formatDuration(r.durationMs)}
                          </td>
                          <td className="px-5 py-3">
                            <RunStatusPill status={r.status} />
                          </td>
                          <td className="px-5 py-3 text-right text-muted">
                            {r.stages.reduce((n, x) => n + x.findings, 0)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-muted">
                            {formatBytes(r.bytes)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isRunning || deleting}
                              onClick={() => onDeleteOne(r.id, r.label)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            ))}
        </div>

        <div className="space-y-4">
          <Panel
            title="Next actions"
            action={
              <span className="text-xs text-muted">
                {findings.length} open finding{findings.length === 1 ? '' : 's'}
              </span>
            }
          >
            <NextActions actions={nextActions} projectId={project.id} />
          </Panel>

          <Panel title="Toolchain">
            <div className="space-y-2">
              <Link
                to="/tools"
                className="flex items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-white/[0.05]"
              >
                Scanner status
                <span className="text-muted">→</span>
              </Link>
              <Link
                to={`/projects/${project.id}/reviews`}
                className="flex items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-white/[0.05]"
              >
                AI review workspace
                <span className="text-muted">→</span>
              </Link>
              <Link
                to={`/projects/${project.id}/compare`}
                className="flex items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-white/[0.05]"
              >
                Compare runs
                <span className="text-muted">→</span>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function strip(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

function RunStatusPill({ status }: { status: string }) {
  const tone =
    status === 'done'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : status === 'running'
        ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
        : status === 'failed'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          : 'border-line bg-white/[0.04] text-muted';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {status}
    </span>
  );
}
