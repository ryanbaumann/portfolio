#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestEntry, parseArgs, registerEntry, SHA256_PATTERN, titleFromName } from './lib/labs.mjs';
import { inspectArchive, sha256File } from './lib/artifacts.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { positionals: [name], flags } = parseArgs(process.argv.slice(2));
if (!name || !flags.uri || !flags.release || (!flags.sha256 && !flags.artifact)) throw new Error('usage: npm run labs:attach -- <name> --uri gs://bucket/name-<digest>.tgz --release <id> (--sha256 <digest>|--artifact <file>)');
if (!String(flags.uri).startsWith('gs://') || flags.uri.includes('?') || flags.uri.includes('#')) throw new Error('--uri must be an immutable gs:// object without query or fragment');
if (flags.artifact) inspectArchive(resolve(flags.artifact));
const computed = flags.artifact ? sha256File(resolve(flags.artifact)) : null;
const sha256 = flags.sha256 || computed;
if (!SHA256_PATTERN.test(sha256 || '') || (computed && flags.sha256 && computed !== flags.sha256)) throw new Error('artifact SHA-256 is invalid or does not match');
if (!flags.uri.includes(sha256)) throw new Error('artifact URI must contain its SHA-256 digest');
const api = flags['upstream-origin-env'] ? {
  type: 'upstream', prefix: `/api/${name}/`, originEnv: flags['upstream-origin-env'],
  audienceEnv: flags['upstream-audience-env'], methods: String(flags.methods || 'GET,POST').split(','),
} : { type: 'none' };
if (api.type === 'upstream' && !api.audienceEnv) throw new Error('--upstream-audience-env is required with --upstream-origin-env');
const entry = manifestEntry({ name, title: flags.title || titleFromName(name), description: flags.description, visibility: flags.visibility || 'private', source: { type: 'artifact', uri: flags.uri, sha256, release: String(flags.release) }, api, tags: (flags.tags || 'interactive-demo').split(',') });
registerEntry(repoRoot, entry);
console.log(`[labs:attach] registered ${name} at /${name}/ without committing private source or build bytes`);
console.log(`[labs:attach] deploy identity needs read-only access to ${flags.uri}; route requires ${entry.auth?.envVar || 'no password'}`);
