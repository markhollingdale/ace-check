import assert from 'node:assert/strict';
import test from 'node:test';
import { extractIssues } from './parser.js';
import {
  summariseEvidenceItem,
  summariseEvidenceItems,
} from '../audit/evidence.js';

test('summariseEvidenceItems: de-duplicates repeat items', () => {
  const node = { node: { selector: 'html', nodeLabel: 'html' } };
  const lines = summariseEvidenceItems([
    { ...node, page: 'https://example.com/' },
    { ...node, page: 'https://example.com/' },
    { ...node, page: 'https://example.com/about' },
  ]);
  assert.equal(lines.length, 2);
});

function lhrWith(audits: Record<string, unknown>): unknown {
  return {
    categories: {
      performance: { auditRefs: Object.keys(audits).map((id) => ({ id })) },
    },
    audits,
  };
}

test('extractIssues: metric audits borrow evidence from supporting audits', () => {
  const lhr = lhrWith({
    'total-blocking-time': {
      id: 'total-blocking-time',
      title: 'Total Blocking Time',
      description: 'TBT',
      score: 0.2,
      scoreDisplayMode: 'numeric',
      numericValue: 900,
      displayValue: '900 ms',
      // Metric audits have no items of their own.
    },
    'mainthread-work-breakdown': {
      id: 'mainthread-work-breakdown',
      scoreDisplayMode: 'metricSavings',
      score: 0.4,
      details: {
        type: 'table',
        items: [{ groupLabel: 'Script Evaluation', duration: 1200 }],
      },
    },
    'bootup-time': {
      id: 'bootup-time',
      scoreDisplayMode: 'metricSavings',
      score: 0.5,
      details: {
        type: 'table',
        items: [{ url: 'https://example.com/app.js', total: 800, scripting: 500 }],
      },
    },
  });

  const issues = extractIssues(lhr);
  const tbt = issues.find((i) => i.auditId === 'total-blocking-time');
  assert.ok(tbt, 'TBT issue should be extracted');
  assert.equal(tbt.items.length, 2, 'TBT should borrow the two culprits');
  assert.equal(tbt.items[0].via, 'mainthread-work-breakdown');
  assert.equal(tbt.items[1].via, 'bootup-time');
});

test('extractIssues: own items win over supporting audits', () => {
  const lhr = lhrWith({
    'landmark-one-main': {
      id: 'landmark-one-main',
      title: 'Document has a main landmark',
      score: 0,
      scoreDisplayMode: 'binary',
      details: { type: 'table', items: [{ node: { selector: 'html' } }] },
    },
  });
  const issues = extractIssues(lhr);
  assert.equal(issues[0].items.length, 1);
  assert.equal(issues[0].items[0].via, undefined);
});

test('summariseEvidenceItem: renders DOM node evidence', () => {
  const line = summariseEvidenceItem({
    page: 'https://example.com/pricing',
    device: 'mobile',
    node: {
      snippet: '<button class="close">×</button>',
      selector: '.close',
      nodeLabel: 'Close',
    },
  });
  assert.match(line, /Element/);
  assert.match(line, /selector: \.close/);
  assert.match(line, /Close/);
  assert.match(line, /https:\/\/example.com\/pricing/);
});

test('summariseEvidenceItem: renders wasted bytes for resources', () => {
  const line = summariseEvidenceItem({
    url: 'https://example.com/hero.png',
    totalBytes: 2_400_000,
    wastedBytes: 1_800_000,
    wastedMs: 320,
  });
  assert.match(line, /hero\.png/);
  assert.match(line, /2\.40 MB/);
  assert.match(line, /1\.80 MB wasted/);
  assert.match(line, /320 ms wasted/);
});

test('summariseEvidenceItem: renders long tasks and category rows', () => {
  const task = summariseEvidenceItem({
    duration: 850,
    startTime: 1234,
    via: 'long-tasks',
  });
  assert.match(task, /850 ms/);
  assert.match(task, /1\.23 s/);
  assert.match(task, /via long-tasks/);

  const group = summariseEvidenceItem({
    groupLabel: 'Script Evaluation',
    duration: 1200,
  });
  assert.match(group, /Script Evaluation: 1200 ms/);

  const resource = summariseEvidenceItem({
    resourceType: 'script',
    requestCount: 12,
    transferSize: 320_000,
  });
  assert.match(resource, /Resource: script/);
  assert.match(resource, /12 request\(s\)/);
  assert.match(resource, /320 KB/);
});

test('summariseEvidenceItem: never dumps JSON for unknown shapes', () => {
  const line = summariseEvidenceItem({ weird: 'value', count: 3 });
  assert.match(line, /weird=value/);
  assert.doesNotMatch(line, /\{/);
});
