import assert from 'node:assert/strict';
import test from 'node:test';
import type { Finding } from '../types.js';
import { groupFindings } from './groups.js';
import { buildReleaseGate } from './gate.js';
import { buildNextActions } from './next-actions.js';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'X-001',
    source: 'web',
    category: 'performance',
    domain: 'PERFORMANCE',
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

test('groups: LCP family collapses to one primary', () => {
  const findings = [
    finding({ id: 'largest-contentful-paint', severity: 'critical' }),
    finding({ id: 'lcp-discovery-insight', severity: 'high' }),
    finding({ id: 'lcp-breakdown-insight', severity: 'low' }),
    finding({ id: 'image-delivery-insight', severity: 'low' }),
  ];
  const { groups } = groupFindings(findings);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 'lcp');
  assert.equal(groups[0].primary, 'largest-contentful-paint');
  assert.deepEqual(groups[0].members, [
    'largest-contentful-paint',
    'lcp-discovery-insight',
    'lcp-breakdown-insight',
    'image-delivery-insight',
  ]);
});

test('gate: derived symptoms are not counted as separate criticals', () => {
  const gate = buildReleaseGate([
    finding({ id: 'largest-contentful-paint', severity: 'critical' }),
    finding({ id: 'lcp-discovery-insight', severity: 'critical' }),
    finding({ id: 'lcp-breakdown-insight', severity: 'critical' }),
    finding({ id: 'image-delivery-insight', severity: 'high' }),
  ]);
  assert.equal(gate.severityCounts.critical, 1);
  assert.equal(gate.groups.length, 1);
});

test('gate: expected/third-party/not-actionable findings do not fail the gate', () => {
  const gate = buildReleaseGate([
    finding({
      id: 'is-crawlable',
      severity: 'critical',
      domain: 'SEO',
      disposition: 'expected',
    }),
    finding({
      id: 'bf-cache',
      severity: 'high',
      disposition: 'not-actionable',
    }),
  ]);
  assert.equal(gate.status, 'READY');
  assert.equal(gate.dispositions.expected, 1);
  assert.equal(gate.dispositions['not-actionable'], 1);
  assert.equal(gate.severityCounts.critical, 0);
});

test('next-actions: derived symptoms are excluded', () => {
  const actions = buildNextActions([
    finding({ id: 'largest-contentful-paint', severity: 'critical' }),
    finding({ id: 'lcp-discovery-insight', severity: 'critical' }),
    finding({ id: 'lcp-breakdown-insight', severity: 'high' }),
  ]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].findingId, 'largest-contentful-paint');
});
