import type { ProductionStatus, ReleaseGate } from '../lib/types';
import { cn } from './ui';

export const STATUS_META: Record<
  ProductionStatus,
  { label: string; tone: string; ring: string; dot: string; blurb: string }
> = {
  READY: {
    label: 'Ready',
    tone: 'text-emerald-300',
    ring: 'border-emerald-500/35 bg-emerald-500/10',
    dot: 'bg-emerald-400',
    blurb: 'No blocking findings in the audited scope.',
  },
  CONDITIONAL: {
    label: 'Conditional',
    tone: 'text-amber-300',
    ring: 'border-amber-500/35 bg-amber-500/10',
    dot: 'bg-amber-400',
    blurb: 'High-severity findings are open - review before shipping.',
  },
  NOT_READY: {
    label: 'Not ready',
    tone: 'text-rose-300',
    ring: 'border-rose-500/35 bg-rose-500/10',
    dot: 'bg-rose-400',
    blurb: 'Critical findings are open - do not ship.',
  },
  UNKNOWN: {
    label: 'Unknown',
    tone: 'text-slate-300',
    ring: 'border-slate-500/35 bg-slate-500/10',
    dot: 'bg-slate-400',
    blurb: 'Not enough data yet - run an audit.',
  },
};

export function StatusPill({ status }: { status: ProductionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        meta.ring,
        meta.tone,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

const VERDICT_TONE: Record<string, string> = {
  PASS: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  WARN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  FAIL: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function VerdictBanner({
  gate,
  projectName,
  runLabel,
  actions,
}: {
  gate: ReleaseGate;
  projectName?: string;
  runLabel?: string;
  actions?: React.ReactNode;
}) {
  const meta = STATUS_META[gate.status];
  const counts = gate.severityCounts;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6',
        meta.ring,
      )}
    >
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Production status
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className={cn('text-4xl font-black tracking-tight', meta.tone)}>
              {meta.label}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            {projectName ? <span className="text-ink">{projectName}</span> : null}
            {projectName && runLabel ? ' · ' : ''}
            {runLabel}
            {!projectName && !runLabel ? meta.blurb : ''}
          </p>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="flex gap-2">
            <Count label="Critical" value={counts.critical} tone="text-rose-300" />
            <Count label="High" value={counts.high} tone="text-orange-300" />
            <Count label="Medium" value={counts.medium} tone="text-amber-300" />
            <Count label="Low" value={counts.low} tone="text-sky-300" />
          </div>
          {actions}
        </div>
      </div>

      {gate.domains.length > 0 && (
        <div className="relative mt-5 flex flex-wrap gap-2">
          {gate.domains.map((d) => (
            <span
              key={d.domain}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs',
                VERDICT_TONE[d.verdict],
              )}
            >
              <span className="font-semibold tracking-wide">{d.domain}</span>
              <span className="opacity-70">
                C{d.critical} H{d.high} M{d.medium} L{d.low}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="glass min-w-[74px] rounded-xl px-3 py-2 text-center">
      <div className={cn('text-2xl font-bold leading-none', tone)}>{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
    </div>
  );
}
