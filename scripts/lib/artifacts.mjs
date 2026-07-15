import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function inspectArchive(path) {
  if (statSync(path).size > 100 * 1024 * 1024) throw new Error('artifact archive exceeds 100 MiB');
  const list = spawnSync('tar', ['-tzf', path], { encoding: 'utf8' });
  if (list.status !== 0) throw new Error(`invalid tar.gz artifact: ${list.stderr.trim()}`);
  const entries = list.stdout.split(/\r?\n/).filter(Boolean);
  if (entries.length > 5000) throw new Error('artifact contains more than 5000 entries');
  for (const entry of entries) {
    const normalized = entry.replace(/^\.\//, '');
    if (normalized === '') continue;
    if (normalized.startsWith('/') || normalized.split('/').includes('..') || normalized.endsWith('.map')) {
      throw new Error(`unsafe artifact entry: ${entry}`);
    }
  }
  if (!entries.some((entry) => entry.replace(/^\.\//, '') === 'index.html')) throw new Error('artifact must contain index.html at its root');
  const verbose = spawnSync('tar', ['-tvzf', path], { encoding: 'utf8' });
  const lines = verbose.stdout.split(/\r?\n/).filter(Boolean);
  if (verbose.status !== 0 || lines.some((line) => /^[lhcbps]/.test(line))) {
    throw new Error('artifact may contain only regular files and directories (no links or devices)');
  }
  let expandedBytes = 0;
  for (const line of lines.filter((item) => item.startsWith('-'))) {
    const size = Number(line.trim().split(/\s+/)[2]);
    if (!Number.isSafeInteger(size) || size > 25 * 1024 * 1024) throw new Error('artifact contains an invalid or oversized file');
    expandedBytes += size;
  }
  if (expandedBytes > 250 * 1024 * 1024) throw new Error('artifact expands beyond 250 MiB');
  return entries.length;
}

export function extractArchive(path, destination) {
  const result = spawnSync('tar', ['-xzf', path, '--no-same-owner', '--no-same-permissions', '-C', destination], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`artifact extraction failed: ${result.stderr.trim()}`);
}

export function withTempDir(callback) {
  const dir = mkdtempSync(join(tmpdir(), 'portfolio-lab-'));
  try { return callback(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
