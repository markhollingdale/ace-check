import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  Finding,
  Project,
  Run,
  ScanItem,
  Severity,
  StageId,
  StageProgress,
  StageState,
  StageStatus,
  StageTask,
} from '../../types.js';
import { defaultConfig } from '../../config.js';
import { runScan } from '../../scanner/scanner.js';
import { readIssues } from '../../storage/storage.js';
import {
  newRunId,
  readStageFindings,
  severityCountsFor,
  stageArtifactDir,
  writeRun,
  writeRunFindings,
  writeRunReport,
  writeStageFindings,
} from '../../storage/projects.js';
import { issueToFinding, correlate } from '../correlate.js';
import { buildReleaseGate } from '../gate.js';
import {
  readReviewFindings,
  releaseReportAiMarkdown,
  releaseReportMarkdown,
} from '../release-report.js';
import { runCodeChecks, type CheckName } from '../checks/index.js';
import {
  describeScanner,
  listScannerDescriptors,
  scannersForStage,
} from '../scanners/registry.js';
import { parseImportedReport } from '../scanners/import.js';
import { hostAllowed, type ScannerContext } from '../scanners/types.js';
import { STAGE_CATALOG, runProfileById, type StageDef } from './catalog.js';

export interface RunCallbacks {
  onProgress?: (progress: StageProgress) => void;
  shouldCancel?: () => boolean;
}

const SCANNER_FALLBACK: Partial<Record<StageId, CheckName[]>> = {
  sast: ['config', 'hygiene'],
  secrets: ['secrets'],
  dependencies: ['dependencies'],
};

function defFor(id: StageId): StageDef {
  const def = STAGE_CATALOG.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown stage: ${id}`);
  return def;
}

function defOrder(id: StageId): number {
  return defFor(id).order;
}

function emptyCounts(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

function targetUrlFor(
  project: Project,
  requirement: 'production' | 'staging' | undefined,
): string | undefined {
  if (requirement === 'staging') return project.targets.stagingUrl;
  return project.targets.productionUrl ?? project.targets.stagingUrl;
}

/** Whether a stage's preconditions are satisfied right now. */
export function precondition(
  project: Project,
  def: StageDef,
): { ok: boolean; reason?: string } {
  const req = def.requires;
  if (req.codebase && !project.targets.codebasePath) {
    return { ok: false, reason: 'Needs a codebase path - set one in Settings.' };
  }
  if (req.url) {
    const url = targetUrlFor(project, req.url);
    if (!url) {
      return {
        ok: false,
        reason:
          req.url === 'staging'
            ? 'Needs a staging URL - set one in Settings.'
            : 'Needs a target URL - set one in Settings.',
      };
    }
    if (
      (def.id === 'dast' || def.id === 'fuzzing') &&
      !hostAllowed(url, project.allowedHosts)
    ) {
      return { ok: false, reason: 'Target host is not in the allowlist.' };
    }
  }
  if (
    def.id === 'abuse' &&
    !project.reportImports?.playwright &&
    !project.reportImports?.burp
  ) {
    return {
      ok: false,
      reason: 'No imported test report configured (Settings → Report imports).',
    };
  }
  return { ok: true };
}

export function makeStageState(
  project: Project,
  def: StageDef,
  override?: Partial<StageState>,
): StageState {
  const pre = precondition(project, def);
  return {
    id: def.id,
    label: def.label,
    source: def.source,
    status: pre.ok ? 'ready' : 'blocked',
    requires: def.requires,
    severityCounts: emptyCounts(),
    findings: 0,
    message: pre.reason,
    ...override,
  };
}

/** The full catalogue with current availability - the project pipeline view. */
export function projectStagePlan(
  project: Project,
  run?: Run | null,
): StageState[] {
  const byId = new Map((run?.stages ?? []).map((s) => [s.id, s]));
  return STAGE_CATALOG.map((def) => {
    const existing = byId.get(def.id);
    return existing ?? makeStageState(project, def);
  });
}

export function planRun(
  project: Project,
  profileId: string,
  stagesOverride?: StageId[],
): Run {
  const profile = runProfileById(profileId) ?? runProfileById('standard')!;
  const selected =
    stagesOverride && stagesOverride.length > 0
      ? stagesOverride
          .filter((id) => STAGE_CATALOG.some((s) => s.id === id))
          .sort((a, b) => defOrder(a) - defOrder(b))
      : profile.stages;
  const stages = selected.map((id) => makeStageState(project, defFor(id)));
  return {
    id: newRunId(project.id),
    projectId: project.id,
    profileId: profile.id,
    label:
      stagesOverride && stagesOverride.length === 1
        ? defFor(selected[0]).label
        : profile.label,
    status: 'pending',
    stages,
    startedAt: new Date().toISOString(),
  };
}

// --- Individual stage execution -------------------------------------------

async function runTargetStage(
  project: Project,
  runId: string,
  emit: (message: string) => void,
): Promise<Finding[]> {
  const info: Record<string, unknown> = {
    productionUrl: project.targets.productionUrl,
    stagingUrl: project.targets.stagingUrl,
    codebasePath: project.targets.codebasePath,
    allowedHosts: project.allowedHosts,
    authorised: project.authorised,
  };

  const scanners = await listScannerDescriptors();
  info.scanners = scanners.map((s) => ({
    id: s.id,
    label: s.label,
    stage: s.stage,
    available: s.available,
    version: s.version ?? null,
  }));
  const available = scanners.filter((s) => s.available).map((s) => s.label);
  info.availableScanners = available;
  info.missingScanners = scanners
    .filter((s) => !s.available)
    .map((s) => s.label);

  if (project.targets.codebasePath) {
    try {
      const raw = await readFile(
        path.join(project.targets.codebasePath, 'package.json'),
        'utf8',
      );
      const pkg = JSON.parse(raw) as {
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const stack: string[] = [];
      if (deps.next) stack.push(`Next.js ${deps.next.replace(/[\^~]/, '')}`);
      if (deps.react) stack.push(`React ${deps.react.replace(/[\^~]/, '')}`);
      if (deps['@trpc/server']) stack.push('tRPC');
      if (deps.prisma) stack.push('Prisma');
      if (deps['drizzle-orm']) stack.push('Drizzle');
      info.stack = stack;
      info.projectName = pkg.name;
      emit(stack.length ? `Detected ${stack.join(' · ')}` : 'Project detected');
    } catch {
      emit('No package.json found - continuing');
    }
  } else {
    emit('URL-only target');
  }
  emit(
    available.length > 0
      ? `Scanners available: ${available.join(', ')}`
      : 'No external scanners installed - built-in checks will be used',
  );
  await writeRunReport(
    project.id,
    runId,
    'target.json',
    JSON.stringify(info, null, 2),
  );
  return [];
}

async function runStaticStage(
  project: Project,
  runId: string,
  stageId: StageId,
  emit: (message: string) => void,
): Promise<Finding[]> {
  const codebasePath = project.targets.codebasePath!;
  const scanner = scannersForStage(stageId)[0];
  if (scanner) {
    const descriptor = await describeScanner(scanner);
    if (descriptor.available) {
      emit(
        `Using ${descriptor.label}${descriptor.version ? ` ${descriptor.version}` : ''}`,
      );
      return scanner.run({
        codebasePath,
        allowedHosts: project.allowedHosts,
        artifactDir: stageArtifactDir(project.id, runId, stageId),
        onProgress: emit,
      });
    }
    emit(`${descriptor.label} not installed - using built-in checks`);
  }
  const fallback = SCANNER_FALLBACK[stageId] ?? [];
  return fallback.length > 0
    ? runCodeChecks(codebasePath, { checks: fallback })
    : [];
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return url;
  }
}

function toTasks(items: ScanItem[] | undefined): StageTask[] | undefined {
  if (!items || items.length === 0) return undefined;
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    status: item.status,
  }));
}

async function runWebQualityStage(
  project: Project,
  runId: string,
  emit: (message: string, tasks?: StageTask[]) => void,
  shouldCancel: () => boolean,
): Promise<Finding[]> {
  const url = project.targets.productionUrl ?? project.targets.stagingUrl;
  if (!url) return [];
  const config = defaultConfig({
    url,
    mode: 'standard',
    device: 'both',
    maxPages: 60,
    concurrency: 2,
    respectRobots: true,
  });
  emit(`Crawling ${url} to discover pages`);
  await runScan(
    config,
    {
      onProgress: (u) => {
        const tasks = toTasks(u.items);
        const total = tasks?.length ?? 0;
        const done = tasks?.filter(
          (t) => t.status === 'done' || t.status === 'failed',
        ).length ?? 0;
        const message = u.message
          ? u.message
          : u.currentUrl
            ? `Lighthouse (${done}/${total}) ${shortUrl(u.currentUrl)}`
            : `Lighthouse across ${total} page run(s)`;
        emit(message, tasks);
      },
      shouldCancel,
    },
    runId,
  );
  const issues = (await readIssues(runId)) ?? [];
  return issues.map(issueToFinding);
}

async function runDynamicStage(
  project: Project,
  runId: string,
  stageId: StageId,
  emit: (message: string) => void,
): Promise<Finding[]> {
  const def = defFor(stageId);
  const scanner = scannersForStage(stageId)[0];
  if (!scanner) return [];
  const descriptor = await describeScanner(scanner);
  if (!descriptor.available) {
    throw new Error(
      `${descriptor.label} is not installed. ${
        descriptor.install.windows ?? descriptor.install.docs
      }`,
    );
  }
  const targetUrl = targetUrlFor(project, def.requires.url);
  const ctx: ScannerContext = {
    targetUrl,
    allowedHosts: project.allowedHosts,
    artifactDir: stageArtifactDir(project.id, runId, stageId),
    onProgress: emit,
  };
  emit(
    `Using ${descriptor.label}${descriptor.version ? ` ${descriptor.version}` : ''}`,
  );
  return scanner.run(ctx);
}

async function runAbuseStage(
  project: Project,
  emit: (message: string) => void,
): Promise<Finding[]> {
  const file = project.reportImports?.playwright ?? project.reportImports?.burp;
  if (!file) return [];
  emit(`Importing test results from ${file}`);
  const raw = await readFile(file, 'utf8');
  return parseImportedReport(raw);
}

async function runReviewStage(
  project: Project,
  emit: (message: string) => void,
): Promise<Finding[]> {
  if (!project.targets.codebasePath) return [];
  const findings = readReviewFindings(project.targets.codebasePath);
  emit(
    findings.length > 0
      ? `Loaded ${findings.length} review finding(s)`
      : 'No review findings yet - generate prompts in the Review workspace',
  );
  return findings;
}

async function collectAllFindings(
  project: Project,
  run: Run,
): Promise<Finding[]> {
  const all: Finding[] = [];
  for (const stage of run.stages) {
    if (stage.id === 'verdict') continue;
    all.push(...(await readStageFindings(project.id, run.id, stage.id)));
  }
  return all;
}

async function runVerdictStage(
  project: Project,
  run: Run,
  emit: (message: string) => void,
): Promise<Finding[]> {
  const findings = await collectAllFindings(project, run);
  await writeRunFindings(project.id, run.id, findings);
  const gate = buildReleaseGate(findings);
  const correlations = correlate(findings);
  const report = {
    meta: {
      project: project.name,
      codebasePath: project.targets.codebasePath,
      scanId: run.webScanId,
      date: new Date().toISOString().slice(0, 10),
    },
    gate,
    findings,
    correlations,
  };
  await writeRunReport(
    project.id,
    run.id,
    'release.md',
    releaseReportMarkdown(report),
  );
  await writeRunReport(
    project.id,
    run.id,
    'release-ai.md',
    releaseReportAiMarkdown(report),
  );
  emit(
    `Verdict: ${gate.status} - ${gate.severityCounts.critical} critical, ${gate.severityCounts.high} high`,
  );
  return findings;
}

async function runStage(
  project: Project,
  run: Run,
  stage: StageState,
  emit: (message: string, tasks?: StageTask[]) => void,
  shouldCancel: () => boolean,
): Promise<Finding[]> {
  switch (stage.id) {
    case 'target':
      return runTargetStage(project, run.id, emit);
    case 'sast':
    case 'secrets':
    case 'dependencies':
      return runStaticStage(project, run.id, stage.id, emit);
    case 'web-quality':
      return runWebQualityStage(project, run.id, emit, shouldCancel);
    case 'attack-surface':
    case 'misconfig':
    case 'dast':
    case 'fuzzing':
      return runDynamicStage(project, run.id, stage.id, emit);
    case 'abuse':
      return runAbuseStage(project, emit);
    case 'review':
      return runReviewStage(project, emit);
    case 'verdict':
      return runVerdictStage(project, run, emit);
    default:
      return [];
  }
}

function statusFor(findings: Finding[], ran: boolean): StageStatus {
  if (!ran) return 'ready';
  return findings.length > 0 ? 'findings' : 'passed';
}

function notify(
  run: Run,
  stage: StageState,
  callbacks: RunCallbacks,
): void {
  callbacks.onProgress?.({
    projectId: run.projectId,
    runId: run.id,
    stageId: stage.id,
    status: run.status,
    stageStatus: stage.status,
    message: stage.message ?? '',
    findings: stage.findings,
    stages: run.stages,
  });
}

/** Execute one stage in place, persisting findings and updating the run. */
async function executeStageIntoRun(
  project: Project,
  run: Run,
  stage: StageState,
  callbacks: RunCallbacks,
): Promise<void> {
  const shouldCancel = callbacks.shouldCancel ?? (() => false);
  const emit = (message: string, tasks?: StageTask[]) => {
    stage.message = message;
    if (tasks) stage.tasks = tasks;
    notify(run, stage, callbacks);
  };

  if (stage.status === 'blocked' || stage.status === 'skipped') return;

  stage.status = 'running';
  stage.startedAt = new Date().toISOString();
  emit('Starting…');

  try {
    const raw = await runStage(project, run, stage, emit, shouldCancel);
    const findings = raw.map((f) => ({ ...f, stage: f.stage ?? stage.id }));
    if (stage.id !== 'verdict') {
      await writeStageFindings(project.id, run.id, stage.id, findings);
      const accumulated: Finding[] = [];
      for (const s of run.stages) {
        if (s.id === 'verdict') continue;
        accumulated.push(...(await readStageFindings(project.id, run.id, s.id)));
      }
      await writeRunFindings(project.id, run.id, accumulated);
    }
    if (stage.id === 'web-quality') run.webScanId = run.id;
    stage.severityCounts = severityCountsFor(findings);
    stage.findings = findings.length;
    stage.status = stage.id === 'verdict' ? 'passed' : statusFor(findings, true);
    stage.finishedAt = new Date().toISOString();
    stage.message = stage.message ?? 'Done';
  } catch (err) {
    stage.status = 'failed';
    stage.error = err instanceof Error ? err.message : String(err);
    stage.message = stage.error;
    stage.finishedAt = new Date().toISOString();
  }

  await writeRun(run);
  notify(run, stage, callbacks);
}

// --- Public entry points ---------------------------------------------------

export async function executeRun(
  project: Project,
  run: Run,
  callbacks: RunCallbacks = {},
): Promise<Run> {
  const shouldCancel = callbacks.shouldCancel ?? (() => false);
  const started = Date.now();
  run.status = 'running';
  await writeRun(run);

  for (const stage of run.stages) {
    if (shouldCancel()) {
      run.status = 'cancelled';
      break;
    }
    await executeStageIntoRun(project, run, stage, callbacks);
    if (shouldCancel()) {
      run.status = 'cancelled';
      break;
    }
  }

  if (run.status !== 'cancelled') {
    run.status = run.stages.some((s) => s.status === 'failed')
      ? 'failed'
      : 'done';
  }
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.now() - started;
  await writeRun(run);

  const last = run.stages[run.stages.length - 1];
  if (last) {
    last.message =
      run.status === 'done' ? 'Run complete' : `Run ${run.status}`;
    notify(run, last, callbacks);
  }
  return run;
}

/** Re-run a single stage in isolation, leaving the rest of the run intact. */
export async function executeSingleStage(
  project: Project,
  run: Run,
  stageId: StageId,
  callbacks: RunCallbacks = {},
): Promise<Run> {
  const def = defFor(stageId);
  const state = makeStageState(project, def);
  const index = run.stages.findIndex((s) => s.id === stageId);
  if (index >= 0) run.stages[index] = state;
  else {
    run.stages.push(state);
    run.stages.sort((a, b) => defOrder(a.id) - defOrder(b.id));
  }
  run.status = 'running';
  await writeRun(run);
  await executeStageIntoRun(project, run, state, callbacks);
  if (run.status === 'running') {
    run.status = run.stages.some((s) => s.status === 'failed')
      ? 'failed'
      : 'done';
    run.finishedAt = new Date().toISOString();
  }
  await writeRun(run);
  return run;
}
