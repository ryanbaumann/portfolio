import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateIsochroneBody, handleIsochronesApi } from '../lib/isochrones.js';

const validBody = {
  location: { latitude: 37.7749, longitude: -122.4194 },
  travelDuration: '600s',
  travelMode: 'DRIVE',
  travelDirection: 'FROM',
  routingPreference: 'TRAFFIC_UNAWARE',
  polygonFidelity: 'MEDIUM',
};

test('validateIsochroneBody accepts a well-formed body', () => {
  assert.equal(validateIsochroneBody(validBody), null);
});

test('validateIsochroneBody rejects out-of-range latitude', () => {
  assert.match(validateIsochroneBody({ ...validBody, location: { latitude: 200, longitude: 0 } }), /Latitude/);
});

test('validateIsochroneBody rejects unsupported travel mode', () => {
  assert.match(validateIsochroneBody({ ...validBody, travelMode: 'TELEPORT' }), /travel mode/);
});

test('validateIsochroneBody caps DRIVE duration at 3600 seconds', () => {
  assert.match(validateIsochroneBody({ ...validBody, travelDuration: '3700s' }), /Drive mode/);
});

test('validateIsochroneBody rejects missing body fields', () => {
  assert.ok(validateIsochroneBody({}));
});

test('handleIsochronesApi returns 400 for an invalid body even with no key configured', async () => {
  const result = await handleIsochronesApi({}, { env: {} });
  assert.equal(result.statusCode, 400);
});

test('handleIsochronesApi returns 503 for a valid body when no key is configured', async () => {
  const result = await handleIsochronesApi(validBody, { env: {} });
  assert.equal(result.statusCode, 503);
});
