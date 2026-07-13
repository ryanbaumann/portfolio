import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const PORTFOLIO_ROOT = resolve(import.meta.dirname, '..');
const BUILD_SCRIPT = join(PORTFOLIO_ROOT, 'build.mjs');

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-build-'));
  const content = join(root, 'content');
  const staticDir = join(root, 'static');
  const dist = join(root, 'dist');
  const manifest = join(root, 'apps.json');
  for (const collection of ['work', 'writing', 'talks', 'pages']) mkdirSync(join(content, collection), { recursive: true });
  write(join(staticDir, 'share.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"></svg>');
  write(join(content, 'site.json'), JSON.stringify({
    name: 'Test Person',
    role: 'Builder',
    tagline: 'Build things',
    location: 'Test City',
    intro: 'A test portfolio.',
    headline: 'Selected work.',
    description: 'A test portfolio used to verify the static build.',
    aboutTeaser: 'A short background.',
    positioning: 'Build things.',
    answerEngineSummary: 'Test Person builds things.',
    sectionIntros: { work: 'Work.', writing: 'Writing.', talks: 'Talks.', demos: 'Demos.' },
    links: { github: 'https://github.com/example', linkedin: 'https://www.linkedin.com/in/example/' },
    siteUrl: 'https://example.com/',
    canonicalHost: 'example.com',
    defaultShareImage: '/share.svg',
  }));
  write(manifest, JSON.stringify([
    { name: 'portfolio', title: 'Test Person', description: 'Home', path: '/', dev_build_dir: 'portfolio/dist' },
    { name: 'public-demo', title: 'Public demo', description: 'Visible', path: '/public/', visibility: 'public' },
    { name: 'private-demo', title: 'Private demo', description: 'Hidden', path: '/private/', visibility: 'private', auth: { type: 'password', envVar: 'PRIVATE_DEMO_PASSWORD' } },
  ]));
  return { root, content, staticDir, dist, manifest };
}

function build(paths) {
  return spawnSync(process.execPath, [BUILD_SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PORTFOLIO_CONTENT_DIR: paths.content,
      PORTFOLIO_STATIC_DIR: paths.staticDir,
      PORTFOLIO_DIST_DIR: paths.dist,
      PORTFOLIO_APPS_MANIFEST: paths.manifest,
    },
  });
}

test('build lists public demos without disclosing private demos', () => {
  const paths = fixture();
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const demos = readFileSync(join(paths.dist, 'demos', 'index.html'), 'utf8');
  assert.match(demos, /Public demo/);
  assert.doesNotMatch(demos, /Private demo/);
});

test('build rejects impossible ISO dates and unsafe drafts', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'bad.md'), `---\ntitle: Bad date\nsummary: Invalid fixture\ndate: 2026-02-30\ndraft: true\n---\nDraft.`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /drafts must set noindex: true/);
  assert.match(result.stderr, /writing date must be YYYY-MM-DD/);
});

test('build rejects duplicate slugs and broken standalone-page links', () => {
  const paths = fixture();
  write(join(paths.content, 'work', 'one.md'), `---\ntitle: One\nsummary: First\nslug: same\n---`);
  write(join(paths.content, 'work', 'two.md'), `---\ntitle: Two\nsummary: Second\nslug: same\n---`);
  write(join(paths.content, 'pages', 'about.md'), `---\ntitle: About\nsummary: About page\n---\n[Missing](/missing/)`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate slug/);
  assert.match(result.stderr, /broken internal link \/missing\//);
});

test('build rejects duplicate page descriptions without publishing invalid output', () => {
  const paths = fixture();
  write(join(paths.content, 'pages', 'one.md'), `---\ntitle: One\nsummary: Duplicate summary\n---`);
  write(join(paths.content, 'pages', 'two.md'), `---\ntitle: Two\nsummary: Duplicate summary\n---`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate description/);
  assert.throws(() => readFileSync(join(paths.dist, 'one', 'index.html')), /ENOENT/);
});

test('build rejects missing root-relative assets in frontmatter links', () => {
  const paths = fixture();
  write(join(paths.content, 'talks', 'missing-deck.md'), `---\ntitle: Missing deck\nsummary: Invalid fixture\nlinks: [{"label":"Slides","url":"/decks/missing.pdf"}]\n---`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /broken internal link \/decks\/missing\.pdf/);
});
