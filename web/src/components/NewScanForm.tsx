import { useEffect, useMemo, useRef, useState } from 'react';
import { startScan } from '../lib/api';
import type { ScanMetadata } from '../lib/types';
import { DirectoryPicker } from './DirectoryPicker';
import { Button, Card, HelpTip } from './ui';

type Mode = 'quick' | 'standard' | 'full';

const MODES: { id: Mode; label: string; hint: string; pages: number }[] = [
  { id: 'quick', label: 'Quick', hint: 'Fast feedback on representative pages', pages: 10 },
  { id: 'standard', label: 'Standard', hint: 'Default whole-site scan', pages: 100 },
  { id: 'full', label: 'Full', hint: 'Every discovered URL up to the limit', pages: 500 },
];

const HISTORY_LIMIT = 10;

function uniqLimit(items: (string | undefined)[], limit = HISTORY_LIMIT): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const value = (item || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

export function NewScanForm({
  onStarted,
  scans,
}: {
  onStarted: (scanId: string, url: string) => void;
  scans: ScanMetadata[];
}) {
  const [url, setUrl] = useState('');
  const [codebasePath, setCodebasePath] = useState('');
  const [mode, setMode] = useState<Mode>('standard');
  const [device, setDevice] = useState<'mobile' | 'desktop' | 'both'>('both');
  const [maxPages, setMaxPages] = useState(100);
  const [concurrency, setConcurrency] = useState(2);
  const [respectRobots, setRespectRobots] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const previousUrls = useMemo(() => uniqLimit(scans.map((s) => s.url)), [scans]);
  const previousCodePaths = useMemo(
    () => uniqLimit(scans.map((s) => s.codebasePath)),
    [scans],
  );

  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current) return;
    if (previousUrls.length === 0 && previousCodePaths.length === 0) return;
    if (previousUrls.length > 0) setUrl(previousUrls[0]);
    if (previousCodePaths.length > 0) setCodebasePath(previousCodePaths[0]);
    defaulted.current = true;
  }, [previousUrls, previousCodePaths]);

  const selectMode = (m: Mode) => {
    setMode(m);
    const preset = MODES.find((x) => x.id === m);
    if (preset) setMaxPages(preset.pages);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !codebasePath.trim()) {
      setError('Enter a website URL, a codebase path, or both.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const scanId = await startScan({
        url: url.trim(),
        codebasePath: codebasePath.trim() || undefined,
        config: {
          mode,
          device,
          maxPages,
          concurrency,
          respectRobots,
        },
      });
      onStarted(scanId, url.trim() || codebasePath.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan.');
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-700">Start a new scan</h2>
        <p className="text-xs text-slate-500">
          Crawl a site, run Lighthouse, and run code checks — one combined
          report.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-6 p-6">
        <div>
          <label
            htmlFor="scan-url"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Website URL
          </label>
          <input
            id="scan-url"
            type="text"
            list="scan-urls"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <datalist id="scan-urls">
            {previousUrls.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">
            Works with production sites, previews (e.g. *.vercel.app) and localhost.
          </p>
        </div>

        <div>
          <label
            htmlFor="scan-codebase"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Codebase path{' '}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="scan-codebase"
              type="text"
              list="codebase-paths"
              value={codebasePath}
              onChange={(e) => setCodebasePath(e.target.value)}
              placeholder="C:\path\to\your\repo"
              className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={() => setBrowsing(true)}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Browse…
            </button>
          </div>
          <datalist id="codebase-paths">
            {previousCodePaths.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">
            Runs static code checks. Enter it alongside a URL to correlate code
            and site findings in one release report.
          </p>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Scan mode
          </span>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMode(m.id)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer ${
                  mode === m.id
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-semibold">{m.label}</div>
                  <div
                    className={`text-xs ${
                      mode === m.id ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                  {m.hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            id="scan-device"
            label="Device"
            tip="The emulated device Lighthouse tests with. 'Desktop & Mobile' runs each page twice and combines the results into a single report. Mobile uses a throttled connection for realistic field-like results."
          >
            <select
              id="scan-device"
              value={device}
              onChange={(e) => setDevice(e.target.value as typeof device)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="both">Desktop &amp; Mobile</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </Field>

          <Field
            id="scan-max-pages"
            label="Max pages"
            tip="The maximum number of pages to run Lighthouse against. Selected automatically by the scan mode, but you can override it."
          >
            <input
              id="scan-max-pages"
              type="number"
              min={1}
              max={5000}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field
            id="scan-concurrency"
            label="Crawl concurrency"
            tip="How many pages the crawler fetches in parallel while discovering URLs. Keep this low to avoid hammering the target site."
          >
            <input
              id="scan-concurrency"
              type="number"
              min={1}
              max={8}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field
            id="scan-robots"
            label="robots.txt"
            tip="When enabled, the crawler respects the site's robots.txt disallow rules and only scans allowed paths."
          >
            <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
              <input
                id="scan-robots"
                type="checkbox"
                checked={respectRobots}
                onChange={(e) => setRespectRobots(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Respect
            </label>
          </Field>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Starting…' : 'Start scan'}
          </Button>
          {concurrency > 4 && (
            <p className="text-xs text-amber-600">
              High concurrency may hammer the target site.
            </p>
          )}
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

function Field({
  id,
  label,
  tip,
  children,
}: {
  id: string;
  label: string;
  tip: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
      >
        {label}
        <HelpTip text={tip} />
      </label>
      {children}
    </div>
  );
}
