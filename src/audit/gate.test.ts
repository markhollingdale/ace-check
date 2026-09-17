import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReleaseGate } from './gate.js';
import { correlate, issueToFinding } from './correlate.js';
import type { Finding, Issue } from '../types.js';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'X-001',
    source: 'static',
    category: 'security',
    domain: 'SECURITY',
    severity: 'medium',
    confidence: 'High',
    title: 'T',
    description: 'D',
    evidence: { proof: 'confirmed' },
    correlationKeys: [],
    status: 'detected',
    ...overrides,
  };
}

test('gate: critical finding → NOT_READY / FAIL', () => {
  const gate = buildReleaseGate([
    finding({ severity: 'critical', domain: 'SECURITY' }),
  ]);
  assert.equal(gate.status, 'NOT_READY');
  assert.equal(gate.domains[0].verdict, 'FAIL');
});

test('gate: high finding → CONDITIONAL / WARN', () => {
  const gate = buildReleaseGate([finding({ severity: 'high', domain: 'API' })]);
  assert.equal(gate.status, 'CONDITIONAL');
  assert.equal(gate.domains[0].verdict, 'WARN');
});

test('gate: only medium/low → READY / PASS', () => {
  const gate = buildReleaseGate([finding({ severity: 'medium' })]);
  assert.equal(gate.status, 'READY');
  assert.equal(gate.domains[0].verdict, 'PASS');
});

test('gate: no findings → UNKNOWN', () => {
  assert.equal(buildReleaseGate([]).status, 'UNKNOWN');
});

test('gate: low-confidence critical downgrades to WARN', () => {
  const gate = buildReleaseGate([
    finding({ severity: 'critical', confidence: 'Low' }),
  ]);
  assert.equal(gate.domains[0].verdict, 'WARN');
  assert.equal(gate.status, 'CONDITIONAL');
});

test('correlate: web + static share key → confirmed', () => {
  const web = finding({
    id: 'lcp-issue',
    source: 'web',
    domain: 'PERFORMANCE',
    correlationKeys: ['lcp'],
    evidence: { proof: 'confirmed' },
  });
  const code = finding({
    id: 'PERF-001',
    source: 'static',
    domain: 'PERFORMANCE',
    correlationKeys: ['lcp'],
    confidence: 'High',
  });
  const groups = correlate([web, code]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].proof, 'confirmed');
});

test('correlate: web + review share key → likely', () => {
  const web = finding({
    id: 'lcp-issue',
    source: 'web',
    domain: 'PERFORMANCE',
    correlationKeys: ['lcp'],
    evidence: { proof: 'confirmed' },
  });
  const review = finding({
    id: 'PERF-002',
    source: 'review',
    domain: 'PERFORMANCE',
    correlationKeys: ['lcp'],
    confidence: 'Medium',
  });
  const groups = correlate([web, review]);
  assert.equal(groups[0].proof, 'likely');
});

test('issueToFinding maps category to domain and keys', () => {
  const issue: Issue = {
    id: 'uses-optimized-images',
    category: 'performance',
    title: 'Efficiently encode images',
    description: 'x',
    severity: 'high',
    devices: ['mobile'],
    deviceCounts: { mobile: 1, desktop: 0 },
    affectedPages: [],
    affectedUrls: ['/events/1'],
    count: 3,
    totalPages: 3,
    avgNumericValue: 1024,
    maxNumericValue: 2048,
    sumNumericValue: 3072,
    displayValue: null,
    affectedTemplates: [],
    representativeUrls: ['/events/1'],
    examples: [],
    likelyCommonCause: 'unoptimized images',
  };
  const f = issueToFinding(issue);
  assert.equal(f.source, 'web');
  assert.equal(f.domain, 'PERFORMANCE');
  assert.ok(f.correlationKeys.includes('image-optimization'));
});
