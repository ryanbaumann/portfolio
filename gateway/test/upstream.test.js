import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proxyUpstream } from '../lib/upstream.js';

const app = {
  api: { type: 'upstream', prefix: '/api/private-demo/', originEnv: 'DEMO_ORIGIN', audienceEnv: 'DEMO_AUDIENCE', methods: ['GET', 'POST'] },
};

function request(method = 'GET', headers = {}, chunks = []) {
  return { method, headers: { host: 'portfolio.example', ...headers }, async *[Symbol.asyncIterator]() { yield* chunks; } };
}

function responseRecorder() {
  return { status: null, headers: null, body: null, writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } };
}

test('private upstream uses a fixed origin, service identity, and stripped headers', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith('http://metadata.google.internal/')) return new Response('identity-token');
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const response = responseRecorder();
  const result = await proxyUpstream({ request: request('GET', { cookie: 'secret', authorization: 'attacker' }), response, pathname: '/api/private-demo/status', search: '?safe=1', app, env: { DEMO_ORIGIN: 'https://service.run.app', DEMO_AUDIENCE: 'https://service.run.app' }, fetchImpl });
  assert.equal(result, null);
  assert.equal(calls[1].url, 'https://service.run.app/status?safe=1');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer identity-token');
  assert.equal(calls[1].options.headers.Cookie, undefined);
  assert.equal(response.status, 200);
});

test('private upstream fails closed for config and cross-origin mutations', async () => {
  assert.deepEqual(await proxyUpstream({ request: request(), response: responseRecorder(), pathname: '/api/private-demo/status', search: '', app, env: {}, fetchImpl: fetch }), { statusCode: 503, json: { error: 'Private demo upstream is not configured.' } });
  const result = await proxyUpstream({ request: request('POST', { origin: 'https://evil.example' }), response: responseRecorder(), pathname: '/api/private-demo/run', search: '', app, env: { DEMO_ORIGIN: 'https://service.run.app', DEMO_AUDIENCE: 'audience' }, fetchImpl: fetch });
  assert.equal(result.statusCode, 403);
});
