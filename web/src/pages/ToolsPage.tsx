import { useEffect, useState } from 'react';
import { getDataPaths, getScanners, type DataPaths } from '../lib/api';
import type { ScannerDescriptor } from '../lib/types';
import { PageHeader } from '../components/Shell';
import {
  Button,
  Card,
  CopyButton,
  EmptyState,
  Panel,
  Spinner,
  cn,
} from '../components/ui';

export function ToolsPage() {
  const [scanners, setScanners] = useState<ScannerDescriptor[]>([]);
  const [paths, setPaths] = useState<DataPaths | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (force = false) => {
    if (force) setRefresh(true);
    try {
      setScanners(await getScanners(force));
    } catch {
      setScanners([]);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  };

  useEffect(() => {
    load();
    getDataPaths()
      .then(setPaths)
      .catch(() => setPaths(null));
  }, []);

  const installed = scanners.filter((s) => s.available);
  const missing = scanners.filter((s) => !s.available);

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        eyebrow="Toolchain"
        title="Scanner status"
        description="AceCheck orchestrates best-in-class open-source security tools. It never bundles or installs them - install what you need, and the matching stage unlocks automatically."
        actions={
          <Button
            variant="secondary"
            onClick={() => load(true)}
            disabled={refresh}
          >
            {refresh ? 'Re-detecting…' : 'Re-detect'}
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted">
          <Spinner /> Detecting installed tools…
        </div>
      ) : scanners.length === 0 ? (
        <EmptyState title="No scanners registered" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {installed.length} installed
            </span>
            <span className="rounded-full border border-line bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted">
              {missing.length} available to install
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[...installed, ...missing].map((scanner) => (
              <ScannerCard key={scanner.id} scanner={scanner} />
            ))}
          </div>

          {paths && (
            <Panel
              title="Storage"
              action={
                <span className="text-xs text-muted">
                  {paths.overrideEnv
                    ? `ACECHECK_DATA_DIR=${paths.overrideEnv}`
                    : 'per-user app data'}
                </span>
              }
            >
              <p className="mb-4 text-sm text-muted">
                Everything AceCheck generates is written outside the repository,
                so running an audit never leaves a trace in your checked-out
                project.
              </p>
              <dl className="space-y-2 text-sm">
                {[
                  { label: 'Data root', value: paths.root },
                  { label: 'Projects & runs', value: paths.projects },
                  { label: 'Web scans', value: paths.scans },
                  { label: 'Target state', value: paths.targets },
                  { label: 'Logs', value: paths.logs },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-black/20 px-3 py-2"
                  >
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="min-w-0 flex-1 truncate text-right font-mono text-xs text-ink-soft">
                      {row.value}
                    </dd>
                    <CopyButton text={row.value} label="Copy" />
                  </div>
                ))}
              </dl>
            </Panel>
          )}

          <Panel title="Notes">
            <ul className="space-y-2 text-sm text-muted">
              <li>
                • Stages degrade gracefully: if a tool is missing, AceCheck falls
                back to its built-in checks where possible.
              </li>
              <li>
                • Active scanners (Nuclei, ZAP, ffuf, Nmap) only run against
                allowlisted hosts - set these per project in Settings.
              </li>
              <li>
                • Burp Suite Community is a manual tool: it has no automatable
                API, so it works alongside AceCheck rather than inside it.
              </li>
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}

function ScannerCard({ scanner }: { scanner: ScannerDescriptor }) {
  const install =
    scanner.install.windows ?? scanner.install.macos ?? scanner.install.linux;
  return (
    <Card className={cn('card-hover p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{scanner.label}</h3>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                scanner.available
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-line bg-white/[0.04] text-muted',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  scanner.available ? 'bg-emerald-400' : 'bg-slate-500',
                )}
              />
              {scanner.available ? 'installed' : 'not found'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">{scanner.description}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted">
        <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5">
          stage: {scanner.stage}
        </span>
        <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5">
          target: {scanner.target}
        </span>
        {scanner.version && (
          <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 font-mono">
            v{scanner.version}
          </span>
        )}
      </div>

      {!scanner.available && install && (
        <div className="mt-4 rounded-xl border border-line bg-black/30 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Install (Windows)
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink-soft">
              {install}
            </code>
            <CopyButton text={install} label="Copy" />
          </div>
        </div>
      )}

      <div className="mt-3">
        <a
          href={scanner.install.docs}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Documentation →
        </a>
      </div>
    </Card>
  );
}
