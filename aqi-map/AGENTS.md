# AGENTS.md — aqi-map

## App scope

This directory contains the AQI map web app. It is currently a Browserify/Budo app with CommonJS source in `index.js`, static HTML in `index.html`, and production output in `build/`.

## Agent workflow

1. Read `package.json`, this file, `index.html`, and `index.js` before changing the app.
2. Keep changes small and reviewable. Avoid broad rewrites unless the task is explicitly a migration.
3. Preserve the CommonJS/Browserify pipeline unless the task explicitly migrates build tooling.
4. Use `rg`/`find` for discovery; do not use recursive `grep` or `ls -R`.
5. Run the narrowest relevant check first, then `npm run build` when practical.
6. If a perceptible UI/map change is made, run or document a browser/screenshot check when the environment allows it.

## Runtime and data sources

- The current runtime is a browser bundle built from `index.js` by Browserify with `esmify`.
- The app currently uses Mapbox GL JS, Mapbox Geocoder, D3 tricontours, Turf helpers, and PurpleAir sensor data.
- Do not commit real API keys, access tokens, refresh tokens, private sensor tokens, generated `.env.*` files, or user location logs.
- Existing committed public tokens should not be copied into new docs or new code. Prefer future work that moves tokens to documented environment variables or a small proxy where appropriate.

## Mapping guidance

- Keep geospatial names explicit: `lat`, `lng`, `longitude`, `latitude`, `bounds`, `coordinates`, `featureCollection`, `contours`, and `heatmapTiles`.
- Validate latitude/longitude ranges before rendering or sending data to APIs.
- Bound external requests by viewport, zoom, cache, or debounce logic.
- Keep attribution visible for map and environmental data providers.
- Keep `aqi-map/` separate from Strava Explorer 3D patterns unless the task explicitly calls for a migration; do not import Vite, `maps3d`, or Strava-specific camera code into this app.
- For Google Maps Platform work, use the repo-local skills:
  - `../.codex/skills/google-maps-platform/SKILL.md` for broad platform/security/quota guidance.
  - `../.codex/skills/google-maps-js-2d/SKILL.md` for Maps JavaScript API 2D maps, Advanced Markers, overlays, and Mapbox-to-Google migration work.
  - `../.codex/skills/google-maps-environment-apis/SKILL.md` for Air Quality, Pollen, Solar, Weather, and environmental tile overlays.

## Validation commands

Run commands from `aqi-map/`:

- `npm run build` — production Browserify bundle.
- `npm start` — local dev server for manual/browser QA.

## Pull request notes

- Summarize changed behavior and cite touched files.
- List every validation command run.
- Call out untested browser/API behavior, required environment variables, credentials, API restrictions, and quota implications.
