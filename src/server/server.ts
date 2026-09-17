import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import type { FindingStatus, ProgressUpdate } from '../types.js';
import { defaultConfig, MODE_PRESETS } from '../config.js';
import { isValidHttpUrl } from '../crawler/url.js';
import { newScanId, scansRoot } from '../storage/storage.js';
import { runScan, retryFailedPages } from '../scanner/scanner.js';
import {
  listScans,
  readMetadata,
  readSummary,
  readIssues,
  readAllPages,
  readPageSummary,
  readLighthouse,
  readHtmlReport,
  readReleaseResult,
  readReportFile,
  deleteScan,
  writeMetadata,
} from '../storage/storage.js';
import { buildComparison } from '../analyser/compare.js';
import {
  generatePrompt,
  generateIssuePrompt,
  generatePagePrompt,
  generateAllIssuesPrompt,
} from '../reports/prompts.js';
import type { ReportInput } from '../reports/markdown.js';
import { createZip } from '../reports/zip.js';
import { runCodeChecks } from '../audit/checks/index.js';
import { writeChecksReport } from '../audit/checks/report.js';
import { discoverModules } from '../audit/modules.js';
import {
  buildProjectContext,
  generateFullSuitePrompt,
  generateModulePrompt,
} from '../audit/prompts.js';
import { parseReviewReport } from '../audit/ingest.js';
import { writeReviewFindings } from '../audit/release-report.js';
import { buildRelease } from '../audit/release.js';
import { logScanError } from '../log.js';
import { AUDIT_PROFILES, profileById } from '../audit/profiles.js';
import {
  isResolved,
  readFindingStatuses,
  setFindingStatus,
} from '../audit/lifecycle.js';
import { aiConfigFromEnv, runAiReview } from '../audit/ai-runner.js';
import type {
  Project,
  Run,
  ScannerDescriptor,
  StageId,
  StageProgress,
} from '../types.js';
import {
  deleteProject,
  deleteRun,
  latestRun,
  listProjects,
  listRuns,
  newProjectId,
  readProject,
  readRun,
  readRunFindings,
  readRunReport,
  writeProject,
  writeRun,
} from '../storage/projects.js';
import {
  executeRun,
  executeSingleStage,
  planRun,
  projectStagePlan,
} from '../audit/stages/runner.js';
import { RUN_PROFILES, runProfileById } from '../audit/stages/catalog.js';
import { listScannerDescriptors } from '../audit/scanners/registry.js';
import { buildReleaseGate } from '../audit/gate.js';
import { buildNextActions } from '../audit/next-actions.js';
import { dataPaths } from '../paths.js';

interface ScanState {
  cancelled: boolean;
  progress: ProgressUpdate | null;
  running: boolean;
}

const runningScans = new Map<string, ScanState>();

const app = new Hono();

app.use('*', cors({ origin: '*' }));
app.use('*', compress());

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/config/presets', (c) =>
  c.json({
    modes: MODE_PRESETS,
    defaults: defaultConfig(),
  }),
);

app.get('/api/config/paths', (c) => {
  const paths = dataPaths();
  return c.json({
    ...paths,
    overrideEnv: process.env.ACECHECK_DATA_DIR || null,
  });
});

function listDrives(): string[] {
  const drives: string[] = [];
  for (let code = 65; code <= 90; code++) {
    const root = `${String.fromCharCode(code)}:\\`;
    if (existsSync(root)) drives.push(root);
  }
  return drives;
}

app.get('/api/fs/browse', async (c) => {
  const requested = (c.req.query('path') || '').trim();

  if (!requested) {
    if (process.platform === 'win32') {
      return c.json({
        path: '',
        entries: listDrives().map((d) => ({ name: d, path: d })),
      });
    }
    return c.json({ path: '', entries: [{ name: '/', path: '/' }] });
  }

  const target = path.resolve(requested);
  let dirents;
  try {
    dirents = await readdir(target, { withFileTypes: true });
  } catch (err) {
    return c.json(
      {
        error: `Cannot read directory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      400,
    );
  }

  const entries: { name: string; path: string }[] = [];
  for (const d of dirents) {
    if (d.name.startsWith('.')) continue;
    const full = path.join(target, d.name);
    let isDir = d.isDirectory();
    if (d.isSymbolicLink()) {
      try {
        isDir = (await stat(full)).isDirectory();
      } catch {
        continue;
      }
    }
    if (!isDir) continue;
    entries.push({ name: d.name, path: full });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const isDriveRoot =
    process.platform === 'win32' && /^[A-Za-z]:[\\/]$/.test(target);
  const parent = isDriveRoot ? '' : path.dirname(target);

  return c.json({ path: target, parent, entries });
});

app.post('/api/checks', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  if (!codebasePath) return c.json({ error: 'Please provide a codebasePath.' }, 400);
  const findings = await runCodeChecks(codebasePath);
  const report = await writeChecksReport(codebasePath, findings);
  return c.json({ findings, report });
});

// Scanners & run profiles ---------------------------------------------

app.get('/api/scanners', async (c) => {
  const force = c.req.query('refresh') === '1';
  return c.json({ scanners: await listScannerDescriptors(force) });
});

app.get('/api/run-profiles', (c) => c.json({ profiles: RUN_PROFILES }));

// Projects -------------------------------------------------------------

interface RunningRun {
  cancelled: boolean;
  progress: StageProgress | null;
  running: boolean;
}

const runningRuns = new Map<string, RunningRun>();

function runKey(projectId: string, runId: string): string {
  return `${projectId}/${runId}`;
}

function hostsFromUrls(...urls: (string | undefined)[]): string[] {
  const hosts = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    try {
      hosts.add(new URL(url).hostname);
    } catch {
      /* ignore invalid url */
    }
  }
  return [...hosts];
}

async function activeFindings(project: Project, runId: string | undefined) {
  if (!runId) return [];
  const findings = await readRunFindings(project.id, runId);
  const statuses = project.targets.codebasePath
    ? readFindingStatuses(project.targets.codebasePath)
    : {};
  return findings
    .map((f) => ({ ...f, status: statuses[f.id] ?? f.status }))
    .filter((f) => !isResolved(f.status));
}

async function projectSnapshot(project: Project) {
  const run = await latestRun(project.id);
  const stages = projectStagePlan(project, run);
  const findings = await activeFindings(project, run?.id);
  const gate = run ? buildReleaseGate(findings) : null;
  return {
    project,
    run,
    stages,
    findings,
    gate,
    nextActions: buildNextActions(findings),
  };
}

app.get('/api/projects', async (c) => {
  const projects = await listProjects();
  const enriched = await Promise.all(
    projects.map(async (project) => {
      const run = await latestRun(project.id);
      const findings = await activeFindings(project, run?.id);
      const gate = run ? buildReleaseGate(findings) : null;
      return {
        project,
        run,
        gate,
        findings: findings.length,
        openCritical: findings.filter((f) => f.severity === 'critical').length,
      };
    }),
  );
  return c.json({ projects: enriched });
});

app.post('/api/projects', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const productionUrl =
    typeof body?.productionUrl === 'string' ? body.productionUrl.trim() : '';
  const stagingUrl =
    typeof body?.stagingUrl === 'string' ? body.stagingUrl.trim() : '';
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath.trim() : '';
  if (!name) return c.json({ error: 'Please provide a project name.' }, 400);
  if (!productionUrl && !codebasePath) {
    return c.json(
      { error: 'Please provide a website URL, a codebase path, or both.' },
      400,
    );
  }
  const allowedHosts = Array.isArray(body?.allowedHosts)
    ? (body.allowedHosts as string[]).filter((h) => typeof h === 'string')
    : hostsFromUrls(stagingUrl, productionUrl);

  const project: Project = {
    id: newProjectId(name),
    name,
    createdAt: new Date().toISOString(),
    targets: {
      productionUrl: productionUrl || undefined,
      stagingUrl: stagingUrl || undefined,
      codebasePath: codebasePath || undefined,
    },
    profileId: typeof body?.profileId === 'string' ? body.profileId : 'standard',
    allowedHosts,
    authorised: Boolean(body?.authorised),
    reportImports:
      typeof body?.reportImports === 'object' && body.reportImports
        ? {
            playwright: body.reportImports.playwright || undefined,
            burp: body.reportImports.burp || undefined,
          }
        : undefined,
  };
  await writeProject(project);
  return c.json({ project });
});

app.get('/api/projects/:id', async (c) => {
  const project = await readProject(c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json(await projectSnapshot(project));
});

app.patch('/api/projects/:id', async (c) => {
  const project = await readProject(c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const body = await c.req.json().catch(() => ({}));

  if (typeof body?.name === 'string' && body.name.trim()) {
    project.name = body.name.trim();
  }
  if (body?.targets && typeof body.targets === 'object') {
    project.targets = {
      productionUrl:
        body.targets.productionUrl !== undefined
          ? body.targets.productionUrl || undefined
          : project.targets.productionUrl,
      stagingUrl:
        body.targets.stagingUrl !== undefined
          ? body.targets.stagingUrl || undefined
          : project.targets.stagingUrl,
      codebasePath:
        body.targets.codebasePath !== undefined
          ? body.targets.codebasePath || undefined
          : project.targets.codebasePath,
    };
  }
  if (typeof body?.profileId === 'string') project.profileId = body.profileId;
  if (typeof body?.authorised === 'boolean') project.authorised = body.authorised;
  if (Array.isArray(body?.allowedHosts)) {
    project.allowedHosts = body.allowedHosts.filter(
      (h: unknown): h is string => typeof h === 'string',
    );
  } else {
    project.allowedHosts = hostsFromUrls(
      project.targets.stagingUrl,
      project.targets.productionUrl,
      ...project.allowedHosts,
    );
  }
  if (body?.reportImports && typeof body.reportImports === 'object') {
    project.reportImports = {
      playwright: body.reportImports.playwright || undefined,
      burp: body.reportImports.burp || undefined,
    };
  }
  await writeProject(project);
  return c.json(await projectSnapshot(project));
});

app.delete('/api/projects/:id', async (c) => {
  await deleteProject(c.req.param('id'));
  return c.json({ ok: true });
});

// Runs -----------------------------------------------------------------

app.get('/api/projects/:id/runs', async (c) => {
  const projectId = c.req.param('id');
  const project = await readProject(projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json({ runs: await listRuns(projectId) });
});

app.post('/api/projects/:id/runs', async (c) => {
  const projectId = c.req.param('id');
  const project = await readProject(projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const profileId =
    typeof body?.profileId === 'string' ? body.profileId : project.profileId;
  const stagesOverride = Array.isArray(body?.stages)
    ? (body.stages as StageId[])
    : undefined;

  const run = planRun(project, profileId, stagesOverride);
  const state: RunningRun = { cancelled: false, progress: null, running: true };
  runningRuns.set(runKey(projectId, run.id), state);
  await writeRun(run);

  executeRun(project, run, {
    onProgress: (p) => {
      state.progress = p;
    },
    shouldCancel: () => state.cancelled,
  })
    .catch((err) => {
      run.status = 'failed';
      void writeRun(run);
      void logScanError(`run ${projectId}/${run.id} failed`, err);
    })
    .finally(() => {
      state.running = false;
    });

  return c.json({ run });
});

app.get('/api/projects/:id/runs/:runId', async (c) => {
  const projectId = c.req.param('id');
  const run = await readRun(projectId, c.req.param('runId'));
  if (!run) return c.json({ error: 'Run not found' }, 404);
  const findings = await readRunFindings(projectId, run.id);
  const project = await readProject(projectId);
  const statuses = project?.targets.codebasePath
    ? readFindingStatuses(project.targets.codebasePath)
    : {};
  const withStatus = findings.map((f) => ({
    ...f,
    status: statuses[f.id] ?? f.status,
  }));
  const active = withStatus.filter((f) => !isResolved(f.status));
  return c.json({
    run,
    findings: active,
    gate: buildReleaseGate(active),
    nextActions: buildNextActions(active),
  });
});

app.get('/api/projects/:id/runs/:runId/progress', async (c) => {
  const projectId = c.req.param('id');
  const runId = c.req.param('runId');
  const state = runningRuns.get(runKey(projectId, runId));
  if (state?.progress) return c.json({ progress: state.progress });
  const run = await readRun(projectId, runId);
  if (!run) return c.json({ error: 'Run not found' }, 404);
  return c.json({
    progress: {
      projectId,
      runId,
      stageId: run.stages[run.stages.length - 1]?.id ?? 'verdict',
      status: run.status,
      stageStatus: run.stages[run.stages.length - 1]?.status ?? 'ready',
      message: run.status === 'done' ? 'Run complete' : `Run ${run.status}`,
      findings: run.stages.reduce((n, s) => n + s.findings, 0),
      stages: run.stages,
    } satisfies StageProgress,
  });
});

app.post('/api/projects/:id/runs/:runId/cancel', async (c) => {
  const key = runKey(c.req.param('id'), c.req.param('runId'));
  const state = runningRuns.get(key);
  if (!state?.running) return c.json({ error: 'Run is not running' }, 400);
  state.cancelled = true;
  return c.json({ ok: true });
});

app.post('/api/projects/:id/runs/:runId/stages/:stageId/run', async (c) => {
  const projectId = c.req.param('id');
  const runId = c.req.param('runId');
  const stageId = c.req.param('stageId') as StageId;
  const project = await readProject(projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const run = await readRun(projectId, runId);
  if (!run) return c.json({ error: 'Run not found' }, 404);

  const key = runKey(projectId, runId);
  const state: RunningRun = { cancelled: false, progress: null, running: true };
  runningRuns.set(key, state);

  executeSingleStage(project, run, stageId, {
    onProgress: (p) => {
      state.progress = p;
    },
    shouldCancel: () => state.cancelled,
  })
    .catch((err) =>
      logScanError(`stage ${stageId} on ${projectId}/${runId} failed`, err),
    )
    .finally(() => {
      state.running = false;
    });

  return c.json({ ok: true });
});

app.get('/api/projects/:id/runs/:runId/report', async (c) => {
  const format = c.req.query('format') === 'ai' ? 'ai' : 'human';
  const file = format === 'ai' ? 'release-ai.md' : 'release.md';
  const content = await readRunReport(
    c.req.param('id'),
    c.req.param('runId'),
    file,
  );
  if (content == null) return c.json({ error: 'No report for this run' }, 404);
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.text(content);
});

app.delete('/api/projects/:id/runs/:runId', async (c) => {
  await deleteRun(c.req.param('id'), c.req.param('runId'));
  return c.json({ ok: true });
});

app.get('/api/projects/:id/findings', async (c) => {
  const project = await readProject(c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const run = await latestRun(project.id);
  return c.json({ findings: await activeFindings(project, run?.id), run });
});

app.get('/api/projects/:id/next-actions', async (c) => {
  const project = await readProject(c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const run = await latestRun(project.id);
  const findings = await activeFindings(project, run?.id);
  return c.json({ nextActions: buildNextActions(findings) });
});

// AI reviews -----------------------------------------------------------

app.get('/api/reviews', (c) => {
  const profile = c.req.query('profile');
  let modules = discoverModules();
  if (profile) {
    const p = profileById(profile);
    if (p) modules = modules.filter((m) => p.moduleNumbers.includes(m.number));
  }
  return c.json({
    modules: modules.map((m) => ({
      number: m.number,
      title: m.title,
      prefix: m.prefix,
      category: m.category,
      domain: m.domain,
      consumesWebScan: m.consumesWebScan,
    })),
  });
});

app.get('/api/reviews/profiles', (c) => c.json({ profiles: AUDIT_PROFILES }));

app.post('/api/reviews/prompt', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  const moduleNumber = Number(body?.moduleNumber);
  if (!codebasePath || !moduleNumber) {
    return c.json({ error: 'Please provide codebasePath and moduleNumber.' }, 400);
  }
  const module = discoverModules().find((m) => m.number === moduleNumber);
  if (!module) return c.json({ error: 'Unknown review module.' }, 404);
  const ctx = buildProjectContext(codebasePath);
  const prompt = generateModulePrompt(module, ctx);
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.text(prompt);
});

app.post('/api/reviews/suite-prompt', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  const profile = typeof body?.profile === 'string' ? body.profile : '';
  if (!codebasePath) return c.json({ error: 'Please provide codebasePath.' }, 400);
  const ctx = buildProjectContext(codebasePath);
  const p = profile ? profileById(profile) : undefined;
  const scope = p
    ? discoverModules()
        .filter((m) => p.moduleNumbers.includes(m.number))
        .map((m) => ({ number: m.number, title: m.title }))
    : undefined;
  const prompt = generateFullSuitePrompt(ctx, { scope });
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.text(prompt);
});

app.post('/api/reviews/ingest', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const markdown = typeof body?.markdown === 'string' ? body.markdown : '';
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  if (!markdown) return c.json({ error: 'Please provide markdown.' }, 400);
  const findings = parseReviewReport(markdown);
  if (codebasePath) writeReviewFindings(codebasePath, findings);
  return c.json({ findings });
});

app.post('/api/reviews/run', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  const moduleNumber = Number(body?.moduleNumber);
  const config = aiConfigFromEnv();
  if (!config) {
    return c.json(
      {
        error:
          'No AI provider configured. Set ACE_AI_API_KEY (and optionally ACE_AI_BASE_URL, ACE_AI_MODEL).',
      },
      400,
    );
  }
  if (!codebasePath || !moduleNumber) {
    return c.json({ error: 'Please provide codebasePath and moduleNumber.' }, 400);
  }
  const module = discoverModules().find((m) => m.number === moduleNumber);
  if (!module) return c.json({ error: 'Unknown review module.' }, 404);
  const ctx = buildProjectContext(codebasePath);
  const prompt = generateModulePrompt(module, ctx);
  const response = await runAiReview(prompt, config);
  return c.json({ response });
});

app.get('/api/findings/status', (c) => {
  const codebasePath = c.req.query('codebasePath') || '';
  if (!codebasePath) return c.json({ error: 'Please provide codebasePath.' }, 400);
  return c.json({ statuses: readFindingStatuses(codebasePath) });
});

app.post('/api/findings/status', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  const findingId = typeof body?.findingId === 'string' ? body.findingId : '';
  const status = body?.status as FindingStatus;
  if (!codebasePath || !findingId || !status) {
    return c.json(
      { error: 'Please provide codebasePath, findingId and status.' },
      400,
    );
  }
  const statuses = setFindingStatus(codebasePath, findingId, status);
  return c.json({ statuses });
});

// Release gate ---------------------------------------------------------

app.post('/api/release', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath : '';
  const scanId = typeof body?.scanId === 'string' ? body.scanId : '';
  if (!codebasePath && !scanId) {
    return c.json({ error: 'Please provide codebasePath or scanId.' }, 400);
  }
  const result = await buildRelease({ codebasePath, scanId });
  return c.json(result);
});

// List scans -----------------------------------------------------------

app.get('/api/scans', async (c) => {
  const scans = await listScans();
  return c.json({ scans });
});

// Start scan -----------------------------------------------------------

app.post('/api/scans', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  const codebasePath =
    typeof body?.codebasePath === 'string' ? body.codebasePath.trim() : '';

  if (!url && !codebasePath) {
    return c.json({ error: 'Please provide a url or codebasePath.' }, 400);
  }
  if (url && !isValidHttpUrl(url)) {
    return c.json({ error: 'Please provide a valid http(s) URL.' }, 400);
  }

  const config = defaultConfig(body?.config || {});
  config.url = url;
  config.codebasePath = codebasePath || undefined;

  const scanId = newScanId();
  const state: ScanState = {
    cancelled: false,
    progress: null,
    running: true,
  };
  runningScans.set(scanId, state);

  runScan(
    config,
    {
      onProgress: (u) => {
        state.progress = u;
      },
      shouldCancel: () => state.cancelled,
    },
    scanId,
  )
    .catch(async (err) => {
      await logScanError(`scan ${scanId} failed`, err);
      const meta = await readMetadata(scanId);
      if (meta) {
        meta.status = 'failed';
        await writeMetadata(scanId, meta);
      }
      state.progress = {
        scanId,
        status: 'failed',
        phase: 'failed',
        discovered: 0,
        scanned: 0,
        succeeded: 0,
        failed: 0,
        total: 0,
        message: err instanceof Error ? err.message : String(err),
      };
    })
    .finally(() => {
      state.running = false;
    });

  return c.json({ scanId });
});

// Scan detail ----------------------------------------------------------

app.get('/api/scans/:id', async (c) => {
  const scanId = c.req.param('id');
  const metadata = await readMetadata(scanId);
  if (!metadata) return c.json({ error: 'Scan not found' }, 404);
  const summary = await readSummary(scanId);
  return c.json({ metadata, summary });
});

app.get('/api/scans/:id/release', async (c) => {
  const scanId = c.req.param('id');
  const release = await readReleaseResult(scanId);
  if (!release) return c.json({ error: 'No code check for this scan' }, 404);
  return c.json(release);
});

app.get('/api/scans/:id/issues', async (c) => {
  const scanId = c.req.param('id');
  const issues = await readIssues(scanId);
  if (!issues) return c.json({ error: 'Scan not found' }, 404);
  const category = c.req.query('category');
  const severity = c.req.query('severity');
  const filtered = issues.filter(
    (i) =>
      (!category || i.category === category) &&
      (!severity || i.severity === severity),
  );
  return c.json({ issues: filtered });
});

app.get('/api/scans/:id/pages', async (c) => {
  const scanId = c.req.param('id');
  const pages = await readAllPages(scanId);
  return c.json({ pages });
});

app.get('/api/scans/:id/pages/:slug', async (c) => {
  const scanId = c.req.param('id');
  const slug = c.req.param('slug');
  const page = await readPageSummary(scanId, slug);
  if (!page) return c.json({ error: 'Page not found' }, 404);
  return c.json({ page });
});

// Raw evidence ---------------------------------------------------------

app.get('/api/scans/:id/pages/:slug/lighthouse.json', async (c) => {
  const scanId = c.req.param('id');
  const slug = c.req.param('slug');
  const raw = await readLighthouse(scanId, slug);
  if (raw == null) return c.json({ error: 'No Lighthouse data' }, 404);
  return c.json(raw);
});

app.get('/api/scans/:id/pages/:slug/report.html', async (c) => {
  const scanId = c.req.param('id');
  const slug = c.req.param('slug');
  const html = await readHtmlReport(scanId, slug);
  if (!html) return c.text('No Lighthouse HTML report available.', 404);
  return c.html(html);
});

// Reports --------------------------------------------------------------

app.get('/api/scans/:id/reports/:type', async (c) => {
  const scanId = c.req.param('id');
  const type = c.req.param('type');
  const filenames: Record<string, string> = {
    ai: 'ai-audit.md',
    markdown: 'ai-audit.md',
    html: 'report.html',
    json: 'report.json',
  };
  const filename = filenames[type];
  if (!filename) return c.json({ error: 'Unknown report type' }, 400);
  const content = await readReportFile(scanId, filename);
  if (content == null) return c.json({ error: 'Report not found' }, 404);
  if (filename.endsWith('.json')) return c.text(content);
  if (filename.endsWith('.html')) return c.html(content);
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.text(content);
});

// AI prompts -----------------------------------------------------------

app.get('/api/scans/:id/prompt', async (c) => {
  const scanId = c.req.param('id');
  const mode = (c.req.query('mode') || 'full') as
    | 'full'
    | 'performance'
    | 'accessibility'
    | 'best-practices'
    | 'seo';
  const format = (c.req.query('format') || 'markdown') as
    | 'markdown'
    | 'text'
    | 'json';

  const metadata = await readMetadata(scanId);
  const summary = await readSummary(scanId);
  const issues = (await readIssues(scanId)) ?? [];
  const pages = await readAllPages(scanId);
  if (!metadata || !summary) return c.json({ error: 'Scan not found' }, 404);

  const input: ReportInput = { metadata, summary, issues, pages };
  const prompt = generatePrompt(input, { mode, format });
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(prompt);
});

app.get('/api/scans/:id/issues/:issueId/prompt', async (c) => {
  const scanId = c.req.param('id');
  const issueId = c.req.param('issueId');
  const metadata = await readMetadata(scanId);
  const summary = await readSummary(scanId);
  const issues = (await readIssues(scanId)) ?? [];
  const pages = await readAllPages(scanId);
  if (!metadata || !summary) return c.json({ error: 'Scan not found' }, 404);

  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return c.json({ error: 'Issue not found' }, 404);

  const input: ReportInput = { metadata, summary, issues, pages };
  const prompt = generateIssuePrompt(input, issue);
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(prompt);
});

app.get('/api/scans/:id/investigation-prompt', async (c) => {
  const scanId = c.req.param('id');
  const metadata = await readMetadata(scanId);
  const summary = await readSummary(scanId);
  const issues = (await readIssues(scanId)) ?? [];
  const pages = await readAllPages(scanId);
  if (!metadata || !summary) return c.json({ error: 'Scan not found' }, 404);

  const input: ReportInput = { metadata, summary, issues, pages };
  const prompt = generateAllIssuesPrompt(input);
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(prompt);
});

app.get('/api/scans/:id/pages/:slug/prompt', async (c) => {
  const scanId = c.req.param('id');
  const slug = c.req.param('slug');
  const metadata = await readMetadata(scanId);
  const summary = await readSummary(scanId);
  const issues = (await readIssues(scanId)) ?? [];
  const pages = await readAllPages(scanId);
  if (!metadata || !summary) return c.json({ error: 'Scan not found' }, 404);

  const page = pages.find((p) => p.slug === slug);
  if (!page) return c.json({ error: 'Page not found' }, 404);

  const input: ReportInput = { metadata, summary, issues, pages };
  const prompt = generatePagePrompt(input, page);
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(prompt);
});

// Progress -------------------------------------------------------------

app.get('/api/scans/:id/progress', async (c) => {
  const scanId = c.req.param('id');
  const state = runningScans.get(scanId);
  if (state?.progress) return c.json({ progress: state.progress });
  const metadata = await readMetadata(scanId);
  if (!metadata) {
    if (state) {
      return c.json({
        progress: {
          scanId,
          status: 'discovering',
          phase: 'discovering',
          discovered: 0,
          scanned: 0,
          succeeded: 0,
          failed: 0,
          total: 0,
          message: 'Starting…',
        },
      });
    }
    return c.json({ error: 'Scan not found' }, 404);
  }
  const summary = await readSummary(scanId);
  return c.json({
    progress: {
      scanId,
      status: metadata.status,
      phase: metadata.status,
      discovered: metadata.pagesDiscovered,
      scanned: metadata.pagesScanned,
      succeeded: metadata.pagesSucceeded,
      failed: metadata.pagesFailed,
      total: metadata.pagesScanned,
      message: summary ? 'Scan complete' : undefined,
    },
  });
});

app.post('/api/scans/:id/cancel', async (c) => {
  const scanId = c.req.param('id');
  const state = runningScans.get(scanId);
  if (state && state.running) {
    state.cancelled = true;
    return c.json({ ok: true });
  }
  return c.json({ error: 'Scan is not running' }, 400);
});

app.post('/api/scans/:id/retry-failed', async (c) => {
  const scanId = c.req.param('id');
  const state = runningScans.get(scanId);
  if (state?.running) return c.json({ error: 'Scan is already running' }, 400);

  const newState: ScanState = {
    cancelled: false,
    progress: null,
    running: true,
  };
  runningScans.set(scanId, newState);

  retryFailedPages(scanId, {
    onProgress: (u) => {
      newState.progress = u;
    },
    shouldCancel: () => newState.cancelled,
  })
    .catch(() => undefined)
    .finally(() => {
      newState.running = false;
    });

  return c.json({ ok: true });
});

// Compare --------------------------------------------------------------

app.get('/api/scans/:id/compare', async (c) => {
  const scanId = c.req.param('id');
  const otherId = c.req.query('other');
  if (!otherId) return c.json({ error: 'Missing other scan id' }, 400);

  const [prevSummary, currSummary] = await Promise.all([
    readSummary(otherId),
    readSummary(scanId),
  ]);
  const [prevIssues, currIssues] = await Promise.all([
    readIssues(otherId),
    readIssues(scanId),
  ]);
  if (!prevSummary || !currSummary) {
    return c.json({ error: 'One or both scans not found' }, 404);
  }

  const comparison = buildComparison(
    prevSummary,
    currSummary,
    prevIssues ?? [],
    currIssues ?? [],
  );
  return c.json({ comparison });
});

// Export / delete ------------------------------------------------------

app.get('/api/scans/:id/export', async (c) => {
  const scanId = c.req.param('id');
  const dir = path.join(scansRoot(), scanId);
  if (!existsSync(dir)) return c.json({ error: 'Scan not found' }, 404);

  const files = await collectScanFiles(scanId);
  const zip = createZip(files);

  c.header('Content-Type', 'application/zip');
  c.header(
    'Content-Disposition',
    `attachment; filename="${scanId}.zip"`,
  );
  return c.body(zip as unknown as ReadableStream);
});

app.delete('/api/scans/:id', async (c) => {
  const scanId = c.req.param('id');
  await deleteScan(scanId);
  return c.json({ ok: true });
});

// Static frontend ------------------------------------------------------

const webDist = path.resolve(process.cwd(), 'web', 'dist');
if (existsSync(webDist)) {
  app.use('/assets/*', async (c, next) => {
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    await next();
  });
  app.use('/*', async (c, next) => {
    const last = (c.req.path.split('/').pop() || '').split('?')[0];
    if (last === '' || last === 'index.html' || !last.includes('.')) {
      c.header('Cache-Control', 'no-cache');
    }
    await next();
  });
  app.use('/*', serveStatic({ root: webDist }));
  app.get('*', serveStatic({ path: path.join(webDist, 'index.html') }));
}

const PORT = Number(process.env.PORT || 3210);

export function startServer(port = PORT): void {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`acecheck server running at http://localhost:${info.port}`);
    console.log(`acecheck data directory: ${dataPaths().root}`);
  });
}

export { app };

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  startServer();
}

async function collectScanFiles(
  scanId: string,
): Promise<{ name: string; data: Buffer }[]> {
  const { readdir, readFile } = await import('node:fs/promises');
  const root = path.join(scansRoot(), scanId);
  const results: { name: string; data: Buffer }[] = [];

  const walk = async (dir: string, prefix: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else {
        results.push({ name: rel, data: await readFile(full) });
      }
    }
  };

  await walk(root, '');
  return results;
}
