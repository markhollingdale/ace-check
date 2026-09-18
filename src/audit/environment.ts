import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type {
  GitInfo,
  Project,
  Run,
  RunEnvironment,
  ScanMetadata,
} from '../types.js';

/** Best-effort git metadata for the codebase that was audited. */
export function readGitInfo(codebasePath?: string): GitInfo | undefined {
  if (!codebasePath || !existsSync(path.join(codebasePath, '.git'))) {
    return undefined;
  }
  const git = (args: string[]): string | undefined => {
    const res = spawnSync('git', ['-C', codebasePath, ...args], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (res.error || res.status !== 0 || typeof res.stdout !== 'string') {
      return undefined;
    }
    return res.stdout.trim() || undefined;
  };
  const commit = git(['rev-parse', 'HEAD']);
  if (!commit) return undefined;
  return {
    commit,
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: Boolean(git(['status', '--porcelain'])),
  };
}

export function readManifest(
  codebasePath?: string,
): { name?: string; version?: string } | undefined {
  if (!codebasePath) return undefined;
  const p = path.join(codebasePath, 'package.json');
  if (!existsSync(p)) return undefined;
  try {
    const pkg = JSON.parse(readFileSync(p, 'utf8')) as {
      name?: unknown;
      version?: unknown;
    };
    return {
      name: typeof pkg.name === 'string' ? pkg.name : undefined,
      version: typeof pkg.version === 'string' ? pkg.version : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Assemble the run environment so a report states exactly what was scanned:
 * target, timing, profile, codebase revision, and whether the deployed site
 * matches the local codebase.
 */
export function buildEnvironment(opts: {
  project: Project;
  run: Run;
  scanMeta?: ScanMetadata | null;
  codebaseMatch?: RunEnvironment['codebaseMatch'];
}): RunEnvironment {
  const { project, run, scanMeta } = opts;
  const codebasePath = project.targets.codebasePath;
  return {
    targetUrl:
      project.targets.productionUrl ??
      project.targets.stagingUrl ??
      scanMeta?.url,
    scannedAt: scanMeta?.timestamp ?? run.startedAt,
    userAgent: scanMeta?.config.userAgent,
    // The crawler is anonymous unless a future stage explicitly authenticates.
    authenticated: false,
    profileId: run.profileId,
    stages: run.stages.map((s) => s.id),
    codebasePath,
    git: readGitInfo(codebasePath),
    manifest: readManifest(codebasePath),
    codebaseMatch: opts.codebaseMatch ?? 'unknown',
  };
}
