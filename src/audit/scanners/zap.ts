import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Severity } from '../../types.js';
import { runBinary, safeJson } from './exec.js';
import { scannerFinding } from './finding.js';
import { hostAllowed, hostOf, type Scanner } from './types.js';

interface ZapInstance {
  uri?: string;
  method?: string;
  evidence?: string;
}

interface ZapAlert {
  alert?: string;
  name?: string;
  riskdesc?: string;
  desc?: string;
  solution?: string;
  reference?: string;
  cweid?: string;
  wascid?: string;
  instances?: ZapInstance[];
}

interface ZapReport {
  site?: { '@name'?: string; alerts?: ZapAlert[] }[];
}

function riskToSeverity(riskdesc: string | undefined): Severity {
  const risk = (riskdesc || '').toLowerCase();
  if (risk.startsWith('high')) return 'high';
  if (risk.startsWith('medium')) return 'medium';
  if (risk.startsWith('low')) return 'low';
  return 'info';
}

/**
 * The ZAP baseline scan is run through Docker so users do not have to install
 * the full ZAP desktop distribution. Falls back to a local `zap-baseline.py`
 * only if Docker is unavailable.
 */
export const zapScanner: Scanner = {
  descriptor: {
    id: 'zap',
    stage: 'dast',
    label: 'OWASP ZAP',
    description:
      'Automated dynamic application security testing (DAST) baseline scan.',
    source: 'dynamic',
    target: 'url',
    binaries: ['docker'],
    install: {
      windows: 'winget install Docker.DockerDesktop',
      linux: 'Install Docker Engine (https://docs.docker.com/engine/install/)',
      docs: 'https://www.zaproxy.org/docs/docker/baseline-scan/',
    },
  },
  async run(ctx) {
    if (!ctx.targetUrl) return [];
    if (!hostAllowed(ctx.targetUrl, ctx.allowedHosts)) {
      throw new Error(
        'Target host is not in this project\'s allowlist - refusing to scan.',
      );
    }
    await mkdir(ctx.artifactDir, { recursive: true });
    const reportPath = path.join(ctx.artifactDir, 'zap-report.json');
    ctx.onProgress?.(`Running ZAP baseline against ${hostOf(ctx.targetUrl)}`);
    await runBinary(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${ctx.artifactDir}:/zap/wrk:rw`,
        'ghcr.io/zaproxy/zaproxy:stable',
        'zap-baseline.py',
        '-t',
        ctx.targetUrl,
        '-J',
        'zap-report.json',
        '-I',
        '-m',
        '5',
      ],
      { timeoutMs: 900_000 },
    );

    let report: ZapReport | null = null;
    try {
      report = safeJson<ZapReport>(await readFile(reportPath, 'utf8'));
    } catch {
      return [];
    }
    if (!report?.site) return [];

    const findings = [];
    for (const site of report.site) {
      for (const alert of site.alerts ?? []) {
        const instance = alert.instances?.[0];
        const severity = riskToSeverity(alert.riskdesc);
        if (severity === 'info') continue;
        findings.push(
          scannerFinding({
            prefix: 'ZAP',
            source: 'dynamic',
            category: 'security',
            domain: 'SECURITY',
            severity,
            title: alert.alert || alert.name || 'ZAP alert',
            description: alert.desc?.replace(/<[^>]+>/g, '').slice(0, 600) || '',
            evidence: {
              url: instance?.uri ?? ctx.targetUrl,
              proof: 'confirmed',
            },
            recommendation:
              alert.solution?.replace(/<[^>]+>/g, '').slice(0, 400) ||
              'Review and remediate the reported issue.',
            correlationKeys: ['security'],
          }),
        );
      }
    }
    return findings;
  },
};
