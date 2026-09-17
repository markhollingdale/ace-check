import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Severity } from '../../types.js';
import { runBinary, safeJson } from './exec.js';
import { scannerFinding } from './finding.js';
import type { Scanner } from './types.js';

interface SemgrepResult {
  check_id: string;
  path: string;
  start?: { line?: number };
  extra?: {
    message?: string;
    severity?: string;
    metadata?: {
      category?: string;
      cwe?: string[] | string;
      owasp?: string[] | string;
      references?: string[];
      confidence?: string;
    };
  };
}

interface SemgrepReport {
  results?: SemgrepResult[];
}

function mapSeverity(value: string | undefined): Severity {
  switch ((value || '').toUpperCase()) {
    case 'ERROR':
      return 'high';
    case 'WARNING':
      return 'medium';
    case 'INFO':
      return 'low';
    default:
      return 'medium';
  }
}

function firstString(value: string[] | string | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export const semgrepScanner: Scanner = {
  descriptor: {
    id: 'semgrep',
    stage: 'sast',
    label: 'Semgrep CE',
    description: 'Pattern-based static analysis (SAST) across the codebase.',
    source: 'static',
    target: 'codebase',
    binaries: ['semgrep'],
    install: {
      windows: 'winget install semgrep.semgrep',
      macos: 'brew install semgrep',
      linux: 'pipx install semgrep',
      docs: 'https://semgrep.dev/docs/getting-started/',
    },
  },
  async run(ctx) {
    if (!ctx.codebasePath) return [];
    await mkdir(ctx.artifactDir, { recursive: true });
    ctx.onProgress?.('Running semgrep --config=auto');
    const result = await runBinary(
      'semgrep',
      [
        '--config=auto',
        '--json',
        '--quiet',
        '--no-git-ignore',
        '--max-target-bytes',
        '2000000',
        ctx.codebasePath,
      ],
      { timeoutMs: 300_000 },
    );
    const report = safeJson<SemgrepReport>(result.stdout);
    if (!report?.results) return [];

    return report.results.slice(0, 2000).map((r) => {
      const ruleName = r.check_id?.split('.').slice(-1)[0] ?? 'rule';
      const relPath = ctx.codebasePath
        ? path.relative(ctx.codebasePath, r.path) || r.path
        : r.path;
      const cwe = firstString(r.extra?.metadata?.cwe);
      return scannerFinding({
        prefix: 'SEMG',
        source: 'static',
        category: 'security',
        domain: 'SECURITY',
        severity: mapSeverity(r.extra?.severity),
        title: `${ruleName} - ${relPath}`,
        description: r.extra?.message || `Semgrep rule ${r.check_id} matched.`,
        evidence: { file: relPath, line: r.start?.line, proof: 'confirmed' },
        recommendation: cwe
          ? `Review the match and remediate (${cwe}). See the Semgrep rule for guidance.`
          : 'Review the match and remediate; see the Semgrep rule for guidance.',
        effort: '30m',
        correlationKeys: ['security'],
      });
    });
  },
};
