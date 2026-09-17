import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPage, getPagePrompt } from '../lib/api';
import type { PageSummary } from '../lib/types';
import { CATEGORY_LABELS, DEVICE_LABELS } from '../lib/types';
import { formatBytes, formatMs, scoreTone } from '../lib/format';
import { lighthouseHtmlUrl, lighthouseJsonUrl } from '../lib/api';
import { Button, Card, Spinner } from '../components/ui';

export function PageDetailPage() {
  const { id = '', slug = '' } = useParams();
  const [page, setPage] = useState<PageSummary | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPage(id, slug).then(setPage);
  }, [id, slug]);

  if (!page) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading page…
      </div>
    );
  }

  const generate = async () => {
    setLoading(true);
    try {
      setPrompt(await getPagePrompt(id, slug));
    } finally {
      setLoading(false);
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
        <Link to={`/scan/${id}?tab=pages`} className="text-sm text-slate-500 hover:underline">
          ← Back to pages
        </Link>
      </div>

      <Card className="p-6">
        <h1 className="break-all font-mono text-lg font-bold text-slate-900">
          {page.url}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Device: <span className="font-medium">{DEVICE_LABELS[page.device]}</span>{' '}
          · Likely template: <span className="font-medium">{page.template}</span>
        </p>
        {page.status === 'failed' && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {page.error || 'Scan failed for this page.'}
          </p>
        )}
      </Card>

      {page.status === 'ok' && (
        <>
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ['performance', 'Performance'],
                  ['accessibility', 'Accessibility'],
                  ['best-practices', 'Best Practices'],
                  ['seo', 'SEO'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className={`text-2xl font-bold ${scoreTone(page.scores[key])}`}>
                    {page.scores[key] ?? '—'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <Metric label="LCP" value={formatMs(page.metrics.lcp)} />
              <Metric label="CLS" value={page.metrics.cls != null ? String(page.metrics.cls) : '—'} />
              <Metric label="TBT" value={formatMs(page.metrics.tbt)} />
              <Metric label="FCP" value={formatMs(page.metrics.fcp)} />
              <Metric label="Speed Index" value={formatMs(page.metrics.speedIndex)} />
              <Metric label="Page weight" value={formatBytes(page.metrics.totalByteWeight)} />
              <Metric label="Requests" value={page.metrics.requestCount != null ? String(page.metrics.requestCount) : '—'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.hasHtmlReport && (
                <a
                  href={lighthouseHtmlUrl(id, slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open Lighthouse HTML report
                </a>
              )}
              {page.hasLighthouseJson && (
                <a
                  href={lighthouseJsonUrl(id, slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View raw JSON
                </a>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700">
              Issues on this page
            </h2>
            {page.issues.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">
                No automated issues detected.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100">
                {page.issues.map((issue) => (
                  <Link
                    key={issue.auditId}
                    to={`/scan/${id}/issue/${issue.auditId}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {issue.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {CATEGORY_LABELS[issue.category]}
                        {issue.displayValue ? ` · ${issue.displayValue}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Page investigation prompt
          </h2>
          <Button onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Page Prompt'}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
