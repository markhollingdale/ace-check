import type { FindingSource, StageId, StageRequirement } from '../../types.js';

export interface StageDef {
  id: StageId;
  order: number;
  label: string;
  short: string;
  source: FindingSource;
  description: string;
  requires: StageRequirement;
  /** Tools the stage drives, shown in the UI so it is clear what runs under the hood. */
  tools: string[];
  /** What the stage leaves behind, so users know where to look for results. */
  output: string;
}

export const STAGE_CATALOG: StageDef[] = [
  {
    id: 'target',
    order: 1,
    label: 'Target & tools',
    short: 'Target',
    source: 'static',
    description:
      'Reconnaissance only: it resolves the target URLs, reads the project manifest to identify the stack, and checks which scanner binaries are installed. It never reports findings.',
    requires: {},
    tools: ['package.json inspection', 'scanner detection'],
    output:
      'Recorded as target.json on the run (stack, project name, URLs) and shown in the stage detail.',
  },
  {
    id: 'sast',
    order: 2,
    label: 'Static analysis (SAST)',
    short: 'SAST',
    source: 'static',
    description:
      'Pattern-based analysis of the source code for security defects.',
    requires: { codebase: true, binaries: ['semgrep'] },
    tools: ['Semgrep CE', 'built-in config/hygiene checks (fallback)'],
    output: 'Findings with file and line evidence.',
  },
  {
    id: 'secrets',
    order: 3,
    label: 'Secrets scan',
    short: 'Secrets',
    source: 'static',
    description: 'Detects credentials committed to the repo or its history.',
    requires: { codebase: true, binaries: ['gitleaks'] },
    tools: ['Gitleaks', 'built-in secret patterns (fallback)'],
    output: 'Findings with file and line evidence.',
  },
  {
    id: 'dependencies',
    order: 4,
    label: 'Dependency & supply chain',
    short: 'Deps',
    source: 'static',
    description: 'Checks dependencies against the OSV vulnerability database.',
    requires: { codebase: true, binaries: ['osv-scanner'] },
    tools: ['OSV-Scanner', 'built-in dependency audit (fallback)'],
    output: 'Findings naming the affected package and version.',
  },
  {
    id: 'web-quality',
    order: 5,
    label: 'Web quality',
    short: 'Web',
    source: 'web',
    description:
      'Crawls the site, then runs Google Lighthouse on each selected page for performance, accessibility, best practices and SEO. One Lighthouse run per page, per device.',
    requires: { url: 'production' },
    tools: ['Google Lighthouse', 'Chrome/Chromium', 'sitemap + link crawler'],
    output:
      'Per-page Lighthouse JSON and HTML, aggregated findings, and a site summary.',
  },
  {
    id: 'attack-surface',
    order: 6,
    label: 'Attack surface',
    short: 'Ports',
    source: 'dynamic',
    description: 'Discovers open ports and services on the target host.',
    requires: { url: 'production', binaries: ['nmap'] },
    tools: ['Nmap'],
    output: 'Findings for each exposed port and service.',
  },
  {
    id: 'misconfig',
    order: 7,
    label: 'Misconfiguration & exposure',
    short: 'Misconfig',
    source: 'dynamic',
    description:
      'Template-driven checks for exposed paths, headers and known CVEs.',
    requires: { url: 'production', binaries: ['nuclei'] },
    tools: ['ProjectDiscovery Nuclei'],
    output: 'Findings with the matched template and endpoint.',
  },
  {
    id: 'dast',
    order: 8,
    label: 'Dynamic scan (DAST)',
    short: 'DAST',
    source: 'dynamic',
    description: 'Automated active scanning of the running application.',
    requires: { url: 'staging', binaries: ['docker'] },
    tools: ['OWASP ZAP baseline (via Docker)'],
    output: 'Findings with the affected URL and remediation guidance.',
  },
  {
    id: 'fuzzing',
    order: 9,
    label: 'Fuzzing & discovery',
    short: 'Fuzz',
    source: 'dynamic',
    description: 'Content and endpoint discovery against an authorised host.',
    requires: { url: 'staging', binaries: ['ffuf'] },
    tools: ['ffuf'],
    output: 'Findings for each discovered endpoint.',
  },
  {
    id: 'abuse',
    order: 10,
    label: 'Abuse & authorisation',
    short: 'Abuse',
    source: 'dynamic',
    description:
      "Imports the target project's own abuse and authorisation test results. AceCheck does not own these rules - they live with your app.",
    requires: {},
    tools: ['Playwright JSON report', 'Burp Suite XML export'],
    output: 'Findings for each failing security-relevant test.',
  },
  {
    id: 'review',
    order: 11,
    label: 'Deep review (AI)',
    short: 'Review',
    source: 'review',
    description:
      'The 16 engineering reviews, run in an agent or in-tool, then ingested.',
    requires: { codebase: true },
    tools: ['16-module review framework', 'your AI agent (or a configured API)'],
    output: 'Findings imported from each review report.',
  },
  {
    id: 'verdict',
    order: 12,
    label: 'Verdict',
    short: 'Verdict',
    source: 'static',
    description:
      'Aggregates every finding from every stage into domain verdicts, an overall production status, and the release report.',
    requires: {},
    tools: ['release gate', 'correlation engine'],
    output: 'release.md and release-ai.md on the run.',
  },
];

export function stageById(id: StageId): StageDef | undefined {
  return STAGE_CATALOG.find((s) => s.id === id);
}

export function stageOrder(id: StageId): number {
  return stageById(id)?.order ?? 99;
}

export interface RunProfile {
  id: string;
  label: string;
  description: string;
  stages: StageId[];
}

export const RUN_PROFILES: RunProfile[] = [
  {
    id: 'quick',
    label: 'Quick',
    description: 'Fast feedback: the deployed site and a verdict.',
    stages: ['target', 'web-quality', 'verdict'],
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Code-level checks plus the full site scan.',
    stages: [
      'target',
      'sast',
      'secrets',
      'dependencies',
      'web-quality',
      'verdict',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    description:
      'Static, dependency and dynamic testing against the authorised scope.',
    stages: [
      'target',
      'sast',
      'secrets',
      'dependencies',
      'misconfig',
      'dast',
      'fuzzing',
      'abuse',
      'verdict',
    ],
  },
  {
    id: 'full',
    label: 'Full',
    description: 'Every stage, including attack surface and deep review.',
    stages: STAGE_CATALOG.map((s) => s.id),
  },
];

export function runProfileById(id: string): RunProfile | undefined {
  return RUN_PROFILES.find((p) => p.id === id);
}
