import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const APP_DIR_NAME = 'AceCheck';

/**
 * The per-user application data directory for this platform:
 *
 *   Windows  %LOCALAPPDATA%\AceCheck
 *   macOS    ~/Library/Application Support/AceCheck
 *   Linux    $XDG_DATA_HOME/acecheck  (or ~/.local/share/acecheck)
 *
 * Generated artefacts (scans, projects, logs) live here rather than inside the
 * repository, so running AceCheck never leaves a trace in the checked-out
 * project and can never be committed by accident.
 */
function osDataDir(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const base =
      process.env.LOCALAPPDATA ||
      process.env.APPDATA ||
      path.join(home, 'AppData', 'Local');
    return path.join(base, APP_DIR_NAME);
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', APP_DIR_NAME);
  }
  const xdg = process.env.XDG_DATA_HOME;
  return xdg
    ? path.join(xdg, 'acecheck')
    : path.join(home, '.local', 'share', 'acecheck');
}

/**
 * Resolve the data root. `ACECHECK_DATA_DIR` overrides everything, which is
 * useful for CI, tests, or keeping a workspace in a synced folder.
 */
export function dataRoot(): string {
  const override = process.env.ACECHECK_DATA_DIR?.trim();
  return override ? path.resolve(override) : osDataDir();
}

export function scansRoot(): string {
  const override = process.env.SITE_AUDIT_SCANS_DIR?.trim();
  return override ? path.resolve(override) : path.join(dataRoot(), 'scans');
}

export function projectsRoot(): string {
  const override = process.env.ACECHECK_PROJECTS_DIR?.trim();
  return override ? path.resolve(override) : path.join(dataRoot(), 'projects');
}

export function logsDir(): string {
  return path.join(dataRoot(), 'logs');
}

export function targetsRoot(): string {
  return path.join(dataRoot(), 'targets');
}

/**
 * Stable, filesystem-safe key for a target codebase. AceCheck stores per-target
 * state (finding statuses, review findings, check reports) under this key so
 * that nothing is ever written into the audited project itself.
 */
export function targetKey(codebasePath: string): string {
  const abs = path.resolve(codebasePath);
  const base =
    path.basename(abs).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 40) ||
    'target';
  const hash = crypto
    .createHash('sha1')
    .update(abs.toLowerCase())
    .digest('hex')
    .slice(0, 8);
  return `${base}-${hash}`;
}

export function targetStateDir(codebasePath: string): string {
  return path.join(targetsRoot(), targetKey(codebasePath));
}

export function dataPaths(): {
  root: string;
  scans: string;
  projects: string;
  logs: string;
  targets: string;
} {
  return {
    root: dataRoot(),
    scans: scansRoot(),
    projects: projectsRoot(),
    logs: logsDir(),
    targets: targetsRoot(),
  };
}
