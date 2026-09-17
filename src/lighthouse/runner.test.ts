import assert from 'node:assert/strict';
import test from 'node:test';
import { isChromeFailure } from './runner.js';
import { classifyError } from './runner.js';

test('isChromeFailure: catches the dirty-renderer messages', () => {
  assert.equal(
    isChromeFailure('The "start lh:driver:navigate" performance mark has not been set'),
    true,
  );
  assert.equal(
    isChromeFailure('The "start lh:storage:clearDataForOrigin" performance mark has not been set'),
    true,
  );
  assert.equal(
    isChromeFailure('An internal Chrome error occurred. Please restart Chrome and try re-running Lighthouse.'),
    true,
  );
  assert.equal(isChromeFailure('ENOENT: chrome not found'), true);
  assert.equal(isChromeFailure('Target closed'), true);
});

test('isChromeFailure: leaves genuinely different failures alone', () => {
  assert.equal(isChromeFailure('The page took too long to respond.'), false);
  assert.equal(isChromeFailure('DNS lookup failed'), false);
});

test('classifyError: chrome failures are classified as retryable chrome errors', () => {
  const classified = classifyError(
    new Error('An internal Chrome error occurred. Please restart Chrome'),
  );
  assert.equal(classified.kind, 'chrome');
});

test('classifyError: timeouts and networks keep their kinds', () => {
  assert.equal(classifyError(new Error('Navigation timeout of 45000 ms')).kind, 'timeout');
  assert.equal(classifyError(new Error('net::ERR_NAME_NOT_RESOLVED')).kind, 'network');
});
