import path from 'node:path';
import type { Finding } from '../../types.js';
import { listFiles, makeFinding, readTextFile, relativePath } from './util.js';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const UNSAFE_ANY = /(:\s*any\b|\bas\s+any\b|<any>|any\[\]|Array<any>|Promise<any>)/;

export async function runConfigAudit(codebasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const tsconfigRaw = await readTextFile(path.join(codebasePath, 'tsconfig.json'));
  if (tsconfigRaw == null) return findings;

  let tsconfig: { compilerOptions?: Record<string, unknown> } = {};
  try {
    tsconfig = JSON.parse(tsconfigRaw) as typeof tsconfig;
  } catch {
    return findings;
  }

  if (tsconfig.compilerOptions?.strict !== true) {
    findings.push(
      makeFinding({
        prefix: 'CONFIG',
        category: 'config',
        domain: 'CODE_QUALITY',
        severity: 'high',
        title: 'TypeScript strict mode is not enabled',
        description: 'tsconfig.json does not set compilerOptions.strict to true.',
        evidence: { file: 'tsconfig.json', proof: 'confirmed' },
        recommendation: 'Enable strict: true and fix the resulting type errors incrementally.',
      }),
    );
  }

  const files = await listFiles(codebasePath, { extensions: TS_EXTENSIONS });
  let anyCount = 0;
  let tsIgnoreCount = 0;
  let eslintDisableCount = 0;
  const anyEvidence: { file: string; line: number }[] = [];
  const ignoreEvidence: { file: string; line: number }[] = [];

  for (const file of files) {
    const content = await readTextFile(file);
    if (content == null) continue;
    const rel = relativePath(file, codebasePath);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      if (UNSAFE_ANY.test(line)) {
        anyCount++;
        if (anyEvidence.length < 5) anyEvidence.push({ file: rel, line: i + 1 });
      }
      if (line.includes('@ts-ignore')) {
        tsIgnoreCount++;
        if (ignoreEvidence.length < 5) ignoreEvidence.push({ file: rel, line: i + 1 });
      }
      if (line.includes('eslint-disable')) {
        eslintDisableCount++;
      }
    }
  }

  if (anyCount > 0) {
    findings.push(
      makeFinding({
        prefix: 'CONFIG',
        category: 'config',
        domain: 'CODE_QUALITY',
        severity: anyCount >= 20 ? 'medium' : 'low',
        title: 'Unsafe any usage detected',
        description: `${anyCount} unsafe any usage(s) (e.g., ${anyEvidence[0].file}:${anyEvidence[0].line}).`,
        evidence: { file: anyEvidence[0].file, line: anyEvidence[0].line, proof: 'confirmed' },
        recommendation: 'Replace any with precise types or unknown, and remove unsafe casts.',
      }),
    );
  }

  if (tsIgnoreCount > 0) {
    findings.push(
      makeFinding({
        prefix: 'CONFIG',
        category: 'config',
        domain: 'CODE_QUALITY',
        severity: 'medium',
        title: '@ts-ignore suppressions present',
        description: `${tsIgnoreCount} @ts-ignore comment(s) (e.g., ${ignoreEvidence[0].file}:${ignoreEvidence[0].line}).`,
        evidence: { file: ignoreEvidence[0].file, line: ignoreEvidence[0].line, proof: 'confirmed' },
        recommendation: 'Replace @ts-ignore with @ts-expect-error or fix the underlying type error.',
      }),
    );
  }

  if (eslintDisableCount > 0) {
    findings.push(
      makeFinding({
        prefix: 'CONFIG',
        category: 'config',
        domain: 'CODE_QUALITY',
        severity: 'info',
        title: 'ESLint disable comments present',
        description: `${eslintDisableCount} eslint-disable comment(s).`,
        evidence: { file: '—', proof: 'confirmed' },
        recommendation: 'Review and justify each disabled rule.',
      }),
    );
  }

  return findings;
}
