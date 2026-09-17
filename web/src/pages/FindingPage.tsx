import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFindingPrompt, getProject, setFindingStatus } from '../lib/api';
import type { FindingStatus, ProjectSnapshot } from '../lib/types';
import { SOURCE_LABELS } from '../lib/types';
import { Crumb, PageHeader } from '../components/Shell';
import {
  Button,
  Card,
  CopyButton,
  EmptyState,
  Panel,
  SeverityBadge,
  SourceTag,
  Spinner,
  cn,
  selectClass,
} from '../components/ui';

const STATUSES: FindingStatus[] = [
  'detected',
  'confirmed',
  'accepted',
  'fixed',
  'verified',
];

export function FindingPage() {
  const { id = '', findingId = '' } = useParams();
  const decoded = decodeURIComponent(findingId);
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [promptBusy, setPromptBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      setSnapshot(await getProject(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load finding.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Ask the server for an evidence-rich prompt rather than assembling one here.
  useEffect(() => {
    if (!snapshot) return;
    const found = snapshot.findings.find((f) => f.id === decoded);
    if (!found) return;
    let stopped = false;
    setPromptBusy(true);
    getFindingPrompt(id, found.id)
      .then((text) => {
        if (!stopped) setPrompt(text);
      })
      .catch(() => {
        if (!stopped) setPrompt('');
      })
      .finally(() => {
        if (!stopped) setPromptBusy(false);
      });
    return () => {
      stopped = true;
    };
  }, [snapshot, id, decoded]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading finding…
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

  const finding = snapshot.findings.find((f) => f.id === decoded);

  if (!finding) {
    return (
      <EmptyState
        title="Finding not found"
        hint="It may have been resolved and dropped from the active set."
        action={
          <Link to={`/projects/${id}/findings`}>
            <Button>Back to findings</Button>
          </Link>
        }
      />
    );
  }

  const codebasePath = snapshot.project.targets.codebasePath;

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={snapshot.project.name} />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}/findings`} label="Findings" />
          </span>
        }
        title={finding.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <SourceTag source={finding.source} />
            <span className="font-mono text-xs text-muted">{finding.id}</span>
          </span>
        }
        actions={
          <>
            <CopyButton text={prompt} label="Copy AI prompt" disabled={!prompt} />
            {codebasePath && (
              <select
                value={finding.status}
                onChange={async (e) => {
                  await setFindingStatus(
                    codebasePath,
                    finding.id,
                    e.target.value as FindingStatus,
                  );
                  await load();
                }}
                className={cn(
                  selectClass,
                  'rounded-xl bg-black/40 px-3 py-2 text-sm capitalize',
                )}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Why it matters">
            <p className="text-sm leading-relaxed text-ink-soft">
              {finding.description || 'No additional detail recorded.'}
            </p>
          </Panel>

          <Panel title="Suggested fix">
            <p className="text-sm leading-relaxed text-ink-soft">
              {finding.recommendation ||
                'Investigate the evidence and remediate the underlying cause.'}
            </p>
          </Panel>

          {finding.context && finding.context.length > 0 && (
            <Panel title="Context">
              <dl className="space-y-2.5 text-sm">
                {finding.context.map((entry) => (
                  <div key={entry.label}>
                    <dt className="text-xs uppercase tracking-wide text-muted">
                      {entry.label}
                    </dt>
                    <dd className="mt-0.5 text-ink-soft">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}

          {finding.details && finding.details.length > 0 && (
            <Panel title="Raw tool evidence">
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-3.5 text-[11px] leading-relaxed text-ink-soft">
                {JSON.stringify(finding.details, null, 2)}
              </pre>
            </Panel>
          )}

          {(finding.affectedFiles && finding.affectedFiles.length > 0) ||
          (finding.affectedPages && finding.affectedPages.length > 0) ? (
            <Panel title="Blast radius">
              {finding.affectedFiles && finding.affectedFiles.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    Files
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {finding.affectedFiles.slice(0, 30).map((f) => (
                      <code
                        key={f}
                        className="rounded-md border border-line bg-black/30 px-1.5 py-0.5 text-[11px] text-ink-soft"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              {finding.affectedPages && finding.affectedPages.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    Pages
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {finding.affectedPages.slice(0, 30).map((u) => (
                      <code
                        key={u}
                        className="rounded-md border border-line bg-black/30 px-1.5 py-0.5 text-[11px] text-ink-soft"
                      >
                        {u}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel title="Evidence">
            <dl className="space-y-3 text-sm">
              <Row label="Proof" value={finding.evidence.proof} />
              <Row label="Confidence" value={finding.confidence} />
              {finding.evidence.file && (
                <Row
                  label="Location"
                  value={`${finding.evidence.file}${
                    finding.evidence.line ? `:${finding.evidence.line}` : ''
                  }`}
                  mono
                />
              )}
              {finding.evidence.url && (
                <Row label="URL" value={finding.evidence.url} mono />
              )}
              {finding.evidence.auditId && (
                <Row label="Audit" value={finding.evidence.auditId} mono />
              )}
              {finding.effort && <Row label="Est. effort" value={`~${finding.effort}`} />}
            </dl>
          </Panel>

          <Panel title="Classification">
            <dl className="space-y-3 text-sm">
              <Row label="Domain" value={finding.domain} />
              <Row label="Category" value={finding.category} />
              <Row label="Source" value={SOURCE_LABELS[finding.source]} />
              {finding.stage && <Row label="Stage" value={finding.stage} />}
              {finding.correlationKeys.length > 0 && (
                <Row
                  label="Correlates"
                  value={finding.correlationKeys.join(', ')}
                  mono
                />
              )}
            </dl>
          </Panel>

          <Panel
            title="AI prompt"
            action={<CopyButton text={prompt} label="Copy" />}
          >
            {promptBusy ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted">
                <Spinner /> Building prompt...
              </div>
            ) : (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-3.5 text-[11px] leading-relaxed text-ink-soft">
                {prompt || 'No prompt available for this finding.'}
              </pre>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-ink-soft ${
          mono ? 'font-mono text-xs' : ''
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}


