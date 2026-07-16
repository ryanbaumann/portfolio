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
  for (const collection of ['work', 'writing', 'talks', 'scripts', 'pages']) mkdirSync(join(content, collection), { recursive: true });
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
    sectionIntros: { work: 'Work.', writing: 'Writing.', talks: 'Talks.', scripts: 'Reusable agent instructions.', demos: 'Demos.' },
    links: { github: 'https://github.com/example', linkedin: 'https://www.linkedin.com/in/example/' },
    siteUrl: 'https://example.com/',
    canonicalHost: 'example.com',
    defaultShareImage: '/share.svg',
    defaultShareImageAlt: 'Test Person portfolio preview.',
  }));
  write(manifest, JSON.stringify([
    { name: 'portfolio', title: 'Test Person', description: 'Home', path: '/', dev_build_dir: 'portfolio/dist' },
    { name: 'public-demo', title: 'Public demo', description: 'Visible', path: '/public/', visibility: 'public' },
    { name: 'private-demo', title: 'Private demo', description: 'Hidden', path: '/private/', visibility: 'private', auth: { type: 'password', envVar: 'PRIVATE_DEMO_PASSWORD' } },
  ]));
  return { root, content, staticDir, dist, manifest };
}

function build(paths, env = {}) {
  return spawnSync(process.execPath, [BUILD_SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PORTFOLIO_CONTENT_DIR: paths.content,
      PORTFOLIO_STATIC_DIR: paths.staticDir,
      PORTFOLIO_DIST_DIR: paths.dist,
      PORTFOLIO_APPS_MANIFEST: paths.manifest,
      ...env,
    },
  });
}

test('build keeps drafts and future writing out of public output', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'draft.md'), `---\ntitle: Draft essay\nsummary: Private draft\ndate: 2026-07-13\ndraft: true\nnoindex: true\n---\nDraft.`);
  write(join(paths.content, 'writing', 'scheduled.md'), `---\ntitle: Scheduled essay\nsummary: Future essay\ndate: 2026-07-14\npublishAt: 2026-07-14T12:00:00Z\n---\nScheduled.`);
  const result = build(paths, { PORTFOLIO_BUILD_TIME: '2026-07-13T12:00:00Z' });
  assert.equal(result.status, 0, result.stderr);
  const writing = readFileSync(join(paths.dist, 'writing', 'index.html'), 'utf8');
  const feed = readFileSync(join(paths.dist, 'feed.xml'), 'utf8');
  const sitemap = readFileSync(join(paths.dist, 'sitemap.xml'), 'utf8');
  assert.doesNotMatch(writing, /Draft essay|Scheduled essay/);
  assert.doesNotMatch(feed, /Draft essay|Scheduled essay/);
  assert.doesNotMatch(sitemap, /writing\/(draft|scheduled)/);
  assert.throws(() => readFileSync(join(paths.dist, 'writing', 'draft', 'index.html')), /ENOENT/);
  assert.throws(() => readFileSync(join(paths.dist, 'writing', 'scheduled', 'index.html')), /ENOENT/);
});

test('writer build previews drafts and future writing with a noindex dashboard', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'draft.md'), `---\ntitle: Draft essay\nsummary: Private draft\ndate: 2026-07-13\ndraft: true\nnoindex: true\n---\n## Draft section\nDraft.`);
  write(join(paths.content, 'writing', 'scheduled.md'), `---\ntitle: Scheduled essay\nsummary: Future essay\ndate: 2026-07-14\npublishAt: 2026-07-14T12:00:00Z\n---\nScheduled.`);
  const result = build(paths, {
    BASE_PATH: '/writer/',
    PORTFOLIO_WRITER_MODE: 'true',
    PORTFOLIO_BUILD_TIME: '2026-07-13T12:00:00Z',
  });
  assert.equal(result.status, 0, result.stderr);
  const dashboard = readFileSync(join(paths.dist, 'index.html'), 'utf8');
  const draft = readFileSync(join(paths.dist, 'writing', 'draft', 'index.html'), 'utf8');
  assert.match(dashboard, /Writer dashboard/);
  assert.match(dashboard, /Draft essay/);
  assert.match(dashboard, /Scheduled essay/);
  assert.match(dashboard, /name="publishAt"/);
  assert.match(dashboard, /name="sourceSlug" value="draft"/);
  assert.ok(dashboard.indexOf('value="draft"') < dashboard.indexOf('value="publish-now"'));
  assert.match(dashboard, /window\.confirm\('Publish this essay now\?/);
  assert.match(draft, /<meta name="robots" content="noindex, nofollow"/);
});

test('build publishes scheduled writing once its timestamp is due', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'scheduled.md'), `---\ntitle: Scheduled essay\nsummary: Due essay\ndate: 2026-07-14\npublishAt: 2026-07-14T12:00:00Z\n---\nScheduled.`);
  const result = build(paths, { PORTFOLIO_BUILD_TIME: '2026-07-14T12:00:01Z' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(join(paths.dist, 'writing', 'index.html'), 'utf8'), /Scheduled essay/);
  assert.match(readFileSync(join(paths.dist, 'feed.xml'), 'utf8'), /Scheduled essay/);
});

test('build emits published aliases and omits redirects from writer previews', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'source.md'), `---\ntitle: Renamed essay\nsummary: Redirect fixture\ndate: 2026-07-14\nslug: current\naliases: ["/writing/previous/"]\ncanonical: https://example.com/writing/current/\n---\nPublished.`);
  let result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(paths.dist, 'redirects.json'), 'utf8')), {
    '/writing/previous/': '/writing/current/',
  });

  result = build(paths, { BASE_PATH: '/writer/', PORTFOLIO_WRITER_MODE: 'true' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(paths.dist, 'redirects.json'), 'utf8')), {});
});

test('build rejects aliases that collide with canonical pages and stale same-site canonicals', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'first.md'), `---\ntitle: First\nsummary: First fixture\ndate: 2026-07-14\naliases: ["/writing/second/"]\ncanonical: https://example.com/writing/stale/\n---\nFirst.`);
  write(join(paths.content, 'writing', 'second.md'), `---\ntitle: Second\nsummary: Second fixture\ndate: 2026-07-13\n---\nSecond.`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /alias collides with a generated canonical path/);
  assert.match(result.stderr, /same-site canonical must match the generated detail URL/);
});

test('build rejects aliases on external and bodyless entries', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'external.md'), `---\ntitle: External\nsummary: External fixture\ndate: 2026-07-14\nexternal: https://example.org/post\naliases: ["/writing/old-external/"]\n---`);
  write(join(paths.content, 'work', 'bodyless.md'), `---\ntitle: Bodyless\nsummary: Bodyless fixture\naliases: ["/work/old-bodyless/"]\n---`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.equal((result.stderr.match(/aliases require a generated internal detail page/g) || []).length, 2);
});

test('markdown headings get stable deep-link ids and explicit ids are preserved', () => {
  const paths = fixture();
  write(join(paths.content, 'writing', 'anchors.md'), `---\ntitle: Anchors\nsummary: Heading links\ndate: 2026-07-13\n---\n## Hello, World!\n\n## Custom heading {#chosen-id}\n\n| Option | Result |\n| --- | --- |\n| A | Works |`);
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(join(paths.dist, 'writing', 'anchors', 'index.html'), 'utf8');
  assert.match(html, /<h2 id="hello-world"><a class="heading-anchor" href="#hello-world"/);
  assert.match(html, /<h2 id="chosen-id"><a class="heading-anchor" href="#chosen-id"/);
  assert.match(html, /<table><thead><tr><th>Option<\/th><th>Result<\/th>/);
});

test('build lists public demos without disclosing private demos', () => {
  const paths = fixture();
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const demos = readFileSync(join(paths.dist, 'demos', 'index.html'), 'utf8');
  assert.match(demos, /Public demo/);
  assert.doesNotMatch(demos, /Private demo/);
});

test('build publishes agent scripts in navigation, homepage, index, and sitemap', () => {
  const paths = fixture();
  write(join(paths.content, 'scripts', 'coding-agent.md'), `---\ntitle: Loop Engineering Coding Agent\nsummary: A tested operating contract for coding agents.\ntype: System prompt\ndate: 2026-07-16\n---\n## Use it\n\nCopy the prompt.`);
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const home = readFileSync(join(paths.dist, 'index.html'), 'utf8');
  const index = readFileSync(join(paths.dist, 'scripts', 'index.html'), 'utf8');
  const detail = readFileSync(join(paths.dist, 'scripts', 'coding-agent', 'index.html'), 'utf8');
  const sitemap = readFileSync(join(paths.dist, 'sitemap.xml'), 'utf8');
  assert.match(home, /href="\/scripts\/">Agent Scripts<\/a>/);
  assert.match(home, /Loop Engineering Coding Agent/);
  assert.match(index, /Reusable agent instructions/);
  assert.match(index, /Loop Engineering Coding Agent/);
  assert.match(detail, /Copy the prompt/);
  assert.match(detail, /"datePublished":"2026-07-16T00:00:00Z"/);
  assert.match(detail, /aria-label="Primary"/);
  assert.match(sitemap, /https:\/\/example\.com\/scripts\/coding-agent\//);
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

test('build omits the analytics script entirely when no measurement id is configured', () => {
  const paths = fixture();
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const home = readFileSync(join(paths.dist, 'index.html'), 'utf8');
  assert.doesNotMatch(home, /gtag\/js\?id="/);
  assert.doesNotMatch(home, /Google tag \(gtag\.js\)/);
});

test('default social images keep their real alt text and resume renders its portrait', () => {
  const paths = fixture();
  write(join(paths.staticDir, 'portrait.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460"></svg>');
  write(join(paths.content, 'pages', 'privacy.md'), `---\ntitle: Privacy\nsummary: Privacy page\n---\nPrivacy details.`);
  write(join(paths.content, 'pages', 'resume.md'), `---\ntitle: Resume\nsummary: Resume page\nimage: /portrait.svg\nimageAlt: Test Person headshot.\n---\nExperience.`);
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const privacy = readFileSync(join(paths.dist, 'privacy', 'index.html'), 'utf8');
  const resume = readFileSync(join(paths.dist, 'resume', 'index.html'), 'utf8');
  const home = readFileSync(join(paths.dist, 'index.html'), 'utf8');
  assert.match(home, /<meta property="og:image:alt" content="Test Person portfolio preview\."/);
  assert.match(privacy, /<meta property="og:image:alt" content="Test Person portfolio preview\."/);
  assert.match(resume, /<img class="article-hero profile-portrait" src="\/portrait\.svg" alt="Test Person headshot\."/);
});

test('build writes a styled 404 page with a link home', () => {
  const paths = fixture();
  const result = build(paths);
  assert.equal(result.status, 0, result.stderr);
  const notFound = readFileSync(join(paths.dist, '404.html'), 'utf8');
  assert.match(notFound, /<h1>Page not found<\/h1>/);
  assert.match(notFound, /<a[^>]*href="\/"[^>]*>Home<\/a>/);
  assert.match(notFound, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(notFound, /class="site-header"/);
});

test('build rejects missing root-relative assets in frontmatter links', () => {
  const paths = fixture();
  write(join(paths.content, 'talks', 'missing-deck.md'), `---\ntitle: Missing deck\nsummary: Invalid fixture\nlinks: [{"label":"Slides","url":"/decks/missing.pdf"}]\n---`);
  const result = build(paths);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /broken internal link \/decks\/missing\.pdf/);
});
