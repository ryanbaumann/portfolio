# trails.ninja — Geospatial Engineering Demos

Ryan Baumann's portfolio of lightweight, static-friendly geospatial web
apps — Strava routes in photorealistic 3D, hyperlocal air-quality mapping,
and reachability isochrones — served together behind one zero-dependency
Node gateway as a single Cloud Run container. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Projects

*   **[Strava 3D Explorer](strava-explorer/README.md)**: A Vite-powered web application to visualize Strava routes, endpoints, and photos in Google Maps Platform Photorealistic 3D with follow-camera animations.
*   **[Hyperlocal AQI Map](aqi-map/README.md)**: A Browserify-powered 2D Mapbox GL map that interpolates real-time PurpleAir sensor data to render local air quality index (AQI) contours.
*   **[Isochrones](isochrones/README.md)**: A Vite + Node Google Maps Platform demo for analyzing delivery, commute, and response reachability with selectable Isochrones API polygons.

## Quickstart: run the whole container locally

This builds every app and boots the same gateway that runs in production,
with no secrets required (proxy endpoints return a clear `503` instead of
crashing when a key is unset):

```bash
node scripts/build-local.mjs   # builds each app, stages apps/<name>/ like the Dockerfile does
node gateway/server.js         # or: npm start
```

Then open `http://localhost:8080/`. To exercise it end-to-end (route
liveness, asset resolution, OAuth URL shape, and a secret-leak scan over
every built file):

```bash
node scripts/smoke.mjs         # or: npm run smoke
```

## Working on a single app

Each app is still self-contained for day-to-day development — navigate to
its directory and follow its README:

```bash
# To run the Strava 3D Explorer
cd strava-explorer
npm install
npm run dev

# To run the Hyperlocal AQI Map
cd aqi-map
npm install
npm start

# To run the Isochrones Demo
cd isochrones
npm install
npm run dev
```

Each app's own dev server (Vite, budo) proxies or stands in for the
gateway's `/api/*` routes locally — see each app's README for details.
`AGENTS.md` has a full "Adding a new demo app" walkthrough for wiring a new
app into the gateway.

## Security Best Practices

*   **No Hardcoded Secrets**: Never commit API keys, client secrets, access tokens, or generated `.env.*` files. Use environment files locally (which are excluded via `.gitignore`).
*   **Key Restrictions**: Always restrict Google Maps and Mapbox browser keys by referrer (e.g., `http://localhost:5173/*` and your production domain) and limit their API scope to only the services required.
*   **Server-Side Proxy**: `gateway/` brokers every secret-bearing API call (Strava OAuth token exchange/refresh/deauthorize + photo proxy, Google Maps Isochrones, PurpleAir sensors) same-origin under `/api/*`, so unrestricted API secrets never reach the browser — only referrer-restricted public browser keys (Google Maps JS, Mapbox public token) ship in the client bundles, which is their designed use.

## Deploy

`.github/workflows/deploy.yml` builds the container image with Cloud Build
and deploys it to a single Cloud Run service (`trails-ninja`) on pushes to
`main`, authenticating via Workload Identity Federation. It replaces the
project's previous two-part deploy (a GCS bucket for the static frontend
plus a separate Cloud Run OAuth broker) — see the workflow file's header
comment for the one-time `gcloud run services update ... --update-secrets`
command that sets runtime secrets on the service.

## Cost Note

> [!NOTE]
> Google Maps Platform usage may incur costs. Consider using the free Maps Demo Key for prototyping: https://mapsplatform.google.com/maps-demo-key.

## Terms of Service Compliance

These projects integrate third-party APIs. By using them, you agree to comply with their respective Terms of Service:
*   **Google Maps Platform**: Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup). Users of applications using these features are also bound by the [Google Maps End User Additional Terms of Service](https://maps.google.com/help/terms_maps.html) and [Google Privacy Policy](https://policies.google.com/privacy).
*   **Strava**: Subject to the [Strava Developer Agreement](https://www.strava.com/legal/api).
*   **Mapbox**: Subject to the [Mapbox Terms of Service](https://www.mapbox.com/legal/tos).
*   **PurpleAir**: Subject to the [PurpleAir Terms of Service](https://www.purpleair.com/terms-of-service).

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository and create a feature branch.
2. Ensure changes are localized to the specific project directory you are modifying.
3. Keep changes simple, clean, and well-documented.
4. Open a pull request describing the changes and testing completed.

## License

This repository is licensed under the [MIT License](LICENSE).
