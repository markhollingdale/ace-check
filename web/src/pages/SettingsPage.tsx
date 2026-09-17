import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteProject,
  getProject,
  getRunProfiles,
  updateProject,
} from '../lib/api';
import type { ProjectSnapshot, RunProfile } from '../lib/types';
import { Crumb, PageHeader } from '../components/Shell';
import { DirectoryPicker } from '../components/DirectoryPicker';
import {
  Button,
  Card,
  HelpTip,
  Panel,
  Spinner,
} from '../components/ui';

const inputClass =
  'w-full rounded-xl border border-line bg-black/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20';

export function SettingsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [profiles, setProfiles] = useState<RunProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const [name, setName] = useState('');
  const [productionUrl, setProductionUrl] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [codebasePath, setCodebasePath] = useState('');
  const [profileId, setProfileId] = useState('standard');
  const [allowedHosts, setAllowedHosts] = useState('');
  const [authorised, setAuthorised] = useState(false);
  const [playwright, setPlaywright] = useState('');
  const [burp, setBurp] = useState('');

  const load = useCallback(async () => {
    try {
      const [snap, profs] = await Promise.all([
        getProject(id),
        getRunProfiles(),
      ]);
      setSnapshot(snap);
      setProfiles(profs);
      const p = snap.project;
      setName(p.name);
      setProductionUrl(p.targets.productionUrl ?? '');
      setStagingUrl(p.targets.stagingUrl ?? '');
      setCodebasePath(p.targets.codebasePath ?? '');
      setProfileId(p.profileId);
      setAllowedHosts(p.allowedHosts.join('\n'));
      setAuthorised(p.authorised);
      setPlaywright(p.reportImports?.playwright ?? '');
      setBurp(p.reportImports?.burp ?? '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProject(id, {
        name,
        profileId,
        authorised,
        targets: {
          productionUrl: productionUrl || undefined,
          stagingUrl: stagingUrl || undefined,
          codebasePath: codebasePath || undefined,
        },
        allowedHosts: allowedHosts
          .split(/[\n,]/)
          .map((h) => h.trim())
          .filter(Boolean),
        reportImports: {
          playwright: playwright || undefined,
          burp: burp || undefined,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this project and all of its runs?')) return;
    await deleteProject(id);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted">
        <Spinner /> Loading settings…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error ?? 'Not found.'}
      </Card>
    );
  }

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Crumb to="/" label="Projects" />
            <span className="text-muted/50">/</span>
            <Crumb to={`/projects/${id}`} label={snapshot.project.name} />
            <span className="text-muted/50">/</span>
            <span className="text-ink-soft">Settings</span>
          </span>
        }
        title="Project settings"
        description="Targets, scope and imports. Everything here is stored locally in the project directory."
      />

      <form onSubmit={save} className="space-y-5">
        <Panel title="Targets">
          <div className="space-y-5">
            <Field label="Project name" htmlFor="s-name">
              <input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Production URL"
                htmlFor="s-prod"
                tip="Lighthouse and misconfiguration checks run here."
              >
                <input
                  id="s-prod"
                  value={productionUrl}
                  onChange={(e) => setProductionUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Staging URL"
                htmlFor="s-staging"
                tip="Required for DAST and fuzzing. Active scanners default to staging and never production."
              >
                <input
                  id="s-staging"
                  value={stagingUrl}
                  onChange={(e) => setStagingUrl(e.target.value)}
                  placeholder="https://staging.example.com"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Codebase path" htmlFor="s-repo">
              <div className="flex gap-2">
                <input
                  id="s-repo"
                  value={codebasePath}
                  onChange={(e) => setCodebasePath(e.target.value)}
                  placeholder="C:\path\to\repo"
                  className={`${inputClass} font-mono`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setBrowsing(true)}
                >
                  Browse…
                </Button>
              </div>
            </Field>

            <Field label="Default run profile" htmlFor="s-profile">
              <select
                id="s-profile"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className={inputClass}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} - {p.description}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Active-scan scope">
          <div className="space-y-5">
            <Field
              label="Allowlisted hosts"
              htmlFor="s-hosts"
              tip="DAST, fuzzing and other active scanners refuse any host not listed here. One per line; wildcards like *.preview.example.com are supported."
            >
              <textarea
                id="s-hosts"
                value={allowedHosts}
                onChange={(e) => setAllowedHosts(e.target.value)}
                rows={4}
                placeholder={'staging.example.com\n*.preview.example.com'}
                className={`${inputClass} font-mono`}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-3.5">
              <input
                type="checkbox"
                checked={authorised}
                onChange={(e) => setAuthorised(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-500"
              />
              <span className="text-sm text-ink-soft">
                I am authorised to run active security tests against the
                allowlisted hosts. Only enable this for systems you own or have
                written permission to test.
              </span>
            </label>
          </div>
        </Panel>

        <Panel title="Report imports">
          <div className="space-y-5">
            <Field
              label="Playwright results (JSON)"
              htmlFor="s-pw"
              optional
              tip="Path to the JSON reporter output from your target repo's abuse/authorisation test suite. Imported by the Abuse stage."
            >
              <input
                id="s-pw"
                value={playwright}
                onChange={(e) => setPlaywright(e.target.value)}
                placeholder="C:\repo\test-results\results.json"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field
              label="Burp Suite export (XML)"
              htmlFor="s-burp"
              optional
              tip="Optional. Import an issue export from Burp Suite Pro."
            >
              <input
                id="s-burp"
                value={burp}
                onChange={(e) => setBurp(e.target.value)}
                placeholder="C:\scans\burp-issues.xml"
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
        </Panel>

        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
            {saved && <span className="text-sm text-emerald-300">Saved</span>}
          </div>
          <Button type="button" variant="danger" onClick={remove}>
            Delete project
          </Button>
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
    </div>
  );
}

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
