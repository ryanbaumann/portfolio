#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apps = JSON.parse(readFileSync(resolve(REPO_ROOT, 'apps.json'), 'utf8'))
  .filter((app) => (app.visibility || 'public') === 'public');
const site = JSON.parse(readFileSync(resolve(REPO_ROOT, 'portfolio/content/site.json'), 'utf8'));
const baseUrl = (process.env.BASE_URL || site.siteUrl).replace(/\/$/, '');
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL  ${name}: ${error.message}`);
  }
}

async function waitForHealthy(timeoutMs = 90_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/healthz`, { redirect: 'manual' });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  throw new Error(`deployment did not become healthy: ${lastError?.message || 'unknown error'}`);
}

function localAssets(html) {
  return [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => value && !/^(?:https?:)?\/\//i.test(value) && !/^(?:data|mailto|tel|javascript):/i.test(value) && !value.startsWith('#'));
}

async function main() {
  console.log(`[smoke-production] testing ${baseUrl}`);
  await waitForHealthy();

  await check('health and public manifest', async () => {
    const response = await fetch(`${baseUrl}/api/apps`);
    if (!response.ok) throw new Error(`/api/apps returned ${response.status}`);
    const payload = await response.json();
    const expected = apps.map((app) => app.name).sort();
    const actual = payload.apps.map((app) => app.name).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ${expected.join(', ')}, got ${actual.join(', ')}`);
  });

  const servedText = [];
  for (const app of apps) {
    await check(`${app.path} and its assets resolve`, async () => {
      const pageUrl = new URL(app.path, `${baseUrl}/`);
      const response = await fetch(pageUrl);
      const html = await response.text();
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error(`returned ${response.status} ${response.headers.get('content-type')}`);
      
      if (app.source?.type !== 'external') {
        servedText.push(html);
      }

      for (const asset of localAssets(html)) {
        const assetUrl = new URL(asset, pageUrl);
        const assetResponse = await fetch(assetUrl);
        if (!assetResponse.ok) throw new Error(`${assetUrl.pathname} returned ${assetResponse.status}`);
        
        if (app.source?.type !== 'external' && /\.(?:js|css|json|svg)$/i.test(assetUrl.pathname)) {
          servedText.push(await assetResponse.text());
        }
      }
    });
  }

  await check('canonical production URL is emitted', async () => {
    const html = await (await fetch(`${baseUrl}/`)).text();
    if (!html.includes(`<link rel="canonical" href="${site.siteUrl}"`)) throw new Error(`missing canonical ${site.siteUrl}`);
  });

  await check('writer dashboard is closed without an authenticated session', async () => {
    const response = await fetch(`${baseUrl}/writer/`, { redirect: 'manual' });
    const html = await response.text();
    if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
    if (html.includes('Writer dashboard')) throw new Error('unauthenticated response disclosed the writer dashboard');
  });

  await check('served assets contain no server-secret markers', async () => {
    const combined = servedText.join('\n');
    for (const pattern of [/client_secret/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /sk_live_[0-9A-Za-z]+/]) {
      if (pattern.test(combined)) throw new Error(`matched ${pattern}`);
    }
  });

  await check('Strava bundle contains OAuth authorize flow', async () => {
    if (!servedText.some((text) => text.includes('https://www.strava.com/oauth/authorize'))) throw new Error('OAuth authorize URL not found');
  });

  await check('keyless-safe API validation remains live', async () => {
    const response = await fetch(`${baseUrl}/api/isochrones`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
  });

  if (failures.length) {
    console.error(`[smoke-production] ${failures.length} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('[smoke-production] all checks passed');
  }
}

main().catch((error) => {
  console.error('[smoke-production] unexpected error:', error);
  process.exitCode = 1;
});
