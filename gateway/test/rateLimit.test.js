import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../lib/rateLimit.js';

test('createRateLimiter allows up to max requests per window then blocks', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
  assert.equal(limiter.check('1.2.3.4'), true);
  assert.equal(limiter.check('1.2.3.4'), true);
  assert.equal(limiter.check('1.2.3.4'), true);
  assert.equal(limiter.check('1.2.3.4'), false);
  limiter.stop();
});

test('createRateLimiter tracks separate keys independently', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
  assert.equal(limiter.check('a'), true);
  assert.equal(limiter.check('b'), true);
  assert.equal(limiter.check('a'), false);
  assert.equal(limiter.check('b'), false);
  limiter.stop();
});
