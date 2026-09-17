import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Finding } from '../../types.js';

export function findingsMarkdown(findings: Finding[]): string {
  const counts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity] += 1;

  const lines: string[] = ['# Code Checks', ''];
  lines.push(`**${findings.length}** finding(s)`);
  for (const [sev, n] of Object.entries(counts)) {
    if (n > 0) lines.push(`- ${sev}: ${n}`);
  }
  lines.push('');

  for (const f of findings) {
    const loc = f.evidence.file
      ? ` \`${f.evidence.file}${f.evidence.line ? `:${f.evidence.line}` : ''}\``
      : '';
    lines.push(`## [${f.severity}] ${f.title}${loc}`);
    lines.push('');
    lines.push(f.description);
    if (f.recommendation) {
      lines.push('');
      lines.push(`**Fix:** ${f.recommendation}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function writeChecksReport(
  codebasePath: string,
  findings: Finding[],
): Promise<{ jsonPath: string; markdownPath: string }> {
  const dir = path.join(codebasePath, '.acecheck');
  await mkdir(dir, { recursive: true });
  const jsonPath = path.join(dir, 'checks.json');
  const markdownPath = path.join(dir, 'checks.md');
  await writeFile(jsonPath, JSON.stringify(findings, null, 2), 'utf8');
  await writeFile(markdownPath, findingsMarkdown(findings), 'utf8');
  return { jsonPath, markdownPath };
}
