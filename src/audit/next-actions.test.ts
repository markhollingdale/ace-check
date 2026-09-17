import assert from 'node:assert/strict';
import test from 'node:test';
import type { Finding } from '../types.js';
import { buildNextActions } from './next-actions.js';
import { planRun, precondition, projectStagePlan } from './stages/runner.js';
import { STAGE_CATALOG, runProfileById } from './stages/catalog.js';
import { parseImportedReport } from './scanners/import.js';
import type { Project } from '../types.js';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'X-0001',
    source: 'static',
    category: 'security',
    domain: 'SECURITY',
    severity: 'medium',
    confidence: 'High',
    title: 'finding',
    description: '',
    evidence: { proof: 'confirmed' },
    correlationKeys: [],
    status: 'detected',
    ...overrides,
  };
}

const baseProject: Project = {
  id: 'demo',
  name: 'Demo',
  createdAt: new Date().toISOString(),
  targets: { productionUrl: 'https://demo.example.com' },
  profileId: 'standard',
  allowedHosts: ['demo.example.com'],
  authorised: false,
};

test('next-actions: ranks by effective severity then confidence', () => {
  const actions = buildNextActions([
    finding({ id: 'A', severity: 'low', title: 'low' }),
    finding({ id: 'B', severity: 'critical', title: 'crit' }),
    finding({ id: 'C', severity: 'high', confidence: 'Low', title: 'high-low' }),
    finding({ id: 'D', severity: 'high', confidence: 'High', title: 'high-high' }),
  ]);
  assert.deepEqual(
    actions.map((a) => a.findingId),
    ['B', 'D', 'C', 'A'],
  );
});

test('next-actions: excludes resolved and info findings', () => {
  const actions = buildNextActions([
    finding({ id: 'A', status: 'fixed' }),
    finding({ id: 'B', severity: 'info' }),
    finding({ id: 'C', severity: 'high' }),
  ]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].findingId, 'C');
});

test('next-actions: blast radius breaks ties', () => {
  const actions = buildNextActions([
    finding({ id: 'small', severity: 'high', affectedFiles: ['a.ts'] }),
    finding({
      id: 'big',
      severity: 'high',
      affectedFiles: ['a.ts', 'b.ts', 'c.ts'],
    }),
  ]);
  assert.equal(actions[0].findingId, 'big');
});

test('stages: catalog is ordered and unique', () => {
  const ids = STAGE_CATALOG.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  const orders = STAGE_CATALOG.map((s) => s.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
});

test('stages: planRun selects the profile stages', () => {
  const run = planRun(baseProject, 'standard');
  assert.deepEqual(
    run.stages.map((s) => s.id),
    runProfileById('standard')!.stages,
  );
});

test('stages: codebase stages are blocked without a codebase', () => {
  const run = planRun(baseProject, 'standard');
  const sast = run.stages.find((s) => s.id === 'sast');
  assert.equal(sast?.status, 'blocked');
});

test('stages: dast requires staging plus allowlist', () => {
  const def = STAGE_CATALOG.find((s) => s.id === 'dast')!;
  const noStaging = precondition(baseProject, def);
  assert.equal(noStaging.ok, false);

  const withStaging: Project = {
    ...baseProject,
    targets: { ...baseProject.targets, stagingUrl: 'https://staging.demo.com' },
    allowedHosts: [],
  };
  assert.equal(precondition(withStaging, def).ok, false);

  const allowed: Project = { ...withStaging, allowedHosts: ['staging.demo.com'] };
  assert.equal(precondition(allowed, def).ok, true);
});

test('stages: projectStagePlan shows the full catalogue', () => {
  const plan = projectStagePlan(baseProject, null);
  assert.equal(plan.length, STAGE_CATALOG.length);
});

test('import: parses a Playwright JSON report', () => {
  const json = JSON.stringify({
    suites: [
      {
        title: 'authz',
        file: 'tests/authz.spec.ts',
        specs: [
          {
            title: 'user cannot edit another venue',
            ok: false,
            line: 42,
            tests: [
              {
                status: 'failed',
                results: [{ status: 'failed', error: { message: 'expected 403' } }],
              },
            ],
          },
          { title: 'user can edit own venue', ok: true, tests: [] },
        ],
      },
    ],
  });
  const findings = parseImportedReport(json);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].prefix, 'ABUSE');
  assert.equal(findings[0].source, 'dynamic');
  assert.equal(findings[0].evidence.line, 42);
});

test('import: parses a generic JSON array', () => {
  const findings = parseImportedReport(
    JSON.stringify([{ title: 'CORS wildcard', severity: 'high' }]),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'high');
});

test('import: parses Burp XML', () => {
  const xml = `<issues><issue><name>SQL injection</name><severity>High</severity><host>https://demo</host><path>/api</path><issueBackground>Background</issueBackground><remediationBackground>Fix it</remediationBackground></issue></issues>`;
  const findings = parseImportedReport(xml);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].title, 'SQL injection');
  assert.equal(findings[0].severity, 'high');
});
