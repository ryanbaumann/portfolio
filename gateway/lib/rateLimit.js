// gateway/lib/rateLimit.js
//
// Simple in-memory sliding-window-ish (fixed window) per-key rate limiter,
// same shape as the one used in demos/strava-explorer/server/server.js. Good
// enough for a single-instance Cloud Run service; not shared across
// replicas, which is an accepted tradeoff for a portfolio demo.

export function createRateLimiter({ windowMs = 60_000, max = 30 } = {}) {
  const hits = new Map();

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.windowStart > windowMs) hits.delete(key);
    }
  }, windowMs);
  interval.unref?.();

  function check(key) {
    const now = Date.now();
    const record = hits.get(key);
    if (!record || now - record.windowStart > windowMs) {
      hits.set(key, { windowStart: now, count: 1 });
      return true;
    }
    record.count += 1;
    return record.count <= max;
  }

  function stop() {
    clearInterval(interval);
  }

  return { check, stop };
}

export function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const chain = String(forwarded).split(',').map((part) => part.trim()).filter(Boolean);
    // Cloud Run's trusted frontend appends the connecting client and proxy
    // addresses to any caller-supplied prefix. Use the address immediately
    // before the trusted proxy, never the spoofable first entry. A lone XFF
    // value is untrusted, so fall back to the socket address.
    if (chain.length >= 2) return chain.at(-2);
  }
  return request.socket?.remoteAddress || 'unknown';
}

export const RATE_LIMIT_POLICIES = Object.freeze({
  auth: Object.freeze({ windowMs: 60_000, max: 5 }),
  contact: Object.freeze({ windowMs: 60_000, max: 5 }),
  subscribe: Object.freeze({ windowMs: 60_000, max: 5 }),
  writer: Object.freeze({ windowMs: 60_000, max: 5 }),
  oauth: Object.freeze({ windowMs: 60_000, max: 20 }),
  isochrones: Object.freeze({ windowMs: 60_000, max: 30 }),
  photo: Object.freeze({ windowMs: 60_000, max: 120 }),
});

export function rateLimitPolicyForPath(pathname) {
  if (pathname === '/api/contact') return 'contact';
  if (pathname === '/api/subscribe') return 'subscribe';
  if (pathname === '/api/writer/publish') return 'writer';
  if (pathname === '/api/isochrones') return 'isochrones';
  if (pathname === '/api/photo-proxy' || pathname === '/api/strava/photo') return 'photo';
  if (pathname.startsWith('/api/strava/')) return 'oauth';
  return null;
}
