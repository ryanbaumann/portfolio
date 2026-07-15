const REQUEST_LIMIT = 256 * 1024;
const RESPONSE_LIMIT = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const ALLOWED_METHODS = new Set(['GET', 'POST']);

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > REQUEST_LIMIT) throw Object.assign(new Error('Payload too large'), { statusCode: 413 });
    chunks.push(Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function identityToken(audience, fetchImpl, signal) {
  const url = new URL('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity');
  url.searchParams.set('audience', audience);
  url.searchParams.set('format', 'full');
  const response = await fetchImpl(url, { headers: { 'Metadata-Flavor': 'Google' }, signal });
  if (!response.ok) throw new Error('service identity token unavailable');
  return response.text();
}

async function readResponseBody(upstream) {
  if (!upstream.body) return Buffer.alloc(0);
  const reader = upstream.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > RESPONSE_LIMIT) {
      await reader.cancel();
      throw Object.assign(new Error('response_too_large'), { statusCode: 502 });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function proxyUpstream({ request, response, pathname, search, app, env = process.env, fetchImpl = fetch }) {
  const method = request.method || 'GET';
  const allowed = app.api.methods || ['GET', 'POST'];
  if (!ALLOWED_METHODS.has(method) || !allowed.includes(method)) return { statusCode: 405, json: { error: 'Method not allowed' } };
  const originValue = env[app.api.originEnv];
  const audience = env[app.api.audienceEnv];
  if (!originValue || !audience) return { statusCode: 503, json: { error: 'Private demo upstream is not configured.' } };
  let origin;
  try { origin = new URL(originValue); } catch { return { statusCode: 503, json: { error: 'Private demo upstream is misconfigured.' } }; }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') return { statusCode: 503, json: { error: 'Private demo upstream is misconfigured.' } };
  if (!['GET', 'HEAD'].includes(method)) {
    const expectedOrigin = `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers.host}`;
    if (request.headers.origin !== expectedOrigin) return { statusCode: 403, json: { error: 'Same-origin request required.' } };
  }
  const suffix = pathname.slice(app.api.prefix.length);
  let decodedSuffix;
  try { decodedSuffix = decodeURIComponent(suffix); } catch { return { statusCode: 400, json: { error: 'Invalid upstream path.' } }; }
  if (decodedSuffix.startsWith('/') || decodedSuffix.split('/').includes('..')) return { statusCode: 400, json: { error: 'Invalid upstream path.' } };
  const target = new URL(suffix + search, origin);
  if (target.origin !== origin.origin) return { statusCode: 400, json: { error: 'Invalid upstream path.' } };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(request);
    const token = await identityToken(audience, fetchImpl, controller.signal);
    const upstream = await fetchImpl(target, {
      method,
      body,
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: request.headers.accept || 'application/json',
        ...(request.headers['content-type'] ? { 'Content-Type': request.headers['content-type'] } : {}),
      },
    });
    const declaredSize = Number(upstream.headers.get('content-length') || 0);
    if (declaredSize > RESPONSE_LIMIT) return { statusCode: 502, json: { error: 'Upstream response too large.' } };
    const bodyBytes = await readResponseBody(upstream);
    response.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(bodyBytes);
    return null;
  } catch (error) {
    return { statusCode: error.statusCode || (error.name === 'AbortError' ? 504 : 502), json: { error: error.message === 'response_too_large' ? 'Upstream response too large.' : (error.name === 'AbortError' ? 'Upstream timed out.' : 'Private demo upstream failed.') } };
  } finally {
    clearTimeout(timeout);
  }
}
