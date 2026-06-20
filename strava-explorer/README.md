# Strava Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

A focused map application for connecting Strava, selecting recent activities, and exploring routes in Google Maps Platform Photorealistic 3D. The app syncs route rendering, endpoint markers, activity photos, elevation, and camera controls so a route can be reviewed like a short 3D flythrough.

## Features

* Secure Strava OAuth2 authentication.
* Fetches, filters, and auto-selects Strava activities.
* Renders activities as terrain-clamped 3D polylines on Google Maps Platform.
* Shows 3D start/finish markers and interactive photo markers with map-anchored popovers.
* Provides route camera shortcuts: fit route, fly to start, fly to finish, orbit the current 3D view, and animated follow-camera tours.
* Respects reduced-motion preferences for camera shortcuts and UI motion.
* Displays activity stats and an imperial elevation profile.

## Tech Stack

* **Frontend:** Vanilla JavaScript, HTML, Tailwind via CDN
* **Build Tool:** Vite
* **Mapping:** Google Maps Platform Maps JavaScript API `alpha` channel, `maps3d`, Photorealistic 3D Tiles, Elevation, Geometry
* **API:** Strava V3 API

## Local Development Setup

1. **Clone the repository and open the app:**
    ```bash
    git clone <repository-url>
    cd trails.ninja/strava-explorer
    ```

2. **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3. **Configure environment variables:**
    Create `.env.development` in `strava-explorer/` and add:
    ```dotenv
    # Strava API credentials (https://www.strava.com/settings/api)
    VITE_STRAVA_CLIENT_ID=YOUR_STRAVA_CLIENT_ID
    VITE_STRAVA_CLIENT_SECRET=YOUR_STRAVA_CLIENT_SECRET
    VITE_STRAVA_REDIRECT_URI=http://localhost:5173/

    # Google Maps Platform browser key
    VITE_GMP_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
    ```

    Never commit `.env.*` files. The root `.gitignore` should continue to ignore local environment files.

4. **Configure Strava API application:**
    * Open <https://www.strava.com/settings/api>.
    * Set **Authorization Callback Domain** to `localhost` for local development.
    * Add the local redirect URI you used above, typically `http://localhost:5173/`.

5. **Configure Google Maps Platform:**
    * Enable **Maps JavaScript API**, **Map Tiles API / Photorealistic 3D Tiles**, and **Elevation API** for the project that owns `VITE_GMP_API_KEY`.
    * Restrict the browser key by HTTP referrer. Include local origins such as `http://localhost:5173/*` and your production origin.
    * Restrict the key to only the required APIs above.
    * Keep billing and quota alerts enabled. Elevation lookups are batched for photos and precomputed for follow-camera samples, but they still consume Elevation API quota.

6. **Run locally:**
    ```bash
    npm run dev -- --host 0.0.0.0
    # or
    yarn dev --host 0.0.0.0
    ```
    Open the Vite URL printed in the terminal, connect Strava, then choose an activity. Use the camera buttons in the activity panel to inspect the route or start the follow-camera tour.

## Production Build

```bash
npm run build
# or
# yarn build
```

Vite writes production assets to `strava-explorer/dist/` by default.

## Manual QA Checklist

After changing 3D map or UI behavior, validate at least:

1. App loads with a valid Google Maps key and shows the 3D globe.
2. Strava connect redirects to the configured callback and returns to the app.
3. Activity filters fetch activities and the first activity auto-loads.
4. Route polyline, start/finish markers, elevation profile, and stats appear.
5. `Fit route`, `Fly start`, `Fly finish`, `Orbit 3D`, and `Follow Camera` all move the same selected route.
6. Photo markers open one popover at a time and do not expose access tokens in request URLs.
7. Mobile layout avoids horizontal scrolling and leaves the map usable behind the bottom sheet.
8. With `prefers-reduced-motion: reduce`, camera shortcuts avoid long cinematic movement.

## Deployment

Deploy the static assets generated in `strava-explorer/dist/` to your preferred static host. Configure production `VITE_` variables at build time, update Strava redirect URIs for the production domain, and add production HTTP referrer restrictions to the Google Maps browser key.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome. Please keep changes small, app-scoped, and validated with the narrowest relevant command plus a production build when practical.
