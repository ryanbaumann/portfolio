import assert from 'node:assert/strict';
import { test } from 'node:test';

import { publishWritingUpdate, requestWritingReview, saveWritingDraft, updatePublishingFrontMatter } from '../lib/writer.js';

const ESSAY = `---
title: Draft
summary: Test
date: 2026-07-13
draft: true
noindex: true
---
Body.`;

test('writer publishing transitions front matter without changing the body', () => {
  const now = new Date('2026-07-13T12:00:00Z');
  const scheduled = updatePublishingFrontMatter(ESSAY, 'schedule', '2026-07-14T12:30:00Z', now);
  assert.match(scheduled, /draft: false/);
  assert.match(scheduled, /noindex: false/);
  assert.match(scheduled, /publishAt: 2026-07-14T12:30:00Z/);
  assert.match(scheduled, /\n---\nBody\.$/);

  const published = updatePublishingFrontMatter(scheduled, 'publish-now');
  assert.doesNotMatch(published, /publishAt:/);

  const draft = updatePublishingFrontMatter(published, 'draft');
  assert.match(draft, /draft: true/);
  assert.match(draft, /noindex: true/);
});

test('writer publishing rejects invalid schedules and slugs', async () => {
  const now = new Date('2026-07-13T12:00:00Z');
  assert.throws(() => updatePublishingFrontMatter(ESSAY, 'schedule', '2026-07-14 12:30', now), /valid future publish time/);
  assert.throws(() => updatePublishingFrontMatter(ESSAY, 'schedule', '2026-02-30T12:30:00Z', now), /valid future publish time/);
  assert.throws(() => updatePublishingFrontMatter(ESSAY, 'schedule', '2026-07-13T11:59:59Z', now), /valid future publish time/);
  assert.throws(() => updatePublishingFrontMatter(ESSAY, 'schedule', '2026-07-13T12:00:00Z', now), /valid future publish time/);
  await assert.rejects(
    publishWritingUpdate({ sourceSlug: '../secret', action: 'draft', env: { GITHUB_CONTENT_TOKEN: 'test' } }),
    /Invalid essay slug/,
  );
});

test('writer publishing reads and updates one known GitHub content file', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (!options.method) return {
      ok: true,
      json: async () => ({ sha: 'abc123', content: Buffer.from(ESSAY).toString('base64') }),
    };
    return { ok: true, json: async () => ({}) };
  };
  const result = await publishWritingUpdate({
    sourceSlug: 'draft',
    action: 'schedule',
    publishAt: '2026-07-14T12:30:00Z',
    env: { GITHUB_CONTENT_TOKEN: 'test-token', GITHUB_CONTENT_REPOSITORY: 'owner/repo' },
    fetchImpl,
    now: new Date('2026-07-13T12:00:00Z'),
  });
  assert.equal(result.action, 'schedule');
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /repos\/owner\/repo\/contents\/portfolio\/content\/writing\/draft\.md\?ref=main$/);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.sha, 'abc123');
  assert.match(Buffer.from(body.content, 'base64').toString('utf8'), /publishAt: 2026-07-14T12:30:00Z/);
});

test('writer publishing preserves actionable GitHub branch errors', async () => {
  const fetchImpl = async (_url, options) => options.method
    ? { ok: false, status: 422 }
    : { ok: true, json: async () => ({ sha: 'abc123', content: Buffer.from(ESSAY).toString('base64') }) };
  await assert.rejects(
    publishWritingUpdate({
      sourceSlug: 'draft',
      action: 'publish-now',
      env: { GITHUB_CONTENT_TOKEN: 'test-token', GITHUB_CONTENT_REPOSITORY: 'owner/repo' },
      fetchImpl,
    }),
    (error) => error.statusCode === 422 && /branch rules/.test(error.message),
  );
});

test('writer direct edits update only the selected Markdown file', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return options.method ? { ok: true } : { ok: true, json: async () => ({ sha: 'abc123' }) };
  };
  await saveWritingDraft({ sourceSlug: 'draft', markdown: ESSAY, env: { GITHUB_CONTENT_TOKEN: 'token', GITHUB_CONTENT_REPOSITORY: 'owner/repo' }, fetchImpl });
  assert.match(calls[0].url, /contents\/portfolio\/content\/writing\/draft\.md/);
  assert.equal(JSON.parse(calls[1].options.body).sha, 'abc123');
});

test('agent review request carries the saved file, author note, and required review lanes', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ html_url: 'https://github.com/owner/repo/issues/42' }) };
  };
  const result = await requestWritingReview({
    sourceSlug: 'draft', comment: 'Check the opening claim.',
    env: { GITHUB_REVIEW_TOKEN: 'review-token', GITHUB_CONTENT_REPOSITORY: 'owner/repo' }, fetchImpl,
  });
  assert.equal(result.issueUrl, 'https://github.com/owner/repo/issues/42');
  assert.equal(request.url, 'https://api.github.com/repos/owner/repo/issues');
  const issue = JSON.parse(request.options.body);
  assert.match(issue.body, /portfolio\/content\/writing\/draft\.md/);
  assert.match(issue.body, /Check the opening claim/);
  assert.match(issue.body, /portfolio-writing/);
  assert.match(issue.body, /portfolio-review/);
  assert.match(issue.body, /portfolio-design/);
});
