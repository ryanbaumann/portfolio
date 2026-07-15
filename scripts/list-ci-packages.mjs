#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function ciPackages(apps, repoRoot) {
  const packages = new Set(['gateway']);
  for (const app of apps) {
    if (app.source?.type !== 'workspace') continue;
    const packageDir = resolve(repoRoot, app.source.package);
    const rel = relative(repoRoot, packageDir).replaceAll('\\', '/');
    if (!rel || rel.startsWith('..')) throw new Error(`${app.name}: workspace package escapes the repository`);
    packages.add(rel);
  }
  return [...packages].sort();
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const apps = JSON.parse(readFileSync(join(repoRoot, 'apps.json'), 'utf8'));
  process.stdout.write(`${JSON.stringify(ciPackages(apps, repoRoot))}\n`);
}
