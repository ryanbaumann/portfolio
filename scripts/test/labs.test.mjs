import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inspectArchive } from '../lib/artifacts.mjs';
import { ciPackages } from '../list-ci-packages.mjs';
import { verifySourceRevision } from '../lib/labs.mjs';

test('CI package discovery is sorted, deduplicated, and excludes artifact apps', () => {
  const apps = [
    { name: 'writer', source: { type: 'workspace', package: 'portfolio', output: 'writer-dist' } },
    { name: 'site', source: { type: 'workspace', package: 'portfolio', output: 'dist' } },
    { name: 'demo', source: { type: 'workspace', package: 'demos/demo', output: 'dist' } },
    { name: 'private', source: { type: 'artifact' } },
  ];
  assert.deepEqual(ciPackages(apps, '/repo'), ['demos/demo', 'gateway', 'portfolio']);
});

test('CI package discovery rejects workspace paths outside the repository', () => {
  assert.throws(() => ciPackages([{ name: 'escape', source: { type: 'workspace', package: '../escape', output: 'dist' } }], '/repo'), /escapes/);
});

test('artifact inspection accepts a static root and rejects traversal', () => {
  const root = mkdtempSync(join(tmpdir(), 'labs-test-'));
  const goodDir = join(root, 'good');
  mkdirSync(goodDir);
  writeFileSync(join(goodDir, 'index.html'), '<!doctype html>');
  const good = join(root, 'good.tgz');
  execFileSync('tar', ['-czf', good, '-C', goodDir, '.']);
  assert.equal(inspectArchive(good), 2);
  const bad = join(root, 'bad.tgz');
  execFileSync('tar', ['-czf', bad, '--transform=s|index.html|../index.html|', '-C', goodDir, 'index.html']);
  assert.throws(() => inspectArchive(bad), /unsafe artifact entry/);
  const bombDir = join(root, 'bomb');
  mkdirSync(bombDir);
  writeFileSync(join(bombDir, 'index.html'), '<!doctype html>');
  writeFileSync(join(bombDir, 'oversized.js'), '');
  truncateSync(join(bombDir, 'oversized.js'), 25 * 1024 * 1024 + 1);
  const bomb = join(root, 'bomb.tgz');
  execFileSync('tar', ['-czf', bomb, '-C', bombDir, '.']);
  assert.throws(() => inspectArchive(bomb), /oversized file/);
});

test('public import provenance must match the checked-out commit', () => {
  const repo = mkdtempSync(join(tmpdir(), 'labs-git-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repo });
  writeFileSync(join(repo, 'README.md'), 'fixture');
  execFileSync('git', ['add', 'README.md'], { cwd: repo });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: repo });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  assert.doesNotThrow(() => verifySourceRevision(repo, head));
  assert.throws(() => verifySourceRevision(repo, 'a'.repeat(40)), /does not match/);
});
