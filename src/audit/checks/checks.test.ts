import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuditJson, parseOutdatedJson } from './dependencies.js';
import { runSecretsScan } from './secrets.js';
import { runConfigAudit } from './config.js';
import { runEnvAudit } from './env.js';
import { runHygieneScan } from './hygiene.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'acecheck-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

test('parseAuditJson extracts vulnerabilities', () => {
  const raw = JSON.stringify({
    vulnerabilities: {
      lodash: {
        severity: 'high',
        advisory: { title: 'Prototype pollution', severity: 'high' },
        range: '<4.17.21',
      },
    },
  });
  const findings = parseAuditJson(raw);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'high');
  assert.equal(findings[0].domain, 'DEPENDENCIES');
  assert.equal(findings[0].confidence, 'High');
});

test('parseOutdatedJson extracts outdated packages', () => {
  const raw = JSON.stringify({ lodash: { current: '4.17.20', latest: '4.17.21' } });
  const findings = parseOutdatedJson(raw);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'low');
});

test('secrets scan flags AWS keys with evidence', async () => {
  const dir = await fixture({ 'index.ts': 'export const key = "AKIAIOSFODNN7EXAMPLE";\n' });
  try {
    const findings = await runSecretsScan(dir);
    const match = findings.find((f) => f.title.includes('AWS access key'));
    assert.ok(match);
    assert.equal(match.severity, 'critical');
    assert.equal(match.evidence.proof, 'possible');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('config audit flags strict:false', async () => {
  const dir = await fixture({
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022' } }),
  });
  try {
    const findings = await runConfigAudit(dir);
    assert.ok(findings.some((f) => f.title.includes('strict mode')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('env audit flags an unignored .env file', async () => {
  const dir = await fixture({ '.env': 'DATABASE_URL=postgres://u:p@h\n' });
  try {
    const findings = await runEnvAudit(dir);
    assert.ok(findings.some((f) => f.title.includes('not gitignored')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('hygiene scan flags console statements and TODOs', async () => {
  const dir = await fixture({ 'app.ts': 'console.log("hi");\n// TODO: fix this\n' });
  try {
    const findings = await runHygieneScan(dir);
    assert.ok(findings.some((f) => f.title.includes('Console statements')));
    assert.ok(findings.some((f) => f.title.includes('TODO/FIXME')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
