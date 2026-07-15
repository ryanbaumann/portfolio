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
import { isKnownProvider } from './config.js';

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

function loadRedirects(dir) {
  if (!dir) return {};
  const redirectsPath = join(dir, 'redirects.json');
  if (!existsSync(redirectsPath)) return {};
  let redirects;
  try {
    redirects = JSON.parse(readFileSync(redirectsPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse redirects.json at ${redirectsPath}: ${error.message}`);
  }
  if (!redirects || typeof redirects !== 'object' || Array.isArray(redirects)) {
    throw new Error(`Invalid redirects.json at ${redirectsPath}.`);
  }
  for (const [source, target] of Object.entries(redirects)) {
    if (!/^\/[a-z0-9/-]+\/$/.test(source) || source.includes('//') || !/^\/[a-z0-9/-]+\/$/.test(target) || target.includes('//')) {
      throw new Error(`Invalid redirect in ${redirectsPath}: ${source} -> ${target}`);
    }
  }
  return redirects;
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

  validateManifestEntries(raw);

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
      redirects: loadRedirects(dir),
    };
  });

  return { apps, manifestPath, appsRoot };
}

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const APP_PATH_PATTERN = /^(?:\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*|https?:\/\/.*)$/;

export function validateManifestEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('apps.json must contain an array.');
  const names = new Set();
  const paths = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Each apps.json entry must be an object.');
    if (!NAME_PATTERN.test(entry.name || '')) throw new Error(`Invalid app name: ${entry.name || '(missing)'}`);
    if (names.has(entry.name)) throw new Error(`Duplicate app name: ${entry.name}`);
    names.add(entry.name);
    if (typeof entry.path !== 'string' || (entry.path !== '/' && !APP_PATH_PATTERN.test(`${entry.path.replace(/\/+$/, '')}/`))) {
      throw new Error(`Invalid path for app ${entry.name}.`);
    }
    const path = entry.path === '/' ? '/' : `${entry.path.replace(/\/+$/, '')}/`;
    if (paths.has(path)) throw new Error(`Duplicate app path: ${path}`);
    paths.add(path);

    const visibility = entry.visibility || 'public';
    if (!['public', 'unlisted', 'private'].includes(visibility)) {
      throw new Error(`Invalid visibility for app ${entry.name}: ${visibility}`);
    }
    if (visibility === 'private') {
      if (entry.auth?.type !== 'password' || !ENV_VAR_PATTERN.test(entry.auth?.envVar || '')) {
        throw new Error(`Private app ${entry.name} requires password auth with a valid envVar.`);
      }
    } else if (entry.auth !== undefined) {
      throw new Error(`Only private apps may define auth metadata (${entry.name}).`);
    }
    if (entry.providers !== undefined) {
      if (!Array.isArray(entry.providers) || entry.providers.some((name) => typeof name !== 'string' || !isKnownProvider(name))) {
        throw new Error(`App ${entry.name} references an unknown provider.`);
      }
    }
  }
  return entries;
}

/**
 * Returns the normalised visibility for an app manifest entry.
 * Defaults to 'public' when the field is absent.
 */
export function appVisibility(app) {
  return app.visibility || 'public';
}

/**
 * Public-safe projection used by the landing page / /api/apps.
 *
 * Only apps with visibility 'public' (the default when the field is absent)
 * are included.  Unlisted and private apps are excluded from the public API
 * response — returns `null` so the caller can filter them out.
 */
export function toPublicApp(app) {
  if (appVisibility(app) !== 'public') return null;
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
