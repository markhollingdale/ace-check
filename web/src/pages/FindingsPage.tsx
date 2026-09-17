import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProject, setFindingStatus } from '../lib/api';
import type {
  FindingSource,
  FindingStatus,
  ProjectSnapshot,
  Severity,
} from '../lib/types';
import { SEVERITY_LABELS, SOURCE_LABELS } from '../lib/types';
import { Crumb, PageHeader } from '../components/Shell';
import { FindingsList } from '../components/FindingsList';
import { Card, Spinner, cn, selectClass } from '../components/ui';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};
const STATUS_ORDER = ['detected', 'confirmed', 'accepted', 'fixed', 'verified'];

export function FindingsPage() {
  const { id = '' } = useParams();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'all' | Severity>('all');
  const [source, setSource] = useState<'all' | FindingSource>('all');
  const [domain, setDomain] = useState('all');
  const [status, setStatus] = useState<'all' | FindingStatus>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setSnapshot(await getProject(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load findings.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onStatus = async (findingId: string, next: FindingStatus) => {
    const codebasePath = snapshot?.project.targets.codebasePath;
    if (!codebasePath) return;
    await setFindingStatus(codebasePath, findingId, next);
    await load();
  };

  const domains = useMemo(() => {
    const set = new Set(snapshot?.findings.map((f) => f.domain) ?? []);
    return ['all', ...[...set].sort()];
  }, [snapshot]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (snapshot?.findings ?? [])
      .filter((f) => severity === 'all' || f.severity === severity)
      .filter((f) => source === 'all' || f.source === source)
      .filter((f) => domain === 'all' || f.domain === domain)
      .filter((f) => status === 'all' || f.status === status)
      .filter(
        (f) =>
          !q ||
          f.title.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.evidence.file ?? '').toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
      );
  }, [snapshot, severity, source, domain, status, query]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading findings…
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error ?? 'Not found.'}
      </Card>
    );
  }

  return (
    <div className="animate-in space-y-5">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={snapshot.project.name} />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">Findings</span>
          </span>
        }
        title="Findings"
        description="Every finding from every stage - web, code, runtime and AI review - in one place."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, id, file…"
            className="min-w-[220px] flex-1 rounded-xl border border-line bg-black/30 px-3.5 py-2 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-accent/60"
          />
          <Filter
            value={severity}
            onChange={(v) => setSeverity(v as typeof severity)}
            options={[
              { value: 'all', label: 'All severities' },
              ...(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map(
                (s) => ({ value: s, label: SEVERITY_LABELS[s] }),
              ),
            ]}
          />
          <Filter
            value={source}
            onChange={(v) => setSource(v as typeof source)}
            options={[
              { value: 'all', label: 'All sources' },
              ...(['web', 'static', 'dynamic', 'review'] as FindingSource[]).map(
                (s) => ({ value: s, label: SOURCE_LABELS[s] }),
              ),
            ]}
          />
          <Filter
            value={domain}
            onChange={setDomain}
            options={domains.map((d) => ({
              value: d,
              label: d === 'all' ? 'All domains' : d,
            }))}
          />
          <Filter
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={[
              { value: 'all', label: 'All statuses' },
              ...STATUS_ORDER.map((s) => ({
                value: s,
                label: s[0].toUpperCase() + s.slice(1),
              })),
            ]}
          />
        </div>
      </Card>

      <div className="flex items-center justify-between px-1 text-xs text-muted">
        <span>
          {filtered.length} of {snapshot.findings.length} findings
        </span>
        {snapshot.run && <span>from run {snapshot.run.label}</span>}
      </div>

      <FindingsList
        findings={filtered}
        projectId={id}
        onStatusChange={snapshot.project.targets.codebasePath ? onStatus : undefined}
      />
    </div>
  );
}

function Filter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(selectClass, 'rounded-xl bg-black/30 px-3 py-2 text-sm')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
