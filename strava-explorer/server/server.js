import http from 'node:http';
import { URLSearchParams } from 'node:url';

const port = Number(process.env.PORT || 8080);
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const stravaTokenUrl = process.env.STRAVA_TOKEN_URL || 'https://www.strava.com/oauth/token';
const stravaDeauthorizeUrl = process.env.STRAVA_DEAUTHORIZE_URL || 'https://www.strava.com/oauth/deauthorize';

const allowedPhotoHosts = new Set([
  'dgtzuqphqg23d.cloudfront.net',
]);
const maxPhotoBytes = Number(process.env.MAX_PHOTO_PROXY_BYTES || 8 * 1024 * 1024);

function isAllowedPhotoUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && allowedPhotoHosts.has(url.hostname);
  } catch {
    return false;
  }
}

async function proxyPhoto(request, response, origin) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const photoUrl = requestUrl.searchParams.get('url');
  if (!photoUrl || !isAllowedPhotoUrl(photoUrl)) {
    sendJson(response, 400, { error: 'Invalid or unsupported photo URL.' }, origin);
    return;
  }

  const upstream = await fetch(photoUrl, {
    headers: {
      'User-Agent': 'trails.ninja-photo-proxy/1.0',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (!upstream.ok) {
    sendJson(response, upstream.status, { error: `Photo request failed: ${upstream.status} ${upstream.statusText}` }, origin);
    return;
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  if (!contentType.toLowerCase().startsWith('image/')) {
    sendJson(response, 415, { error: 'Photo URL did not return an image.' }, origin);
    return;
  }

  const contentLength = Number(upstream.headers.get('content-length') || 0);
  if (contentLength > maxPhotoBytes) {
    sendJson(response, 413, { error: 'Photo is too large to proxy.' }, origin);
    return;
  }

  const photoBuffer = Buffer.from(await upstream.arrayBuffer());
  if (photoBuffer.byteLength > maxPhotoBytes) {
    sendJson(response, 413, { error: 'Photo is too large to proxy.' }, origin);
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': photoBuffer.byteLength,
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    ...corsHeaders(origin),
  });
  response.end(photoBuffer);
}

function corsHeaders(origin) {
  const allowOrigin = allowedOrigin === '*' ? (origin || '*') : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

function sendJson(response, statusCode, payload, origin) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsHeaders(origin),
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  if (!rawBody) return {};
  return JSON.parse(rawBody);
}

function requireConfig() {
  if (!stravaClientId || !stravaClientSecret) {
    throw new Error('Cloud Run broker is missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET.');
  }
}

async function postForm(url, params, token) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Strava request failed: ${response.status} ${response.statusText}`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function exchangeCode(body) {
  if (!body.code) throw new Error('Missing authorization code.');
  return postForm(stravaTokenUrl, new URLSearchParams({
    client_id: stravaClientId,
    client_secret: stravaClientSecret,
    code: body.code,
    grant_type: 'authorization_code',
  }));
}

async function refreshToken(body) {
  if (!body.refresh_token) throw new Error('Missing refresh token.');
  return postForm(stravaTokenUrl, new URLSearchParams({
    client_id: stravaClientId,
    client_secret: stravaClientSecret,
    refresh_token: body.refresh_token,
    grant_type: 'refresh_token',
  }));
}

async function deauthorize(body, request) {
  const header = request.headers.authorization || '';
  const token = body.access_token || header.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing access token.');
  return postForm(stravaDeauthorizeUrl, new URLSearchParams({}), token);
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }

  if (request.method === 'GET') {
    if (request.url === '/healthz') {
      sendJson(response, 200, { ok: true }, origin);
      return;
    }
    if (request.url.startsWith('/api/photo-proxy?')) {
      try {
        await proxyPhoto(request, response, origin);
      } catch (error) {
        sendJson(response, error.statusCode || 502, { error: error.message }, origin);
      }
      return;
    }
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' }, origin);
    return;
  }

  try {
    requireConfig();
    const body = await readJsonBody(request);
    if (request.url === '/api/strava/token') {
      sendJson(response, 200, await exchangeCode(body), origin);
      return;
    }
    if (request.url === '/api/strava/refresh') {
      sendJson(response, 200, await refreshToken(body), origin);
      return;
    }
    if (request.url === '/api/strava/deauthorize') {
      sendJson(response, 200, await deauthorize(body, request), origin);
      return;
    }
    sendJson(response, 404, { error: 'Not found' }, origin);
  } catch (error) {
    const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    sendJson(response, statusCode, { error: error.message, details: error.details }, origin);
  }
});

server.listen(port, () => {
  console.log(`Strava OAuth broker listening on ${port}`);
});
