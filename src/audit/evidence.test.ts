import assert from 'node:assert/strict';
import test from 'node:test';
import { summariseEvidenceItem } from './evidence.js';

test('evidence: renders a nested insight table by heading label', () => {
  const line = summariseEvidenceItem({
    page: 'https://example.com/whats-on',
    device: 'mobile',
    type: 'table',
    headings: [
      { key: 'source', label: 'Source' },
      { key: 'reflowTime', label: 'Total reflow time' },
    ],
    items: [
      {
        source: { type: 'text', value: '[unattributed]' },
        reflowTime: 40.269,
      },
    ],
  });
  assert.match(line, /Source: \[unattributed\]/);
  assert.match(line, /Total reflow time: 40.269/);
  assert.doesNotMatch(line, /no readable detail/);
});

test('evidence: renders the longest chain from a network tree', () => {
  const line = summariseEvidenceItem({
    type: 'list-section',
    value: {
      type: 'network-tree',
      chains: {
        root: {
          url: 'https://example.com/',
          navStartToEndTime: 5,
          transferSize: 100,
          children: {
            css: {
              url: 'https://example.com/_next/static/chunks/app.css',
              navStartToEndTime: 100,
              transferSize: 30930,
              children: {},
            },
          },
        },
      },
      longestChain: { duration: 100 },
    },
  });
  assert.match(line, /Longest critical chain/);
  assert.match(line, /app\.css/);
  assert.match(line, /100 ms/);
});

test('evidence: keeps the full console message and source location', () => {
  const description =
    'Loading the script violates the following Content Security Policy directive: "script-src \'self\'". ' +
    'x'.repeat(300);
  const line = summariseEvidenceItem({
    page: 'https://example.com/',
    device: 'mobile',
    source: 'security',
    description,
    sourceLocation: {
      type: 'source-location',
      url: 'https://example.com/_next/static/chunks/app.js',
      line: 1,
      column: 5500,
    },
  });
  assert.ok(line.includes(description), 'full description should be present');
  assert.match(line, /app\.js:1:5500/);
  assert.match(line, /\[security\]/);
});

test('evidence: renders checklist label/value pairs', () => {
  const line = summariseEvidenceItem({
    noRedirects: { label: 'Avoids redirects', value: true },
    serverResponseIsFast: {
      label: 'Server responds quickly (observed 13 ms)',
      value: true,
    },
  });
  assert.match(line, /Avoids redirects: yes/);
  assert.match(line, /Server responds quickly/);
});
