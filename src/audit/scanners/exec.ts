import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

/**
 * Run a local binary and capture its output.
 *
 * `shell` is enabled on Windows only, because npm/pip-installed tools are
 * exposed as `.cmd`/`.ps1` shims that `execFile` cannot resolve directly. All
 * arguments are passed as an array (never interpolated into a shell string) and
 * callers only ever supply values derived from the user's own project config.
 */
export async function runBinary(
  bin: string,
  args: string[],
  opts: ExecOptions = {},
): Promise<ExecResult> {
  const timeout = opts.timeoutMs ?? 120_000;
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      cwd: opts.cwd,
      timeout,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
      shell: process.platform === 'win32',
      env: { ...process.env, ...(opts.env ?? {}) },
    });
    return { ok: true, code: 0, stdout, stderr };
  } catch (err) {
    const e = err as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    // Many scanners exit non-zero when they *found* something - that is not an
    // execution failure. Callers inspect stdout; only ENOENT/ETIMEDOUT matter.
    const notFound =
      e.code === 'ENOENT' ||
      (typeof e.message === 'string' && /not recognized|not found|ENOENT/i.test(e.message));
    return {
      ok: !notFound,
      code: typeof e.code === 'number' ? e.code : null,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      error: notFound ? 'not-installed' : e.message,
    };
  }
}

export interface Detection {
  available: boolean;
  version?: string;
}

/** Probe for a binary without throwing; returns a best-effort version string. */
export async function detectBinary(
  bin: string,
  versionArgs: string[] = ['--version'],
): Promise<Detection> {
  const result = await runBinary(bin, versionArgs, { timeoutMs: 8_000 });
  if (!result.ok) return { available: false };
  const text = `${result.stdout}\n${result.stderr}`.trim();
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  const match = firstLine.match(/\d+\.\d+(\.\d+)?([.-][\w.]+)?/);
  return { available: true, version: match?.[0] ?? firstLine.slice(0, 40) };
}

export function safeJson<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Scanners sometimes emit a leading log line before the JSON payload.
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function parseJsonLines<T>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      out.push(JSON.parse(trimmed) as T);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}
