import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Finding } from '../types.js';
import { enrichFindingSources, mapFindingToSource } from './source-map.js';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'color-contrast',
    source: 'web',
    category: 'accessibility',
    domain: 'ACCESSIBILITY',
    severity: 'critical',
    confidence: 'High',
    title: 'T',
    description: 'D',
    evidence: { proof: 'confirmed' },
    correlationKeys: [],
    status: 'detected',
    ...overrides,
  };
}

function tempProject(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'acecheck-source-'));
  mkdirSync(path.join(dir, 'components', 'x'), { recursive: true });
  mkdirSync(path.join(dir, 'app', 'whats-on'), { recursive: true });
  writeFileSync(
    path.join(dir, 'components', 'x', 'ad.tsx'),
    'export function Ad() { return <div className="opacity-40">x</div>; }',
  );
  writeFileSync(path.join(dir, 'components', 'x', 'other.tsx'), 'export const a = 1;');
  writeFileSync(
    path.join(dir, 'app', 'whats-on', 'page.tsx'),
    'export default function Page() { return <main>whats on</main>; }',
  );
  return dir;
}

test('source-map: maps selector classes to candidate files', () => {
  const dir = tempProject();
  try {
    const files = mapFindingToSource(
      finding({
        detailsSummary: [
          'Element <li class="flex opacity-40"> (selector: li.opacity-40)',
        ],
      }),
      dir,
    );
    assert.ok(files.includes('components/x/ad.tsx'));
    assert.ok(!files.includes('components/x/other.tsx'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('source-map: maps a route to its page file', () => {
  const dir = tempProject();
  try {
    const files = mapFindingToSource(
      finding({ id: 'largest-contentful-paint', evidence: { url: 'https://x.dev/whats-on', proof: 'confirmed' } }),
      dir,
    );
    assert.ok(files.includes('app/whats-on/page.tsx'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('source-map: enrichFindingSources records a heuristic note', () => {
  const dir = tempProject();
  try {
    const enriched = enrichFindingSources(
      [
        finding({
          detailsSummary: ['Element <li class="opacity-40"> (selector: li.opacity-40)'],
        }),
      ],
      dir,
    );
    assert.ok(enriched[0].affectedFiles?.includes('components/x/ad.tsx'));
    assert.ok(
      enriched[0].context?.some(
        (c) => c.label === 'Candidate source files (heuristic)',
      ),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('source-map: no codebase yields no candidates', () => {
  assert.deepEqual(mapFindingToSource(finding({}), undefined), []);
});
