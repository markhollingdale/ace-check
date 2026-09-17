import { useState } from 'react';
import type { StageDef, StageId, StageState, StageTask } from '../lib/types';
import { SOURCE_LABELS } from '../lib/types';
import { elapsedMs, formatClock } from '../lib/format';
import { Button, cn } from './ui';

const DOT: Record<string, string> = {
  blocked: 'bg-slate-500',
  ready: 'bg-slate-400',
  running: 'bg-indigo-400',
  passed: 'bg-emerald-400',
  findings: 'bg-amber-400',
  failed: 'bg-rose-400',
  skipped: 'bg-slate-600',
};

const RING: Record<string, string> = {
  blocked: 'border-slate-500/40 text-slate-400',
  ready: 'border-line text-muted',
  running: 'border-indigo-500/50 text-indigo-300',
  passed: 'border-emerald-500/50 text-emerald-300',
  findings: 'border-amber-500/50 text-amber-300',
  failed: 'border-rose-500/50 text-rose-300',
  skipped: 'border-slate-600/40 text-slate-500',
};

export function StagePipeline({
  stages,
  defs,
  onRunStage,
  onOpenStage,
  busyStageId,
  runningStageId,
  currentStageId,
  now,
  showOutput = true,
}: {
  stages: StageState[];
  defs?: Record<string, StageDef>;
  onRunStage?: (id: StageId) => void;
  onOpenStage?: (id: StageId) => void;
  busyStageId?: StageId | null;
  runningStageId?: StageId | null;
  currentStageId?: StageId | null;
  now?: number;
  showOutput?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(
    runningStageId ?? currentStageId ?? null,
  );

  const activeId = runningStageId ?? currentStageId ?? null;

  return (
    <ol className="relative space-y-2">
      {stages.map((stage, i) => {
        const def = defs?.[stage.id];
        const isRunning = runningStageId === stage.id || stage.status === 'running';
        const isOpen = expanded === stage.id || (activeId === stage.id && expanded === null);
        const duration = elapsedMs(stage.startedAt, stage.finishedAt, now);
        const live = isRunning && stage.startedAt;

        return (
          <li key={stage.id}>
            <div
              className={cn(
                'rounded-xl border transition-colors',
                currentStageId === stage.id || isRunning
                  ? 'border-accent/40 bg-accent-subtle/20'
                  : 'border-line bg-white/[0.02] hover:bg-white/[0.04]',
              )}
            >
              <div className="flex items-start gap-3 p-3.5">
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-canvas text-xs font-bold',
                    RING[stage.status],
                    isRunning && 'pulse-ring',
                  )}
                >
                  {isRunning ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300" />
                  ) : stage.status === 'passed' ? (
                    '✓'
                  ) : stage.status === 'findings' ? (
                    '!'
                  ) : stage.status === 'failed' ? (
                    '✕'
                  ) : (
                    i + 1
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(isOpen && activeId !== stage.id ? null : stage.id)
                      }
                      className="text-left text-sm font-semibold text-ink cursor-pointer hover:text-accent"
                    >
                      {stage.label}
                    </button>
                    <span className="rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {SOURCE_LABELS[stage.source]}
                    </span>
                    {(def?.tools ?? []).slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md border border-accent/25 bg-accent-subtle/40 px-1.5 py-0.5 text-[10px] font-medium text-accent"
                      >
                        {tool}
                      </span>
                    ))}
                    {stage.findings > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full', DOT[stage.status])}
                        />
                        {stage.findings} finding{stage.findings === 1 ? '' : 's'}
                      </span>
                    )}
                    {(duration != null || live) && (
                      <span className="ml-auto font-mono text-[11px] text-muted">
                        {live
                          ? `elapsed ${formatClock(duration ?? 0)}`
                          : duration != null
                            ? formatClock(duration)
                            : ''}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    {stage.error ? (
                      <span className="text-rose-300">{stage.error}</span>
                    ) : (
                      stage.message ||
                      (stage.status === 'blocked'
                        ? 'Complete the prerequisites to unlock this stage.'
                        : stage.status === 'ready'
                          ? 'Not run yet.'
                          : stage.status === 'passed'
                            ? 'No findings.'
                            : '')
                    )}
                  </p>

                  {stage.findings > 0 && (
                    <div className="mt-1.5 flex gap-2 text-[11px] text-muted">
                      {stage.severityCounts.critical > 0 && (
                        <span className="text-rose-300">
                          {stage.severityCounts.critical} critical
                        </span>
                      )}
                      {stage.severityCounts.high > 0 && (
                        <span className="text-orange-300">
                          {stage.severityCounts.high} high
                        </span>
                      )}
                      {stage.severityCounts.medium > 0 && (
                        <span className="text-amber-300">
                          {stage.severityCounts.medium} medium
                        </span>
                      )}
                      {stage.severityCounts.low > 0 && (
                        <span className="text-sky-300">
                          {stage.severityCounts.low} low
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {onOpenStage && stage.findings > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => onOpenStage(stage.id)}>
                      Open
                    </Button>
                  )}
                  {onRunStage && stage.id !== 'verdict' && (
                    <Button
                      variant={stage.status === 'ready' ? 'secondary' : 'ghost'}
                      size="sm"
                      disabled={stage.status === 'blocked' || busyStageId === stage.id}
                      onClick={() => onRunStage(stage.id)}
                    >
                      {busyStageId === stage.id || isRunning
                        ? 'Running...'
                        : stage.status === 'ready' || stage.status === 'blocked'
                          ? 'Run'
                          : 'Re-run'}
                    </Button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-line px-3.5 py-3">
                  {def?.description && (
                    <p className="text-xs leading-relaxed text-ink-soft">
                      {def.description}
                    </p>
                  )}

                  {def?.tools && def.tools.length > 0 && (
                    <Detail label="Tools">
                      <div className="flex flex-wrap gap-1.5">
                        {def.tools.map((tool) => (
                          <span
                            key={tool}
                            className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-[11px] text-ink-soft"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </Detail>
                  )}

                  {stage.startedAt && (
                    <Detail label="Timing">
                      <span className="font-mono text-[11px] text-muted">
                        started {new Date(stage.startedAt).toLocaleTimeString()}
                        {stage.finishedAt
                          ? ` · finished ${new Date(
                              stage.finishedAt,
                            ).toLocaleTimeString()} · total ${
                              formatClock(duration ?? 0)
                            }`
                          : ' · running'}
                      </span>
                    </Detail>
                  )}

                  {stage.tasks && stage.tasks.length > 0 && (
                    <Detail
                      label={`Work items (${
                        stage.tasks.filter((t) => t.status === 'done').length
                      }/${stage.tasks.length})`}
                    >
                      <TaskList tasks={stage.tasks} />
                    </Detail>
                  )}

                  {showOutput && def?.output && (
                    <Detail label="Results">
                      <span className="text-[11px] text-muted">{def.output}</span>
                    </Detail>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

export function TaskList({ tasks, className }: { tasks: StageTask[]; className?: string }) {
  return (
    <ul
      className={cn(
        'max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-line bg-black/20 p-2',
        className,
      )}
    >
      {tasks.map((task) => (
        <li
          key={task.key}
          className="flex items-center gap-2 px-1 py-0.5 font-mono text-[11px]"
        >
          <TaskGlyph status={task.status} />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              task.status === 'done'
                ? 'text-muted'
                : task.status === 'failed'
                  ? 'text-rose-300'
                  : task.status === 'running'
                    ? 'text-indigo-300'
                    : 'text-ink-soft',
            )}
          >
            {task.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TaskGlyph({ status }: { status: StageTask['status'] }) {
  if (status === 'done') return <span className="text-emerald-400">✓</span>;
  if (status === 'failed') return <span className="text-rose-400">✕</span>;
  if (status === 'running') {
    return (
      <span className="inline-block h-2.5 w-2.5 shrink-0 animate-spin rounded-full border border-indigo-300/40 border-t-indigo-300" />
    );
  }
  return <span className="text-slate-500">·</span>;
}
