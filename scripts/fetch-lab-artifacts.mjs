#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractArchive, inspectArchive, sha256File, withTempDir } from './lib/artifacts.mjs';
import { validateManifestEntries } from '../gateway/lib/apps.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
const manifest = JSON.parse(readFileSync(join(repoRoot, 'apps.json'), 'utf8'));
validateManifestEntries(manifest);
const apps = manifest.filter((app) => app.source?.type === 'artifact');
const root = join(repoRoot, '.labs-artifacts');
mkdirSync(root, { recursive: true });

for (const app of apps) {
  withTempDir((temp) => {
    const archive = join(temp, 'artifact.tgz');
    const result = spawnSync('gcloud', ['storage', 'cp', app.source.uri, archive], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`${app.name}: could not fetch private artifact`);
    const digest = sha256File(archive);
    if (digest !== app.source.sha256) throw new Error(`${app.name}: checksum mismatch; refusing untrusted bytes`);
    inspectArchive(archive);
    const extracted = join(temp, 'extracted');
    mkdirSync(extracted);
    extractArchive(archive, extracted);
    const destination = join(root, app.name);
    rmSync(destination, { recursive: true, force: true });
    renameSync(extracted, destination);
    console.log(`[labs:fetch] verified and staged ${app.name} (${app.source.release})`);
  });
}
if (required && apps.length === 0) console.log('[labs:fetch] no private artifacts declared');
if (!required && apps.some((app) => !existsSync(join(root, app.name)))) process.exitCode = 1;
