import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProject, getRunReport } from '../lib/api';
import type { ProjectSnapshot } from '../lib/types';
import { formatDate } from '../lib/format';
import { Crumb, PageHeader } from '../components/Shell';
import { VerdictBanner } from '../components/Verdict';
import { Card, CopyButton, EmptyState, Spinner, Tabs } from '../components/ui';

export function ReportPage() {
  const { id = '' } = useParams();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [format, setFormat] = useState<'human' | 'ai'>('human');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSnapshot(await getProject(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!snapshot?.run) return;
    getRunReport(id, snapshot.run.id, format)
      .then(setMarkdown)
      .catch(() => setMarkdown(''));
  }, [snapshot, id, format]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading report…
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

  const { project, run, gate } = snapshot;

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={project.name} />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">Report</span>
          </span>
        }
        title="Release report"
        description={
          run
            ? `${run.label} · ${formatDate(run.startedAt)}`
            : 'No completed run yet.'
        }
        actions={
          markdown ? (
            <>
              <CopyButton text={markdown} label="Copy markdown" />
              <a
                href={`/api/projects/${id}/runs/${run?.id}/report?format=${format}`}
                download={`${project.id}-release-${format}.md`}
                className="inline-flex items-center rounded-xl border border-line bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white/[0.09]"
              >
                Download .md
              </a>
            </>
          ) : undefined
        }
      />

      {!run ? (
        <EmptyState
          title="Nothing to report yet"
          hint="Run an audit and the release report will appear here."
        />
      ) : (
        <>
          {gate && <VerdictBanner gate={gate} projectName={project.name} />}

          <Tabs
            active={format}
            onChange={(t) => setFormat(t as 'human' | 'ai')}
            tabs={[
              { id: 'human', label: 'Human report' },
              { id: 'ai', label: 'AI-ready' },
            ]}
          />

          <Card className="p-5">
            {markdown ? (
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                {markdown}
              </pre>
            ) : (
              <p className="text-sm text-muted">No report for this run.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
