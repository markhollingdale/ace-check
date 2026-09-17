import { useEffect, useMemo, useState } from 'react';
import {
  getReviewPrompt,
  getSuitePrompt,
  ingestReport,
  listProfiles,
  listReviewModules,
  runReview,
} from '../lib/api';
import type { AuditProfile, Finding, ReviewModule } from '../lib/types';
import {
  Button,
  Card,
  EmptyState,
  SeverityBadge,
  Spinner,
  cn,
} from './ui';

export function AiReviewsPanel({ codebasePath }: { codebasePath: string }) {
  const [profiles, setProfiles] = useState<AuditProfile[]>([]);
  const [profile, setProfile] = useState('web-app');
  const [modules, setModules] = useState<ReviewModule[]>([]);
  const [suitePrompt, setSuitePrompt] = useState<string | null>(null);
  const [busySuite, setBusySuite] = useState(false);
  const [copiedModule, setCopiedModule] = useState<number | null>(null);
  const [suiteCopied, setSuiteCopied] = useState(false);

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [runningModule, setRunningModule] = useState<number | null>(null);

  const [markdown, setMarkdown] = useState('');
  const [imported, setImported] = useState<Finding[] | null>(null);
  const [busyImport, setBusyImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  useEffect(() => {
    listReviewModules(profile || undefined)
      .then(setModules)
      .catch(() => setModules([]));
  }, [profile]);

  const copyModule = async (m: ReviewModule) => {
    setError(null);
    try {
      const prompt = await getReviewPrompt(codebasePath, m.number);
      await navigator.clipboard.writeText(prompt);
      setCopiedModule(m.number);
      setTimeout(() => setCopiedModule(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt.');
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

  const copySuite = async () => {
    if (!suitePrompt) return;
    await navigator.clipboard.writeText(suitePrompt);
    setSuiteCopied(true);
    setTimeout(() => setSuiteCopied(false), 1500);
  };

  const runModule = async (m: ReviewModule) => {
    setError(null);
    setRunningModule(m.number);
    setAiResponse(null);
    try {
      setAiResponse(await runReview(codebasePath, m.number));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run review.');
    } finally {
      setRunningModule(null);
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
    <div className="space-y-6">
      <Card className="border-accent-subtle bg-accent-subtle/30 p-4">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Optional deep-dive.</span> This runs
          16 AI engineering reviews against your code — separate from the scan
          on the main page. Copy a prompt into an AI agent (Claude, ChatGPT,
          etc.), paste the report back here, then re-run a scan with the same
          codebase to include its findings. Or set{' '}
          <code className="rounded bg-white px-1 py-0.5 text-xs">
            ACE_AI_API_KEY
          </code>{' '}
          to run them in-tool.
        </p>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              Generate review prompts
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Prompts embed auto-generated project context so an AI agent can
              start reviewing immediately.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label
                htmlFor="review-profile"
                className="mb-1 block text-xs font-medium text-slate-500"
              >
                Profile
              </label>
              <select
                id="review-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={generateSuite}
              disabled={busySuite || !codebasePath}
            >
              {busySuite ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-3.5 w-3.5" />
                  Generating…
                </span>
              ) : (
                'Full-suite prompt'
              )}
            </Button>
          </div>
        </div>

        {suitePrompt && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {suitePrompt.length.toLocaleString()} characters
              </span>
              <Button variant="secondary" size="sm" onClick={copySuite}>
                {suiteCopied ? 'Copied!' : 'Copy to clipboard'}
              </Button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {suitePrompt}
            </pre>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div
              key={m.number}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3.5 transition-all hover:border-accent hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                  {m.prefix}
                </span>
                {m.consumesWebScan && (
                  <span className="rounded-md bg-accent-subtle px-1.5 py-0.5 text-[11px] font-medium text-accent">
                    + web
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-800">
                {m.title}
              </span>
              <div className="mt-auto flex items-center gap-1.5">
                <button
                  onClick={() => copyModule(m)}
                  disabled={!codebasePath}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {copiedModule === m.number ? 'Copied!' : 'Copy prompt'}
                </button>
                <button
                  onClick={() => runModule(m)}
                  disabled={!codebasePath || runningModule != null}
                  className="rounded-md border border-accent-subtle px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-subtle disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {runningModule === m.number ? 'Running…' : 'Run'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {aiResponse && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                AI review result — paste into "Import a review report" to ingest.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(aiResponse);
                }}
              >
                Copy
              </Button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {aiResponse}
            </pre>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-700">
          Import a review report
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Paste a completed review report (Markdown) to ingest its findings into
          the unified finding store.
        </p>

        <div className="mt-4">
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={8}
            placeholder={'## SEC-001\n\n## Severity\n\nHigh\n\n## Problem\n\n…'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="mt-3">
            <Button onClick={doImport} disabled={busyImport || !markdown.trim()}>
              {busyImport ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-3.5 w-3.5 border-white/40 border-t-white" />
                  Importing…
                </span>
              ) : (
                'Import report'
              )}
            </Button>
          </div>
        </div>

        {imported && (
          <div className="mt-6">
            <p className="mb-3 text-sm text-slate-500">
              Ingested{' '}
              <span className="font-semibold text-slate-800">
                {imported.length}
              </span>{' '}
              finding{imported.length === 1 ? '' : 's'}.
            </p>
            {imported.length === 0 ? (
              <EmptyState title="No findings parsed." hint="Check the report format." />
            ) : (
              <div className="space-y-4">
                {grouped.map((g) => (
                  <div key={g.domain}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {g.domain}
                    </h3>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {g.findings.map((f) => (
                        <ReviewFindingRow key={f.id} finding={f} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function ReviewFindingRow({ finding }: { finding: Finding }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-500">
          {finding.id}
        </span>
        <SeverityBadge severity={finding.severity} />
        {finding.effort && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {finding.effort}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-800">
        {finding.title}
      </p>
      <p className="mt-1 text-sm text-slate-500">{finding.description}</p>
      {finding.recommendation && (
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-600">Fix:</span>{' '}
          {finding.recommendation}
        </p>
      )}
      {finding.affectedFiles && finding.affectedFiles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {finding.affectedFiles.slice(0, 5).map((file) => (
            <code
              key={file}
              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
            >
              {file}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
