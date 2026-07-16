import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const GOOGLE_AUTH_COOKIE = '__Host-writer-auth';
const STATE_COOKIE = '__Host-writer-state';
const TTL_SECONDS = 60 * 60 * 8;

function sign(value, secret) { return createHmac('sha256', secret).update(value).digest('hex'); }
function equal(a, b) {
  const left = Buffer.from(a || ''); const right = Buffer.from(b || '');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}
function cookie(response, name, value, maxAge) {
  response.setHeader('Set-Cookie', `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}
function readCookie(request, name) {
  return Object.fromEntries(String(request.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('='); return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }))[name];
}

export function googleAuthConfigured(env = process.env) {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_SESSION_SECRET);
}

export function beginGoogleLogin(request, response, env = process.env) {
  if (!googleAuthConfigured(env)) throw Object.assign(new Error('Google sign-in is not configured.'), { statusCode: 503 });
  const origin = env.WRITER_PUBLIC_ORIGIN;
  if (!/^https:\/\/[^/?#]+$/.test(origin || '')) throw Object.assign(new Error('WRITER_PUBLIC_ORIGIN must be an HTTPS origin.'), { statusCode: 503 });
  const state = randomBytes(24).toString('base64url');
  cookie(response, STATE_COOKIE, `${state}.${sign(state, env.GOOGLE_OAUTH_SESSION_SECRET)}`, 600);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: env.GOOGLE_OAUTH_CLIENT_ID, redirect_uri: `${origin}/auth/google/callback`, response_type: 'code', scope: 'openid email', state, prompt: 'select_account' });
  return url.toString();
}

export async function finishGoogleLogin(request, response, searchParams, env = process.env, fetchImpl = fetch) {
  if (!googleAuthConfigured(env)) throw Object.assign(new Error('Google sign-in is not configured.'), { statusCode: 503 });
  const state = String(searchParams.get('state') || '');
  const stored = readCookie(request, STATE_COOKIE) || '';
  const [storedState, storedSignature] = stored.split('.');
  if (!equal(state, storedState) || !equal(storedSignature, sign(storedState, env.GOOGLE_OAUTH_SESSION_SECRET))) throw Object.assign(new Error('Google sign-in state expired. Try again.'), { statusCode: 401 });
  const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: String(searchParams.get('code') || ''), client_id: env.GOOGLE_OAUTH_CLIENT_ID, client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET, redirect_uri: `${env.WRITER_PUBLIC_ORIGIN}/auth/google/callback`, grant_type: 'authorization_code' }), signal: AbortSignal.timeout(10_000) });
  if (!tokenResponse.ok) throw Object.assign(new Error('Google did not accept the sign-in response.'), { statusCode: 401 });
  const token = await tokenResponse.json();
  // tokeninfo verifies Google's signed ID token before we inspect its claims.
  // Do not decode an ID token and trust its JSON payload without this check.
  const claimsResponse = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(token.id_token || ''))}`, { signal: AbortSignal.timeout(10_000) });
  if (!claimsResponse.ok) throw Object.assign(new Error('Google could not verify the sign-in token.'), { statusCode: 401 });
  const payload = await claimsResponse.json();
  const allowedEmail = env.GOOGLE_OAUTH_ALLOWED_EMAIL || 'rsbaumann@gmail.com';
  if (!payload.email_verified || payload.email !== allowedEmail || payload.aud !== env.GOOGLE_OAUTH_CLIENT_ID || payload.iss !== 'https://accounts.google.com' || Number(payload.exp) <= Date.now() / 1000) throw Object.assign(new Error('This Google account is not allowed to access the dashboard.'), { statusCode: 403 });
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const session = `${payload.email}:${expires}:${randomBytes(16).toString('hex')}`;
  cookie(response, GOOGLE_AUTH_COOKIE, `${session}:${sign(session, env.GOOGLE_OAUTH_SESSION_SECRET)}`, TTL_SECONDS);
  response.setHeader('Set-Cookie', [`${GOOGLE_AUTH_COOKIE}=${session}:${sign(session, env.GOOGLE_OAUTH_SESSION_SECRET)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL_SECONDS}`, `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`]);
}

export function hasGoogleSession(request, env = process.env) {
  const raw = readCookie(request, GOOGLE_AUTH_COOKIE) || ''; const parts = raw.split(':');
  if (parts.length !== 4 || !env.GOOGLE_OAUTH_SESSION_SECRET) return false;
  const [email, expires, nonce, signature] = parts; const payload = `${email}:${expires}:${nonce}`;
  return email === (env.GOOGLE_OAUTH_ALLOWED_EMAIL || 'rsbaumann@gmail.com') && Number(expires) > Date.now() / 1000 && /^[a-f0-9]{32}$/.test(nonce) && equal(signature, sign(payload, env.GOOGLE_OAUTH_SESSION_SECRET));
}

export function googleLoginPage(error = '') { return `<!doctype html><title>Dashboard sign in</title><main><h1>Dashboard</h1><p>Sign in with the approved Google account to review private releases.</p>${error ? `<p role="alert">${error}</p>` : ''}<p><a href="/auth/google">Continue with Google</a></p></main>`; }
