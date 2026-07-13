#!/usr/bin/env node
// scripts/previews.mjs — regenerate the homepage demo screenshots.
//
// Boots the gateway against the staged apps/ directory (run
// scripts/build-local.mjs with real VITE_ keys first, or set BASE_URL to a
// running instance — including https://www.ryanbaumann-portfolio.com) and captures one real
// screenshot per demo into portfolio/static/previews/<name>.jpg. Honest
// previews only: this replaces hand-made mockups with what the app actually
// looks like.
//
// Browser automation comes from demos/strava-explorer's Playwright dev dependency
// (no new root dependencies). One-time setup if the browser is missing:
//   cd demos/strava-explorer && npm install && npx playwright install chromium
//
// Usage:
//   node scripts/previews.mjs                       # boot local gateway from ./apps
//   BASE_URL=https://www.ryanbaumann-portfolio.com node scripts/previews.mjs   # shoot production

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEWS_DIR = join(REPO_ROOT, 'portfolio', 'static', 'previews');

let chromium;
try {
  const requireFromStrava = createRequire(join(REPO_ROOT, 'demos', 'strava-explorer', 'package.json'));
  ({ chromium } = requireFromStrava('playwright-core'));
} catch {
  console.error('[previews] Playwright not found. Run: cd demos/strava-explorer && npm install');
  process.exit(1);
}

const apps = JSON.parse(readFileSync(join(REPO_ROOT, 'apps.json'), 'utf8'));
const demos = apps.filter((app) => app.path !== '/');

// Load .env (same simple format scripts/setup.mjs writes) for the gateway's
// server-side keys when booting locally.
function loadDotEnv() {
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

let child = null;

async function startGateway() {
  const port = 8097;
  child = spawn(process.execPath, [join(REPO_ROOT, 'gateway', 'server.js')], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...loadDotEnv(), PORT: String(port), APPS_ROOT: join(REPO_ROOT, 'apps') },
    stdio: 'ignore',
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const start = Date.now();
  while (Date.now() - start < 15_000) {
    try {
      const response = await fetch(`${baseUrl}/api/healthz`);
      if (response.ok) return baseUrl;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('gateway did not become healthy');
}

async function main() {
  const baseUrl = process.env.BASE_URL || await startGateway();
  console.log(`[previews] shooting ${demos.length} demo(s) at ${baseUrl}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  for (const demo of demos) {
    const url = `${baseUrl}${demo.path}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    // Give maps/tiles a moment to actually paint.
    await page.waitForTimeout(6000);
    const outPath = join(PREVIEWS_DIR, `${demo.name}.jpg`);
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 80 });
    console.log(`[previews] wrote portfolio/static/previews/${demo.name}.jpg`);
  }

  await browser.close();
  console.log('[previews] done — rebuild the portfolio to pick them up.');
}

main()
  .catch((err) => {
    console.error('[previews] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (child && !child.killed) child.kill();
  });
