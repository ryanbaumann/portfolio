// gateway/lib/rateLimit.js
//
// Simple in-memory sliding-window-ish (fixed window) per-key rate limiter,
// same shape as the one used in strava-explorer/server/server.js. Good
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
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return request.socket?.remoteAddress || 'unknown';
}
