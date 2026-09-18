import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Finding, ReleaseGate, RunEnvironment } from '../types.js';
import type { CorrelatedGroup } from './correlate.js';
import { groupFindings } from './groups.js';
import { findingBlock } from './ai-prompts.js';
import { targetStateDir } from '../paths.js';

export interface ReleaseReportMeta {
  project: string;
  codebasePath?: string;
  scanId?: string;
  date: string;
  environment?: RunEnvironment;
}

export interface ReleaseReport {
  meta: ReleaseReportMeta;
  gate: ReleaseGate;
  findings: Finding[];
  correlations: CorrelatedGroup[];
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const CODE_STAGE_IDS = ['sast', 'secrets', 'dependencies', 'abuse', 'review'];

function hasCodeStage(environment: RunEnvironment | undefined): boolean {
  return Boolean(environment?.stages.some((s) => CODE_STAGE_IDS.includes(s)));
}

function limitationLines(environment: RunEnvironment | undefined): string[] {
  if (!environment || hasCodeStage(environment)) return [];
  return [
    'Profile limitation: no code stage ran, so no finding is mapped to source files and cross-source correlations are empty. Run the standard or full profile with a codebase path for file-level mapping.',
    '',
  ];
}

function dispositionsLine(gate: ReleaseGate): string {
  const d = gate.dispositions;
  return `Dispositions: genuine ${d.genuine} | expected ${d.expected} | third-party ${d['third-party']} | not-actionable ${d['not-actionable']} | needs-investigation ${d['needs-investigation']}`;
}

function environmentLines(environment: RunEnvironment | undefined): string[] {
  if (!environment) return [];
  const lines: string[] = ['## Environment', ''];
  if (environment.targetUrl) lines.push(`- Target: ${environment.targetUrl}`);
  if (environment.scannedAt) lines.push(`- Scanned at: ${environment.scannedAt}`);
  lines.push(
    `- Authenticated: ${environment.authenticated ? 'yes' : 'no (anonymous crawl)'}`,
  );
  if (environment.profileId) lines.push(`- Profile: ${environment.profileId}`);
  if (environment.stages.length > 0) {
    lines.push(`- Stages: ${environment.stages.join(', ')}`);
  }
  if (environment.codebasePath) lines.push(`- Codebase: ${environment.codebasePath}`);
  if (environment.manifest?.name) {
    lines.push(
      `- Project manifest: ${environment.manifest.name}${
        environment.manifest.version ? `@${environment.manifest.version}` : ''
      }`,
    );
  }
  if (environment.git?.commit) {
    lines.push(
      `- Commit: ${environment.git.commit}${
        environment.git.branch ? ` (${environment.git.branch})` : ''
      }${environment.git.dirty ? ' [dirty working tree]' : ''}`,
    );
  }
  if (environment.codebaseMatch) {
    lines.push(`- Codebase match: ${environment.codebaseMatch}`);
  }
  lines.push('');
  return lines;
}

export function releaseReportMarkdown(report: ReleaseReport): string {
  const { meta, gate, findings, correlations } = report;
  const lines: string[] = [];
  lines.push(`# Release Report - ${meta.project}`);
  lines.push('');
  lines.push(`**Date:** ${meta.date}`);
  lines.push('');
  lines.push('## Production Status');
  lines.push('');
  lines.push('```');
  lines.push(gate.status);
  lines.push('```');
  lines.push('');
  lines.push('## Domain verdicts');
  lines.push('');
  lines.push('| Domain | Verdict | Critical | High | Medium | Low |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const d of gate.domains) {
    lines.push(
      `| ${d.domain} | ${d.verdict} | ${d.critical} | ${d.high} | ${d.medium} | ${d.low} |`,
    );
  }
  lines.push('');
  lines.push('## Severity summary');
  lines.push('');
  lines.push(
    `Critical: ${gate.severityCounts.critical} · High: ${gate.severityCounts.high} · Medium: ${gate.severityCounts.medium} · Low: ${gate.severityCounts.low}`,
  );
  lines.push('');
  lines.push(dispositionsLine(gate));
  lines.push('');
  lines.push(
    'Counts include only primary, genuine findings; derived symptoms and intentional/third-party findings are listed but not gated.',
  );
  lines.push('');

  if (meta.environment) {
    lines.push(...environmentLines(meta.environment));
  }
  lines.push(...limitationLines(meta.environment));

  if (gate.groups.length > 0) {
    lines.push('## Root-cause groups');
    lines.push('');
    for (const group of gate.groups) {
      lines.push(
        `- **${group.label}** (primary \`${group.primary}\`): ${group.members.join(', ')}`,
      );
      lines.push(`  ${group.summary}`);
    }
    lines.push('');
  }

  const blocking = findings
    .filter(
      (f) =>
        (f.severity === 'critical' || f.severity === 'high') &&
        f.confidence !== 'Low' &&
        f.groupRole !== 'derived' &&
        (f.disposition === undefined || f.disposition === 'genuine'),
    )
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  if (blocking.length > 0) {
    lines.push('## Blocking issues');
    lines.push('');
    for (const f of blocking) {
      const loc = f.evidence.file
        ? ` (${f.evidence.file}${f.evidence.line ? `:${f.evidence.line}` : ''})`
        : '';
      lines.push(`- **[${f.severity}] ${f.id}** - ${f.title}${loc}`);
    }
    lines.push('');
  }

  if (correlations.length > 0) {
    lines.push('## Correlated findings');
    lines.push('');
    for (const c of correlations) {
      lines.push(
        `- \`${c.key}\` (${c.proof}): web ${c.webFindingIds.join(', ')} ↔ code ${c.codeFindingIds.join(', ')}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function releaseReportAiMarkdown(report: ReleaseReport): string {
  const { meta, gate, findings, correlations } = report;
  const lines: string[] = [];
  lines.push(`# Release report (AI) - ${meta.project}`);
  lines.push('');
  lines.push(`Production status: ${gate.status}`);
  lines.push('');
  lines.push(
    `Critical: ${gate.severityCounts.critical} · High: ${gate.severityCounts.high} · Medium: ${gate.severityCounts.medium} · Low: ${gate.severityCounts.low}`,
  );
  lines.push('');
  lines.push(dispositionsLine(gate));
  lines.push('');
  lines.push(
    'Counts include only primary, genuine findings; derived symptoms and intentional/third-party findings are listed but not gated.',
  );
  lines.push('');

  if (meta.environment) {
    lines.push(...environmentLines(meta.environment));
  }
  lines.push(...limitationLines(meta.environment));

  if (gate.groups.length > 0) {
    lines.push('## Root-cause groups');
    lines.push('');
    for (const group of gate.groups) {
      lines.push(
        `- ${group.label} (primary ${group.primary}): ${group.members.join(', ')}`,
      );
      lines.push(`  ${group.summary}`);
    }
    lines.push('');
  }

  const { findings: tagged } = groupFindings(findings);
  tagged.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (a.groupRole === 'derived' ? 1 : 0) - (b.groupRole === 'derived' ? 1 : 0),
  );

  lines.push(
    '## Instructions',
    '',
    'Work through each finding below and produce: which are genuine, the root cause and where it lives in the code, a prioritised plan, and for each change the smallest safe edit plus verification. Prefer shared root causes over treating each symptom separately.',
    '',
    `## Findings (${tagged.length})`,
    '',
  );

  if (tagged.length === 0) {
    lines.push('No findings.');
    lines.push('');
  } else {
    tagged.forEach((finding, i) => {
      lines.push(findingBlock(finding, i + 1));
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  if (correlations.length > 0) {
    lines.push('## Correlated findings');
    lines.push('');
    for (const c of correlations) {
      lines.push(
        `- ${c.key} (${c.proof}): ${c.webFindingIds.join(', ')} <-> ${c.codeFindingIds.join(', ')}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function reviewFindingsPath(codebasePath: string): string {
  return path.join(targetStateDir(codebasePath), 'review-findings.json');
}

export function readReviewFindings(codebasePath: string): Finding[] {
  const p = reviewFindingsPath(codebasePath);
  if (!existsSync(p)) return [];
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as unknown;
    return Array.isArray(parsed) ? (parsed as Finding[]) : [];
  } catch {
    return [];
  }
}

export function writeReviewFindings(
  codebasePath: string,
  findings: Finding[],
): void {
  const p = reviewFindingsPath(codebasePath);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(findings, null, 2), 'utf8');
}
