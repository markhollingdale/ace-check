import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractField, extractFiles, mapSeverity, parseReviewReport } from './ingest.js';

const FIXTURE = `# Security Review

## 7. Detailed Findings

---

## SEC-001

## Severity

High

## Category

Authentication / Client-side redirect

## Problem

\`app/(auth)/auth/signin/_components/signin-form.tsx\` reads \`callbackURL\` and calls \`router.push(callbackUrl)\` - line 238. No validation.

## Why It Matters

An attacker can craft a phishing redirect.

## Recommendation

Validate \`callbackURL\` before redirecting.

## Example Implementation

\`\`\`ts
function safeCallbackUrl(raw) { return raw.startsWith("/") ? raw : "/"; }
\`\`\`

## Estimated Fix Time

1-2 hours

---

## SEC-002

## Severity

Medium

## Category

Account enumeration

## Problem

Two server actions disclose account existence.

## Recommendation

Gate the actions behind authentication.

## Estimated Fix Time

0.5-1 day
`;

test('extractField pulls a section value', () => {
  const block = FIXTURE.split('## SEC-002')[0];
  assert.equal(extractField(block, 'Severity'), 'High');
  assert.ok(extractField(block, 'Problem').includes('signin-form.tsx'));
});

test('parseReviewReport extracts findings with metadata', () => {
  const findings = parseReviewReport(FIXTURE);
  assert.equal(findings.length, 2);

  const first = findings[0];
  assert.equal(first.id, 'SEC-001');
  assert.equal(first.severity, 'high');
  assert.equal(first.domain, 'SECURITY');
  assert.equal(first.confidence, 'Medium');
  assert.equal(first.effort, '1-2 hours');
  assert.ok(first.affectedFiles?.some((f) => f.includes('signin-form.tsx')));

  const second = findings[1];
  assert.equal(second.id, 'SEC-002');
  assert.equal(second.severity, 'medium');
});

test('mapSeverity normalises labels', () => {
  assert.equal(mapSeverity('Critical'), 'critical');
  assert.equal(mapSeverity('High'), 'high');
  assert.equal(mapSeverity('Medium'), 'medium');
  assert.equal(mapSeverity('Low'), 'low');
});

test('extractFiles finds code references', () => {
  const files = extractFiles('see app/(auth)/auth/signin/_components/signin-form.tsx:238 and src/server.ts');
  assert.ok(files.some((f) => f.includes('signin-form.tsx')));
});
