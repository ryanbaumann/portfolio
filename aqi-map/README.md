# AQI Map

Browser-based hyperlocal AQI map that renders PurpleAir sensor data on a Mapbox GL globe with geocoder search, point markers, and interpolated AQI contours.

## Runtime configuration

This app is fully static, but it still needs browser-exposed public service credentials at runtime. Do **not** commit real tokens to this repository. Configure them in `index.html` before local use or inject the same `window.AQI_MAP_CONFIG` object with your static host:

```html
<script>
  window.AQI_MAP_CONFIG = {
    mapboxAccessToken: "YOUR_MAPBOX_PUBLIC_TOKEN",
    mapboxStyleUrl: "mapbox://styles/YOUR_ACCOUNT/YOUR_STYLE?optimize=true",
    purpleAirApiKey: "YOUR_PURPLEAIR_API_KEY",
    maxSensorAgeSeconds: 604800
  };
</script>
```

Best-practice restrictions:

- Use a Mapbox public token restricted to the production origin and local development origins that need access.
- Restrict the PurpleAir key according to the controls available for the account, rotate any key that has been committed or shared, and monitor API usage.
- Keep `maxSensorAgeSeconds` as low as product requirements allow to reduce stale readings.

## Prerequisites

- Node.js 20 or newer.
- npm, or Yarn if you prefer matching the existing lockfile workflow.

## Install

```bash
cd aqi-map
npm install
# or: yarn install
```

## Run locally

```bash
npm start
# or: yarn start
```

`budo` opens the app with live reload. Confirm `window.AQI_MAP_CONFIG` has development-safe values before loading the page.

## Build

```bash
npm run build
# or: yarn build
```

The production bundle is written to `build/`.

## Test and validation

```bash
npm test
```

`npm test` currently runs the production build. When map rendering or sensor-fetch behavior changes, also do a browser check with valid Mapbox and PurpleAir credentials.

## Deploy

```bash
npm run deploy:static
```

Then upload the contents of `build/` to a static host such as Netlify, Cloudflare Pages, GitHub Pages, or S3/CloudFront. Inject production `window.AQI_MAP_CONFIG` values before serving the app, and ensure the Mapbox token allows the production referrer.

## Manual QA checklist

1. App shows a clear missing-configuration message when any required config value is absent.
2. With valid config, Mapbox GL loads the configured style and geocoder.
3. PurpleAir sensor data loads without exposing credentials in source control.
4. Low-confidence sensors are excluded and latitude/longitude values are validated before rendering.
5. AQI contour fill, sensor points, and popup values match expected ranges.
6. The map remains usable on desktop and mobile viewport sizes.
