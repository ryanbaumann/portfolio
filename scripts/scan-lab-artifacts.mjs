#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../.labs-artifacts/', import.meta.url));
const patterns = [
  ['OAuth client secret marker', /client_secret/i],
  ['live secret key', /sk_live_[0-9A-Za-z]+/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
const extensions = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.webmanifest']);
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const hits = [];
if (existsSync(root)) for (const path of files(root)) {
  if (!extensions.has(extname(path))) continue;
  const content = readFileSync(path, 'utf8');
  for (const [label, pattern] of patterns) if (pattern.test(content)) hits.push(`${label}: ${path}`);
}
if (hits.length) {
  console.error('[labs:scan] rejected staged artifact content:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('[labs:scan] staged private artifacts contain no known secret patterns');
