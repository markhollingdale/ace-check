import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllIssuesPrompt } from '../lib/api';
import type { Category, Issue, Severity } from '../lib/types';
import { CATEGORY_LABELS, DEVICE_LABELS, SEVERITY_LABELS } from '../lib/types';
import { formatBytes } from '../lib/format';
import { Button, Card, EmptyState, SeverityBadge } from './ui';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const CATEGORIES: Category[] = ['performance', 'accessibility', 'best-practices', 'seo'];

export function IssuesTab({
  scanId,
  issues,
}: {
  scanId: string;
  issues: Issue[];
}) {
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateAll = async () => {
    setPromptLoading(true);
    setPrompt(null);
    try {
      setPrompt(await getAllIssuesPrompt(scanId));
    } catch (err) {
      setPrompt(`Error: ${err instanceof Error ? err.message : String(err)}`);
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

  const download = () => {
    if (!prompt) return;
    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scanId}-investigation-prompt.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (severity !== 'all' && i.severity !== severity) return false;
      if (category !== 'all' && i.category !== category) return false;
      if (query && !i.title.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [issues, severity, category, query]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Investigate all issues
            </h3>
            <p className="text-xs text-slate-500">
              Generate one investigation prompt covering every issue in this
              scan.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={generateAll}
            disabled={promptLoading || issues.length === 0}
          >
            {promptLoading ? 'Generating…' : 'Generate investigation prompt'}
          </Button>
        </div>
        {prompt && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {prompt.length.toLocaleString()} characters
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="secondary" size="sm" onClick={download}>
                  Save Markdown
                </Button>
              </div>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {prompt}
            </pre>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Severity | 'all')}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        >
          <option value="all">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'all')}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title…"
          className="w-56 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        />
        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} issue{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No issues match your filters" />
      ) : (
        <div className="space-y-2">
          {filtered.map((issue) => (
            <Link
              key={issue.id}
              to={`/scan/${scanId}/issue/${issue.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {issue.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {issue.id} · {CATEGORY_LABELS[issue.category]}
                    {issue.devices &&
                      issue.devices.length > 0 &&
                      issue.devices.length < 2 &&
                      ` · ${DEVICE_LABELS[issue.devices[0]]}`}
                  </p>
                </div>
                <SeverityBadge severity={issue.severity} />
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>
                  <strong className="font-semibold text-slate-700">
                    {issue.count}
                  </strong>{' '}
                  / {issue.totalPages} pages
                </span>
                {issue.devices && issue.devices.length === 2 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    Mobile + Desktop
                  </span>
                )}
                {issue.avgNumericValue != null && (
                  <span>
                    avg impact{' '}
                    <strong className="font-semibold text-slate-700">
                      {issue.category === 'performance'
                        ? formatBytes(issue.avgNumericValue)
                        : issue.displayValue || String(Math.round(issue.avgNumericValue))}
                    </strong>
                  </span>
                )}
                {issue.affectedTemplates.length > 0 && (
                  <span className="truncate">
                    {issue.affectedTemplates
                      .slice(0, 3)
                      .map((t) => t.template)
                      .join(', ')}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
