// gateway/lib/apps.js
//
// Loads the root-level apps.json manifest and resolves, for each app, the
// on-disk directory that should be served for it.
//
// Resolution order per app:
//   1. `${APPS_ROOT}/<name>` if it exists (production/container layout,
//      populated by the Dockerfile or scripts/build-local.mjs).
//   2. `<repoRoot>/<dev_build_dir>` if it exists (local dev convenience,
//      lets you run `node gateway/server.js` straight after `npm run build`
//      inside an individual app without staging anything).
//
// Neither existing is not fatal: the app is listed but marked unavailable
// so the gateway can still boot and serve everything else.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// gateway/lib -> gateway -> repo root (or /app in the container image).
export const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');

function findManifestPath() {
  const candidates = [
    join(process.cwd(), 'apps.json'),
    join(REPO_ROOT, 'apps.json'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function hasIndexHtml(dir) {
  return existsSync(dir) && existsSync(join(dir, 'index.html'));
}

/**
 * @returns {{ apps: Array<object>, manifestPath: string|null, appsRoot: string }}
 */
export function loadApps(env = process.env) {
  const appsRoot = resolve(env.APPS_ROOT || join(process.cwd(), 'apps'));
  const manifestPath = findManifestPath();

  let raw = [];
  if (manifestPath) {
    try {
      raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      throw new Error(`Failed to parse apps.json at ${manifestPath}: ${err.message}`);
    }
  }

  const apps = raw.map((entry) => {
    const prodDir = join(appsRoot, entry.name);
    const devDir = entry.dev_build_dir ? join(REPO_ROOT, entry.dev_build_dir) : null;

    let dir = null;
    let source = null;
    if (hasIndexHtml(prodDir)) {
      dir = prodDir;
      source = 'apps_root';
    } else if (devDir && hasIndexHtml(devDir)) {
      dir = devDir;
      source = 'dev_build_dir';
    }

    const routePath = entry.path.endsWith('/') ? entry.path : `${entry.path}/`;

    return {
      ...entry,
      path: routePath,
      dir,
      source,
      available: Boolean(dir),
    };
  });

  return { apps, manifestPath, appsRoot };
}

/** Public-safe projection used by the landing page / /api/apps. */
export function toPublicApp(app) {
  return {
    name: app.name,
    title: app.title,
    description: app.description,
    path: app.path,
    tags: app.tags || [],
    preview: app.preview || null,
    available: app.available,
  };
}
