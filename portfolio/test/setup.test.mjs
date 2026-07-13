import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatEnv } from '../../scripts/setup.mjs';

test('setup writes separate browser, server, and contact configuration', () => {
  const generated = formatEnv({
    STRAVA_CLIENT_ID: 'strava-client',
    STRAVA_CLIENT_SECRET: 'strava-secret',
    VITE_GMP_API_KEY: 'shared-browser-key',
    VITE_ISOCHRONES_GMP_API_KEY: 'isochrones-browser-key',
    GMP_SERVER_API_KEY: 'server-key',
    RESEND_API_KEY: 'resend-key',
    CONTACT_TO_EMAIL: 'owner@example.com',
    CONTACT_FROM_EMAIL: 'Portfolio <sender@example.com>',
  });
  assert.match(generated, /^VITE_GMP_API_KEY=shared-browser-key$/m);
  assert.match(generated, /^VITE_ISOCHRONES_GMP_API_KEY=isochrones-browser-key$/m);
  assert.match(generated, /^GMP_SERVER_API_KEY=server-key$/m);
  assert.match(generated, /^RESEND_API_KEY=resend-key$/m);
  assert.match(generated, /^CONTACT_TO_EMAIL=owner@example\.com$/m);
});
