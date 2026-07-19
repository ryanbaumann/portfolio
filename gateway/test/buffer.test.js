import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stageWriterSocialDraft } from '../lib/buffer.js';

const ENV = {
  BUFFER_API_KEY: 'secret',
  BUFFER_ORGANIZATION_ID: 'org',
  BUFFER_LINKEDIN_CHANNEL_ID: 'linkedin-id',
  BUFFER_X_CHANNEL_ID: 'x-id',
};

test('writer stages an unpublished Buffer draft for the selected channel', async () => {
  const calls = [];
  const fetchImpl = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return calls.length === 1
      ? { ok: true, json: async () => ({ data: { posts: { edges: [] } } }) }
      : { ok: true, json: async () => ({ data: { createPost: { post: { id: 'new-draft' } } } }) };
  };
  const result = await stageWriterSocialDraft({ channel: 'linkedin', text: 'Editable copy', env: ENV, fetchImpl });
  assert.deepEqual(result, { id: 'new-draft', channel: 'linkedin', duplicate: false });
  assert.equal(calls[1].variables.input.channelId, 'linkedin-id');
  assert.equal(calls[1].variables.input.saveToDraft, true);
  assert.equal(calls[1].variables.input.mode, 'addToQueue');
});

test('writer reuses exact draft copy and validates X length', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ data: { posts: { edges: [{ node: { id: 'existing', text: 'Same' } }] } } }) });
  assert.deepEqual(
    await stageWriterSocialDraft({ channel: 'x', text: 'Same', env: ENV, fetchImpl }),
    { id: 'existing', channel: 'x', duplicate: true },
  );
  await assert.rejects(stageWriterSocialDraft({ channel: 'x', text: 'x'.repeat(281), env: ENV, fetchImpl }), /280 characters/);
});

test('writer social staging requires a configured known channel', async () => {
  await assert.rejects(stageWriterSocialDraft({ channel: 'other', text: 'Draft', env: ENV }), /Choose LinkedIn or X/);
  await assert.rejects(stageWriterSocialDraft({ channel: 'x', text: 'Draft', env: {} }), /not configured/);
});
