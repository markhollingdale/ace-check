import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Finding, Severity } from '../../types.js';
import { makeFinding } from './util.js';

const execFileAsync = promisify(execFile);

interface AuditVuln {
  severity?: string;
  advisory?: { title?: string; severity?: string };
  range?: string;
}

interface AuditReport {
  vulnerabilities?: Record<string, AuditVuln>;
}

function vulnSeverity(v: AuditVuln): Severity {
  const s = (v.severity || v.advisory?.severity || '').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'moderate') return 'medium';
  return 'low';
}

export function parseAuditJson(raw: string): Finding[] {
  let parsed: AuditReport;
  try {
    parsed = JSON.parse(raw) as AuditReport;
  } catch {
    return [];
  }
  const vulns = parsed.vulnerabilities;
  if (!vulns || typeof vulns !== 'object') return [];
  const findings: Finding[] = [];
  for (const [name, entry] of Object.entries(vulns)) {
    const v = entry ?? {};
    if ((v.severity || '').toLowerCase() === 'info') continue;
    findings.push(
      makeFinding({
        prefix: 'DEP',
        category: 'dependencies',
        domain: 'DEPENDENCIES',
        severity: vulnSeverity(v),
        title: `Vulnerable dependency: ${name}`,
        description: v.advisory?.title || `Known vulnerability in ${name}`,
        evidence: { file: 'package.json', proof: 'confirmed' },
        recommendation: `Upgrade ${name}${v.range ? ` (affected: ${v.range})` : ''} and re-run the audit.`,
      }),
    );
  }
  return findings;
}

export function parseOutdatedJson(raw: string): Finding[] {
  let parsed: Record<string, { current?: string; latest?: string }>;
  try {
    parsed = JSON.parse(raw) as Record<string, { current?: string; latest?: string }>;
  } catch {
    return [];
  }
  const findings: Finding[] = [];
  for (const [name, info] of Object.entries(parsed)) {
    if (!info?.current || !info?.latest || info.current === info.latest) continue;
    findings.push(
      makeFinding({
        prefix: 'DEP',
        category: 'dependencies',
        domain: 'DEPENDENCIES',
        severity: 'low',
        title: `Outdated dependency: ${name}`,
        description: `${name} is ${info.current}, latest is ${info.latest}`,
        evidence: { file: 'package.json', proof: 'confirmed' },
        recommendation: `Consider updating ${name} to ${info.latest}.`,
      }),
    );
  }
  return findings;
}

async function runJson(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      cwd,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout as string;
  } catch (err) {
    const e = err as { stdout?: string };
    return e.stdout ?? null;
  }
}

export async function runDependencyAudit(codebasePath: string): Promise<Finding[]> {
  const hasPnpm = existsSync(path.join(codebasePath, 'pnpm-lock.yaml'));
  const hasNpm = existsSync(path.join(codebasePath, 'package-lock.json'));
  if (!hasPnpm && !hasNpm) return [];

  const pkgManager = hasPnpm ? 'pnpm' : 'npm';
  const findings: Finding[] = [];

  const auditRaw = await runJson(
    pkgManager,
    hasPnpm ? ['audit', '--json'] : ['audit', '--json', '--audit-level=low'],
    codebasePath,
  );
  if (auditRaw) findings.push(...parseAuditJson(auditRaw));

  const outdatedRaw = await runJson(
    pkgManager,
    ['outdated', '--json'],
    codebasePath,
  );
  if (outdatedRaw) findings.push(...parseOutdatedJson(outdatedRaw));

  return findings;
}
