import assert from 'node:assert/strict';
import test from 'node:test';
import { assignSeverity, type SeverityInput } from './priorities.js';

function input(overrides: Partial<SeverityInput>): SeverityInput {
  return {
    auditId: 'some-audit',
    category: 'performance',
    baseSeverity: 'high',
    score: 0,
    affectedCount: 1,
    totalPages: 32,
    avgNumericValue: null,
    unitHint: null,
    ...overrides,
  };
}

test('severity: valid-source-maps is capped low even at full coverage', () => {
  assert.equal(
    assignSeverity(input({ auditId: 'valid-source-maps', affectedCount: 32 })),
    'low',
  );
});

test('severity: color-contrast stays critical', () => {
  assert.equal(
    assignSeverity(
      input({
        auditId: 'color-contrast',
        category: 'accessibility',
        affectedCount: 5,
      }),
    ),
    'critical',
  );
});

test('severity: a failing target-size audit is capped at medium', () => {
  assert.equal(
    assignSeverity(
      input({
        auditId: 'target-size',
        category: 'accessibility',
        affectedCount: 2,
      }),
    ),
    'medium',
  );
});

test('severity: coverage cannot manufacture a critical for symptoms', () => {
  assert.equal(
    assignSeverity(
      input({ auditId: 'total-blocking-time', affectedCount: 32 }),
    ),
    'high',
  );
});

test('severity: is-crawlable is capped at medium', () => {
  assert.equal(
    assignSeverity(
      input({ auditId: 'is-crawlable', category: 'seo', affectedCount: 10 }),
    ),
    'medium',
  );
});
