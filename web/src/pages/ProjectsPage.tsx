import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createProject,
  listProjects,
  getRunProfiles,
} from '../lib/api';
import type { ProjectSummary, RunProfile } from '../lib/types';
import { formatDate } from '../lib/format';
import { DirectoryPicker } from '../components/DirectoryPicker';
import { PageHeader } from '../components/Shell';
import { StatusPill } from '../components/Verdict';
import {
  Button,
  Card,
  EmptyState,
  HelpTip,
  Spinner,
  cn,
  selectClass,
} from '../components/ui';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [profiles, setProfiles] = useState<RunProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    getRunProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Local-first audit workspace"
        title={
          <span>
            Check everything. <span className="grad-text">Ship with confidence.</span>
          </span>
        }
        description="Point AceCheck at a deployed site and a codebase, then run a guided progression of audit stages - code, dependencies, runtime and review - into a single release verdict."
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Close' : '+ New project'}
          </Button>
        }
      />

      {showForm && (
        <div className="mb-8">
          <NewProjectForm
            profiles={profiles}
            onCreated={(id) => navigate(`/projects/${id}`)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted">
          <Spinner /> Loading projects…
        </div>
      ) : error ? (
        <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          {error}
        </Card>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="🛰"
          title="No projects yet"
          hint="Create a project with a website URL and/or a codebase path to start your first audit."
          action={
            !showForm && (
              <Button onClick={() => setShowForm(true)}>Create a project</Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.project.id} summary={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ summary }: { summary: ProjectSummary }) {
  const { project, run, gate, findings, openCritical } = summary;
  const host =
    project.targets.productionUrl?.replace(/^https?:\/\//, '') ??
    project.targets.stagingUrl?.replace(/^https?:\/\//, '');
  const repo = project.targets.codebasePath
    ? project.targets.codebasePath.split(/[\\/]/).filter(Boolean).pop()
    : undefined;

  return (
    <Link to={`/projects/${project.id}`} className="block">
      <Card className="card-hover h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink">
              {project.name}
            </h3>
            <p className="mt-0.5 truncate font-mono text-xs text-muted">
              {host ?? repo ?? 'no target'}
            </p>
          </div>
          {gate ? <StatusPill status={gate.status} /> : <StatusPill status="UNKNOWN" />}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
          {host && (
            <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-muted">
              site
            </span>
          )}
          {repo && (
            <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 font-mono text-muted">
              {repo}
            </span>
          )}
          {project.targets.stagingUrl && (
            <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-muted">
              staging
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
          <Stat label="Findings" value={findings} />
          <Stat
            label="Critical"
            value={openCritical}
            tone={openCritical > 0 ? 'text-rose-300' : undefined}
          />
          <Stat
            label="Last run"
            value={run ? formatDate(run.startedAt).split(',')[0] : '-'}
          />
        </div>
      </Card>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div>
      <div className={`text-lg font-bold ${tone ?? 'text-ink'}`}>{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
    </div>
  );
}

function NewProjectForm({
  profiles,
  onCreated,
}: {
  profiles: RunProfile[];
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [productionUrl, setProductionUrl] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [codebasePath, setCodebasePath] = useState('');
  const [profileId, setProfileId] = useState('standard');
  const [browsing, setBrowsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the project a name.');
      return;
    }
    if (!productionUrl.trim() && !codebasePath.trim()) {
      setError('Enter a website URL, a codebase path, or both.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        productionUrl: productionUrl.trim() || undefined,
        stagingUrl: stagingUrl.trim() || undefined,
        codebasePath: codebasePath.trim() || undefined,
        profileId,
      });
      onCreated(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
      setBusy(false);
    }
  };

  return (
    <Card className="animate-in p-6">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">New project</h2>
        <HelpTip text="A project is the durable thing: its site, its repo, and its staging target. Every audit run belongs to it, so you can track findings over time." />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" htmlFor="np-name">
          <input
            id="np-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My website"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Production URL"
            htmlFor="np-prod"
            tip="The live site. Lighthouse and misconfiguration checks run against this."
          >
            <input
              id="np-prod"
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </Field>

          <Field
            label="Staging URL"
            htmlFor="np-staging"
            optional
            tip="Required for DAST and fuzzing. Active scanners refuse hosts that are not allowlisted, and default to staging - never production."
          >
            <input
              id="np-staging"
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              placeholder="https://staging.example.com"
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Codebase path"
          htmlFor="np-repo"
          optional
          tip="Enables SAST, secret, dependency and deep-review stages."
        >
          <div className="flex gap-2">
            <input
              id="np-repo"
              value={codebasePath}
              onChange={(e) => setCodebasePath(e.target.value)}
              placeholder="C:\path\to\your\repo"
              className={`${inputClass} font-mono`}
            />
            <Button type="button" variant="secondary" onClick={() => setBrowsing(true)}>
              Browse…
            </Button>
          </div>
        </Field>

        <Field label="Default run profile" htmlFor="np-profile">
          <select
            id="np-profile"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className={cn(inputClass, selectClass)}
          >
            {(profiles.length ? profiles : [{ id: 'standard', label: 'Standard', description: '', stages: [] }]).map(
              (p) => (
                <option key={p.id} value={p.id}>
                  {p.label} - {p.description}
                </option>
              ),
            )}
          </select>
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </Button>
          <span className="text-xs text-muted">
            You can change every option later in Settings.
          </span>
        </div>
      </form>

      <DirectoryPicker
        open={browsing}
        onSelect={(p) => {
          setCodebasePath(p);
          setBrowsing(false);
        }}
        onClose={() => setBrowsing(false)}
      />
    </Card>
  );
}

const inputClass =
  'w-full rounded-xl border border-line bg-black/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20';

function Field({
  label,
  htmlFor,
  tip,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  tip?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
      >
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted">(optional)</span>
        )}
        {tip && <HelpTip text={tip} />}
      </label>
      {children}
    </div>
  );
}
