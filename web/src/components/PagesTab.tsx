import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PageSummary } from '../lib/types';
import { DEVICE_LABELS } from '../lib/types';
import { scoreTone } from '../lib/format';
import { EmptyState } from './ui';

export function PagesTab({
  scanId,
  pages,
}: {
  scanId: string;
  pages: PageSummary[];
}) {
  const [query, setQuery] = useState('');
  const [onlyFailed, setOnlyFailed] = useState(false);

  const multi = new Set(pages.map((p) => p.device)).size > 1;

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (onlyFailed && p.status !== 'failed') return false;
      if (query && !p.url.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [pages, query, onlyFailed]);

  const scoreCell = (v: number | null) => (
    <span className={scoreTone(v)}>{v ?? '—'}</span>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by URL…"
          className="w-64 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyFailed}
            onChange={(e) => setOnlyFailed(e.target.checked)}
            className="h-4 w-4"
          />
          Failed only
        </label>
        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} / {pages.length} runs
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No pages match your filters" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-2.5 font-medium">URL</th>
                {multi && (
                  <th scope="col" className="px-4 py-2.5 font-medium">Device</th>
                )}
                <th scope="col" className="px-4 py-2.5 text-center font-medium">Perf</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">A11y</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">BP</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">SEO</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Template</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Issues</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.slug}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="max-w-[360px] truncate px-4 py-2">
                    <Link
                      to={`/scan/${scanId}/page/${p.slug}`}
                      className="font-mono text-xs text-slate-700 hover:underline"
                    >
                      {p.url}
                    </Link>
                  </td>
                  {multi && (
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {DEVICE_LABELS[p.device]}
                    </td>
                  )}
                  <td className="px-4 py-2 text-center">
                    {scoreCell(p.scores.performance)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {scoreCell(p.scores.accessibility)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {scoreCell(p.scores['best-practices'])}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {scoreCell(p.scores.seo)}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {p.status === 'failed' ? (
                      <span className="text-red-600">failed</span>
                    ) : (
                      p.template
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {p.status === 'failed' ? '—' : p.issues.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
