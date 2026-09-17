import { useEffect, useMemo, useState } from 'react';
import { getAttributions, type AttributionsData } from '../lib/api';
import { PageHeader } from '../components/Shell';
import { Card, EmptyState, Panel, Spinner, cn } from '../components/ui';

export function AttributionsPage() {
  const [data, setData] = useState<AttributionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openText, setOpenText] = useState<string | null>(null);

  useEffect(() => {
    getAttributions()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load notices.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const map = new Map<string, AttributionsData['packages']>();
    for (const pkg of data.packages) {
      if (q && !pkg.name.toLowerCase().includes(q)) continue;
      const list = map.get(pkg.license) ?? [];
      list.push(pkg);
      map.set(pkg.license, list);
    }
    return [...map.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );
  }, [data, query]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading attributions…
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error ?? 'Attributions unavailable.'}
      </Card>
    );
  }

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow="Credits"
        title="Attribution & licenses"
        description={
          <>
            AceCheck is MIT-licensed and stands on open-source software. This page
            lists every dependency, its license and its copyright holder, plus the
            external tools AceCheck runs. The same notices ship in the repository
            as{' '}
            <code className="rounded bg-white/[0.08] px-1 text-xs">
              THIRD-PARTY-NOTICES.md
            </code>
            .
          </>
        }
      />

      <div className="flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-full border border-line bg-white/[0.04] px-3 py-1 font-medium text-ink-soft">
          {data.totalPackages} packages
        </span>
        <span className="rounded-full border border-line bg-white/[0.04] px-3 py-1">
          {data.externalTools.length} external tools
        </span>
        <span className="rounded-full border border-line bg-white/[0.04] px-3 py-1">
          generated {data.generated}
        </span>
      </div>

      <Panel title="Licenses in use">
        <div className="flex flex-wrap gap-2">
          {data.summary.map((s) => (
            <button
              key={s.license}
              onClick={() =>
                setOpenText(openText === s.license ? null : s.license)
              }
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors cursor-pointer',
                openText === s.license
                  ? 'border-accent/50 bg-accent-subtle text-ink'
                  : 'border-line bg-white/[0.03] text-ink-soft hover:bg-white/[0.06]',
              )}
            >
              <span className="font-semibold">{s.license}</span>
              <span className="text-muted">{s.count}</span>
            </button>
          ))}
        </div>
        {openText && data.licenseTexts[openText] && (
          <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-4 text-[11px] leading-relaxed text-ink-soft">
            {data.licenseTexts[openText]}
          </pre>
        )}
      </Panel>

      <Panel title="External tools AceCheck runs">
        <p className="mb-4 text-sm text-muted">
          These are separate programs. AceCheck detects and runs them locally; it
          never bundles or redistributes them, and each is governed by its own
          license.
        </p>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Tool</th>
                <th className="px-4 py-2.5 font-medium">License</th>
                <th className="px-4 py-2.5 font-medium">Project</th>
              </tr>
            </thead>
            <tbody>
              {data.externalTools.map((tool) => (
                <tr
                  key={tool.name}
                  className="border-b border-line/60 last:border-0"
                >
                  <td className="px-4 py-2.5 text-ink-soft">{tool.name}</td>
                  <td className="px-4 py-2.5 text-muted">{tool.license}</td>
                  <td className="px-4 py-2.5">
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      source
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Packages"
        action={
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter packages…"
            className="rounded-lg border border-line bg-black/30 px-3 py-1.5 text-xs text-ink outline-none focus:border-accent/60"
          />
        }
      >
        {grouped.length === 0 ? (
          <EmptyState title="No packages match" />
        ) : (
          <div className="space-y-5">
            {grouped.map(([license, packages]) => (
              <div key={license}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {license} · {packages.length}
                </h4>
                <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-ink-soft">{pkg.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-muted">
                          {pkg.versions.join(', ')}
                        </span>
                        {pkg.author && (
                          <p className="mt-0.5 text-[11px] text-muted">
                            {pkg.author}
                          </p>
                        )}
                      </div>
                      {pkg.homepage && (
                        <a
                          href={pkg.homepage}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs text-accent hover:underline"
                        >
                          homepage
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
