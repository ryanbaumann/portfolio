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
    RESEND_SEGMENT_ID: 'segment-id',
    RESEND_TOPIC_ID: 'topic-id',
    GOOGLE_OAUTH_CLIENT_ID: 'google-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret',
    GOOGLE_OAUTH_SESSION_SECRET: 'session-secret',
    WRITER_PUBLIC_ORIGIN: 'https://dashboard.example.com',
    GITHUB_CONTENT_TOKEN: 'github-token',
    GITHUB_REVIEW_TOKEN: 'review-token',
    ANALYTICS_MEASUREMENT_ID: 'G-TEST123',
  });
  assert.match(generated, /^VITE_GMP_API_KEY=shared-browser-key$/m);
  assert.match(generated, /^VITE_ISOCHRONES_GMP_API_KEY=isochrones-browser-key$/m);
  assert.match(generated, /^GMP_SERVER_API_KEY=server-key$/m);
  assert.match(generated, /^RESEND_API_KEY=resend-key$/m);
  assert.match(generated, /^CONTACT_TO_EMAIL=owner@example\.com$/m);
  assert.match(generated, /^RESEND_SEGMENT_ID=segment-id$/m);
  assert.match(generated, /^RESEND_TOPIC_ID=topic-id$/m);
  assert.match(generated, /^GOOGLE_OAUTH_CLIENT_ID=google-client$/m);
  assert.match(generated, /^GOOGLE_OAUTH_CLIENT_SECRET=google-secret$/m);
  assert.match(generated, /^GOOGLE_OAUTH_SESSION_SECRET=session-secret$/m);
  assert.match(generated, /^WRITER_PUBLIC_ORIGIN=https:\/\/dashboard\.example\.com$/m);
  assert.match(generated, /^GITHUB_CONTENT_TOKEN=github-token$/m);
  assert.match(generated, /^GITHUB_REVIEW_TOKEN=review-token$/m);
  assert.match(generated, /^ANALYTICS_MEASUREMENT_ID=G-TEST123$/m);
});
