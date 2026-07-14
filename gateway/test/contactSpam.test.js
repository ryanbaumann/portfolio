import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyContactSubmission,
  deterministicContactDecision,
  parseContactClassifierOutput,
} from '../lib/contactSpam.js';

test('deterministic contact rules reject explicit advertising but allow legitimate SEO context', () => {
  assert.equal(deterministicContactDecision('We offer SEO services and backlink packages for your website.').decision, 'reject');
  assert.equal(deterministicContactDecision('Could you speak about how AEO changes developer documentation?').decision, 'allow');
  assert.equal(deterministicContactDecision('I lead SEO at our company and want to hire a developer platform speaker.').decision, 'allow');
});

test('classifier output requires exact structured values', () => {
  assert.deepEqual(parseContactClassifierOutput('{"decision":"reject","category":"advertising","confidence":0.99}'), {
    decision: 'reject', category: 'advertising', confidence: 0.99, source: 'model',
  });
  assert.equal(parseContactClassifierOutput('SPAM'), null);
  assert.equal(parseContactClassifierOutput('{"decision":"reject","category":"advertising","confidence":5}'), null);
});

test('model rejection requires high-confidence advertising and sends no identity fields', async () => {
  let requestBody;
  const fetchImpl = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"decision":"reject","category":"advertising","confidence":0.99}' }] } }] }),
    };
  };
  const result = await classifyContactSubmission({
    intent: 'Speaking opportunity',
    message: 'A vague commercial pitch that the model must evaluate.',
    geminiApiKey: 'test-key',
    fetchImpl,
  });
  assert.equal(result.decision, 'reject');
  const modelText = requestBody.contents[0].parts[0].text;
  assert.doesNotMatch(modelText, /name:|email:/i);
});

test('ambiguous, malformed, and failed model responses fail open', async () => {
  const cases = [
    async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"decision":"reject","category":"advertising","confidence":0.7}' }] } }] }) }),
    async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'SPAM' }] } }] }) }),
    async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); },
  ];
  const decisions = [];
  for (const fetchImpl of cases) {
    decisions.push(await classifyContactSubmission({
      intent: 'Other',
      message: 'I have a potentially useful professional question for Ryan.',
      geminiApiKey: 'test-key',
      fetchImpl,
    }));
  }
  assert.equal(decisions[0].decision, 'review');
  assert.equal(decisions[1].decision, 'allow');
  assert.equal(decisions[2].decision, 'allow');
});
