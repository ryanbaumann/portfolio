// gateway/lib/staticFiles.js
//
// Static file serving helpers: MIME lookup, cache-control policy, security
// headers, and a path-traversal-safe resolver.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

export const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
]);

export function mimeTypeFor(filePath) {
  return MIME_TYPES.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
}

// Vite/Rollup and most bundlers embed a content hash directly in the
// filename, e.g. `index-D3xK9f2a.js`, `strava-explorer-gMKfxHCm.jpg`,
// `dist-D-g5X-d9.js` (real filenames Vite produced for this repo's apps).
// The segment right before the extension is treated as a hash if it's
// 6-14 chars from the filename-safe alphabet AND contains an uppercase
// letter: Vite/Rollup hashes are case-sensitive pseudo-random output, so an
// uppercase letter shows up in all but a vanishingly small fraction of real
// hashes, while ordinary hand-written lowercase names (`strava-explorer.jpg`,
// `not-found.html`, `bundle.js`) never trip it.
const HASHED_SEGMENT_PATTERN = /[.-]([A-Za-z0-9_-]{6,14})\.[a-z0-9]+$/i;

export function cacheControlFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.html') {
    return 'no-cache';
  }
  const match = HASHED_SEGMENT_PATTERN.exec(filePath);
  if (match && /[A-Z]/.test(match[1])) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  // The service only ever runs behind Cloud Run's TLS termination (and
  // local dev is plain HTTP on localhost, which browsers exempt from HSTS
  // upgrade-loop issues), so this is safe to send unconditionally.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export function applySecurityHeaders(response) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(key, value);
  }
}

/**
 * Resolve `subPath` inside `baseDir`, refusing anything that would escape
 * `baseDir` (path traversal via `..` or an absolute path). Note this is a
 * lexical check on the resolved path string, not a symlink-safe jail:
 * `resolve()` does not follow or validate symlinks. That's an accepted
 * tradeoff here because `baseDir` only ever contains our own build output
 * (never user-uploaded content), so no symlink can point outside it.
 * Returns null if the resolved path escapes baseDir.
 */
export function safeResolve(baseDir, subPath) {
  const base = resolve(baseDir);
  const target = resolve(base, `.${sep}${subPath.replace(/^\/+/, '')}`);
  if (target !== base && !target.startsWith(base + sep)) {
    return null;
  }
  return target;
}

/**
 * Serve a static file (or that directory's index.html) from baseDir for the
 * given request subPath. Returns true if a response was sent, false if the
 * caller should fall through (e.g. to a 404 handler).
 */
export function serveFromDir(baseDir, subPath, response) {
  let filePath = safeResolve(baseDir, subPath || '/');
  if (!filePath) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request path.');
    return true;
  }

  if (!existsSync(filePath)) {
    return false;
  }

  let stat = statSync(filePath);
  if (stat.isDirectory()) {
    filePath = join(filePath, 'index.html');
    if (!existsSync(filePath)) return false;
    stat = statSync(filePath);
  }

  applySecurityHeaders(response);
  response.writeHead(200, {
    'Content-Type': mimeTypeFor(filePath),
    'Content-Length': stat.size,
    'Cache-Control': cacheControlFor(filePath),
  });
  createReadStream(filePath).pipe(response);
  return true;
}
