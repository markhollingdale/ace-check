import type { StageId, StageState } from '../lib/types';
import { SOURCE_LABELS } from '../lib/types';
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
  onRunStage,
  onOpenStage,
  busyStageId,
  runningStageId,
  currentStageId,
}: {
  stages: StageState[];
  onRunStage?: (id: StageId) => void;
  onOpenStage?: (id: StageId) => void;
  busyStageId?: StageId | null;
  runningStageId?: StageId | null;
  currentStageId?: StageId | null;
}) {
  return (
    <ol className="relative">
      <span
        className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-line-strong via-line to-transparent"
        aria-hidden
      />
      {stages.map((stage, i) => {
        const isRunning = runningStageId === stage.id || stage.status === 'running';
        return (
          <li key={stage.id} className="relative flex gap-4 pb-3 last:pb-0">
            <span
              className={cn(
                'z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-canvas text-xs font-bold',
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

            <div
              className={cn(
                'group flex flex-1 flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
                currentStageId === stage.id
                  ? 'border-accent/40 bg-accent-subtle/30'
                  : 'border-line bg-white/[0.02] hover:bg-white/[0.04]',
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {stage.label}
                  </span>
                  <span className="rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {SOURCE_LABELS[stage.source]}
                  </span>
                  {stage.findings > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[stage.status])} />
                      {stage.findings} finding{stage.findings === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {stage.error ? (
                    <span className="text-rose-300">{stage.error}</span>
                  ) : (
                    stage.message || defaultHint(stage)
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenStage(stage.id)}
                  >
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
                      ? 'Running…'
                      : stage.status === 'ready' || stage.status === 'blocked'
                        ? 'Run'
                        : 'Re-run'}
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function defaultHint(stage: StageState): string {
  switch (stage.status) {
    case 'blocked':
      return 'Complete the prerequisites to unlock this stage.';
    case 'ready':
      return 'Not run yet.';
    case 'passed':
      return 'No findings.';
    case 'findings':
      return 'Findings recorded.';
    default:
      return '';
  }
}
