import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getRun,
  getRunProgress,
  getRunPrompt,
  getPages,
  getProject,
  cancelRun,
  getStages,
  getRunTarget,
  type RunTarget,
  runStage as runStageApi,
  setFindingStatus,
} from '../lib/api';
import type {
  FindingStatus,
  PageSummary,
  Project,
  RunSnapshot,
  StageDef,
  StageId,
  StageProgress,
  StageState,
} from '../lib/types';
import { elapsedMs, formatClock, formatDate } from '../lib/format';
import { QUIPS } from '../lib/quips';
import { useNow } from '../lib/useNow';
import { Crumb, PageHeader } from '../components/Shell';
import { VerdictBanner } from '../components/Verdict';
import { StagePipeline, TaskList } from '../components/StagePipeline';
import { FindingsList } from '../components/FindingsList';
import {
  Button,
  Card,
  CopyButton,
  EmptyState,
  Panel,
  ProgressBar,
  Spinner,
  Tabs,
  cn,
  selectClass,
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
  const [stageDefs, setStageDefs] = useState<Record<string, StageDef>>({});
  const [quip, setQuip] = useState(
    () => QUIPS[Math.floor(Math.random() * QUIPS.length)],
  );
  const [target, setTarget] = useState<RunTarget | null>(null);
  const [aborting, setAborting] = useState(false);

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
    getStages()
      .then((defs) =>
        setStageDefs(Object.fromEntries(defs.map((d) => [d.id, d]))),
      )
      .catch(() => setStageDefs({}));
  }, [load]);

  const running = snapshot ? RUNNING.has(snapshot.run.status) : true;
  const now = useNow(running);

  // The reconnaissance artefact from the "Target & tools" stage.
  useEffect(() => {
    if (!snapshot) return;
    let stopped = false;
    getRunTarget(id, runId)
      .then((value) => {
        if (!stopped) setTarget(value);
      })
      .catch(() => {
        if (!stopped) setTarget(null);
      });
    return () => {
      stopped = true;
    };
  }, [snapshot, id, runId]);

  // Rotate a loading quip while a long stage works.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setQuip((current) => {
        let next = QUIPS[Math.floor(Math.random() * QUIPS.length)];
        if (QUIPS.length > 1) {
          while (next === current) {
            next = QUIPS[Math.floor(Math.random() * QUIPS.length)];
          }
        }
        return next;
      });
    }, 10_000);
    return () => clearInterval(timer);
  }, [running]);

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

  const onAbort = async () => {
    if (!confirm('Abort this run? Stages already completed are kept.')) return;
    setAborting(true);
    try {
      await cancelRun(id, runId);
    } catch {
      /* the run may have finished between click and request */
    } finally {
      setAborting(false);
    }
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
  const totalElapsed = elapsedMs(run.startedAt, run.finishedAt, now);

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
            {totalElapsed != null && (
              <span className="font-mono">
                {RUNNING.has(run.status) ? 'elapsed ' : 'took '}
                {formatClock(totalElapsed)}
              </span>
            )}
            <span className="capitalize">{run.status}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setTab('prompt')}>
              AI prompt
            </Button>
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
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted">
                {completed}/{stages.length} stages ·{' '}
                {formatClock(totalElapsed ?? 0)}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={onAbort}
                disabled={aborting}
              >
                {aborting ? 'Aborting...' : 'Abort run'}
              </Button>
            </div>
          }
        >
          <div className="mb-4">
            <ProgressBar value={pct} />
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
              {current ? current.label : 'Starting'}
              <span className="text-muted">·</span>
              <span className="truncate">
                {progress?.message || 'working...'}
              </span>
            </p>
            <p className="text-shimmer mt-2 text-xs font-medium">{quip}</p>
          </div>

          {current?.tasks && current.tasks.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
                <span>Work items</span>
                <span className="font-mono">
                  {current.tasks.filter((t) => t.status === 'done').length}/
                  {current.tasks.length} done
                </span>
              </div>
              <TaskList tasks={current.tasks} />
            </div>
          )}

          <p className="text-xs text-muted">
            Full stage detail is in the{' '}
            <button
              type="button"
              onClick={() => setTab('stages')}
              className="text-accent hover:underline cursor-pointer"
            >
              Stages
            </button>{' '}
            tab below.
          </p>
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
          { id: 'prompt', label: 'AI prompt' },
        ]}
      />

      {tab === 'stages' && (
        <>
          {target && <TargetSummary target={target} />}
          <Panel bodyClassName="py-4">
            <StagePipeline
              stages={stages}
              defs={stageDefs}
              onRunStage={onRunStage}
              onOpenStage={() => navigate(`/projects/${id}/findings`)}
              busyStageId={busyStage}
              runningStageId={current?.id}
              now={now}
            />
          </Panel>
        </>
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

      {tab === 'prompt' && (
        <RunPromptPanel projectId={id} runId={runId} stages={stages} />
      )}
    </div>
  );
}

/** What the "Target & tools" stage resolved for this run. */
function TargetSummary({ target }: { target: RunTarget }) {
  const scanners = target.scanners ?? [];
  return (
    <Card className="mb-3 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Target &amp; tools
        <span className="font-normal normal-case tracking-normal text-muted">
          recorded by the first stage
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div className="space-y-1">
          {target.productionUrl && (
            <Row label="Production" value={target.productionUrl} />
          )}
          {target.stagingUrl && <Row label="Staging" value={target.stagingUrl} />}
          {target.codebasePath && <Row label="Repo" value={target.codebasePath} />}
          {target.allowedHosts && target.allowedHosts.length > 0 && (
            <Row label="Allowlist" value={target.allowedHosts.join(', ')} />
          )}
        </div>
        <div className="space-y-1">
          {target.projectName && <Row label="Project" value={target.projectName} />}
          {target.stack && target.stack.length > 0 && (
            <Row label="Stack" value={target.stack.join(' · ')} />
          )}
          <div className="flex gap-2">
            <span className="w-20 shrink-0 text-muted">Scanners</span>
            <span className="flex flex-wrap gap-1">
              {scanners.length === 0 ? (
                <span className="text-muted">not probed</span>
              ) : (
                scanners.map((s) => (
                  <span
                    key={s.id}
                    title={s.version ?? undefined}
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 font-mono text-[10px]',
                      s.available
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-line bg-white/[0.03] text-muted',
                    )}
                  >
                    {s.label}
                  </span>
                ))
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-ink-soft" title={value}>
        {value}
      </span>
    </div>
  );
}

function RunPromptPanel({
  projectId,
  runId,
  stages,
}: {
  projectId: string;
  runId: string;
  stages: StageState[];
}) {
  const [scope, setScope] = useState('all');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    setBusy(true);
    setError(null);
    getRunPrompt(projectId, runId, scope === 'all' ? {} : { stage: scope as StageId })
      .then((text) => {
        if (!stopped) setPrompt(text);
      })
      .catch((err) => {
        if (!stopped) {
          setError(err instanceof Error ? err.message : 'Could not build prompt.');
        }
      })
      .finally(() => {
        if (!stopped) setBusy(false);
      });
    return () => {
      stopped = true;
    };
  }, [projectId, runId, scope]);

  const withFindings = stages.filter((s) => s.findings > 0);

  return (
    <Panel
      title="Full-run AI prompt"
      action={
        <div className="flex items-center gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={cn(
              selectClass,
              'rounded-lg bg-black/30 px-3 py-1.5 text-xs',
            )}
          >
            <option value="all">All findings</option>
            {withFindings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.findings})
              </option>
            ))}
          </select>
          <CopyButton text={prompt} label="Copy prompt" />
        </div>
      }
    >
      <p className="mb-3 text-xs text-muted">
        A single, evidence-rich brief covering every finding in scope - hand it to
        any coding agent. Each finding includes its blast radius, raw tool
        evidence and suggested direction.
      </p>
      {busy ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Spinner /> Building prompt...
        </div>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : (
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-4 text-[11px] leading-relaxed text-ink-soft">
          {prompt}
        </pre>
      )}
    </Panel>
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
