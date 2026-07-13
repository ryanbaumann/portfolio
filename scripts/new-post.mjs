#!/usr/bin/env node
// scripts/new-post.mjs — one-command blog post scaffold.
//
// Creates portfolio/content/writing/<slug>.md with front matter filled in.
// The writing section is already designed and routed: the post is live on
// the next build. Zero dependencies.
//
// Usage:
//   npm run new:post -- "Developer experience is a growth engine"
//   npm run new:post -- "Launch post" --external https://example.com/launch
//   npm run new:post -- "My post" --summary "One-line summary for lists."
//   npm run new:post -- "Ready to publish" --publish
//
// Voice and structure guidance: .agents/skills/portfolio-writing/SKILL.md

import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRITING_DIR = resolve(process.env.PORTFOLIO_WRITING_DIR || join(REPO_ROOT, 'portfolio', 'content', 'writing'));

const args = process.argv.slice(2);
const title = args[0];
if (!title || title.startsWith('-')) {
  console.error('[new-post] usage: npm run new:post -- "Post title" [--summary "..."] [--external <url>]');
  process.exit(1);
}

function flag(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const summary = flag('summary', 'One sentence: the claim and why the reader should care.');
const external = flag('external', null);
const draft = !args.includes('--publish');
const tags = flag('tags', 'developer experience');

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .slice(0, 60);
const postPath = join(WRITING_DIR, `${slug}.md`);
if (existsSync(postPath)) {
  console.error(`[new-post] ${postPath} already exists`);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const canonical = external || `https://www.ryanbaumann-portfolio.com/writing/${slug}/`;
const tagList = tags.split(',').map((tag) => tag.trim()).filter(Boolean);

const body = external
  ? ''
  : `

State the thesis in the first paragraph — the claim and why the reader
should care. No throat-clearing.

Evidence from real work. Link the artifact every time.

End with what to do about it, not a summary.
`;

writeFileSync(postPath, `---
title: ${title}
summary: ${summary}
date: ${date}
updated: ${date}
canonical: ${canonical}
image: /previews/portfolio.jpg
imageAlt: Ryan Baumann Portfolio preview card
tags: ${JSON.stringify(tagList)}
draft: ${draft}
noindex: ${draft}
${external ? `external: ${external}\n` : ''}---${body}`);

console.log(`[new-post] created portfolio/content/writing/${slug}.md`);
console.log('[new-post] preview:  cd portfolio && node build.mjs && node serve.mjs');
console.log('[new-post] voice:    .agents/skills/portfolio-writing/SKILL.md');
