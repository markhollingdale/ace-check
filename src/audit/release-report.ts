import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Finding, ReleaseGate } from '../types.js';
import type { CorrelatedGroup } from './correlate.js';

export interface ReleaseReportMeta {
  project: string;
  codebasePath?: string;
  scanId?: string;
  date: string;
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

export function releaseReportMarkdown(report: ReleaseReport): string {
  const { meta, gate, findings, correlations } = report;
  const lines: string[] = [];
  lines.push(`# Release Report — ${meta.project}`);
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

  const blocking = findings
    .filter(
      (f) =>
        (f.severity === 'critical' || f.severity === 'high') &&
        f.confidence !== 'Low',
    )
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  if (blocking.length > 0) {
    lines.push('## Blocking issues');
    lines.push('');
    for (const f of blocking) {
      const loc = f.evidence.file
        ? ` (${f.evidence.file}${f.evidence.line ? `:${f.evidence.line}` : ''})`
        : '';
      lines.push(`- **[${f.severity}] ${f.id}** — ${f.title}${loc}`);
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
  const { gate, findings, correlations } = report;
  const lines: string[] = [];
  lines.push(`Production status: ${gate.status}`);
  lines.push('');
  lines.push(
    `Critical: ${gate.severityCounts.critical} · High: ${gate.severityCounts.high} · Medium: ${gate.severityCounts.medium} · Low: ${gate.severityCounts.low}`,
  );
  lines.push('');

  const top = [...findings]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 15);
  lines.push('Top findings:');
  for (const f of top) {
    const loc = f.evidence.file
      ? ` — ${f.evidence.file}${f.evidence.line ? `:${f.evidence.line}` : ''}`
      : '';
    lines.push(`- [${f.severity}] ${f.id}: ${f.title}${loc}`);
  }
  lines.push('');

  lines.push('Correlations:');
  for (const c of correlations) {
    lines.push(
      `- ${c.key} (${c.proof}): ${c.webFindingIds.join(', ')} ↔ ${c.codeFindingIds.join(', ')}`,
    );
  }

  return lines.join('\n');
}

export function reviewFindingsPath(codebasePath: string): string {
  return path.join(codebasePath, '.acecheck', 'review-findings.json');
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
