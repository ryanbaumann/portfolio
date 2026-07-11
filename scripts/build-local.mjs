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

const args = new Set(process.argv.slice(2));
const forceInstall = args.has('--force-install');
const skipInstall = args.has('--skip-install');

function log(...parts) {
  console.log('[build-local]', ...parts);
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
  return raw.map((entry) => ({
    ...entry,
    dir: join(REPO_ROOT, entry.name),
    outDir: join(REPO_ROOT, entry.dev_build_dir),
  }));
}

function buildApp(app) {
  log(`--- ${app.name} ---`);
  if (!existsSync(app.dir)) {
    throw new Error(`App directory not found: ${app.dir}`);
  }

  const nodeModulesDir = join(app.dir, 'node_modules');
  const shouldInstall = forceInstall || (!skipInstall && !existsSync(nodeModulesDir));
  if (shouldInstall) {
    run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: app.dir });
  } else {
    log(`Skipping install for ${app.name} (node_modules present).`);
  }

  run('npm', ['run', 'build'], {
    cwd: app.dir,
    env: { ...process.env, BASE_PATH: app.path },
  });

  if (!existsSync(app.outDir)) {
    throw new Error(`${app.name} build did not produce expected output dir: ${app.outDir}`);
  }
  if (!existsSync(join(app.outDir, 'index.html'))) {
    throw new Error(`${app.name} build output is missing index.html: ${app.outDir}`);
  }

  const destDir = join(APPS_OUT_DIR, app.name);
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  cpSync(app.outDir, destDir, { recursive: true });
  log(`Staged ${app.name} -> ${destDir}`);
}

function main() {
  const apps = loadApps();
  log(`Building ${apps.length} app(s) from ${APPS_JSON_PATH}`);
  mkdirSync(APPS_OUT_DIR, { recursive: true });

  const failures = [];
  for (const app of apps) {
    try {
      buildApp(app);
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

main();
