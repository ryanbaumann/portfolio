// gateway/lib/config.js
//
// Deploy-time public config for client apps. These are values that are
// *meant* to ship to the browser (referrer-restricted Mapbox token, style
// URL) but shouldn't be hardcoded in committed source — they're injected
// at deploy time via Cloud Run env vars instead.

export function isAqiMapConfigured(env = process.env) {
  return Boolean(env.MAPBOX_PUBLIC_TOKEN && env.MAPBOX_STYLE_URL);
}

export function getAqiMapConfig(env = process.env) {
  if (!isAqiMapConfigured(env)) {
    return { statusCode: 503, json: { error: 'aqi-map is not configured on this server (set MAPBOX_PUBLIC_TOKEN and MAPBOX_STYLE_URL).' } };
  }
  return {
    statusCode: 200,
    json: {
      mapboxAccessToken: env.MAPBOX_PUBLIC_TOKEN,
      mapboxStyleUrl: env.MAPBOX_STYLE_URL,
    },
  };
}
