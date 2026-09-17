import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { Finding, Project, Run } from '../types.js';
import {
  latestRun,
  listProjects,
  listRuns,
  newProjectId,
  readProject,
  readRun,
  readRunFindings,
  readStageFindings,
  writeProject,
  writeRun,
  writeRunFindings,
  writeStageFindings,
} from './projects.js';

function withTempRoot<T>(fn: () => Promise<T>): Promise<T> {
  const dir = mkdtempSync(path.join(tmpdir(), 'acecheck-projects-'));
  const prev = process.env.ACECHECK_PROJECTS_DIR;
  process.env.ACECHECK_PROJECTS_DIR = dir;
  return fn().finally(() => {
    if (prev === undefined) delete process.env.ACECHECK_PROJECTS_DIR;
    else process.env.ACECHECK_PROJECTS_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  });
}

function makeProject(): Project {
  return {
    id: newProjectId('Demo Project'),
    name: 'Demo Project',
    createdAt: new Date().toISOString(),
    targets: { productionUrl: 'https://demo.example.com' },
    profileId: 'standard',
    allowedHosts: ['demo.example.com'],
    authorised: false,
  };
}

const sampleFinding: Finding = {
  id: 'SEMG-0001',
  source: 'static',
  stage: 'sast',
  category: 'security',
  domain: 'SECURITY',
  severity: 'high',
  confidence: 'High',
  title: 'XSS',
  description: 'boom',
  evidence: { file: 'src/a.ts', line: 3, proof: 'confirmed' },
  correlationKeys: [],
  status: 'detected',
};

test('projects: round-trips a project', async () => {
  await withTempRoot(async () => {
    const project = makeProject();
    await writeProject(project);
    const read = await readProject(project.id);
    assert.equal(read?.name, 'Demo Project');
    const list = await listProjects();
    assert.equal(list.length, 1);
  });
});

test('projects: round-trips runs, stage findings and run findings', async () => {
  await withTempRoot(async () => {
    const project = makeProject();
    await writeProject(project);
    const run: Run = {
      id: '2026-01-01_000000',
      projectId: project.id,
      profileId: 'standard',
      label: 'Standard',
      status: 'done',
      stages: [],
      startedAt: new Date().toISOString(),
    };
    await writeRun(run);
    await writeStageFindings(project.id, run.id, 'sast', [sampleFinding]);
    await writeRunFindings(project.id, run.id, [sampleFinding]);

    const readRunResult = await readRun(project.id, run.id);
    assert.equal(readRunResult?.label, 'Standard');

    const stage = await readStageFindings(project.id, run.id, 'sast');
    assert.equal(stage.length, 1);
    assert.equal(stage[0].stage, 'sast');

    const all = await readRunFindings(project.id, run.id);
    assert.equal(all.length, 1);

    const runs = await listRuns(project.id);
    assert.equal(runs.length, 1);
    const latest = await latestRun(project.id);
    assert.equal(latest?.id, run.id);
  });
});
