import http from 'node:http';
import {
  exchangeCode,
  refreshToken,
  deauthorize,
  handlePhotoProxy,
  allowedPhotoHosts,
} from './broker.js';

const port = Number(process.env.PORT || 8080);
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
const stravaTokenUrl = process.env.STRAVA_TOKEN_URL || 'https://www.strava.com/oauth/token';
const stravaDeauthorizeUrl = process.env.STRAVA_DEAUTHORIZE_URL || 'https://www.strava.com/oauth/deauthorize';
const maxPhotoBytes = Number(process.env.MAX_PHOTO_PROXY_BYTES || 8 * 1024 * 1024);

export const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : [];

export const isOriginAllowed = (origin) => {
  if (!origin) return false;
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.includes(origin);
};

if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
  console.warn('\n\x1b[33m%s\x1b[0m', '======================================================================');
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: ALLOWED_ORIGIN is unset or set to "*".');
  console.warn('\x1b[33m%s\x1b[0m', 'In development, this allows local testing.');
  if (process.env.NODE_ENV === 'production') {
    console.warn('\x1b[31m%s\x1b[0m', 'CRITICAL: Running in production. For token endpoints,');
    console.warn('\x1b[31m%s\x1b[0m', 'origin reflection is disabled to protect client secrets.');
  }
  console.warn('\x1b[33m%s\x1b[0m', '======================================================================\n');
}

export function corsHeaders(origin, isTokenEndpoint = false) {
  let allowOrigin = '*';

  if (allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
    if (origin && isOriginAllowed(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = 'null';
    }
  } else {
    if (process.env.NODE_ENV === 'production' && isTokenEndpoint) {
      allowOrigin = '*';
    } else {
      allowOrigin = origin || '*';
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

function sendJson(response, statusCode, payload, origin, isTokenEndpoint = false) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsHeaders(origin, isTokenEndpoint),
  });
  response.end(JSON.stringify(payload));
}

const rateLimits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimits.entries()) {
    if (now - record.windowStart > 60000) {
      rateLimits.delete(ip);
    }
  }
}, 60000).unref();

export function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip);
  if (!record || now - record.windowStart > 60000) {
    rateLimits.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  record.count++;
  if (record.count > 30) {
    return false;
  }
  return true;
}

export function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesRead = 0;
    const limitBytes = 10 * 1024; // 10 KB limit

    request.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > limitBytes) {
        reject(new Error('Payload too large'));
        return;
      }
      body += chunk;
    });

    request.on('end', () => {
      if (bytesRead > limitBytes) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });

    request.on('error', (err) => {
      reject(err);
    });
  });
}

function requireConfig() {
  if (!stravaClientId || !stravaClientSecret) {
    throw new Error('Broker configuration missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET.');
  }
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  const ip = request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || 'unknown';

  let requestUrl;
  try {
    requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  } catch (err) {
    sendJson(response, 400, { error: 'Bad request URL.' }, origin);
    return;
  }

  const pathname = requestUrl.pathname;
  const isTokenEndpoint = pathname === '/api/strava/token' || pathname === '/api/strava/refresh' || pathname === '/api/strava/deauthorize';

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(origin, isTokenEndpoint));
    response.end();
    return;
  }

  if (request.method === 'POST' || (request.method === 'GET' && pathname === '/api/photo-proxy')) {
    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip} on path ${pathname}`);
      sendJson(response, 429, { error: 'Too many requests. Please try again later.' }, origin, isTokenEndpoint);
      return;
    }
  }

  if (request.method === 'GET') {
    if (pathname === '/healthz') {
      sendJson(response, 200, { ok: true }, origin);
      return;
    }

    if (pathname === '/api/photo-proxy') {
      const photoUrl = requestUrl.searchParams.get('url');
      try {
        const result = await handlePhotoProxy(photoUrl, {
          fetch: globalThis.fetch,
          maxPhotoBytes,
          hosts: allowedPhotoHosts,
        });

        response.writeHead(200, {
          'Content-Type': result.contentType,
          'Content-Length': result.body.byteLength,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': 'sandbox',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          ...corsHeaders(origin, false),
        });
        response.end(Buffer.from(result.body));
      } catch (error) {
        console.error('Photo proxy error:', error);
        const statusCode = error.statusCode || 500;
        let message = 'Failed to proxy photo.';
        if (error.message === 'Invalid or unsupported photo URL.') {
          message = error.message;
        }
        sendJson(response, statusCode, { error: message }, origin, false);
      }
      return;
    }

    sendJson(response, 404, { error: 'Not found' }, origin, false);
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' }, origin, isTokenEndpoint);
    return;
  }

  try {
    requireConfig();
    const body = await readJsonBody(request);

    if (pathname === '/api/strava/token') {
      const data = await exchangeCode(body, {
        clientId: stravaClientId,
        clientSecret: stravaClientSecret,
        fetch: globalThis.fetch,
        tokenUrl: stravaTokenUrl,
      });
      sendJson(response, 200, data, origin, true);
      return;
    }

    if (pathname === '/api/strava/refresh') {
      const data = await refreshToken(body, {
        clientId: stravaClientId,
        clientSecret: stravaClientSecret,
        fetch: globalThis.fetch,
        tokenUrl: stravaTokenUrl,
      });
      sendJson(response, 200, data, origin, true);
      return;
    }

    if (pathname === '/api/strava/deauthorize') {
      const authHeader = request.headers.authorization;
      const data = await deauthorize(body, authHeader, {
        fetch: globalThis.fetch,
        deauthorizeUrl: stravaDeauthorizeUrl,
      });
      sendJson(response, 200, data, origin, true);
      return;
    }

    sendJson(response, 404, { error: 'Not found' }, origin, true);
  } catch (error) {
    console.error('Broker error occurred:', error);
    let statusCode = error.statusCode || 500;
    let clientMessage = 'Internal server error';

    if (error.message === 'Payload too large') {
      statusCode = 413;
      clientMessage = 'Payload too large';
    } else if (error instanceof SyntaxError) {
      statusCode = 400;
      clientMessage = 'Invalid JSON request body.';
    } else if (error.message === 'Missing authorization code.' || error.message === 'Missing refresh token.' || error.message === 'Missing access token.') {
      statusCode = 400;
      clientMessage = error.message;
    } else {
      if (pathname === '/api/strava/token') {
        clientMessage = 'Strava authorization failed.';
      } else if (pathname === '/api/strava/refresh') {
        clientMessage = 'Strava token refresh failed.';
      } else if (pathname === '/api/strava/deauthorize') {
        clientMessage = 'Strava deauthorization failed.';
      }
    }

    sendJson(response, statusCode, { error: clientMessage }, origin, isTokenEndpoint);
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  server.listen(port, () => {
    console.log(`Strava OAuth broker listening on ${port}`);
  });
}
