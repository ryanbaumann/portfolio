// gateway/lib/purpleair.js
//
// Server-side PurpleAir sensor proxy. aqi-map/index.js used to call
// https://map.purpleair.com/v1/sensors directly from the browser with the
// API key in the query string; this moves the key server-side and adds a
// short in-memory cache to protect PurpleAir's quota.

const PURPLEAIR_ENDPOINT = 'https://map.purpleair.com/v1/sensors';
const CACHE_TTL_MS = 60_000;
// Distinct query-param combos are rare in practice (aqi-map issues one
// fixed query), but bound the cache anyway so an unbounded set of
// `max_age`/bounding-box combos can't grow memory forever.
const CACHE_MAX_ENTRIES = 50;

// Only pass through params the client actually needs (aqi-map/index.js uses
// `fields` + `max_age` today; the bounding-box params are accepted too in
// case a future map view wants a windowed query).
const ALLOWED_PARAMS = new Set(['fields', 'max_age', 'nwlng', 'nwlat', 'selng', 'selat', 'location_type']);

const cache = new Map();

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.storedAt >= CACHE_TTL_MS) cache.delete(key);
  }
  while (cache.size >= CACHE_MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the oldest.
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export function isPurpleAirConfigured(env = process.env) {
  return Boolean(env.PURPLEAIR_API_KEY);
}

function buildUpstreamUrl(searchParams, apiKey) {
  const url = new URL(PURPLEAIR_ENDPOINT);
  for (const [key, value] of searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) url.searchParams.set(key, value);
  }
  if (!url.searchParams.has('fields')) {
    url.searchParams.set('fields', 'name,latitude,longitude,confidence,pm2.5_10minute,humidity');
  }
  url.searchParams.set('token', apiKey);
  return url;
}

function cacheKey(searchParams) {
  const parts = [];
  for (const key of [...ALLOWED_PARAMS].sort()) {
    if (searchParams.has(key)) parts.push(`${key}=${searchParams.get(key)}`);
  }
  return parts.join('&');
}

export async function handlePurpleAirApi(searchParams, { fetch = globalThis.fetch, env = process.env } = {}) {
  const apiKey = env.PURPLEAIR_API_KEY;
  if (!apiKey) {
    return { statusCode: 503, json: { error: 'PurpleAir proxy is not configured on this server (set PURPLEAIR_API_KEY).' } };
  }

  const key = cacheKey(searchParams);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return { statusCode: 200, json: cached.data, cached: true };
  }

  const upstreamUrl = buildUpstreamUrl(searchParams, apiKey);
  let upstream;
  try {
    upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(10000) });
  } catch (error) {
    console.error('PurpleAir upstream fetch error:', error);
    const statusCode = error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : 502;
    return { statusCode, json: { error: 'Failed to connect to PurpleAir.' } };
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    console.error(`PurpleAir upstream returned ${upstream.status}`);
    return { statusCode: upstream.status === 429 ? 429 : 502, json: { error: 'PurpleAir request failed.' } };
  }

  pruneCache();
  cache.set(key, { data, storedAt: Date.now() });
  return { statusCode: 200, json: data, cached: false };
}
