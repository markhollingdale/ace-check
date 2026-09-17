import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { logsDir } from './paths.js';

export async function logScanError(
  context: string,
  err: unknown,
): Promise<void> {
  const detail =
    err instanceof Error
      ? `${err.message}\n${err.stack || ''}`
      : String(err);
  console.error(
    `[acecheck] ${context}: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  try {
    const dir = logsDir();
    await mkdir(dir, { recursive: true });
    await appendFile(
      path.join(dir, 'acecheck.log'),
      `[${new Date().toISOString()}] ${context}\n${detail}\n`,
      'utf8',
    );
  } catch {
    /* never let logging break a scan */
  }
}
