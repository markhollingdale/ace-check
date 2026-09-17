import { useEffect, useRef, useState } from 'react';
import { cancelScan, getProgress } from '../lib/api';
import type { ProgressUpdate, ScanItemStatus } from '../lib/types';
import { Button, Card, Spinner } from './ui';

export function ProgressPanel({
  scanId,
  onDone,
}: {
  scanId: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const p = await getProgress(scanId);
        if (stopped) return;
        setProgress(p);
        if (['done', 'failed', 'cancelled'].includes(p.status)) {
          if (!doneRef.current) {
            doneRef.current = true;
            setTimeout(onDone, 400);
          }
          return;
        }
      } catch {
        /* ignore transient errors */
      }
      setTimeout(tick, 900);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [scanId, onDone]);

  const pct = progress && progress.total > 0
    ? Math.round((progress.scanned / progress.total) * 100)
    : 0;

  const finished = progress && ['done', 'failed', 'cancelled'].includes(progress.status);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!finished ? <Spinner /> : <span className="h-4 w-4" />}
          <h2 className="text-base font-semibold text-slate-900">
            {finished
              ? progress!.status === 'done'
                ? 'Scan complete'
                : progress!.status === 'cancelled'
                  ? 'Scan cancelled'
                  : 'Scan failed'
              : 'Scanning…'}
          </h2>
        </div>
        {!finished && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => cancelScan(scanId)}
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-slate-600">
            {progress?.scanned ?? 0} / {progress?.total ?? 0} pages
          </span>
          <span className="text-slate-500">
            {progress?.failed ? `${progress.failed} failed` : ''}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-500"
            style={{ width: `${finished ? 100 : pct}%` }}
          />
        </div>
      </div>

      {progress?.items && progress.items.length > 0 && (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
          <ul className="divide-y divide-slate-100">
            {progress.items.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2.5 px-3 py-1.5 text-sm"
              >
                <ItemStatus status={item.status} />
                <span
                  className={
                    item.kind === 'code'
                      ? 'truncate font-medium text-slate-700'
                      : item.status === 'pending'
                        ? 'truncate text-slate-500'
                        : 'truncate text-slate-700'
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress?.currentUrl && (
        <p className="mt-3 truncate font-mono text-xs text-slate-500">
          {progress.currentUrl}
        </p>
      )}
      {progress?.message && (
        <p className="mt-1 text-xs text-slate-500">{progress.message}</p>
      )}
    </Card>
  );
}

function ItemStatus({ status }: { status: ScanItemStatus }) {
  if (status === 'done') {
    return <span className="w-4 text-center text-emerald-500">✓</span>;
  }
  if (status === 'failed') {
    return <span className="w-4 text-center text-red-500">✕</span>;
  }
  if (status === 'running') {
    return <Spinner className="h-3.5 w-3.5" />;
  }
  return <span className="w-4 text-center text-slate-300">○</span>;
}
