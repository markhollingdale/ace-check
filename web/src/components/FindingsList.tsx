import { Link } from 'react-router-dom';
import type { Finding, FindingStatus } from '../lib/types';
import { SeverityBadge, SourceTag, EmptyState, cn } from './ui';

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: 'detected', label: 'Detected' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'verified', label: 'Verified' },
];

export function FindingsList({
  findings,
  projectId,
  onStatusChange,
  emptyHint,
}: {
  findings: Finding[];
  projectId: string;
  onStatusChange?: (id: string, status: FindingStatus) => void;
  emptyHint?: string;
}) {
  if (findings.length === 0) {
    return (
      <EmptyState
        title="No findings here"
        hint={emptyHint ?? 'Nothing matched the current filters.'}
      />
    );
  }

  return (
    <div className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-white/[0.015]">
      {findings.map((f) => (
        <div
          key={f.id}
          className="group flex flex-wrap items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={f.severity} />
              <SourceTag source={f.source} />
              <Link
                to={`/projects/${projectId}/findings/${encodeURIComponent(f.id)}`}
                className="font-mono text-[11px] text-muted hover:text-accent hover:underline"
              >
                {f.id}
              </Link>
              {f.confidence === 'Low' && (
                <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">
                  low confidence
                </span>
              )}
            </div>
            <Link
              to={`/projects/${projectId}/findings/${encodeURIComponent(f.id)}`}
              className="mt-1 block text-sm font-medium text-ink transition-colors hover:text-accent"
            >
              {f.title}
            </Link>
            {f.evidence.file && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                {f.evidence.file}
                {f.evidence.line ? `:${f.evidence.line}` : ''}
              </p>
            )}
            {f.evidence.url && !f.evidence.file && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                {f.evidence.url}
              </p>
            )}
          </div>

          {onStatusChange ? (
            <select
              value={f.status}
              onChange={(e) =>
                onStatusChange(f.id, e.target.value as FindingStatus)
              }
              className={cn(
                'shrink-0 rounded-lg border border-line bg-black/40 px-2 py-1.5 text-xs text-ink-soft outline-none focus:border-accent/60',
                f.status === 'fixed' || f.status === 'verified'
                  ? 'text-emerald-300'
                  : undefined,
              )}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="shrink-0 rounded-lg border border-line px-2 py-1 text-[11px] capitalize text-muted">
              {f.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
