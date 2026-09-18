import assert from 'node:assert/strict';
import test from 'node:test';
import type { Finding, Run } from '../types.js';
import { findingBlock, generateRunPrompt } from './ai-prompts.js';
import { buildReleaseGate } from './gate.js';
import { releaseReportAiMarkdown } from './release-report.js';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'largest-contentful-paint',
    source: 'web',
    category: 'performance',
    domain: 'PERFORMANCE',
    severity: 'high',
    confidence: 'High',
    title: 'Largest Contentful Paint',
    description: 'D',
    evidence: { proof: 'confirmed' },
    correlationKeys: [],
    status: 'detected',
    ...overrides,
  };
}

function run(profileId: string): Run {
  return {
    id: 'r1',
    projectId: 'p1',
    profileId,
    label: 'Run',
    status: 'done',
    stages: [],
    startedAt: '2026-09-17T00:00:00.000Z',
  };
}

test('findingBlock: includes device-tagged pages and disposition', () => {
  const block = findingBlock(
    finding({
      affectedPages: ['https://x.dev/whats-on'],
      affectedPageRefs: [
        { url: 'https://x.dev/whats-on', device: 'mobile' },
        { url: 'https://x.dev/whats-on', device: 'desktop' },
      ],
      disposition: 'third-party',
      dispositionReason: 'Served by a third-party origin.',
      detailsSummary: ['Longest critical chain (100 ms): https://x.dev/a.css'],
    }),
    1,
  );
  assert.match(block, /https:\/\/x\.dev\/whats-on \(mobile\)/);
  assert.match(block, /Disposition: third-party/);
  assert.match(block, /Longest critical chain/);
});

test('generateRunPrompt: states the quick-profile limitation', () => {
  const prompt = generateRunPrompt({
    projectName: 'x',
    run: run('quick'),
    findings: [finding({})],
  });
  assert.match(prompt, /Profile limitation/);
});

test('generateRunPrompt: no limitation note when a code stage ran', () => {
  const prompt = generateRunPrompt({
    projectName: 'x',
    run: run('standard'),
    findings: [finding({})],
  });
  assert.doesNotMatch(prompt, /Profile limitation/);
});

test('releaseReportAiMarkdown: carries evidence, environment and groups', () => {
  const findings = [
    finding({ id: 'largest-contentful-paint', severity: 'critical' }),
    finding({ id: 'lcp-discovery-insight', severity: 'high' }),
  ];
  const markdown = releaseReportAiMarkdown({
    meta: {
      project: 'x',
      date: '2026-09-17',
      environment: {
        targetUrl: 'https://x.dev',
        authenticated: false,
        stages: ['target', 'web-quality', 'verdict'],
        profileId: 'quick',
        git: { commit: 'abc1234', branch: 'main', dirty: false },
      },
    },
    gate: buildReleaseGate(findings),
    findings,
    correlations: [],
  });
  assert.match(markdown, /## Environment/);
  assert.match(markdown, /Root-cause groups/);
  assert.match(markdown, /## Findings \(2\)/);
  assert.match(markdown, /Profile limitation/);
  assert.match(markdown, /Commit: abc1234/);
});
