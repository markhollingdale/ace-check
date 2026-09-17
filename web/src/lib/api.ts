import type {
  AuditProfile,
  Finding,
  FindingSource,
  FindingStatus,
  PageSummary,
  Project,
  ProjectSnapshot,
  ProjectSummary,
  ReviewModule,
  Run,
  RunProfile,
  RunSnapshot,
  ScannerDescriptor,
  ScanComparison,
  StageDef,
  StageId,
  StageProgress,
} from './types';

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* body was not JSON */
    }
    if (res.status >= 500) {
      message += ' - is the local server running?';
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

async function send<T>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return json<T>(res);
}

// --- Scanners & profiles ---------------------------------------------------

export async function getScanners(refresh = false): Promise<ScannerDescriptor[]> {
  const res = await fetch(`/api/scanners${refresh ? '?refresh=1' : ''}`);
  return (await json<{ scanners: ScannerDescriptor[] }>(res)).scanners;
}

export async function getRunProfiles(): Promise<RunProfile[]> {
  const res = await fetch('/api/run-profiles');
  return (await json<{ profiles: RunProfile[] }>(res)).profiles;
}

export async function getStages(): Promise<StageDef[]> {
  const res = await fetch('/api/stages');
  return (await json<{ stages: StageDef[] }>(res)).stages;
}

export interface RunTarget {
  productionUrl?: string | null;
  stagingUrl?: string | null;
  codebasePath?: string | null;
  allowedHosts?: string[];
  stack?: string[];
  projectName?: string;
  authorised?: boolean;
  scanners?: {
    id: string;
    label: string;
    stage: string;
    available: boolean;
    version: string | null;
  }[];
}

export async function getRunTarget(
  projectId: string,
  runId: string,
): Promise<RunTarget | null> {
  const res = await fetch(`/api/projects/${projectId}/runs/${runId}/target`);
  return (await json<{ target: RunTarget | null }>(res)).target;
}

export async function getFindingPrompt(
  projectId: string,
  findingId: string,
): Promise<string> {
  const res = await fetch(
    `/api/projects/${projectId}/findings/${encodeURIComponent(findingId)}/prompt`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error('Could not generate a prompt for this finding.');
  return res.text();
}

export async function getRunPrompt(
  projectId: string,
  runId: string,
  opts: { stage?: StageId; source?: FindingSource } = {},
): Promise<string> {
  const res = await fetch(`/api/projects/${projectId}/runs/${runId}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('Could not generate a prompt for this run.');
  return res.text();
}

export interface AttributionsData {
  generated: string;
  totalPackages: number;
  summary: { license: string; count: number }[];
  packages: {
    name: string;
    versions: string[];
    license: string;
    homepage: string | null;
    author: string | null;
  }[];
  externalTools: { name: string; license: string; url: string; note: string }[];
  licenseTexts: Record<string, string>;
}

export async function getAttributions(): Promise<AttributionsData> {
  const res = await fetch('/attributions.json');
  return json<AttributionsData>(res);
}

export interface DataPaths {
  root: string;
  scans: string;
  projects: string;
  logs: string;
  targets: string;
  overrideEnv: string | null;
}

export async function getDataPaths(): Promise<DataPaths> {
  const res = await fetch('/api/config/paths');
  return json<DataPaths>(res);
}

// --- Projects --------------------------------------------------------------

export async function listProjects(): Promise<ProjectSummary[]> {
  const res = await fetch('/api/projects');
  return (await json<{ projects: ProjectSummary[] }>(res)).projects;
}

export async function createProject(input: {
  name: string;
  productionUrl?: string;
  stagingUrl?: string;
  codebasePath?: string;
  profileId?: string;
  authorised?: boolean;
}): Promise<Project> {
  return (
    await send<{ project: Project }>('/api/projects', 'POST', input)
  ).project;
}

export async function getProject(id: string): Promise<ProjectSnapshot> {
  const res = await fetch(`/api/projects/${id}`);
  return json<ProjectSnapshot>(res);
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, 'id' | 'createdAt'>>,
): Promise<ProjectSnapshot> {
  return send<ProjectSnapshot>(`/api/projects/${id}`, 'PATCH', patch);
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`/api/projects/${id}`, { method: 'DELETE' });
}

// --- Runs ------------------------------------------------------------------

export async function listRuns(projectId: string): Promise<Run[]> {
  const res = await fetch(`/api/projects/${projectId}/runs`);
  return (await json<{ runs: Run[] }>(res)).runs;
}

export async function startRun(
  projectId: string,
  opts: { profileId?: string; stages?: StageId[] } = {},
): Promise<Run> {
  return (
    await send<{ run: Run }>(`/api/projects/${projectId}/runs`, 'POST', opts)
  ).run;
}

export async function getRun(
  projectId: string,
  runId: string,
): Promise<RunSnapshot> {
  const res = await fetch(`/api/projects/${projectId}/runs/${runId}`);
  return json<RunSnapshot>(res);
}

export async function getRunProgress(
  projectId: string,
  runId: string,
): Promise<StageProgress> {
  const res = await fetch(`/api/projects/${projectId}/runs/${runId}/progress`);
  return (await json<{ progress: StageProgress }>(res)).progress;
}

export async function cancelRun(
  projectId: string,
  runId: string,
): Promise<void> {
  await fetch(`/api/projects/${projectId}/runs/${runId}/cancel`, {
    method: 'POST',
  });
}

export async function runStage(
  projectId: string,
  runId: string,
  stageId: StageId,
): Promise<void> {
  await send(
    `/api/projects/${projectId}/runs/${runId}/stages/${stageId}/run`,
    'POST',
  );
}

export async function deleteRun(
  projectId: string,
  runId: string,
): Promise<void> {
  await fetch(`/api/projects/${projectId}/runs/${runId}`, { method: 'DELETE' });
}

export async function getRunReport(
  projectId: string,
  runId: string,
  format: 'human' | 'ai' = 'human',
): Promise<string> {
  const res = await fetch(
    `/api/projects/${projectId}/runs/${runId}/report?format=${format}`,
  );
  if (!res.ok) throw new Error('No report available for this run.');
  return res.text();
}

export const runReportUrl = (
  projectId: string,
  runId: string,
  format: 'human' | 'ai' = 'human',
) => `/api/projects/${projectId}/runs/${runId}/report?format=${format}`;

// --- Findings / pages / compare --------------------------------------------

export async function getProjectFindings(
  projectId: string,
): Promise<{ findings: Finding[]; run: Run | null }> {
  const res = await fetch(`/api/projects/${projectId}/findings`);
  return json<{ findings: Finding[]; run: Run | null }>(res);
}

export async function getPages(scanId: string): Promise<PageSummary[]> {
  const res = await fetch(`/api/scans/${scanId}/pages`);
  return (await json<{ pages: PageSummary[] }>(res)).pages;
}

export async function getPage(
  scanId: string,
  slug: string,
): Promise<PageSummary> {
  const res = await fetch(`/api/scans/${scanId}/pages/${slug}`);
  return (await json<{ page: PageSummary }>(res)).page;
}

export async function getComparison(
  scanId: string,
  otherId: string,
): Promise<ScanComparison> {
  const res = await fetch(`/api/scans/${scanId}/compare?other=${otherId}`);
  return (await json<{ comparison: ScanComparison }>(res)).comparison;
}

export const lighthouseJsonUrl = (scanId: string, slug: string) =>
  `/api/scans/${scanId}/pages/${slug}/lighthouse.json`;
export const lighthouseHtmlUrl = (scanId: string, slug: string) =>
  `/api/scans/${scanId}/pages/${slug}/report.html`;

// --- Finding lifecycle -----------------------------------------------------

export async function getFindingStatuses(
  codebasePath: string,
): Promise<Record<string, FindingStatus>> {
  const res = await fetch(
    `/api/findings/status?codebasePath=${encodeURIComponent(codebasePath)}`,
  );
  return (await json<{ statuses: Record<string, FindingStatus> }>(res)).statuses;
}

export async function setFindingStatus(
  codebasePath: string,
  findingId: string,
  status: FindingStatus,
): Promise<Record<string, FindingStatus>> {
  return (
    await send<{ statuses: Record<string, FindingStatus> }>(
      '/api/findings/status',
      'POST',
      { codebasePath, findingId, status },
    )
  ).statuses;
}

// --- Filesystem ------------------------------------------------------------

export async function browseDirectory(dirPath: string): Promise<{
  path: string;
  parent: string;
  entries: { name: string; path: string }[];
}> {
  const params = new URLSearchParams();
  if (dirPath) params.set('path', dirPath);
  const qs = params.toString();
  const res = await fetch(`/api/fs/browse${qs ? `?${qs}` : ''}`);
  return json(res);
}

// --- AI reviews ------------------------------------------------------------

export async function listProfiles(): Promise<AuditProfile[]> {
  const res = await fetch('/api/reviews/profiles');
  return (await json<{ profiles: AuditProfile[] }>(res)).profiles;
}

export async function listReviewModules(
  profile?: string,
): Promise<ReviewModule[]> {
  const res = await fetch(
    `/api/reviews${profile ? `?profile=${encodeURIComponent(profile)}` : ''}`,
  );
  return (await json<{ modules: ReviewModule[] }>(res)).modules;
}

export async function getReviewPrompt(
  codebasePath: string,
  moduleNumber: number,
): Promise<string> {
  const res = await fetch('/api/reviews/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, moduleNumber }),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Failed to generate prompt.');
  return res.text();
}

export async function getSuitePrompt(
  codebasePath: string,
  profile?: string,
): Promise<string> {
  const res = await fetch('/api/reviews/suite-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, profile }),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Failed to generate prompt.');
  return res.text();
}

export async function ingestReport(
  markdown: string,
  codebasePath?: string,
): Promise<Finding[]> {
  const res = await fetch('/api/reviews/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown, codebasePath }),
  });
  return (await json<{ findings: Finding[] }>(res)).findings;
}

export async function runReview(
  codebasePath: string,
  moduleNumber: number,
): Promise<string> {
  const res = await fetch('/api/reviews/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codebasePath, moduleNumber }),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  return (await json<{ response: string }>(res)).response;
}
