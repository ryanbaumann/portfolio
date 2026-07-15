#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDependabot, copySnapshot, manifestEntry, parseArgs, registerEntry, rollbackPath, SHA_PATTERN, titleFromName, validateImport, verifySourceRevision } from './lib/labs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { positionals: [name], flags } = parseArgs(process.argv.slice(2));
if (!name || !flags.from) throw new Error('usage: npm run labs:import -- <name> --from <checked-out-repo> [--ref <40-char-sha>] [--source-url <https-url>]');
const sourceDir = resolve(flags.from);
const destination = join(repoRoot, 'demos', name);
const output = flags.output || 'dist';
if (!existsSync(sourceDir)) throw new Error(`source directory does not exist: ${sourceDir}`);
if (existsSync(destination)) throw new Error(`demos/${name} already exists`);
if (!flags['confirm-source-public']) throw new Error('import publishes the snapshot; pass --confirm-source-public after verifying it contains no private source or secrets');
if (flags['source-url']) {
  const url = new URL(flags['source-url']);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('source-url must be credential-free HTTPS');
  if (!SHA_PATTERN.test(flags.ref || '')) throw new Error('--ref must be the exact 40-character source commit');
  verifySourceRevision(sourceDir, flags.ref);
}
validateImport(sourceDir, output);
const entry = manifestEntry({ name, title: flags.title || titleFromName(name), description: flags.description, visibility: flags.visibility || 'public', source: { type: 'workspace', package: `demos/${name}`, output }, tags: (flags.tags || 'interactive-demo').split(','), sourceUrl: flags['source-url'], sourceRef: flags.ref });
const manifestPath = join(repoRoot, 'apps.json');
const dependabotPath = join(repoRoot, '.github/dependabot.yml');
const originalManifest = readFileSync(manifestPath, 'utf8');
const originalDependabot = readFileSync(dependabotPath, 'utf8');
try {
  copySnapshot(sourceDir, destination);
  registerEntry(repoRoot, entry);
  addDependabot(repoRoot, `demos/${name}`);
} catch (error) {
  rollbackPath(destination);
  writeFileSync(manifestPath, originalManifest);
  writeFileSync(dependabotPath, originalDependabot);
  throw error;
}
console.log(`[labs:import] copied a source snapshot into demos/${name}; original repo was not modified`);
console.log('[labs:import] run npm test in the demo, then npm run labs:check && npm run build && npm run smoke');
