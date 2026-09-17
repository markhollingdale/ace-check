import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runBinary, safeJson } from './exec.js';
import { scannerFinding } from './finding.js';
import { hostAllowed, type Scanner } from './types.js';

interface FfufResult {
  url?: string;
  status?: number;
  length?: number;
  words?: number;
  lines?: number;
  'content-type'?: string;
  redirectlocation?: string;
}

interface FfufReport {
  results?: FfufResult[];
}

/** A deliberately small, high-signal discovery list. Not a wordlist replacement. */
const PATHS = [
  'admin',
  'api',
  'api/admin',
  'api/internal',
  'debug',
  'actuator',
  'actuator/health',
  'metrics',
  'health',
  'status',
  '.git/config',
  '.env',
  '.env.local',
  'backup',
  'backup.zip',
  'config',
  'config.json',
  'graphql',
  'swagger',
  'swagger.json',
  'openapi.json',
  'api-docs',
  'server-status',
  'phpinfo.php',
  'robots.txt',
  'sitemap.xml',
  'wp-login.php',
  '.well-known/security.txt',
  'console',
  'test',
  'staging',
  'internal',
];

export const ffufScanner: Scanner = {
  descriptor: {
    id: 'ffuf',
    stage: 'fuzzing',
    label: 'ffuf',
    description:
      'Content and endpoint discovery against an authorised staging host.',
    source: 'dynamic',
    target: 'url',
    binaries: ['ffuf'],
    install: {
      windows: 'winget install ffuf.ffuf',
      macos: 'brew install ffuf',
      linux: 'go install github.com/ffuf/ffuf/v2@latest',
      docs: 'https://github.com/ffuf/ffuf',
    },
  },
  async run(ctx) {
    if (!ctx.targetUrl) return [];
    if (!hostAllowed(ctx.targetUrl, ctx.allowedHosts)) {
      throw new Error(
        'Target host is not in this project\'s allowlist - refusing to fuzz.',
      );
    }
    await mkdir(ctx.artifactDir, { recursive: true });
    const wordlist = path.join(ctx.artifactDir, 'acecheck-paths.txt');
    await writeFile(wordlist, PATHS.join('\n'), 'utf8');
    const reportPath = path.join(ctx.artifactDir, 'ffuf.json');

    const base = ctx.targetUrl.replace(/\/+$/, '');
    ctx.onProgress?.(`Running ffuf against ${base}`);
    await runBinary(
      'ffuf',
      [
        '-u',
        `${base}/FUZZ`,
        '-w',
        wordlist,
        '-of',
        'json',
        '-o',
        reportPath,
        '-mc',
        '200,201,204,301,302,307,401,403,405,500',
        '-t',
        '10',
        '-rate',
        '50',
        '-timeout',
        '10',
      ],
      { timeoutMs: 600_000 },
    );

    let report: FfufReport | null = null;
    try {
      report = safeJson<FfufReport>(await readFile(reportPath, 'utf8'));
    } catch {
      return [];
    }
    if (!report?.results) return [];

    return report.results.map((r) => {
      return scannerFinding({
        prefix: 'FFUF',
        source: 'dynamic',
        category: 'security',
        domain: 'SECURITY',
        severity: r.status === 200 ? 'medium' : 'low',
        title: `Discovered endpoint: ${r.url ?? 'unknown'}`,
        description: `ffuf discovered a reachable path (HTTP ${r.status ?? '?'}, ${
          r.length ?? '?'
        } bytes) that is not part of the advertised surface.`,
        evidence: { url: r.url ?? ctx.targetUrl, proof: 'confirmed' },
        recommendation:
          r.status === 401 || r.status === 403
            ? 'Confirm this endpoint should be exposed at all; if not, remove or restrict it.'
            : 'Confirm this endpoint is intended to be public. Remove or protect it if not.',
        effort: '1h',
        correlationKeys: ['security'],
      });
    });
  },
};
