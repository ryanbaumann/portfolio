# AGENTS.md

## Project Overview

This repository contains two small geospatial web apps:

- `strava-explorer/`: Vite app for exploring Strava activities on Google Maps Platform 3D Maps.
- `aqi-map/`: Browserify/Budo app for a Mapbox GL + PurpleAir hyperlocal AQI map.

Prefer small, reviewable changes. Keep app-specific code, commands, and dependencies inside the app directory you are modifying.

## Agent Workflow

1. Start by reading the relevant `package.json`, README, and the files you plan to change.
2. Use `rg`/`find` for discovery; do not use `ls -R` or `grep -R`.
3. Keep implementation details in source files and durable task workflows in local skills under `.codex/skills/`.
4. Before editing secrets, auth flows, map API usage, or build config, identify the affected runtime and required environment variables.
5. After changes, run the narrowest relevant validation command first, then a full app build when practical.

## Commands

Run commands from the app directory unless noted.

### `strava-explorer/`

- Install: `yarn install` or `npm install`.
- Dev server: `yarn dev` or `npm run dev`.
- Production build: `yarn build` or `npm run build`.
- Preview build: `yarn preview` or `npm run preview`.

### `aqi-map/`

- Install: `yarn install` or `npm install`.
- Dev server: `yarn start` or `npm start`.
- Production build: `yarn build` or `npm run build`.

## Environment Variables and Secrets

- Never commit real API keys, OAuth client secrets, access tokens, refresh tokens, or generated `.env.*` files.
- `strava-explorer` expects Google Maps Platform and Strava configuration through Vite `import.meta.env` variables. Preserve the `VITE_` prefix for browser-exposed variables.
- If you encounter hard-coded credentials or tokens, prefer moving them to documented environment variables and note required API restrictions in the PR.
- For Google Maps Platform browser keys, document required API restrictions, HTTP referrer restrictions, billing/quota expectations, and local development origins.

## Code Style

- Use modern JavaScript modules in `strava-explorer/src/`; preserve the existing no-framework Vite architecture unless explicitly asked to migrate.
- Keep `aqi-map/index.js` compatible with its current CommonJS/Browserify pipeline unless migrating the build system is the task.
- Use descriptive names for geospatial values: `lat`, `lng`, `altitude`, `bounds`, `coordinates`, `polyline`, `featureCollection`.
- Avoid broad rewrites, hidden formatting churn, and unrelated dependency upgrades.
- Do not add `try`/`catch` blocks around imports.

## Mapping and Geospatial Guidelines

- Prefer official SDK/library APIs over hand-rolled loaders.
- In Google Maps Platform work, prefer `google.maps.importLibrary()` after the API loader has resolved.
- Prefer Advanced Markers or the app's current 3D marker elements over legacy `google.maps.Marker` in new Google Maps code.
- Keep map container CSS isolated so global styles and utility frameworks do not accidentally override map internals.
- Validate latitude/longitude ranges before rendering or sending geospatial data to APIs.
- Batch API calls with documented limits and graceful fallback behavior.

## Frontend and UX Guidelines

- Design mobile-first, then add larger-layout enhancements.
- Prefer resilient CSS: fluid sizing with `clamp()`, component-level responsiveness with container queries where useful, and viewport media queries for major page-shell changes.
- Keep controls keyboard-accessible and screen-reader-friendly with explicit labels, useful `alt` text, focus styles, and semantic elements.
- Respect reduced-motion preferences for camera, map, and UI animation work.
- If a perceptible web UI change is made, run or document a browser/screenshot check when the environment allows it.

## Local Skills

Use these repo-local skills when the task matches their scope:

- `.codex/skills/google-maps-platform/SKILL.md` for broad Google Maps Platform, key-security, quota, Places, Routes, and general Maps JavaScript API work.
- `.codex/skills/google-maps-js-3d/SKILL.md` for focused Maps JavaScript API 3D Maps work: `Map3DElement`, `maps3d`, 3D markers, popovers, altitude, drawing, and camera behavior.
- `.codex/skills/frontend-responsive-design/SKILL.md` for responsive layout, accessibility, CSS architecture, Tailwind utility usage, and visual QA work.

## Pull Request Expectations

- Summarize changed behavior and cite touched files.
- List every validation command run and whether it passed, failed, or was limited by environment.
- Call out any untested browser/API behavior, required environment variables, or migration follow-ups.
