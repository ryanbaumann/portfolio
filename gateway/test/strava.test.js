import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleStravaApi, isAllowedPhotoUrl } from '../lib/strava.js';

test('handleStravaApi returns 400 for a missing code, even with no key configured', async () => {
  const result = await handleStravaApi(
    { pathname: '/api/strava/token', method: 'POST', body: {} },
    { env: {} },
  );
  assert.equal(result.statusCode, 400);
});

test('handleStravaApi returns 400 for a missing refresh_token, even with no key configured', async () => {
  const result = await handleStravaApi(
    { pathname: '/api/strava/refresh', method: 'POST', body: {} },
    { env: {} },
  );
  assert.equal(result.statusCode, 400);
});

test('handleStravaApi returns 503 for a well-formed token request when no key is configured', async () => {
  const result = await handleStravaApi(
    { pathname: '/api/strava/token', method: 'POST', body: { code: 'abc123' } },
    { env: {} },
  );
  assert.equal(result.statusCode, 503);
});

test('isAllowedPhotoUrl only allows the CloudFront photo host over https', () => {
  assert.equal(isAllowedPhotoUrl('https://dgtzuqphqg23d.cloudfront.net/photo.jpg'), true);
  assert.equal(isAllowedPhotoUrl('http://dgtzuqphqg23d.cloudfront.net/photo.jpg'), false);
  assert.equal(isAllowedPhotoUrl('https://evil.example.com/photo.jpg'), false);
  assert.equal(isAllowedPhotoUrl('not a url'), false);
});
