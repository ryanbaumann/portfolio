# Strava Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A focused static web app for connecting Strava, selecting recent activities, and exploring routes in Google Maps Platform Photorealistic 3D. The app syncs route rendering, endpoint markers, activity photos, elevation, stats, and camera controls so a route can be reviewed like a short 3D flythrough.

## Features

- Strava OAuth2 connection for recent activities.
- Activity filtering and first-activity auto-selection.
- Terrain-clamped Google Maps JavaScript 3D route polylines.
- 3D start/finish markers plus interactive photo markers with map-anchored popovers.
- Camera shortcuts for fit route, fly to start, fly to finish, orbit, and follow-camera tours.
- Reduced-motion-aware map and UI animation behavior.
- Activity stats and an imperial elevation profile.

## Tech stack

- Vanilla JavaScript modules, HTML, and Tailwind CDN utilities.
- Vite for local development and production bundling.
- Google Maps Platform Maps JavaScript API `alpha` channel with `maps3d`, `marker`, `elevation`, `geometry`, and `core` libraries.
- Strava V3 API.

## Prerequisites

- Node.js 20 or newer.
- npm, or Yarn if you prefer matching the existing lockfile workflow.
- A Strava API application.
- A Google Maps Platform project with billing enabled.

## Environment variables

Create `strava-explorer/.env.development` for local development and configure equivalent variables in your deployment provider for production builds:

```dotenv
VITE_STRAVA_CLIENT_ID=YOUR_STRAVA_CLIENT_ID
VITE_STRAVA_CLIENT_SECRET=YOUR_STRAVA_CLIENT_SECRET
VITE_STRAVA_REDIRECT_URI=http://localhost:5173/
VITE_GMP_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY
```

Never commit `.env.*` files. All `VITE_` variables are browser-exposed after build, so restrict the Google Maps browser key by API and HTTP referrer and treat the Strava browser OAuth flow accordingly.

## Service setup

### Strava

1. Open <https://www.strava.com/settings/api>.
2. Set the local authorization callback domain to `localhost`.
3. Add the local redirect URI used by `VITE_STRAVA_REDIRECT_URI`, typically `http://localhost:5173/`.
4. Add the production callback domain and redirect URI before deploying.

### Google Maps Platform

Enable the APIs needed by the current app runtime:

- Maps JavaScript API with the `alpha` channel for 3D Maps.
- Map Tiles API / Photorealistic 3D Tiles.
- Elevation API.

Recommended browser-key restrictions:

- API restrictions limited to the required APIs above.
- HTTP referrer restrictions for local origins such as `http://localhost:5173/*` plus the production origin.
- Billing budgets, quota alerts, and monitoring for Elevation API usage. Elevation lookups are batched, but photo markers and follow-camera samples can still consume quota.

## Install

```bash
cd strava-explorer
npm install
# or: yarn install
```

## Run locally

```bash
npm run dev -- --host 0.0.0.0
# or: yarn dev --host 0.0.0.0
```

Open the Vite URL printed in the terminal, connect Strava, select an activity, and use the camera controls in the activity panel.

## Build

```bash
npm run build
# or: yarn build
```

Vite writes static production assets to `dist/`.

## Preview the production build

```bash
npm run preview -- --host 0.0.0.0
# or: yarn preview --host 0.0.0.0
```

## Test and validation

```bash
npm test
```

`npm test` currently runs the production build. For map, OAuth, camera, or responsive UI changes, also complete the manual browser checklist below with valid development credentials.

## Deploy

```bash
npm run deploy:static
```

Then upload `dist/` to a static host such as Netlify, Cloudflare Pages, GitHub Pages, or S3/CloudFront. Configure production `VITE_` variables at build time, update Strava production redirect URIs, and add production HTTP referrer restrictions to the Google Maps browser key before publishing.

## Manual QA checklist

1. App loads with a valid Google Maps browser key and shows the 3D globe.
2. Strava connect redirects to the configured callback and returns to the app.
3. Activity filters fetch activities and the first activity auto-loads.
4. Route polyline, start/finish markers, elevation profile, and stats appear.
5. `Fit route`, `Fly start`, `Fly finish`, `Orbit 3D`, and `Follow Camera` all move the same selected route.
6. Photo markers open one popover at a time and do not expose access tokens in committed source.
7. Mobile layout avoids horizontal scrolling and keeps the map usable behind the bottom sheet.
8. With `prefers-reduced-motion: reduce`, camera shortcuts avoid long cinematic movement.

## Contributing

Keep changes small, app-scoped, and validated with the narrowest relevant command plus a production build when practical.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
