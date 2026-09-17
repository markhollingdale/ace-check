import { Link } from 'react-router-dom';
import type { NextAction } from '../lib/types';
import { SeverityBadge, SourceTag, EmptyState } from './ui';

export function NextActions({
  actions,
  projectId,
}: {
  actions: NextAction[];
  projectId: string;
}) {
  if (actions.length === 0) {
    return (
      <EmptyState
        title="No open actions"
        hint="Every recorded finding is either resolved or informational."
      />
    );
  }
  return (
    <ol className="space-y-2">
      {actions.map((a) => (
        <li key={a.findingId}>
          <Link
            to={`/projects/${projectId}/findings/${encodeURIComponent(a.findingId)}`}
            className="group flex items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-3.5 transition-colors hover:border-line-strong hover:bg-white/[0.05]"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-xs font-bold text-muted">
              {a.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={a.severity} />
                <SourceTag source={a.source} />
                <span className="font-mono text-[11px] text-muted">
                  {a.findingId}
                </span>
                {a.effort && (
                  <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">
                    ~{a.effort}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-ink">{a.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                {a.recommendation}
              </p>
            </div>
            <span className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
