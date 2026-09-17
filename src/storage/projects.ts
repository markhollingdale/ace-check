import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import type { Finding, Project, Run, StageId } from '../types.js';
import { newScanId } from './storage.js';
import { projectsRoot } from '../paths.js';

export { projectsRoot };

export async function ensureProjectsRoot(): Promise<string> {
  const dir = projectsRoot();
  await mkdir(dir, { recursive: true });
  return dir;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, 48) || 'project';
}

// Projects ---------------------------------------------------------------

export function projectDir(projectId: string): string {
  return path.join(projectsRoot(), projectId);
}

export function projectFilePath(projectId: string): string {
  return path.join(projectDir(projectId), 'project.json');
}

export function newProjectId(name: string): string {
  const base = slugify(name);
  let id = base;
  let i = 2;
  while (existsSync(projectDir(id))) id = `${base}-${i++}`;
  return id;
}

export async function writeProject(project: Project): Promise<void> {
  await writeJson(projectFilePath(project.id), project);
}

export async function readProject(projectId: string): Promise<Project | null> {
  return readJson<Project>(projectFilePath(projectId));
}

export async function listProjects(): Promise<Project[]> {
  const root = projectsRoot();
  let entries: Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const projects: Project[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const project = await readProject(entry.name);
    if (project) projects.push(project);
  }
  projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return projects;
}

export async function deleteProject(projectId: string): Promise<void> {
  await rm(projectDir(projectId), { recursive: true, force: true });
}

// Runs -------------------------------------------------------------------

export function runsRoot(projectId: string): string {
  return path.join(projectDir(projectId), 'runs');
}

export function runDir(projectId: string, runId: string): string {
  return path.join(runsRoot(projectId), runId);
}

export function runFilePath(projectId: string, runId: string): string {
  return path.join(runDir(projectId, runId), 'run.json');
}

export function newRunId(projectId: string): string {
  const base = newScanId();
  let id = base;
  let i = 2;
  while (existsSync(runDir(projectId, id))) id = `${base}-${i++}`;
  return id;
}

export async function writeRun(run: Run): Promise<void> {
  await writeJson(runFilePath(run.projectId, run.id), run);
}

export async function readRun(
  projectId: string,
  runId: string,
): Promise<Run | null> {
  return readJson<Run>(runFilePath(projectId, runId));
}

export async function listRuns(projectId: string): Promise<Run[]> {
  const dir = runsRoot(projectId);
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const runs: Run[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const run = await readRun(projectId, entry.name);
    if (run) runs.push(run);
  }
  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return runs;
}

export async function deleteRun(
  projectId: string,
  runId: string,
): Promise<void> {
  await rm(runDir(projectId, runId), { recursive: true, force: true });
}

export async function latestRun(projectId: string): Promise<Run | null> {
  const runs = await listRuns(projectId);
  return runs[0] ?? null;
}

// Findings & artifacts ---------------------------------------------------

export function findingsDir(projectId: string, runId: string): string {
  return path.join(runDir(projectId, runId), 'findings');
}

export function stageFindingsPath(
  projectId: string,
  runId: string,
  stageId: StageId,
): string {
  return path.join(findingsDir(projectId, runId), `${stageId}.json`);
}

export async function writeStageFindings(
  projectId: string,
  runId: string,
  stageId: StageId,
  findings: Finding[],
): Promise<void> {
  await writeJson(stageFindingsPath(projectId, runId, stageId), findings);
}

export async function readStageFindings(
  projectId: string,
  runId: string,
  stageId: StageId,
): Promise<Finding[]> {
  return (await readJson<Finding[]>(stageFindingsPath(projectId, runId, stageId))) ?? [];
}

export function runFindingsPath(projectId: string, runId: string): string {
  return path.join(runDir(projectId, runId), 'findings.json');
}

export async function writeRunFindings(
  projectId: string,
  runId: string,
  findings: Finding[],
): Promise<void> {
  await writeJson(runFindingsPath(projectId, runId), findings);
}

export async function readRunFindings(
  projectId: string,
  runId: string,
): Promise<Finding[]> {
  return (await readJson<Finding[]>(runFindingsPath(projectId, runId))) ?? [];
}

export function stageArtifactDir(
  projectId: string,
  runId: string,
  stageId: StageId,
): string {
  return path.join(runDir(projectId, runId), 'artifacts', stageId);
}

export async function writeRunReport(
  projectId: string,
  runId: string,
  filename: string,
  content: string,
): Promise<void> {
  const filePath = path.join(runDir(projectId, runId), filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

export async function readRunReport(
  projectId: string,
  runId: string,
  filename: string,
): Promise<string | null> {
  try {
    return await readFile(path.join(runDir(projectId, runId), filename), 'utf8');
  } catch {
    return null;
  }
}

export function emptySeverityCounts(): Record<
  'critical' | 'high' | 'medium' | 'low' | 'info',
  number
> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

export function severityCountsFor(
  findings: Finding[],
): Record<'critical' | 'high' | 'medium' | 'low' | 'info', number> {
  const counts = emptySeverityCounts();
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}
