# Trails Ninja Geospatial Apps

This repository contains two small, static-friendly geospatial web apps plus repo-local agent skills for Google Maps Platform, environmental data, and frontend UX work.

## Apps

### `strava-explorer/`

Vite app for connecting to Strava, selecting recent activities, and exploring routes in Google Maps Platform Photorealistic 3D.

Current focus areas:

- Google Maps JavaScript API `weekly` channel with `maps3d`, 3D route polylines, 3D endpoint markers, 3D photo markers, popovers, Elevation, Geometry, and Core libraries.
- Strava OAuth and activity/photo/stream data fetched in the browser, with a documented Cloud Run broker path for production OAuth token exchange.
- Follow-camera flythrough UX with route/elevation pre-sampling, terrain-aware mesh clearance, multi-lookahead bearing smoothing, yaw-rate limiting, and user-adjustable pace/view controls.
- Interactive photo billboards implemented as `Marker3DInteractiveElement` content. Custom 3D marker content must be wrapped in an `HTMLTemplateElement` or use `PinElement`; raw DOM nodes will trigger Maps 3D slot validation warnings.

Common commands:

```bash
cd strava-explorer
npm install
npm run dev -- --host 0.0.0.0
npm run build
npm test
```

### `aqi-map/`

Browserify/Budo app for a Mapbox GL + PurpleAir hyperlocal AQI map.

Current focus areas:

- CommonJS `index.js` entry bundled with Browserify/esmify.
- Mapbox GL map, geocoder, sensor points, popups, and D3/Turf AQI contour rendering.
- Runtime configuration through browser-exposed `window.AQI_MAP_CONFIG`; never commit real Mapbox or PurpleAir credentials.
- Future migration guidance lives in repo-local Google Maps Platform 2D and Environment API skills.

Common commands:

```bash
cd aqi-map
npm install
npm start
npm run build
npm test
```

## Repo workflow

- Read the app-specific `README.md`, `AGENTS.md`, and `package.json` before editing an app.
- Run commands from the app directory you modify; there is no root-level app package.
- Prefer small, reviewable, app-scoped changes.
- Use `rg`/`find` for discovery; avoid `ls -R` and recursive `grep`.
- Never commit real API keys, OAuth secrets, access tokens, generated `.env.*` files, or private user/location logs.
- For visible map or UI changes, run the relevant build and do browser/screenshot QA when credentials and environment allow it; otherwise document the limitation.

## Local skills

Durable implementation guidance lives under `.codex/skills/`:

- `google-maps-platform` for broad Maps Platform loading, security, quota, and runtime behavior.
- `google-maps-js-3d` for `strava-explorer` 3D Maps, camera, markers, popovers, altitude, and route flythroughs.
- `google-maps-js-2d` for 2D Google Maps JavaScript API work and Mapbox-to-Google migration planning.
- `google-maps-environment-apis` for Air Quality, Pollen, Solar, Weather, heatmap tiles, attribution, quota, and PurpleAir migration work.
- `frontend-responsive-design` for responsive layout, accessibility, Tailwind/HTML structure, and visual QA.
