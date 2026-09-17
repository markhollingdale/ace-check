import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getPage,
  lighthouseHtmlUrl,
  lighthouseJsonUrl,
  getProject,
} from '../lib/api';
import type { PageSummary } from '../lib/types';
import { CATEGORY_LABELS } from '../lib/types';
import { formatBytes, formatMs } from '../lib/format';
import { Crumb, PageHeader } from '../components/Shell';
import { ScoreRing } from '../components/ScoreRing';
import {
  Card,
  Panel,
  SeverityBadge,
  Spinner,
} from '../components/ui';

export function PageDetailPage() {
  const { id = '', runId = '', slug = '' } = useParams();
  const [page, setPage] = useState<PageSummary | null>(null);
  const [projectName, setProjectName] = useState(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, snap] = await Promise.all([
          getPage(runId, slug),
          getProject(id),
        ]);
        setPage(p);
        setProjectName(snap.project.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load page.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, runId, slug]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading page…
      </div>
    );
  }

  if (error || !page) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error ?? 'Page not found.'}
      </Card>
    );
  }

  const metrics: { label: string; value: string }[] = [
    { label: 'LCP', value: formatMs(page.metrics.lcp) },
    { label: 'CLS', value: page.metrics.cls?.toFixed(3) ?? '-' },
    { label: 'TBT', value: formatMs(page.metrics.tbt) },
    { label: 'FCP', value: formatMs(page.metrics.fcp) },
    { label: 'Speed Index', value: formatMs(page.metrics.speedIndex) },
    { label: 'Page weight', value: formatBytes(page.metrics.totalByteWeight) },
  ];

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={projectName} />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}/runs/${runId}`} label="Run" />
          </span>
        }
        title={page.template}
        description={
          <span className="font-mono text-xs text-muted">
            {page.url} · {page.device}
          </span>
        }
        actions={
          <>
            <a
              href={lighthouseHtmlUrl(runId, page.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-line bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white/[0.09]"
            >
              Lighthouse report
            </a>
            <a
              href={lighthouseJsonUrl(runId, page.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-line bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white/[0.09]"
            >
              Raw JSON
            </a>
          </>
        }
      />

      <Card className="flex flex-wrap items-center justify-around gap-6 p-6">
        {(
          ['performance', 'accessibility', 'best-practices', 'seo'] as const
        ).map((cat) => (
          <ScoreRing
            key={cat}
            score={page.scores[cat]}
            label={CATEGORY_LABELS[cat]}
          />
        ))}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <Panel title="Metrics">
          <dl className="space-y-2.5 text-sm">
            {metrics.map((m) => (
              <div key={m.label} className="flex justify-between">
                <dt className="text-muted">{m.label}</dt>
                <dd className="font-mono text-ink-soft">{m.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel
          title="Page issues"
          action={
            <span className="text-xs text-muted">{page.issues.length} found</span>
          }
        >
          {page.issues.length === 0 ? (
            <p className="text-sm text-muted">No page-level issues recorded.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {page.issues.map((issue) => (
                <li key={issue.auditId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={issue.baseSeverity} />
                    <span className="font-mono text-[11px] text-muted">
                      {issue.auditId}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-ink-soft">
                    {issue.title}
                  </p>
                  {issue.displayValue && (
                    <p className="mt-0.5 text-xs text-muted">
                      {issue.displayValue}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
