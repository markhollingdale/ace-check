import { mkdir } from 'node:fs/promises';
import { parseJsonLines, runBinary } from './exec.js';
import { normaliseSeverity, scannerFinding } from './finding.js';
import { hostAllowed, type Scanner } from './types.js';

interface NucleiLine {
  'template-id'?: string;
  'matched-at'?: string;
  host?: string;
  type?: string;
  info?: {
    name?: string;
    severity?: string;
    description?: string;
    tags?: string[] | string;
    classification?: {
      'cve-id'?: string[] | string;
      'cwe-id'?: string[] | string;
    };
  };
}

export const nucleiScanner: Scanner = {
  descriptor: {
    id: 'nuclei',
    stage: 'misconfig',
    label: 'Nuclei',
    description:
      'Template-driven checks for misconfiguration, exposure and known CVEs.',
    source: 'dynamic',
    target: 'url',
    binaries: ['nuclei'],
    install: {
      windows: 'winget install ProjectDiscovery.nuclei',
      macos: 'brew install nuclei',
      linux: 'go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      docs: 'https://docs.projectdiscovery.io/tools/nuclei/overview',
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
    ctx.onProgress?.(`Running nuclei against ${ctx.targetUrl}`);
    const result = await runBinary(
      'nuclei',
      [
        '-u',
        ctx.targetUrl,
        '-jsonl',
        '-silent',
        '-no-color',
        '-severity',
        'low,medium,high,critical',
        '-rate-limit',
        '50',
        '-bulk-size',
        '10',
        '-timeout',
        '10',
      ],
      { timeoutMs: 600_000 },
    );

    return parseJsonLines<NucleiLine>(result.stdout)
      .slice(0, 1000)
      .map((line) =>
        scannerFinding({
          prefix: 'NUC',
          source: 'dynamic',
          category: 'security',
          domain: 'SECURITY',
          severity: normaliseSeverity(line.info?.severity),
          title: line.info?.name || line['template-id'] || 'Nuclei finding',
          description:
            line.info?.description ||
            `Matched template ${line['template-id'] ?? 'unknown'} at ${
              line['matched-at'] ?? ctx.targetUrl
            }.`,
          evidence: {
            url: line['matched-at'] ?? ctx.targetUrl,
            proof: 'confirmed',
          },
          recommendation:
            'Review the matched endpoint/template and remediate the reported exposure.',
          effort: '1h',
          correlationKeys: ['security'],
        }),
      );
  },
};
