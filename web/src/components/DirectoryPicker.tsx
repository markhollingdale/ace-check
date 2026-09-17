import { useEffect, useState } from 'react';
import { browseDirectory } from '../lib/api';
import { Button, Spinner } from './ui';

interface DirEntry {
  name: string;
  path: string;
}

export function DirectoryPicker({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (dirPath: string) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [parent, setParent] = useState('');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await browseDirectory(p);
      setCurrent(res.path);
      setParent(res.parent);
      setEntries(res.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">
            Select codebase folder
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.08] hover:text-ink cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <Button variant="secondary" size="sm" onClick={() => load('')}>
            Root
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(parent)}
            disabled={!parent}
          >
            ↑ Up
          </Button>
          <input
            readOnly
            value={current}
            className="min-w-0 flex-1 truncate rounded-lg border border-line bg-black/30 px-3 py-1.5 font-mono text-xs text-ink-soft"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted">
              <Spinner /> Reading directory…
            </div>
          ) : error ? (
            <p className="px-2 py-6 text-sm text-rose-300">{error}</p>
          ) : entries.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted">No subfolders.</p>
          ) : (
            <div className="space-y-0.5">
              {entries.map((e) => (
                <button
                  key={e.path}
                  onClick={() => load(e.path)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink cursor-pointer"
                >
                  <svg
                    className="h-4 w-4 shrink-0 text-amber-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                  </svg>
                  <span className="truncate">{e.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSelect(current)} disabled={!current}>
            Select folder
          </Button>
        </div>
      </div>
    </div>
  );
}
