#!/usr/bin/env node
// gateway/server.js
//
// Zero-npm-dependency Node ES-module server that is the single entry point
// for the Ryan Baumann portfolio container: it serves the site at the root
// path, every demo app's static build under its own path, and brokers all
// secret-bearing API calls same-origin under /api/*. See
// docs/ARCHITECTURE.md for the full picture.

import { createServer } from 'node:http';

import { loadApps, toPublicApp, appVisibility } from './lib/apps.js';
import { applySecurityHeaders, serveFromDir } from './lib/staticFiles.js';
import { createRateLimiter, clientIp, RATE_LIMIT_POLICIES, rateLimitPolicyForPath } from './lib/rateLimit.js';
import { resolveProvider } from './lib/config.js';
import {
  verifyAuthCookie,
  loginPageHtml,
  handleAuthRequest,
} from './lib/auth.js';
import { handleStravaApi } from './lib/strava.js';
import { handleIsochronesApi } from './lib/isochrones.js';

const PORT = Number(process.env.PORT || 8080);
const JSON_BODY_LIMIT_BYTES = 16 * 1024;
const FORM_BODY_LIMIT_BYTES = 32 * 1024;

const { apps } = loadApps(process.env);
// Only public-visibility apps appear in /api/apps and /healthz.
// toPublicApp returns null for unlisted/private apps.
const publicApps = apps.map(toPublicApp).filter(Boolean);

// Most-specific path first, so the root-mounted portfolio ("/") acts as the
// catch-all only after every demo app path has had its chance to match.
const appsByPathLength = [...apps].sort((a, b) => b.path.length - a.path.length);

// Token/refresh/deauthorize and isochrones are all low-volume,
// one-request-per-user-action calls, so a shared conservative bucket is
// fine. The photo proxy is different: a single Strava tour can render
// dozens of photo billboards, each firing its own GET, so it gets its own
// more generous limiter to avoid 429s on ordinary page loads.
const routeRateLimiters = Object.fromEntries(
  Object.entries(RATE_LIMIT_POLICIES).map(([name, policy]) => [name, createRateLimiter(policy)]),
);

// Route-aware rate limiter for private-demo auth attempts.
// Deliberately tight (5 attempts/min per IP) to discourage brute-force.
//
// CLOUD RUN SINGLE-INSTANCE TRADEOFF:
// These in-memory rate limiters only track counts within the current process.
// On Cloud Run with max-instances=1 (the default for this portfolio) that's
// fine — every request hits the same process.  If the service ever scales to
// multiple instances, rate limits become per-instance and an attacker can
// round-robin across them.  For shared/distributed rate limiting consider:
//   - Google Cloud Armor rate-limiting policies (Layer 7, no code change)
//   - Redis or Memorystore counters (requires a dependency)
//   - Firestore increment-based counters (serverless, but adds latency)
// For a portfolio site the single-instance limiter is the right trade-off.
const authRateLimiter = routeRateLimiters.auth;

function sendJson(response, statusCode, payload) {
  applySecurityHeaders(response);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendRaw(response, statusCode, body, contentType) {
  applySecurityHeaders(response);
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}


function readTextBody(request, limitBytes = FORM_BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesRead = 0;
    request.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > limitBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (bytesRead <= limitBytes) resolve(body);
    });
    request.on('error', reject);
  });
}

function sendHtml(response, statusCode, body) {
  applySecurityHeaders(response);
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function contactResponsePage(title, message, statusCode = 200) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1.25rem;line-height:1.6;color:#111827;background:#faf9f6}a{color:inherit}</style></head><body><p><a href="/contact/">← Contact</a></p><h1>${title}</h1><p>${message}</p></body></html>`;
}

async function handleContactRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  let rawBody;
  try {
    rawBody = await readTextBody(request);
  } catch (err) {
    sendHtml(response, err.statusCode || 400, contactResponsePage('Message not sent', err.message, err.statusCode || 400));
    return;
  }

  const contentType = request.headers['content-type'] || '';
  const params = contentType.includes('application/x-www-form-urlencoded')
    ? new URLSearchParams(rawBody)
    : new URLSearchParams();
  const name = String(params.get('name') || '').trim().slice(0, 120);
  const email = String(params.get('email') || '').trim().slice(0, 200);
  const message = String(params.get('message') || '').trim().slice(0, 5000);

  if (!name || !email || !message || !email.includes('@') || message.length < 20) {
    sendHtml(response, 400, contactResponsePage('Message not sent', 'Please include your name, a valid email, and a message with at least 20 characters.', 400));
    return;
  }

  const { apiKey: resendApiKey, toEmail, fromEmail: configuredFromEmail } = resolveProvider('resend', process.env);
  const fromEmail = configuredFromEmail || 'Portfolio Contact <onboarding@resend.dev>';
  if (!resendApiKey || !toEmail) {
    sendHtml(response, 503, contactResponsePage('Contact form is not configured yet', 'The backend route is live, but RESEND_API_KEY and CONTACT_TO_EMAIL must be set before it can deliver messages.', 503));
    return;
  }

  const upstream = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: `Portfolio contact from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!upstream.ok) {
    sendHtml(response, 502, contactResponsePage('Message not sent', 'The mail provider did not accept the message. Please try again later.', 502));
    return;
  }

  sendHtml(response, 200, contactResponsePage('Message sent', 'Thanks. I have your note and enough context to reply.', 200));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesRead = 0;
    request.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > JSON_BODY_LIMIT_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (bytesRead > JSON_BODY_LIMIT_BYTES) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON request body.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function findAppForPath(pathname) {
  return appsByPathLength.find((app) => pathname === app.path.slice(0, -1) || pathname.startsWith(app.path));
}

async function handleApi(request, response, pathname, searchParams) {
  const ip = clientIp(request);

  if (pathname === '/healthz' || pathname === '/api/healthz') {
    sendJson(response, 200, { ok: true, apps: publicApps.map((app) => app.name) });
    return;
  }

  if (pathname === '/api/apps') {
    sendJson(response, 200, { apps: publicApps });
    return;
  }

  // /api/photo-proxy is a compatibility alias for /api/strava/photo: the
  // strava-explorer client (and its standalone Cloud Run broker in
  // demos/strava-explorer/server/) both speak /api/photo-proxy, so the gateway
  // accepts both without requiring a client change.
  const isPhotoRoute = pathname === '/api/strava/photo' || pathname === '/api/photo-proxy';
  const isStravaRoute = pathname.startsWith('/api/strava/') || isPhotoRoute;
  const policyName = rateLimitPolicyForPath(pathname);
  if (policyName && !routeRateLimiters[policyName].check(`${policyName}:${ip}`)) {
    response.setHeader('Retry-After', String(Math.ceil(RATE_LIMIT_POLICIES[policyName].windowMs / 1000)));
    sendJson(response, 429, { error: 'Too many requests. Please try again later.' });
    return;
  }

  if (pathname === '/api/contact') {
    await handleContactRequest(request, response);
    return;
  }

  if (isStravaRoute) {
    const normalizedPathname = pathname === '/api/photo-proxy' ? '/api/strava/photo' : pathname;
    let body = {};
    if (request.method === 'POST') {
      try {
        body = await readJsonBody(request);
      } catch (err) {
        sendJson(response, err.statusCode || 400, { error: err.message });
        return;
      }
    }
    const result = await handleStravaApi({
      pathname: normalizedPathname,
      method: request.method,
      body,
      authHeader: request.headers.authorization,
      searchParams,
    });
    if (result.binary) {
      applySecurityHeaders(response);
      response.writeHead(200, {
        'Content-Type': result.binary.contentType,
        'Content-Length': result.binary.body.byteLength,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Security-Policy': 'sandbox',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      response.end(Buffer.from(result.binary.body));
      return;
    }
    sendJson(response, result.statusCode, result.json);
    return;
  }

  if (pathname === '/api/isochrones') {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }
    let body;
    try {
      body = await readJsonBody(request);
    } catch (err) {
      sendJson(response, err.statusCode || 400, { error: err.message });
      return;
    }
    const result = await handleIsochronesApi(body);
    if (result.rawJson !== undefined) {
      sendRaw(response, result.statusCode, result.rawJson, result.contentType);
      return;
    }
    sendJson(response, result.statusCode, result.json);
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
}

const server = createServer(async (request, response) => {
  let requestUrl;
  try {
    requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  } catch {
    sendJson(response, 400, { error: 'Bad request URL.' });
    return;
  }

  const { pathname, searchParams } = requestUrl;

  try {
    if (pathname === '/healthz' || pathname.startsWith('/api/')) {
      await handleApi(request, response, pathname, searchParams);
      return;
    }

    // Private-demo auth POST: /<app-path>__auth
    // Handled before the GET/HEAD method gate so that form submissions work.
    if (request.method === 'POST' && pathname.endsWith('__auth')) {
      const appPath = pathname.slice(0, -'__auth'.length);
      const app = findAppForPath(appPath);
      if (app && appVisibility(app) === 'private') {
        const ip = clientIp(request);
        await handleAuthRequest(request, response, app, process.env, applySecurityHeaders, authRateLimiter, ip);
        return;
      }
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    // The portfolio used to be mounted at /portfolio/; it now lives at the
    // root. Permanently redirect old links (search results, LinkedIn posts)
    // to the same page at the root path.
    if (pathname === '/portfolio' || pathname.startsWith('/portfolio/')) {
      applySecurityHeaders(response);
      // Collapse leading slashes so /portfolio//host can't become a
      // protocol-relative ("//host") open redirect.
      const target = pathname.slice('/portfolio'.length).replace(/^\/+/, '/') || '/';
      response.writeHead(308, { Location: target + requestUrl.search });
      response.end();
      return;
    }

    const app = findAppForPath(pathname);
    if (app) {
      // Redirect the trailing-slash-less form (`/aqi-map`) to the canonical
      // directory URL (`/aqi-map/`). Apps use root-relative or
      // directory-relative asset URLs that assume they're served from
      // their own "directory"; without the slash the browser resolves
      // `./bundle.js` against `/` instead of `/aqi-map/` and 404s.
      if (pathname === app.path.slice(0, -1)) {
        applySecurityHeaders(response);
        response.writeHead(308, { Location: app.path + requestUrl.search });
        response.end();
        return;
      }

      // ── Private-demo auth gate ──────────────────────────────────
      // Authorization MUST be checked before serveFromDir so that
      // static assets are never leaked to unauthenticated visitors.
      if (appVisibility(app) === 'private') {
        const secret = process.env[app.auth.envVar];
        if (!secret) {
          // Password env var not configured — refuse to serve.
          applySecurityHeaders(response);
          response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('This demo is not currently available.');
          return;
        }
        if (!verifyAuthCookie(request, app.name, secret)) {
          applySecurityHeaders(response);
          response.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end(loginPageHtml(app));
          return;
        }
      }

      if (!app.available) {
        applySecurityHeaders(response);
        response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(`${app.name} is not built. Run scripts/build-local.mjs first.`);
        return;
      }

      const subPath = pathname.slice(app.path.length - 1);
      if (serveFromDir(app.dir, subPath, response)) return;
      applySecurityHeaders(response);
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found.');
      return;
    }

    applySecurityHeaders(response);
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found.');
  } catch (error) {
    console.error('Unhandled gateway error:', error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'Internal server error' });
    } else {
      response.end();
    }
  }
});

// Never start listening under the node:test runner: a listening socket keeps
// the process alive after the tests pass, which hangs `node --test` (and hung
// CI for up to 6 hours per run before this guard). NODE_TEST_CONTEXT is set
// by the test runner itself, so this holds even when NODE_ENV is forgotten.
if (process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  server.listen(PORT, () => {
    console.log(`Ryan Baumann portfolio gateway listening on :${PORT}`);
    console.log(`Apps: ${publicApps.map((app) => `${app.name}${app.available ? '' : ' (unbuilt)'}`).join(', ') || '(none found in apps.json)'}`);
  });
}

export { server, apps, publicApps, appsByPathLength, authRateLimiter, routeRateLimiters };
