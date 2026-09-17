import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AUDIT_PROFILES, profileById } from './profiles.js';
import { isResolved, readFindingStatuses, setFindingStatus } from './lifecycle.js';
import { aiConfigFromEnv } from './ai-runner.js';
import { projectNameFromCodebase } from './match.js';

test('profiles: web-app includes all 16 modules', () => {
  const p = profileById('web-app');
  assert.ok(p);
  assert.equal(p.moduleNumbers.length, 16);
});

test('profiles: api excludes accessibility and SEO', () => {
  const p = profileById('api');
  assert.ok(p);
  assert.ok(!p.moduleNumbers.includes(80));
  assert.ok(!p.moduleNumbers.includes(90));
});

test('profiles: unknown profile returns undefined', () => {
  assert.equal(profileById('nope'), undefined);
});

test('profiles: every profile has a unique id', () => {
  const ids = AUDIT_PROFILES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('lifecycle: set + read statuses round-trip', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'acecheck-lifecycle-'));
  try {
    setFindingStatus(dir, 'SEC-001', 'fixed');
    assert.equal(readFindingStatuses(dir)['SEC-001'], 'fixed');
    assert.ok(isResolved('fixed'));
    assert.ok(!isResolved('detected'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('aiConfigFromEnv: null without key', () => {
  assert.equal(aiConfigFromEnv({}), null);
});

test('aiConfigFromEnv: config with key and overrides', () => {
  const c = aiConfigFromEnv({
    ACE_AI_API_KEY: 'sk-123',
    ACE_AI_BASE_URL: 'http://localhost:11434/v1/',
    ACE_AI_MODEL: 'qwen3',
  });
  assert.ok(c);
  assert.equal(c.apiKey, 'sk-123');
  assert.equal(c.baseUrl, 'http://localhost:11434/v1');
  assert.equal(c.model, 'qwen3');
});

test('match: projectNameFromCodebase reads package.json name', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'acecheck-match-'));
  try {
    await writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'my-app' }),
      'utf8',
    );
    assert.equal(projectNameFromCodebase(dir), 'my-app');
    assert.equal(projectNameFromCodebase(path.join(dir, 'missing')), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
