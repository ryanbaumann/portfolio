import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTimeOverrides, sanitizedBuildEnv } from '../../scripts/build-local.mjs';

test('build-local exposes only browser-public configuration to app builds', () => {
  const apps = [{ auth: { envVar: 'PRIVATE_DEMO_PASSWORD' } }];
  const env = sanitizedBuildEnv(apps, {
    VITE_GMP_API_KEY: 'root-browser-key',
    VITE_ISOCHRONES_GMP_API_KEY: 'root-isochrones-key',
  }, {
    PATH: '/usr/bin',
    VITE_GMP_API_KEY: 'exported-browser-key',
    STRAVA_CLIENT_SECRET: 'server-secret',
    GMP_SERVER_API_KEY: 'server-key',
    RESEND_API_KEY: 'resend-key',
    GITHUB_TOKEN: 'token',
    PRIVATE_DEMO_PASSWORD: 'password',
    DATABASE_URL: 'postgres://sensitive',
    GOOGLE_APPLICATION_CREDENTIALS: '/sensitive/credentials.json',
  });
  assert.equal(env.PATH, '/usr/bin');
  assert.equal(env.VITE_GMP_API_KEY, 'exported-browser-key');
  assert.equal(env.VITE_ISOCHRONES_GMP_API_KEY, 'root-isochrones-key');
  for (const key of ['STRAVA_CLIENT_SECRET', 'GMP_SERVER_API_KEY', 'RESEND_API_KEY', 'GITHUB_TOKEN', 'PRIVATE_DEMO_PASSWORD', 'DATABASE_URL', 'GOOGLE_APPLICATION_CREDENTIALS']) {
    assert.equal(env[key], undefined);
  }
  assert.deepEqual(
    buildTimeOverrides({ name: 'isochrones' }, env),
    { VITE_GMP_API_KEY: 'root-isochrones-key' },
  );
});
