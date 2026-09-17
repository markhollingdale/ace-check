import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getIssuePrompt, getIssues, getScan } from '../lib/api';
import type { Issue, ScanMetadata } from '../lib/types';
import { CATEGORY_LABELS, DEVICE_LABELS } from '../lib/types';
import { formatBytes } from '../lib/format';
import { Button, Card, SeverityBadge, Spinner } from '../components/ui';

export function IssuePage() {
  const { id = '', issueId = '' } = useParams();
  const [metadata, setMetadata] = useState<ScanMetadata | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([getScan(id), getIssues(id)]).then(([detail, issues]) => {
      setMetadata(detail.metadata);
      setIssue(issues.find((i) => i.id === issueId) ?? null);
    });
  }, [id, issueId]);

  if (!issue) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading issue…
      </div>
    );
  }

  const generate = async () => {
    setPromptLoading(true);
    setPrompt(null);
    try {
      setPrompt(await getIssuePrompt(id, issue.id));
    } finally {
      setPromptLoading(false);
    }
  };

  const copy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/scan/${id}?tab=issues`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Back to issues
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {issue.title}
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {issue.id} · {CATEGORY_LABELS[issue.category]}
              {issue.devices &&
                issue.devices.length > 0 &&
                ` · ${issue.devices.map((d) => DEVICE_LABELS[d]).join(' + ')}`}
            </p>
          </div>
          <SeverityBadge severity={issue.severity} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Affected pages"
            value={`${issue.count} / ${issue.totalPages}`}
          />
          <Stat
            label="Estimated avg saving"
            value={
              issue.avgNumericValue != null
                ? formatBytes(issue.avgNumericValue)
                : '—'
            }
          />
          <Stat
            label="Estimated max saving"
            value={
              issue.maxNumericValue != null
                ? formatBytes(issue.maxNumericValue)
                : '—'
            }
          />
          <Stat
            label="Affected page types"
            value={
              issue.affectedTemplates.length > 0
                ? issue.affectedTemplates
                    .slice(0, 3)
                    .map((t) => t.template)
                    .join(', ')
                : '—'
            }
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-700">Description</h2>
        <p className="mt-2 text-sm text-slate-600">{issue.description}</p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Likely common cause
          </h3>
          <p className="mt-1 text-sm text-slate-700">{issue.likelyCommonCause}</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-700">
          Representative pages
        </h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {issue.representativeUrls.map((url) => {
            const page = url;
            return (
              <li key={url} className="flex items-center justify-between py-2">
                <span className="truncate font-mono text-xs text-slate-600">
                  {page}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {issue.examples.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-700">
            Lighthouse evidence
          </h2>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            {JSON.stringify(issue.examples.slice(0, 10), null, 2)}
          </pre>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            AI investigation prompt
          </h2>
          <Button onClick={generate} disabled={promptLoading}>
            {promptLoading ? 'Generating…' : 'Generate Investigation Prompt'}
          </Button>
        </div>
        {prompt && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {prompt.length.toLocaleString()} characters
              </span>
              <Button variant="secondary" size="sm" onClick={copy}>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {prompt}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
