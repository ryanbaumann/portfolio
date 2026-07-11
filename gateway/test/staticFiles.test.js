import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeResolve, cacheControlFor, mimeTypeFor } from '../lib/staticFiles.js';

test('safeResolve refuses to escape the base directory', () => {
  assert.equal(safeResolve('/srv/app', '../../etc/passwd'), null);
  assert.equal(safeResolve('/srv/app', '/../../etc/passwd'), null);
});

test('safeResolve resolves normal subpaths inside the base directory', () => {
  assert.equal(safeResolve('/srv/app', '/assets/app.js'), '/srv/app/assets/app.js');
  assert.equal(safeResolve('/srv/app', '/'), '/srv/app');
});

test('cacheControlFor uses no-cache for HTML', () => {
  assert.equal(cacheControlFor('/srv/app/index.html'), 'no-cache');
});

test('cacheControlFor uses immutable caching for hashed asset filenames', () => {
  // Real filenames Vite produced for this repo's apps.
  assert.equal(cacheControlFor('/srv/app/assets/index-D3xK9f2a.js'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControlFor('/srv/app/assets/dist-D-g5X-d9.js'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControlFor('/srv/app/assets/strava-explorer-gMKfxHCm.jpg'), 'public, max-age=31536000, immutable');
});

test('cacheControlFor falls back to a conservative default for unhashed files', () => {
  assert.equal(cacheControlFor('/srv/app/bundle.js'), 'public, max-age=3600');
  // Regression: an all-lowercase hand-written filename must not be mistaken
  // for a content hash just because its final hyphenated segment is long.
  assert.equal(cacheControlFor('/srv/app/previews/strava-explorer.jpg'), 'public, max-age=3600');
  assert.equal(cacheControlFor('/srv/app/not-found.txt'), 'public, max-age=3600');
});

test('mimeTypeFor maps common extensions', () => {
  assert.equal(mimeTypeFor('a.js'), 'text/javascript; charset=utf-8');
  assert.equal(mimeTypeFor('a.css'), 'text/css; charset=utf-8');
  assert.equal(mimeTypeFor('a.unknownext'), 'application/octet-stream');
});
