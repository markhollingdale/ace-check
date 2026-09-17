import { useState } from 'react';
import { exportUrl, getPrompt, reportUrl } from '../lib/api';
import { Button, Card } from './ui';

const MODES = [
  { id: 'full', label: 'Full Audit' },
  { id: 'performance', label: 'Performance' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'seo', label: 'SEO' },
  { id: 'best-practices', label: 'Best Practices' },
];

export function ReportsTab({ scanId }: { scanId: string }) {
  const [mode, setMode] = useState('full');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setPrompt(null);
    try {
      const text = await getPrompt(scanId, mode, 'markdown');
      setPrompt(text);
    } catch (err) {
      setPrompt(`Error: ${err instanceof Error ? err.message : String(err)}`);
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

  const download = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Generated reports
        </h3>
        <div className="flex flex-wrap gap-2">
          <a
            href={reportUrl(scanId, 'ai')}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            AI audit (Markdown)
          </a>
          <a
            href={reportUrl(scanId, 'html')}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            HTML report
          </a>
          <a
            href={reportUrl(scanId, 'json')}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            JSON report
          </a>
          <a
            href={exportUrl(scanId)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export scan (ZIP)
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Generate AI prompt
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                mode === m.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
          <Button onClick={generate} disabled={loading} className="ml-auto">
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        </div>

        {prompt && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {prompt.length.toLocaleString()} characters
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    download(prompt, `${scanId}-ai-prompt.md`)
                  }
                >
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
    </div>
  );
}
