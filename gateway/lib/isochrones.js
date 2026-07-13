// gateway/lib/isochrones.js
//
// Ports the validation + upstream call from demos/isochrones/server.js so the
// gateway can serve POST /api/isochrones same-origin. Env var name matches
// demos/isochrones/server.js: GMP_SERVER_API_KEY. VITE_* values are deliberately
// excluded because they are browser-public build configuration.

import { resolveProvider } from './config.js';

const ISOCHRONES_ENDPOINT = 'https://isochrones.googleapis.com/v1/isochrones:generate';

export function validateIsochroneBody(body) {
  const latitude = Number(body?.location?.latitude);
  const longitude = Number(body?.location?.longitude);
  const seconds = Number.parseInt(String(body?.travelDuration || '').replace('s', ''), 10);
  const travelMode = String(body?.travelMode || '');
  const travelDirection = String(body?.travelDirection || '');
  const routingPreference = String(body?.routingPreference || '');
  const polygonFidelity = String(body?.polygonFidelity || 'MEDIUM');

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return 'Latitude must be between -90 and 90.';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return 'Longitude must be between -180 and 180.';
  if (!['DRIVE', 'BICYCLE', 'WALK'].includes(travelMode)) return 'Unsupported travel mode.';
  if (!['FROM', 'TO'].includes(travelDirection)) return 'Unsupported travel direction.';
  if (!['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE'].includes(routingPreference)) return 'Unsupported routing preference.';
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(polygonFidelity)) return 'Unsupported polygon fidelity.';
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 7200) return 'Travel duration must be between 1 and 7200 seconds.';
  if (travelMode === 'DRIVE' && seconds > 3600) return 'Drive mode is limited to 3600 seconds.';
  return null;
}

export function isIsochronesConfigured(env = process.env) {
  return Boolean(resolveProvider('isochrones', env).apiKey);
}

export async function handleIsochronesApi(body, { fetch = globalThis.fetch, env = process.env } = {}) {
  // Validate before checking configuration: a malformed request should
  // always come back as 400 regardless of whether the server happens to
  // have a key configured, so callers (and the smoke test) can rely on 400
  // meaning "fix your request" and 503 meaning "server isn't configured".
  const validationError = validateIsochroneBody(body);
  if (validationError) {
    return { statusCode: 400, json: { error: validationError } };
  }

  const { apiKey } = resolveProvider('isochrones', env);
  if (!apiKey) {
    return { statusCode: 503, json: { error: 'Isochrones proxy is not configured on this server (set GMP_SERVER_API_KEY).' } };
  }

  let upstream;
  try {
    upstream = await fetch(ISOCHRONES_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
        'x-goog-fieldmask': 'isochrone.geoJson',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error('Isochrones API connection error:', error);
    const statusCode = error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : 502;
    return { statusCode, json: { error: 'Failed to connect to Google Maps Isochrones API.' } };
  }

  let text;
  try {
    text = await upstream.text();
  } catch (error) {
    console.error('Failed to read response from Isochrones API:', error);
    return { statusCode: 502, json: { error: 'Invalid response from Google Maps Isochrones API.' } };
  }

  return {
    statusCode: upstream.status,
    rawJson: text,
    contentType: upstream.headers.get('content-type') || 'application/json',
  };
}
