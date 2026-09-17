import { mkdir } from 'node:fs/promises';
import type { Severity } from '../../types.js';
import { runBinary, safeJson } from './exec.js';
import { scannerFinding } from './finding.js';
import type { Scanner } from './types.js';

interface OsvVulnerability {
  id?: string;
  summary?: string;
  details?: string;
  severity?: { type?: string; score?: string }[];
  database_specific?: { severity?: string };
  aliases?: string[];
}

interface OsvPackage {
  package?: { name?: string; version?: string; ecosystem?: string };
  vulnerabilities?: OsvVulnerability[];
}

interface OsvResult {
  source?: { path?: string };
  packages?: OsvPackage[];
}

interface OsvReport {
  results?: OsvResult[];
}

function severityFromScore(score: string | undefined): Severity | null {
  if (!score) return null;
  const match = score.match(/(\d+\.\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  if (value >= 9) return 'critical';
  if (value >= 7) return 'high';
  if (value >= 4) return 'medium';
  if (value > 0) return 'low';
  return null;
}

export const osvScanner: Scanner = {
  descriptor: {
    id: 'osv-scanner',
    stage: 'dependencies',
    label: 'OSV-Scanner',
    description:
      'Checks dependencies against the OSV database of known vulnerabilities.',
    source: 'static',
    target: 'codebase',
    binaries: ['osv-scanner'],
    install: {
      windows: 'winget install Google.OSV-Scanner',
      macos: 'brew install osv-scanner',
      linux: 'go install github.com/google/osv-scanner/cmd/osv-scanner@latest',
      docs: 'https://google.github.io/osv-scanner/',
    },
  },
  async run(ctx) {
    if (!ctx.codebasePath) return [];
    await mkdir(ctx.artifactDir, { recursive: true });
    ctx.onProgress?.('Running osv-scanner');
    const result = await runBinary(
      'osv-scanner',
      ['--format', 'json', '-r', ctx.codebasePath],
      { timeoutMs: 180_000 },
    );
    const report = safeJson<OsvReport>(result.stdout);
    if (!report?.results) return [];

    const findings = [];
    for (const source of report.results) {
      for (const pkg of source.packages ?? []) {
        for (const vuln of pkg.vulnerabilities ?? []) {
          const sev =
            severityFromScore(vuln.severity?.[0]?.score) ??
            (vuln.database_specific?.severity
              ? (vuln.database_specific.severity.toLowerCase() as Severity)
              : 'high');
          findings.push(
            scannerFinding({
              prefix: 'OSV',
              source: 'static',
              category: 'security',
              domain: 'DEPENDENCIES',
              severity: sev === 'info' ? 'low' : sev,
              title: `${pkg.package?.name ?? 'dependency'}@${
                pkg.package?.version ?? '?'
              } - ${vuln.id ?? 'known vulnerability'}`,
              description:
                vuln.summary ||
                vuln.details?.slice(0, 400) ||
                'A dependency has a known vulnerability.',
              evidence: {
                file: source.source?.path,
                proof: 'confirmed',
              },
              recommendation: `Upgrade ${pkg.package?.name ?? 'the dependency'} to a patched version${
                vuln.aliases?.length ? ` (${vuln.aliases.join(', ')})` : ''
              }.`,
              effort: '1h',
              correlationKeys: ['bundle-size', 'security'],
            }),
          );
        }
      }
    }
    return findings;
  },
};
