export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '-';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '-';
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(ms: number | undefined): string {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function scoreTone(score: number | null | undefined): string {
  if (score == null) return 'text-slate-500';
  if (score >= 90) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function scoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-slate-300';
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}
