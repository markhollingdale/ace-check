import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { FindingStatus } from '../types.js';
import { targetStateDir } from '../paths.js';

function statusPath(codebasePath: string): string {
  return path.join(targetStateDir(codebasePath), 'finding-status.json');
}

export function readFindingStatuses(
  codebasePath: string,
): Record<string, FindingStatus> {
  const p = statusPath(codebasePath);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Record<string, FindingStatus>;
  } catch {
    return {};
  }
}

export function setFindingStatus(
  codebasePath: string,
  findingId: string,
  status: FindingStatus,
): Record<string, FindingStatus> {
  const statuses = readFindingStatuses(codebasePath);
  statuses[findingId] = status;
  const p = statusPath(codebasePath);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(statuses, null, 2), 'utf8');
  return statuses;
}

export function isResolved(status: FindingStatus | undefined): boolean {
  return status === 'fixed' || status === 'verified';
}
