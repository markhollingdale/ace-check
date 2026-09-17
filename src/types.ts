export type ScanMode = 'quick' | 'standard' | 'full';
export type Device = 'mobile' | 'desktop';
export type DeviceMode = Device | 'both';
export type Category =
  | 'performance'
  | 'accessibility'
  | 'best-practices'
  | 'seo';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ScanStatus =
  | 'discovering'
  | 'scanning'
  | 'analysing'
  | 'reporting'
  | 'done'
  | 'failed'
  | 'cancelled';
export type PageStatus = 'ok' | 'failed' | 'skipped';

export interface ScanConfig {
  url: string;
  codebasePath?: string;
  mode: ScanMode;
  maxPages: number;
  device: DeviceMode;
  concurrency: number;
  timeoutMs: number;
  respectRobots: boolean;
  includeSitemap: boolean;
  includeLinks: boolean;
  ignoredQueryParams: string[];
  userAgent?: string;
}

export interface PageScores {
  performance: number | null;
  accessibility: number | null;
  'best-practices': number | null;
  seo: number | null;
}

export interface PageMetrics {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  tbt: number | null;
  speedIndex: number | null;
  totalByteWeight: number | null;
  requestCount: number | null;
}

export interface PageIssue {
  auditId: string;
  category: Category;
  title: string;
  description: string;
  score: number | null;
  numericValue: number | null;
  displayValue: string | null;
  itemCount: number;
  items: Record<string, unknown>[];
  baseSeverity: Severity;
}

export interface PageSummary {
  slug: string;
  url: string;
  device: Device;
  template: string;
  scores: PageScores;
  metrics: PageMetrics;
  issues: PageIssue[];
  status: PageStatus;
  error?: string;
  timestamp: string;
  hasLighthouseJson: boolean;
  hasHtmlReport: boolean;
}

export interface Issue {
  id: string;
  category: Category;
  title: string;
  description: string;
  severity: Severity;
  devices: Device[];
  deviceCounts: Record<Device, number>;
  affectedPages: string[];
  affectedUrls: string[];
  count: number;
  totalPages: number;
  avgNumericValue: number | null;
  maxNumericValue: number | null;
  sumNumericValue: number | null;
  displayValue: string | null;
  affectedTemplates: { template: string; count: number }[];
  representativeUrls: string[];
  examples: Record<string, unknown>[];
  likelyCommonCause: string;
}

export interface CategoryAggregate {
  average: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
}

export interface ScanMetrics {
  lcpMedian: number | null;
  clsMedian: number | null;
  tbtMedian: number | null;
  fcpMedian: number | null;
  speedIndexMedian: number | null;
  totalByteWeightMedian: number | null;
  requestCountMedian: number | null;
}

export interface ScanSummary {
  scanId: string;
  url: string;
  timestamp: string;
  mode: ScanMode;
  device: DeviceMode;
  devices: Device[];
  pagesDiscovered: number;
  pagesScanned: number;
  pagesSucceeded: number;
  pagesFailed: number;
  scores: Record<Category, CategoryAggregate>;
  deviceScores: Record<Device, Record<Category, CategoryAggregate>>;
  metrics: ScanMetrics;
  deviceMetrics: Record<Device, ScanMetrics>;
  issueCounts: Record<Severity, number>;
  deviceIssueCounts: Record<Device, Record<Severity, number>>;
  totalIssues: number;
}

export interface ScanMetadata {
  scanId: string;
  url: string;
  codebasePath?: string;
  timestamp: string;
  mode: ScanMode;
  device: DeviceMode;
  status: ScanStatus;
  config: ScanConfig;
  pagesDiscovered: number;
  pagesScanned: number;
  pagesSucceeded: number;
  pagesFailed: number;
  durationMs?: number;
}

export type ScanItemStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ScanItem {
  key: string;
  label: string;
  kind: 'page' | 'code';
  status: ScanItemStatus;
}

export interface ProgressUpdate {
  scanId: string;
  status: ScanStatus;
  phase: string;
  discovered: number;
  scanned: number;
  succeeded: number;
  failed: number;
  total: number;
  currentUrl?: string;
  message?: string;
  items?: ScanItem[];
}

export interface ScanRecord {
  metadata: ScanMetadata;
  summary: ScanSummary | null;
  issues: Issue[];
  pages: PageSummary[];
}

export const CATEGORIES: Category[] = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
];

export const DEVICES: Device[] = ['mobile', 'desktop'];

export const DEVICE_LABELS: Record<Device, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
};

export const SEVERITIES: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export type FindingSource = 'web' | 'static' | 'dynamic' | 'review';
export type Confidence = 'High' | 'Medium' | 'Low';
export type Proof = 'confirmed' | 'likely' | 'possible';
export type FindingStatus =
  | 'detected'
  | 'confirmed'
  | 'accepted'
  | 'fixed'
  | 'verified';
export type ReleaseVerdict = 'PASS' | 'WARN' | 'FAIL';
export type ProductionStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY' | 'UNKNOWN';

export interface AuditTarget {
  url?: string;
  codebasePath?: string;
}

export interface AuditModule {
  number: number;
  title: string;
  prefix: string;
  category: string;
  domain: string;
  doc: string;
  requiresCodebase: boolean;
  consumesWebScan: boolean;
}

export interface FindingEvidence {
  file?: string;
  line?: number;
  url?: string;
  auditId?: string;
  numericValue?: number | null;
  proof: Proof;
}

export interface Finding {
  id: string;
  source: FindingSource;
  stage?: StageId;
  moduleNumber?: number;
  prefix?: string;
  category: string;
  domain: string;
  severity: Severity;
  confidence: Confidence;
  title: string;
  description: string;
  evidence: FindingEvidence;
  recommendation?: string;
  effort?: string;
  correlationKeys: string[];
  affectedPages?: string[];
  affectedFiles?: string[];
  status: FindingStatus;
}

export interface DomainVerdict {
  domain: string;
  verdict: ReleaseVerdict;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReleaseGate {
  status: ProductionStatus;
  domains: DomainVerdict[];
  severityCounts: Record<'critical' | 'high' | 'medium' | 'low', number>;
}

// ---------------------------------------------------------------------------
// Projects, runs and stages - the guided-audit model
// ---------------------------------------------------------------------------

export interface ProjectTargets {
  productionUrl?: string;
  stagingUrl?: string;
  codebasePath?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  targets: ProjectTargets;
  profileId: string;
  allowedHosts: string[];
  /** Whether the user has acknowledged they are authorised to actively test. */
  authorised: boolean;
  /** Optional report imports (produced by the target repo's own test suite). */
  reportImports?: {
    playwright?: string;
    burp?: string;
  };
}

export type StageId =
  | 'target'
  | 'sast'
  | 'secrets'
  | 'dependencies'
  | 'web-quality'
  | 'attack-surface'
  | 'misconfig'
  | 'dast'
  | 'fuzzing'
  | 'abuse'
  | 'review'
  | 'verdict';

export type StageStatus =
  | 'blocked'
  | 'ready'
  | 'running'
  | 'passed'
  | 'findings'
  | 'failed'
  | 'skipped';

export interface StageRequirement {
  codebase?: boolean;
  url?: 'production' | 'staging';
  binaries?: string[];
}

export interface StageState {
  id: StageId;
  label: string;
  source: FindingSource;
  status: StageStatus;
  requires: StageRequirement;
  severityCounts: Record<Severity, number>;
  findings: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  message?: string;
  artifacts?: string[];
}

export type RunStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

export interface Run {
  id: string;
  projectId: string;
  profileId: string;
  label: string;
  status: RunStatus;
  stages: StageState[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  /** Optional link to a legacy scan directory holding Lighthouse evidence. */
  webScanId?: string;
}

export interface StageProgress {
  projectId: string;
  runId: string;
  stageId: StageId;
  status: RunStatus;
  stageStatus: StageStatus;
  message: string;
  findings: number;
  stages: StageState[];
}

export interface ScannerDescriptor {
  id: string;
  stage: StageId;
  label: string;
  description: string;
  source: FindingSource;
  target: 'codebase' | 'url';
  binaries: string[];
  /** Copy-pasteable install instructions per platform. */
  install: { windows?: string; macos?: string; linux?: string; docs: string };
  available: boolean;
  version?: string;
}

export interface NextAction {
  rank: number;
  findingId: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  domain: string;
  source: FindingSource;
  effort?: string;
  recommendation: string;
  blastRadius: number;
}
