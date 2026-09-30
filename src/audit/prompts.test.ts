import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverModules } from './modules.js';
import {
  generateFullSuitePrompt,
  generateModulePrompt,
  type ProjectContext,
} from './prompts.js';

const ctx: ProjectContext = {
  name: 'sample',
  stack: ['next@15'],
  tree: ['package.json', 'src/'],
  envKeys: ['DATABASE_URL'],
};

function referenceDoc(prompt: string, ref: string): string | null {
  const match = new RegExp(
    `<reference-document path="${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([\\s\\S]*?)</reference-document>`,
  ).exec(prompt);
  return match ? match[1] : null;
}

test('generateModulePrompt: inlines the framework documents it references', () => {
  const module = discoverModules().find((m) => m.number === 20);
  assert.ok(module, 'expected the security module to be discoverable');
  const prompt = generateModulePrompt(module, ctx);

  assert.match(prompt, /self-contained/);
  const framework = referenceDoc(prompt, 'framework/20-review-framework.md');
  assert.ok(framework, 'expected the review framework to be inlined');
  assert.match(framework, /# Review Framework/);

  const standard = referenceDoc(
    prompt,
    'reviews/20-security-analysis/20-security-analysis.md',
  );
  assert.equal(standard, null, 'the module doc is the review standard, not a ref');

  assert.match(prompt, /## Review standard/);
  assert.match(prompt, /# Security Audit/);
});

test('generateFullSuitePrompt: inlines every review plus the framework and runner', () => {
  const prompt = generateFullSuitePrompt(ctx);

  assert.match(prompt, /## Runner instructions/);
  assert.match(prompt, /Run Full AI Review Suite/);

  for (const ref of [
    'framework/10-readme.md',
    'framework/20-review-framework.md',
    'reviews/10-architecture-analysis/10-architecture-analysis.md',
    'reviews/20-security-analysis/20-security-analysis.md',
    'reviews/180-portability-analysis/180-portability-analysis.md',
    'reviews/190-abuse-bot-resilience/190-abuse-bot-resilience.md',
    'reviews/990-meta-review/990-meta-review.md',
    'reviews/140-specification/140-specification.md',
    'reviews/999-summary/999-summary.md',
  ]) {
    const doc = referenceDoc(prompt, ref);
    assert.ok(doc, `expected ${ref} to be inlined`);
    assert.ok(doc.trim().length > 0, `expected ${ref} to have content`);
  }
});
