import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getProject,
  getReviewPrompt,
  getSuitePrompt,
  ingestReport,
  listProfiles,
  listReviewModules,
  runReview,
} from '../lib/api';
import type {
  AuditProfile,
  Finding,
  ProjectSnapshot,
  ReviewModule,
} from '../lib/types';
import { Crumb, PageHeader } from '../components/Shell';
import {
  Button,
  Card,
  CopyButton,
  EmptyState,
  Panel,
  SeverityBadge,
  Spinner,
} from '../components/ui';

export function ReviewPage() {
  const { id = '' } = useParams();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [profiles, setProfiles] = useState<AuditProfile[]>([]);
  const [profile, setProfile] = useState('web-app');
  const [modules, setModules] = useState<ReviewModule[]>([]);
  const [suitePrompt, setSuitePrompt] = useState<string | null>(null);
  const [busySuite, setBusySuite] = useState(false);
  const [promptFor, setPromptFor] = useState<number | null>(null);
  const [activePrompt, setActivePrompt] = useState<{ n: number; text: string } | null>(
    null,
  );
  const [running, setRunning] = useState<number | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [imported, setImported] = useState<Finding[] | null>(null);
  const [busyImport, setBusyImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codebasePath = snapshot?.project.targets.codebasePath ?? '';

  useEffect(() => {
    getProject(id).then(setSnapshot).catch(() => undefined);
    listProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, [id]);

  useEffect(() => {
    listReviewModules(profile || undefined)
      .then(setModules)
      .catch(() => setModules([]));
  }, [profile]);

  const copyModule = async (m: ReviewModule) => {
    setError(null);
    setPromptFor(m.number);
    try {
      const prompt = await getReviewPrompt(codebasePath, m.number);
      setActivePrompt({ n: m.number, text: prompt });
      await navigator.clipboard.writeText(prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt.');
    } finally {
      setPromptFor(null);
    }
  };

  const generateSuite = async () => {
    setError(null);
    setBusySuite(true);
    setSuitePrompt(null);
    try {
      setSuitePrompt(await getSuitePrompt(codebasePath, profile || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt.');
    } finally {
      setBusySuite(false);
    }
  };

  const runModule = async (m: ReviewModule) => {
    setError(null);
    setRunning(m.number);
    try {
      const response = await runReview(codebasePath, m.number);
      setActivePrompt({ n: m.number, text: response });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run review.');
    } finally {
      setRunning(null);
    }
  };

  const doImport = async () => {
    if (!markdown.trim()) return;
    setBusyImport(true);
    setError(null);
    try {
      setImported(await ingestReport(markdown.trim(), codebasePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import report.');
    } finally {
      setBusyImport(false);
    }
  };

  const grouped = useMemo(() => {
    const map: Record<string, Finding[]> = {};
    const order: string[] = [];
    for (const f of imported ?? []) {
      if (!map[f.domain]) {
        map[f.domain] = [];
        order.push(f.domain);
      }
      map[f.domain].push(f);
    }
    return order.map((domain) => ({ domain, findings: map[domain] }));
  }, [imported]);

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={snapshot?.project.name ?? id} />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">Deep review</span>
          </span>
        }
        title="AI review workspace"
        description="Generate prompts for 16 engineering reviews, run them in any agent (or in-tool), then ingest the reports into the unified finding store."
      />

      {!codebasePath && (
        <Card className="border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Set a codebase path in Settings to use the review workspace.
        </Card>
      )}

      {error && (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </Card>
      )}

      <Panel
        title="Generate review prompts"
        action={
          <div className="flex items-end gap-2">
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="rounded-lg border border-line bg-black/30 px-3 py-2 text-sm text-ink-soft outline-none focus:border-accent/60"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={generateSuite}
              disabled={busySuite || !codebasePath}
            >
              {busySuite ? 'Generating…' : 'Full-suite prompt'}
            </Button>
          </div>
        }
      >
        {suitePrompt && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted">
                {suitePrompt.length.toLocaleString()} characters
              </span>
              <CopyButton text={suitePrompt} label="Copy to clipboard" />
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-3.5 text-xs leading-relaxed text-ink-soft">
              {suitePrompt}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div
              key={m.number}
              className="flex flex-col gap-2 rounded-xl border border-line bg-white/[0.02] p-3.5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-gradient-to-br from-indigo-400 to-indigo-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                  {m.prefix}
                </span>
                {m.consumesWebScan && (
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                    + web
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-ink-soft">{m.title}</span>
              <div className="mt-auto flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyModule(m)}
                  disabled={!codebasePath}
                >
                  {promptFor === m.number ? 'Generating…' : 'Copy prompt'}
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => runModule(m)}
                  disabled={!codebasePath || running != null}
                >
                  {running === m.number ? '…' : 'Run'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {activePrompt && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Module output - paste into "Import a review report" to ingest
              </span>
              <CopyButton text={activePrompt.text} label="Copy" />
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-3.5 text-xs leading-relaxed text-ink-soft">
              {activePrompt.text}
            </pre>
          </div>
        )}
      </Panel>

      <Panel title="Import a review report">
        <p className="mb-3 text-xs text-muted">
          Paste a completed review report (Markdown) to ingest its findings.
        </p>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={8}
          placeholder={'## SEC-001\n\n## Severity\n\nHigh\n\n## Problem\n\n…'}
          className="w-full rounded-xl border border-line bg-black/30 px-3.5 py-2.5 font-mono text-xs text-ink outline-none transition focus:border-accent/60"
        />
        <div className="mt-3">
          <Button onClick={doImport} disabled={busyImport || !markdown.trim()}>
            {busyImport ? 'Importing…' : 'Import report'}
          </Button>
        </div>

        {imported && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-muted">
              Ingested <span className="font-semibold text-ink">{imported.length}</span>{' '}
              finding{imported.length === 1 ? '' : 's'}. Re-run the Review stage to
              fold them into the gate.
            </p>
            {imported.length === 0 ? (
              <EmptyState title="No findings parsed" hint="Check the report format." />
            ) : (
              <div className="space-y-4">
                {grouped.map((g) => (
                  <div key={g.domain}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {g.domain}
                    </h3>
                    <div className="divide-y divide-line/70 rounded-xl border border-line">
                      {g.findings.map((f) => (
                        <div key={f.id} className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-muted">
                              {f.id}
                            </span>
                            <SeverityBadge severity={f.severity} />
                            {f.effort && (
                              <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                                ~{f.effort}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-ink">
                            {f.title}
                          </p>
                          <p className="mt-1 text-sm text-muted">{f.description}</p>
                          {f.recommendation && (
                            <p className="mt-1 text-sm text-muted">
                              <span className="font-medium text-ink-soft">Fix:</span>{' '}
                              {f.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
