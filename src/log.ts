import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const logsDir = path.resolve(process.cwd(), 'logs');
const logFile = path.join(logsDir, 'acecheck.log');

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
    await mkdir(logsDir, { recursive: true });
    await appendFile(
      logFile,
      `[${new Date().toISOString()}] ${context}\n${detail}\n`,
      'utf8',
    );
  } catch {
    /* never let logging break a scan */
  }
}
