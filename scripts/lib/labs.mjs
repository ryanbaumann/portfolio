import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
export const SHA_PATTERN = /^[a-f0-9]{40}$/;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function titleFromName(name) {
  return name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) positionals.push(value);
    else {
      const name = value.slice(2);
      const next = argv[index + 1];
      flags[name] = next && !next.startsWith('--') ? argv[++index] : true;
    }
  }
  return { positionals, flags };
}

export function manifestEntry({ name, title, description, visibility = 'public', source, api = { type: 'none' }, tags = [], preview = null, sourceUrl, sourceRef }) {
  if (!NAME_PATTERN.test(name || '')) throw new Error('name must be lowercase kebab-case');
  if (!['public', 'unlisted', 'private'].includes(visibility)) throw new Error('visibility must be public, unlisted, or private');
  const authEnv = `${name.replaceAll('-', '_').toUpperCase()}_PASSWORD`;
  return {
    name,
    title: title || titleFromName(name),
    description: description || `A ${title || titleFromName(name)} lab demo.`,
    path: `/${name}/`,
    ...(source.type === 'workspace' ? { dev_build_dir: `${source.package}/${source.output}` } : {}),
    source,
    api,
    ...(sourceUrl ? { source_url: sourceUrl, source_ref: sourceRef } : {}),
    ...(visibility !== 'public' ? { visibility } : {}),
    ...(visibility === 'private' ? { auth: { type: 'password', envVar: authEnv } } : {}),
    tags,
    preview,
  };
}

export function registerEntry(repoRoot, entry) {
  const path = join(repoRoot, 'apps.json');
  const apps = JSON.parse(readFileSync(path, 'utf8'));
  if (apps.some((app) => app.name === entry.name || app.path === entry.path)) throw new Error(`apps.json already contains ${entry.name}`);
  apps.push(entry);
  writeFileSync(path, `${JSON.stringify(apps, null, 2)}\n`);
}

export function addDependabot(repoRoot, packagePath) {
  const path = join(repoRoot, '.github/dependabot.yml');
  let contents = readFileSync(path, 'utf8');
  if (contents.includes(`directory: "/${packagePath}"`)) return;
  const anchor = '  - package-ecosystem: "github-actions"';
  if (!contents.includes(anchor)) throw new Error('Dependabot github-actions anchor is missing');
  const entry = `  - package-ecosystem: "npm"\n    directory: "/${packagePath}"\n    schedule:\n      interval: "weekly"\n\n`;
  contents = contents.replace(anchor, entry + anchor);
  writeFileSync(path, contents);
}

export function copySnapshot(sourceDir, destinationDir) {
  const excluded = new Set(['.git', 'node_modules', 'dist', 'build', '.env']);
  mkdirSync(destinationDir, { recursive: true });
  cpSync(sourceDir, destinationDir, {
    recursive: true,
    filter(source) {
      const rel = relative(sourceDir, source);
      if (!rel) return true;
      return !rel.split(/[\\/]/).some((part) => excluded.has(part) || part.startsWith('.env.') || part.startsWith('gha-creds-'));
    },
  });
}

export function validateImport(sourceDir, output) {
  const packagePath = join(sourceDir, 'package.json');
  if (!existsSync(packagePath)) throw new Error('import source needs package.json');
  if (!existsSync(join(sourceDir, 'package-lock.json'))) throw new Error('import source needs package-lock.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (!pkg.scripts?.build || !pkg.scripts?.test || !pkg.engines?.node) throw new Error('package.json needs build, test, and engines.node');
  if (!/^[a-zA-Z0-9._/-]+$/.test(output) || output.split('/').includes('..')) throw new Error('output must be a safe relative path');
}

export function verifySourceRevision(sourceDir, expectedRef) {
  const result = spawnSync('git', ['-C', sourceDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('import source must be a Git checkout when --ref is used');
  const actual = result.stdout.trim();
  if (actual !== expectedRef) throw new Error(`import source HEAD ${actual} does not match --ref ${expectedRef}`);
}

export function assertWithin(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  if (rel.startsWith('..') || rel === '') throw new Error(`${basename(child)} must be a child of ${parent}`);
}

export function rollbackPath(path) {
  rmSync(path, { recursive: true, force: true });
}
