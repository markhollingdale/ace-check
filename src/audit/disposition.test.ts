import assert from 'node:assert/strict';
import test from 'node:test';
import type { Issue } from '../types.js';
import { classifyIssue } from './disposition.js';

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: 'some-audit',
    category: 'performance',
    title: 'T',
    description: 'D',
    severity: 'high',
    devices: ['mobile'],
    deviceCounts: { mobile: 1, desktop: 0 },
    affectedPages: [],
    affectedUrls: [],
    count: 1,
    totalPages: 1,
    avgNumericValue: null,
    maxNumericValue: null,
    sumNumericValue: null,
    displayValue: null,
    affectedTemplates: [],
    representativeUrls: [],
    examples: [],
    likelyCommonCause: 'x',
    ...overrides,
  };
}

test('disposition: is-crawlable on private pages is expected', () => {
  const result = classifyIssue(
    issue({
      id: 'is-crawlable',
      affectedUrls: [
        'https://x.dev/auth/signin',
        'https://x.dev/dashboard',
        'https://x.dev/events/new',
      ],
    }),
  );
  assert.equal(result.disposition, 'expected');
});

test('disposition: is-crawlable with a public page stays genuine', () => {
  const result = classifyIssue(
    issue({
      id: 'is-crawlable',
      affectedUrls: ['https://x.dev/auth/signin', 'https://x.dev/pricing'],
    }),
  );
  assert.equal(result.disposition, 'genuine');
});

test('disposition: bf-cache with no-store is not actionable', () => {
  const result = classifyIssue(
    issue({
      id: 'bf-cache',
      description: 'Main resource has cache-control:no-store',
      examples: [{ reason: 'MainResourceHasCacheControlNoStore' }],
    }),
  );
  assert.equal(result.disposition, 'not-actionable');
});

test('disposition: auth and canonical redirects are expected', () => {
  const result = classifyIssue(
    issue({
      id: 'redirects',
      affectedUrls: [
        'https://x.dev/dashboard',
        'https://x.dev/venues',
        'https://x.dev/auth/signin',
      ],
    }),
  );
  assert.equal(result.disposition, 'expected');
});

test('disposition: third-party tile resources are third-party', () => {
  const result = classifyIssue(
    issue({
      id: 'cache-insight',
      examples: [
        { url: 'https://a.tile.openstreetmap.org/1/2/3.png' },
        { url: 'https://b.tile.openstreetmap.org/4/5/6.png' },
      ],
      affectedUrls: ['https://x.dev/whats-on'],
    }),
  );
  assert.equal(result.disposition, 'third-party');
});

test('disposition: unreadable latency evidence needs investigation', () => {
  const result = classifyIssue(
    issue({ id: 'document-latency-insight', examples: [] }),
  );
  assert.equal(result.disposition, 'needs-investigation');
});

test('disposition: readable evidence stays genuine', () => {
  const result = classifyIssue(
    issue({
      id: 'color-contrast',
      examples: [{ node: { selector: '.opacity-40' } }],
    }),
  );
  assert.equal(result.disposition, 'genuine');
});
