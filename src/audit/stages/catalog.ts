import type { FindingSource, StageId, StageRequirement } from '../../types.js';

export interface StageDef {
  id: StageId;
  order: number;
  label: string;
  short: string;
  source: FindingSource;
  description: string;
  requires: StageRequirement;
}

export const STAGE_CATALOG: StageDef[] = [
  {
    id: 'target',
    order: 1,
    label: 'Target & tools',
    short: 'Target',
    source: 'static',
    description:
      'Resolves the target, detects the stack, and probes for installed scanners.',
    requires: {},
  },
  {
    id: 'sast',
    order: 2,
    label: 'Static analysis (SAST)',
    short: 'SAST',
    source: 'static',
    description: 'Pattern-based analysis of the source for security defects.',
    requires: { codebase: true, binaries: ['semgrep'] },
  },
  {
    id: 'secrets',
    order: 3,
    label: 'Secrets scan',
    short: 'Secrets',
    source: 'static',
    description: 'Detects credentials committed to the repo or its history.',
    requires: { codebase: true, binaries: ['gitleaks'] },
  },
  {
    id: 'dependencies',
    order: 4,
    label: 'Dependency & supply chain',
    short: 'Deps',
    source: 'static',
    description: 'Checks dependencies against the OSV vulnerability database.',
    requires: { codebase: true, binaries: ['osv-scanner'] },
  },
  {
    id: 'web-quality',
    order: 5,
    label: 'Web quality',
    short: 'Web',
    source: 'web',
    description:
      'Crawls the site and runs Lighthouse for performance, accessibility and SEO.',
    requires: { url: 'production' },
  },
  {
    id: 'attack-surface',
    order: 6,
    label: 'Attack surface',
    short: 'Ports',
    source: 'dynamic',
    description: 'Discovers open ports and services on the target host.',
    requires: { url: 'production', binaries: ['nmap'] },
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
  },
  {
    id: 'dast',
    order: 8,
    label: 'Dynamic scan (DAST)',
    short: 'DAST',
    source: 'dynamic',
    description: 'Automated active scanning of the running application.',
    requires: { url: 'staging', binaries: ['docker'] },
  },
  {
    id: 'fuzzing',
    order: 9,
    label: 'Fuzzing & discovery',
    short: 'Fuzz',
    source: 'dynamic',
    description: 'Content and endpoint discovery against an authorised host.',
    requires: { url: 'staging', binaries: ['ffuf'] },
  },
  {
    id: 'abuse',
    order: 10,
    label: 'Abuse & authorisation',
    short: 'Abuse',
    source: 'dynamic',
    description:
      'Imports the target project\'s own abuse/authorisation test results.',
    requires: {},
  },
  {
    id: 'review',
    order: 11,
    label: 'Deep review (AI)',
    short: 'Review',
    source: 'review',
    description:
      'The 16 engineering reviews - run in an agent or in-tool, then ingested.',
    requires: { codebase: true },
  },
  {
    id: 'verdict',
    order: 12,
    label: 'Verdict',
    short: 'Verdict',
    source: 'static',
    description: 'Aggregates every finding into a release gate and report.',
    requires: {},
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
