import type { Finding } from '../../types.js';
import { listFiles, makeFinding, readTextFile, relativePath } from './util.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export async function runHygieneScan(codebasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await listFiles(codebasePath, { extensions: SOURCE_EXTENSIONS });

  let consoleCount = 0;
  let todoCount = 0;
  const consoleEvidence: { file: string; line: number }[] = [];
  const todoEvidence: { file: string; line: number }[] = [];
  const oversized: { file: string; lines: number }[] = [];

  for (const file of files) {
    const content = await readTextFile(file);
    if (content == null) continue;
    const rel = relativePath(file, codebasePath);
    const lines = content.split('\n');
    if (lines.length > 500) oversized.push({ file: rel, lines: lines.length });
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/\b(TODO|FIXME)\b/.test(line)) {
        todoCount++;
        if (todoEvidence.length < 5) todoEvidence.push({ file: rel, line: i + 1 });
      }
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      if (/\bconsole\.(log|debug|warn|error)\b/.test(line)) {
        consoleCount++;
        if (consoleEvidence.length < 5) consoleEvidence.push({ file: rel, line: i + 1 });
      }
    }
  }

  if (consoleCount > 0) {
    findings.push(
      makeFinding({
        prefix: 'HYG',
        category: 'hygiene',
        domain: 'CODE_QUALITY',
        severity: 'low',
        title: 'Console statements in source',
        description: `${consoleCount} console.* statement(s) (e.g., ${consoleEvidence[0].file}:${consoleEvidence[0].line}).`,
        evidence: { file: consoleEvidence[0].file, line: consoleEvidence[0].line, proof: 'confirmed' },
        recommendation: 'Remove debug logging or replace it with a structured logger.',
      }),
    );
  }

  if (todoCount > 0) {
    findings.push(
      makeFinding({
        prefix: 'HYG',
        category: 'hygiene',
        domain: 'CODE_QUALITY',
        severity: 'info',
        title: 'TODO/FIXME markers',
        description: `${todoCount} TODO/FIXME marker(s) (e.g., ${todoEvidence[0].file}:${todoEvidence[0].line}).`,
        evidence: { file: todoEvidence[0].file, line: todoEvidence[0].line, proof: 'confirmed' },
        recommendation: 'Triage and track TODOs rather than leaving them silently in code.',
      }),
    );
  }

  for (const o of oversized.slice(0, 5)) {
    findings.push(
      makeFinding({
        prefix: 'HYG',
        category: 'hygiene',
        domain: 'CODE_QUALITY',
        severity: 'info',
        title: `Oversized file: ${o.file}`,
        description: `${o.file} is ${o.lines} lines; consider splitting it.`,
        evidence: { file: o.file, proof: 'confirmed' },
        recommendation: 'Break the file into smaller, focused modules.',
      }),
    );
  }

  return findings;
}
