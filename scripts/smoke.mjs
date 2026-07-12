#!/usr/bin/env node
// scripts/smoke.mjs
//
// Dependency-free smoke test for the trails.ninja gateway. Exercises a
// running instance with plain `fetch`: route liveness, HTML sanity, the
// apps.json <-> /api/apps contract, OAuth URL shape, a leaked-secret grep
// over every served asset, and keyless proxy behavior. See
// docs/ARCHITECTURE.md rule 4: "Smoke tests are dependency-free."
//
// Usage:
//   BASE_URL=https://trails.ninja node scripts/smoke.mjs   # test a running instance
//   node scripts/smoke.mjs                                  # build nothing; boot the
//                                                            # gateway against ./apps
//                                                            # (run `node scripts/build-local.mjs`
//                                                            # first) and test that

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS_JSON_PATH = join(REPO_ROOT, 'apps.json');
const APPS_STAGING_DIR = join(REPO_ROOT, 'apps');
const GATEWAY_PUBLIC_DIR = join(REPO_ROOT, 'gateway', 'public');

const failures = [];
const passes = [];

function pass(name) {
  passes.push(name);
  console.log(`  ok  ${name}`);
}

function fail(name, detail) {
  failures.push({ name, detail });
  console.error(`FAIL  ${name}`);
  if (detail) console.error(`      ${String(detail).split('\n').join('\n      ')}`);
}

async function check(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err.stack || err.message || String(err));
  }
}

// ---------------------------------------------------------------------------
// Gateway lifecycle: reuse BASE_URL if given, else boot the gateway ourselves
// against the local apps/ staging directory produced by build-local.mjs.
// ---------------------------------------------------------------------------

let child = null;

async function waitForHealthz(baseUrl, timeoutMs = 15_000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Gateway did not become healthy at ${baseUrl} within ${timeoutMs}ms: ${lastError}`);
}

async function startGateway() {
  const port = Number(process.env.SMOKE_PORT || 8099);
  const baseUrl = `http://127.0.0.1:${port}`;

  child = spawn(process.execPath, [join(REPO_ROOT, 'gateway', 'server.js')], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      APPS_ROOT: APPS_STAGING_DIR,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[smoke] gateway process exited early with code ${code} (signal ${signal})\n${output}`);
    }
  });

  await waitForHealthz(baseUrl);
  return baseUrl;
}

function stopGateway() {
  if (child && !child.killed) {
    child.kill();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listFilesRecursive(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// Matches src="..." / href="..." attribute values that look like local
// asset references (not http(s)/data/mailto/anchor links).
function extractAssetUrls(html) {
  const urls = new Set();
  const attrPattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) {
    const value = match[1];
    if (!value) continue;
    if (/^(https?:)?\/\//i.test(value)) continue; // external
    if (/^(data|mailto|tel|javascript):/i.test(value)) continue;
    if (value.startsWith('#')) continue;
    urls.add(value);
  }
  return [...urls];
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { response, text };
}

// ---------------------------------------------------------------------------
// Secret-leak patterns. Each entry: [label, regex, note].
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  ['Strava/generic OAuth client_secret string', /client_secret/i],
  // Google API keys. In a keyless CI build no VITE_GMP_API_KEY was ever
  // injected, so any match here is a real leak, not an expected browser key.
  ['Google API key (AIza...)', /AIza[0-9A-Za-z_-]{35}/],
  ['Stripe-style live secret key', /sk_live_[0-9A-Za-z]+/],
  ['PEM private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

function scanForSecrets(rootDirs) {
  const hits = [];
  const textExtensions = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.svg', '.txt', '.webmanifest']);
  for (const rootDir of rootDirs) {
    for (const filePath of listFilesRecursive(rootDir)) {
      if (!textExtensions.has(extname(filePath).toLowerCase())) continue;
      let content;
      try {
        content = readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }
      const relPath = relative(REPO_ROOT, filePath);
      for (const [label, pattern] of SECRET_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
          hits.push(`${label} in ${relPath}: "${match[0].slice(0, 60)}"`);
        }
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apps = JSON.parse(readFileSync(APPS_JSON_PATH, 'utf8'));
  const startedOwnGateway = !process.env.BASE_URL;
  const baseUrl = process.env.BASE_URL || await startGateway();

  console.log(`[smoke] testing ${baseUrl}${startedOwnGateway ? ' (gateway started by this script)' : ' (external BASE_URL)'}`);

  try {
    await check('/healthz returns 200', async () => {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
      const data = await response.json();
      if (data.ok !== true) throw new Error(`expected ok: true, got ${JSON.stringify(data)}`);
    });

    await check('/ returns 200 text/html containing every app title', async () => {
      const { response, text } = await fetchText(`${baseUrl}/`);
      if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) throw new Error(`expected text/html, got ${contentType}`);
      for (const app of apps) {
        if (!text.includes(app.title)) throw new Error(`landing page missing app title "${app.title}"`);
      }
    });

    await check('/api/apps returns JSON matching apps.json', async () => {
      const response = await fetch(`${baseUrl}/api/apps`);
      if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.apps)) throw new Error('expected { apps: [...] }');
      if (data.apps.length !== apps.length) {
        throw new Error(`expected ${apps.length} apps, got ${data.apps.length}`);
      }
      for (const expected of apps) {
        const actual = data.apps.find((a) => a.name === expected.name);
        if (!actual) throw new Error(`apps.json app "${expected.name}" missing from /api/apps`);
        for (const field of ['title', 'description', 'path']) {
          if (actual[field] !== expected[field]) {
            throw new Error(`app "${expected.name}" field "${field}" mismatch: expected ${JSON.stringify(expected[field])}, got ${JSON.stringify(actual[field])}`);
          }
        }
      }
    });

    await check('/<app> (no trailing slash) redirects to /<app>/', async () => {
      const app = apps[0];
      const bare = app.path.slice(0, -1);
      const response = await fetch(`${baseUrl}${bare}`, { redirect: 'manual' });
      if (response.status !== 308) throw new Error(`expected 308 redirect for ${bare}, got ${response.status}`);
      const location = response.headers.get('location');
      if (location !== app.path) throw new Error(`expected redirect Location "${app.path}", got "${location}"`);
    });

    for (const app of apps) {
      await check(`${app.path} returns 200 HTML with resolving asset references`, async () => {
        const pageUrl = `${baseUrl}${app.path}`;
        const { response, text } = await fetchText(pageUrl);
        if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) throw new Error(`expected text/html, got ${contentType}`);
        if (!/<html/i.test(text)) throw new Error('response does not look like parseable HTML (no <html> tag)');

        const assetUrls = extractAssetUrls(text);
        if (assetUrls.length === 0) throw new Error('found no local asset references to verify');

        for (const assetUrl of assetUrls) {
          const resolved = new URL(assetUrl, pageUrl).href;
          const assetResponse = await fetch(resolved);
          if (assetResponse.status !== 200) {
            throw new Error(`asset ${assetUrl} (resolved: ${resolved}) returned ${assetResponse.status}`);
          }
        }
      });
    }

    await check('strava-explorer bundle uses the real Strava OAuth authorize URL', async () => {
      const strava = apps.find((a) => a.name === 'strava-explorer');
      if (!strava) throw new Error('strava-explorer missing from apps.json');
      const dir = join(APPS_STAGING_DIR, 'strava-explorer');
      const jsFiles = listFilesRecursive(dir).filter((f) => f.endsWith('.js'));
      if (jsFiles.length === 0) throw new Error(`no built JS found under ${dir}; run scripts/build-local.mjs first`);
      const combined = jsFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
      if (!combined.includes('https://www.strava.com/oauth/authorize')) {
        throw new Error('did not find https://www.strava.com/oauth/authorize in the built bundle');
      }
      if (!/response_type=code/.test(combined)) {
        throw new Error('did not find response_type=code in the built bundle');
      }
    });

    await check('no client_secret string in any served asset', () => {
      const hits = scanForSecrets([APPS_STAGING_DIR, GATEWAY_PUBLIC_DIR]).filter((h) => /client_secret/i.test(h));
      if (hits.length > 0) throw new Error(hits.join('\n'));
    });

    await check('secret-leak scan over staged apps + gateway/public', () => {
      const hits = scanForSecrets([APPS_STAGING_DIR, GATEWAY_PUBLIC_DIR]);
      if (hits.length > 0) throw new Error(hits.join('\n'));
    });

    await check('POST /api/strava/token without code returns 4xx JSON', async () => {
      const response = await fetch(`${baseUrl}/api/strava/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.status < 400 || response.status >= 500) {
        throw new Error(`expected 4xx, got ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error(`expected JSON, got ${contentType}`);
      const data = await response.json();
      if (!data.error) throw new Error(`expected { error }, got ${JSON.stringify(data)}`);
    });

    await check('POST /api/isochrones with invalid body returns 400 with a validation message', async () => {
      const response = await fetch(`${baseUrl}/api/isochrones`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
      const data = await response.json();
      if (!data.error || typeof data.error !== 'string') throw new Error(`expected a validation message, got ${JSON.stringify(data)}`);
    });

  } finally {
    if (startedOwnGateway) stopGateway();
  }

  console.log(`\n[smoke] ${passes.length} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error('\n[smoke] FAILURES:');
    for (const failure of failures) {
      console.error(`  - ${failure.name}`);
      if (failure.detail) console.error(`    ${failure.detail.split('\n').join('\n    ')}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  stopGateway();
  console.error('[smoke] unexpected error:', err);
  process.exitCode = 1;
});
