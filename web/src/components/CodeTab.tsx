import { useEffect, useState } from 'react';
import { getScanRelease } from '../lib/api';
import type { ReleaseResult } from '../lib/types';
import { AuditResults } from './AuditResults';
import { Card, Spinner } from './ui';

export function CodeTab({
  scanId,
  codebasePath,
}: {
  scanId: string;
  codebasePath: string;
}) {
  const [result, setResult] = useState<ReleaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopped = false;
    getScanRelease(scanId)
      .then((r) => {
        if (!stopped) setResult(r);
      })
      .catch((err) => {
        if (!stopped) {
          setError(err instanceof Error ? err.message : 'Failed to load code check.');
        }
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [scanId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Spinner /> Loading code check…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </Card>
    );
  }

  if (!result) return null;

  return <AuditResults result={result} codebasePath={codebasePath} />;
}
