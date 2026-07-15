#!/usr/bin/env node
// scripts/build-local.mjs
//
// Builds every app listed in apps.json and stages their static output under
// <repoRoot>/apps/<name>/ exactly the way the Dockerfile's runtime stage
// does. CI and humans both use this script, so "does it build" only needs
// to be answered once. Zero npm dependencies (uses only node: builtins).
//
// Usage:
//   node scripts/build-local.mjs             # install (if needed) + build all apps
//   node scripts/build-local.mjs --force-install
//   node scripts/build-local.mjs --skip-install

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS_JSON_PATH = join(REPO_ROOT, 'apps.json');
const APPS_OUT_DIR = join(REPO_ROOT, 'apps');
const ARTIFACTS_DIR = join(REPO_ROOT, '.labs-artifacts');
const ROOT_ENV_PATH = join(REPO_ROOT, '.env');
const PUBLIC_BUILD_ENV_KEYS = new Set([
  'VITE_GMP_API_KEY',
  'VITE_ISOCHRONES_GMP_API_KEY',
  'VITE_STRAVA_CLIENT_ID',
  'VITE_STRAVA_API_BASE_URL',
  'VITE_STRAVA_AUTH_BASE_URL',
  'VITE_STRAVA_REDIRECT_URI',
  'ANALYTICS_MEASUREMENT_ID',
]);
const SAFE_INHERITED_ENV_KEYS = new Set([
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL',
  'TMPDIR', 'TMP', 'TEMP',
  'CI', 'NODE_ENV', 'NODE_OPTIONS',
  'LANG', 'LC_ALL', 'TERM', 'NO_COLOR', 'FORCE_COLOR',
  'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD',
]);

const args = new Set(process.argv.slice(2));
const forceInstall = args.has('--force-install');
const skipInstall = args.has('--skip-install');
const allowMissingArtifacts = args.has('--allow-missing-artifacts');
const onlyArtifacts = args.has('--only-artifacts');

function log(...parts) {
  console.log('[build-local]', ...parts);
}

function loadRootPublicEnv() {
  const env = {};
  if (!existsSync(ROOT_ENV_PATH)) return env;
  const lines = readFileSync(ROOT_ENV_PATH, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!PUBLIC_BUILD_ENV_KEYS.has(key)) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  log('Loaded browser-public build configuration from .env (values not printed).');
  return env;
}

export function sanitizedBuildEnv(apps, rootPublicEnv, sourceEnv = process.env) {
  const privateAuthVars = new Set(apps.map((app) => app.auth?.envVar).filter(Boolean));
  const env = {};
  for (const [key, value] of Object.entries(sourceEnv)) {
    if (!privateAuthVars.has(key) && SAFE_INHERITED_ENV_KEYS.has(key)) env[key] = value;
  }
  for (const key of PUBLIC_BUILD_ENV_KEYS) {
    if (sourceEnv[key] !== undefined) env[key] = sourceEnv[key];
    else if (rootPublicEnv[key] !== undefined) env[key] = rootPublicEnv[key];
  }
  return env;
}

function run(command, cmdArgs, options) {
  log(`$ ${command} ${cmdArgs.join(' ')} (cwd: ${options.cwd})`);
  const result = spawnSync(command, cmdArgs, {
    stdio: 'inherit',
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${cmdArgs.join(' ')} exited with code ${result.status} in ${options.cwd}`);
  }
}

function loadApps() {
  const raw = JSON.parse(readFileSync(APPS_JSON_PATH, 'utf8'));
  return raw.map((entry) => ({ ...entry, ...resolveAppPaths(entry) }));
}

export function resolveAppPaths(entry, repoRoot = REPO_ROOT) {
  if (entry.source?.type === 'artifact') return { dir: null, outDir: join(repoRoot, '.labs-artifacts', entry.name) };
  const outDir = join(repoRoot, entry.dev_build_dir || join(entry.source.package, entry.source.output));
  return { dir: dirname(outDir), outDir };
}

// Vite/esbuild statically replace `import.meta.env.VITE_*` at build time and
// then dead-code-eliminate branches it can prove unreachable. strava.js's
// getStravaAuthUrl() starts with `if (!STRAVA_CLIENT_ID || ...) return null`,
// so a keyless build (no VITE_STRAVA_CLIENT_ID set) makes that condition
// statically `true` and the minifier strips the whole Strava OAuth URL
// out of the bundle as unreachable code — which breaks smoke tests that
// need to see it (docs/ARCHITECTURE.md rule 4) and would break real users
// too if this ever shipped unset. A client ID is not a secret (Strava
// embeds it directly in the OAuth authorize URL every user sees), so it's
// safe to default to a placeholder here; a real deploy sets the real one
// via env before calling this script.
export function buildTimeOverrides(app, env) {
  if (app.name === 'portfolio-writer') {
    return {
      PORTFOLIO_WRITER_MODE: 'true',
      PORTFOLIO_DIST_DIR: app.outDir,
    };
  }
  if (app.name === 'isochrones' && env.VITE_ISOCHRONES_GMP_API_KEY) {
    return { VITE_GMP_API_KEY: env.VITE_ISOCHRONES_GMP_API_KEY };
  }
  if (app.name === 'strava-explorer' && !env.VITE_STRAVA_CLIENT_ID) {
    return { VITE_STRAVA_CLIENT_ID: 'smoke-test-placeholder-client-id' };
  }
  return {};
}

function buildApp(app, childEnv) {
  log(`--- ${app.name} ---`);
  const destDir = join(APPS_OUT_DIR, app.name);
  if (app.source?.type === 'artifact') {
    rmSync(destDir, { recursive: true, force: true });
    if (!existsSync(join(app.outDir, 'index.html'))) {
      if (allowMissingArtifacts) {
        log(`SKIPPED ${app.name}: private artifact is unavailable in this untrusted build; gateway will fail closed.`);
        return;
      }
      throw new Error(`private artifact is not staged: run npm run labs:fetch -- --required`);
    }
    cpSync(app.outDir, destDir, { recursive: true });
    log(`Staged verified artifact ${app.name} -> ${destDir}`);
    return;
  }
  if (!existsSync(app.dir)) {
    throw new Error(`App directory not found: ${app.dir}`);
  }

  const nodeModulesDir = join(app.dir, 'node_modules');
  const shouldInstall = forceInstall || (!skipInstall && !existsSync(nodeModulesDir));
  if (shouldInstall) {
    run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: app.dir, env: childEnv });
  } else {
    log(`Skipping install for ${app.name} (node_modules present).`);
  }

  run('npm', ['run', 'build'], {
    cwd: app.dir,
    env: { ...childEnv, BASE_PATH: app.path, ...buildTimeOverrides(app, childEnv) },
  });

  if (!existsSync(app.outDir)) {
    throw new Error(`${app.name} build did not produce expected output dir: ${app.outDir}`);
  }
  if (!existsSync(join(app.outDir, 'index.html'))) {
    throw new Error(`${app.name} build output is missing index.html: ${app.outDir}`);
  }

  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  cpSync(app.outDir, destDir, { recursive: true });
  log(`Staged ${app.name} -> ${destDir}`);
}

function main() {
  const manifestApps = loadApps();
  const apps = onlyArtifacts ? manifestApps.filter((app) => app.source?.type === 'artifact') : manifestApps;
  const childEnv = {
    ...sanitizedBuildEnv(manifestApps, loadRootPublicEnv()),
    PORTFOLIO_BUILD_TIME: new Date().toISOString(),
  };
  log(`Building ${apps.length} app(s) from ${APPS_JSON_PATH}`);
  mkdirSync(APPS_OUT_DIR, { recursive: true });

  const failures = [];
  for (const app of apps) {
    try {
      buildApp(app, childEnv);
    } catch (err) {
      console.error(`[build-local] FAILED: ${app.name}:`, err.message);
      failures.push(app.name);
    }
  }

  if (failures.length > 0) {
    console.error(`\n[build-local] ${failures.length} app(s) failed to build: ${failures.join(', ')}`);
    process.exit(1);
  }

  log(`All apps built and staged under ${APPS_OUT_DIR}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
