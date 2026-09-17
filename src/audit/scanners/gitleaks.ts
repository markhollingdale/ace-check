import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runBinary, safeJson } from './exec.js';
import { scannerFinding } from './finding.js';
import type { Scanner } from './types.js';

interface GitleaksLeak {
  RuleID?: string;
  Description?: string;
  File?: string;
  StartLine?: number;
  Commit?: string;
  Author?: string;
  Match?: string;
  Secret?: string;
}

export const gitleaksScanner: Scanner = {
  descriptor: {
    id: 'gitleaks',
    stage: 'secrets',
    label: 'Gitleaks',
    description: 'Scans the working tree and git history for committed secrets.',
    source: 'static',
    target: 'codebase',
    binaries: ['gitleaks'],
    install: {
      windows: 'winget install gitleaks.gitleaks',
      macos: 'brew install gitleaks',
      linux: 'go install github.com/gitleaks/gitleaks/v8@latest',
      docs: 'https://github.com/gitleaks/gitleaks',
    },
  },
  async run(ctx) {
    if (!ctx.codebasePath) return [];
    await mkdir(ctx.artifactDir, { recursive: true });
    const reportPath = path.join(ctx.artifactDir, 'gitleaks.json');
    ctx.onProgress?.('Running gitleaks detect');
    await runBinary(
      'gitleaks',
      [
        'detect',
        '--source',
        ctx.codebasePath,
        '--report-format',
        'json',
        '--report-path',
        reportPath,
        '--no-banner',
        '--redact',
      ],
      { timeoutMs: 180_000 },
    );

    let leaks: GitleaksLeak[] = [];
    try {
      leaks = safeJson<GitleaksLeak[]>(await readFile(reportPath, 'utf8')) ?? [];
    } catch {
      return [];
    }

    return leaks.slice(0, 500).map((leak) => {
      const rel = leak.File
        ? path.relative(ctx.codebasePath!, leak.File) || leak.File
        : undefined;
      return scannerFinding({
        prefix: 'SECRET',
        source: 'static',
        category: 'security',
        domain: 'SECURITY',
        severity: 'critical',
        title: `Committed secret detected${leak.RuleID ? ` (${leak.RuleID})` : ''}`,
        description:
          leak.Description ||
          'A credential appears to be committed to the repository.',
        evidence: {
          file: rel,
          line: leak.StartLine,
          proof: 'confirmed',
        },
        recommendation:
          'Rotate the credential immediately, remove it from history (e.g. git-filter-repo), and load it from an environment variable instead.',
        effort: '1h',
        correlationKeys: ['security'],
      });
    });
  },
};
