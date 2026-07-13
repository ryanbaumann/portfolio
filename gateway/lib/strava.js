// gateway/lib/strava.js
//
// Strava OAuth broker + photo proxy, ported from demos/strava-explorer/server/broker.js
// so the gateway can serve /api/strava/* same-origin without depending on the
// standalone demos/strava-explorer/server package. Keep the two in sync by hand;
// demos/strava-explorer/server/ is left intact for standalone deploys (see
// demos/strava-explorer/HOSTING.md).

import { resolveProvider } from './config.js';

export const allowedPhotoHosts = new Set([
  'dgtzuqphqg23d.cloudfront.net',
]);

export function isAllowedPhotoUrl(rawUrl, hosts = allowedPhotoHosts) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && !url.username && !url.password
      && (!url.port || url.port === '443') && hosts.has(url.hostname);
  } catch {
    return false;
  }
}

async function postForm(url, params, token, { fetch }) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: params,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('Strava postForm fetch error:', err);
    const error = new Error('Upstream request timed out or failed.');
    error.statusCode = err.name === 'TimeoutError' || err.name === 'AbortError' ? 504 : 502;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`Strava request failed: ${response.status} ${response.statusText}`, data);
    const error = new Error('Strava request failed.');
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

export async function exchangeCode(body, { clientId, clientSecret, fetch, tokenUrl }) {
  if (!body?.code) {
    const error = new Error('Missing authorization code.');
    error.statusCode = 400;
    throw error;
  }
  return postForm(tokenUrl, new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: body.code,
    grant_type: 'authorization_code',
  }), null, { fetch });
}

export async function refreshToken(body, { clientId, clientSecret, fetch, tokenUrl }) {
  if (!body?.refresh_token) {
    const error = new Error('Missing refresh token.');
    error.statusCode = 400;
    throw error;
  }
  return postForm(tokenUrl, new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: body.refresh_token,
    grant_type: 'refresh_token',
  }), null, { fetch });
}

export async function deauthorize(body, authHeader, { fetch, deauthorizeUrl }) {
  const token = body?.access_token || authHeader?.replace(/^Bearer\s+/i, '') || '';
  if (!token) {
    const error = new Error('Missing access token.');
    error.statusCode = 400;
    throw error;
  }
  return postForm(deauthorizeUrl, new URLSearchParams({}), token, { fetch });
}

export async function handlePhotoProxy(photoUrl, { fetch, maxPhotoBytes, hosts = allowedPhotoHosts }) {
  if (!photoUrl || !isAllowedPhotoUrl(photoUrl, hosts)) {
    const error = new Error('Invalid or unsupported photo URL.');
    error.statusCode = 400;
    throw error;
  }

  let upstream;
  let currentUrl = photoUrl;
  try {
    // One deadline covers the entire redirect chain so each hop cannot reset
    // the upstream budget and multiply the gateway's 10-second timeout.
    const requestSignal = AbortSignal.timeout(10000);
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      upstream = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'ryan-baumann-portfolio-photo-proxy/1.0',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: requestSignal,
      });
      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
      // Redirect bodies are never consumed. Cancel them before following so
      // the fetch implementation can promptly release the connection/body.
      if (upstream.body?.cancel) {
        try {
          await upstream.body.cancel();
        } catch {
          // A response may already be closed; redirect validation still
          // determines whether it is safe to continue.
        }
      }
      const location = upstream.headers.get('location');
      const nextUrl = location ? new URL(location, currentUrl).href : '';
      if (!isAllowedPhotoUrl(nextUrl, hosts) || redirectCount === 3) {
        const error = new Error('Photo redirect was invalid or unsupported.');
        error.statusCode = 502;
        throw error;
      }
      currentUrl = nextUrl;
    }
  } catch (err) {
    if (err.statusCode) throw err;
    console.error('Photo proxy upstream fetch error:', err);
    const error = new Error('Failed to fetch photo from upstream.');
    error.statusCode = err.name === 'TimeoutError' || err.name === 'AbortError' ? 504 : 502;
    throw error;
  }

  if (!upstream.ok) {
    console.error(`Upstream returned non-ok status: ${upstream.status} ${upstream.statusText}`);
    const error = new Error('Photo request failed.');
    error.statusCode = upstream.status === 404 ? 404 : 502;
    throw error;
  }

  const contentType = (upstream.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
  const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
  if (!allowedMimeTypes.has(contentType)) {
    console.error(`Forbidden content type: ${contentType}`);
    const error = new Error('Photo URL did not return a supported image type.');
    error.statusCode = 415;
    throw error;
  }

  const contentLength = Number(upstream.headers.get('content-length') || 0);
  if (contentLength > maxPhotoBytes) {
    console.error(`Content length exceeds max allowed bytes: ${contentLength} > ${maxPhotoBytes}`);
    const error = new Error('Photo is too large to proxy.');
    error.statusCode = 413;
    throw error;
  }

  const photoBuffer = await readBodyWithLimit(upstream, maxPhotoBytes);

  return {
    contentType,
    body: photoBuffer,
  };
}

async function readBodyWithLimit(response, maxBytes) {
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength <= maxBytes) return buffer;
    const error = new Error('Photo is too large to proxy.');
    error.statusCode = 413;
    throw error;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      const error = new Error('Photo is too large to proxy.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

const STRAVA_TOKEN_URL = process.env.STRAVA_TOKEN_URL || 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTHORIZE_URL = process.env.STRAVA_DEAUTHORIZE_URL || 'https://www.strava.com/oauth/deauthorize';
const configuredPhotoBytes = Number(process.env.MAX_PHOTO_PROXY_BYTES);
const MAX_PHOTO_PROXY_BYTES = Number.isSafeInteger(configuredPhotoBytes) && configuredPhotoBytes > 0
  ? configuredPhotoBytes
  : 8 * 1024 * 1024;

function credentials(env = process.env) {
  return resolveProvider('strava', env);
}

export function isStravaConfigured(env = process.env) {
  const { clientId, clientSecret } = credentials(env);
  return Boolean(clientId && clientSecret);
}

// Mirrors the "missing X" checks inside exchangeCode/refreshToken/deauthorize
// below, run before the isStravaConfigured() check so a malformed request
// reliably 400s instead of 503ing just because the server happens to be
// keyless (same reasoning as gateway/lib/isochrones.js).
function missingFieldError(pathname, body, authHeader) {
  if (pathname === '/api/strava/token' && !body?.code) return 'Missing authorization code.';
  if (pathname === '/api/strava/refresh' && !body?.refresh_token) return 'Missing refresh token.';
  if (pathname === '/api/strava/deauthorize') {
    const token = body?.access_token || authHeader?.replace(/^Bearer\s+/i, '') || '';
    if (!token) return 'Missing access token.';
  }
  return null;
}

/**
 * Dispatch a /api/strava/* request. Returns a plain result object the
 * caller writes to the response; never throws (all errors are turned into
 * { statusCode, body } responses so the gateway stays keyless-safe).
 */
export async function handleStravaApi({ pathname, method, body, authHeader, searchParams }, { fetch = globalThis.fetch, env = process.env } = {}) {
  const isTokenEndpoint = pathname === '/api/strava/token' || pathname === '/api/strava/refresh' || pathname === '/api/strava/deauthorize';

  if (isTokenEndpoint) {
    if (method !== 'POST') {
      return { statusCode: 405, json: { error: 'Method not allowed' } };
    }
    const validationError = missingFieldError(pathname, body, authHeader);
    if (validationError) {
      return { statusCode: 400, json: { error: validationError } };
    }
    if (!isStravaConfigured(env)) {
      return { statusCode: 503, json: { error: 'Strava broker is not configured on this server.' } };
    }

    const { clientId, clientSecret } = credentials(env);
    try {
      if (pathname === '/api/strava/token') {
        const data = await exchangeCode(body, { clientId, clientSecret, fetch, tokenUrl: STRAVA_TOKEN_URL });
        return { statusCode: 200, json: data };
      }
      if (pathname === '/api/strava/refresh') {
        const data = await refreshToken(body, { clientId, clientSecret, fetch, tokenUrl: STRAVA_TOKEN_URL });
        return { statusCode: 200, json: data };
      }
      if (pathname === '/api/strava/deauthorize') {
        const data = await deauthorize(body, authHeader, { fetch, deauthorizeUrl: STRAVA_DEAUTHORIZE_URL });
        return { statusCode: 200, json: data };
      }
    } catch (error) {
      return stravaErrorResponse(pathname, error);
    }
  }

  if (pathname === '/api/strava/photo') {
    if (method !== 'GET') {
      return { statusCode: 405, json: { error: 'Method not allowed' } };
    }
    const photoUrl = searchParams?.get('url');
    try {
      const result = await handlePhotoProxy(photoUrl, { fetch, maxPhotoBytes: MAX_PHOTO_PROXY_BYTES, hosts: allowedPhotoHosts });
      return { statusCode: 200, binary: result };
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message = error.message === 'Invalid or unsupported photo URL.' ? error.message : 'Failed to proxy photo.';
      return { statusCode, json: { error: message } };
    }
  }

  return { statusCode: 404, json: { error: 'Not found' } };
}

function stravaErrorResponse(pathname, error) {
  console.error('Strava broker error:', error);
  let statusCode = error.statusCode || 500;
  let clientMessage = 'Internal server error';

  if (error.message === 'Missing authorization code.' || error.message === 'Missing refresh token.' || error.message === 'Missing access token.') {
    statusCode = 400;
    clientMessage = error.message;
  } else if (error instanceof SyntaxError) {
    statusCode = 400;
    clientMessage = 'Invalid JSON request body.';
  } else if (pathname === '/api/strava/token') {
    clientMessage = 'Strava authorization failed.';
  } else if (pathname === '/api/strava/refresh') {
    clientMessage = 'Strava token refresh failed.';
  } else if (pathname === '/api/strava/deauthorize') {
    clientMessage = 'Strava deauthorization failed.';
  }

  return { statusCode, json: { error: clientMessage } };
}
