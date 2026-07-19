const BUFFER_ENDPOINT = 'https://api.buffer.com';
const CHANNEL_ENV = Object.freeze({
  linkedin: 'BUFFER_LINKEDIN_CHANNEL_ID',
  x: 'BUFFER_X_CHANNEL_ID',
});

async function bufferRequest(apiKey, query, variables, fetchImpl) {
  const response = await fetchImpl(BUFFER_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw Object.assign(new Error(`Buffer API request failed with HTTP ${response.status}.`), { statusCode: 502 });
  const payload = await response.json();
  if (payload.errors?.length) throw Object.assign(new Error(`Buffer API error: ${payload.errors[0].message}`), { statusCode: 502 });
  return payload.data;
}

export async function stageWriterSocialDraft({ channel, text, env = process.env, fetchImpl = fetch }) {
  if (!Object.hasOwn(CHANNEL_ENV, channel)) throw Object.assign(new Error('Choose LinkedIn or X.'), { statusCode: 400 });
  const limit = channel === 'x' ? 280 : 3_000;
  if (typeof text !== 'string' || !text.trim() || text.length > limit) {
    throw Object.assign(new Error(`${channel === 'x' ? 'X' : 'LinkedIn'} copy must be between 1 and ${limit.toLocaleString()} characters.`), { statusCode: 422 });
  }
  const apiKey = env.BUFFER_API_KEY;
  const organizationId = env.BUFFER_ORGANIZATION_ID;
  const channelId = env[CHANNEL_ENV[channel]];
  if (!apiKey || !organizationId || !channelId) throw Object.assign(new Error('Buffer draft staging is not configured.'), { statusCode: 503 });

  const existing = await bufferRequest(apiKey, `query ExistingDrafts($input: PostsInput!) {
    posts(first: 100, input: $input) { edges { node { id text status channelId } } }
  }`, {
    input: { organizationId, filter: { status: ['draft', 'needs_approval'], channelIds: [channelId] } },
  }, fetchImpl);
  const duplicate = existing?.posts?.edges?.find((edge) => edge?.node?.text === text)?.node;
  if (duplicate) return { id: duplicate.id, channel, duplicate: true };

  const created = await bufferRequest(apiKey, `mutation StageSocialDraft($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess { post { id text status channelId } }
      ... on MutationError { message }
    }
  }`, {
    input: { text, channelId, schedulingType: 'automatic', mode: 'addToQueue', saveToDraft: true, source: 'field-notes' },
  }, fetchImpl);
  if (created?.createPost?.message) throw Object.assign(new Error(`Buffer rejected the draft: ${created.createPost.message}`), { statusCode: 502 });
  if (!created?.createPost?.post?.id) throw Object.assign(new Error('Buffer did not return the staged draft.'), { statusCode: 502 });
  return { id: created.createPost.post.id, channel, duplicate: false };
}
