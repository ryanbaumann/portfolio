# trails.ninja — Ryan Baumann's site and lab

Ryan Baumann's home page — work, writing, talks — with a lab of live demo
apps, served together behind one zero-dependency Node gateway as a single
Cloud Run container. The site lives at the root; every demo mounts under its
own path; navigation works in every direction. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Apps

*   **[Site / Portfolio](portfolio/README.md)** (served at `/`): Ryan's home page — work, writing (the blog), talks, and the demo lab — built as a zero-dependency static site over a flat-file markdown CMS. Staged here for extraction into its own `portfolio` repo.
*   **[Strava 3D Explorer](strava-explorer/README.md)**: A Vite-powered web application to visualize Strava routes, endpoints, and photos in Google Maps Platform Photorealistic 3D with follow-camera animations.
*   **[Air Quality Map](aqi-map/README.md)**: A live air-quality heatmap and click-to-inspect conditions from the Google Maps Platform Air Quality API on a 2D Google map.
*   **[Isochrones](isochrones/README.md)**: A Vite + Node Google Maps Platform demo for analyzing delivery, commute, and response reachability with live-regenerating isochrone bands.

## Adding things (paved paths)

```bash
npm run new:demo -- my-demo --title "My Demo"   # scaffold + wire a new demo app
npm run new:post -- "Post title"                # scaffold a blog post
npm run previews                                # regenerate demo screenshots
```

A new demo shows up on the homepage, in the nav, in the container build, and
in CI's smoke test purely from its `apps.json` entry. A new post is live at
`/writing/<slug>/` on the next build.

## Quickstart: run the whole container locally

This builds every app and boots the same gateway that runs in production.
First, run the interactive setup script to configure your local `.env` file with the required API keys:

```bash
npm run setup                  # interactively generates your .env file
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

# To run the Air Quality Map
cd aqi-map
npm install
npm run dev

# To run the Isochrones Demo
cd isochrones
npm install
npm run dev

# To build and preview the Portfolio (zero dependencies)
cd portfolio
node build.mjs && node serve.mjs
```

Each app's own dev server proxies or stands in for the gateway's `/api/*`
routes locally — see each app's README for details. `AGENTS.md` has a full
"Adding a new demo app" walkthrough for wiring a new app into the gateway.

## Security Best Practices

*   **No Hardcoded Secrets**: Never commit API keys, client secrets, access tokens, or generated `.env.*` files. Use environment files locally (which are excluded via `.gitignore`).
*   **Key Restrictions**: Always restrict Google Maps browser keys by referrer (e.g., `http://localhost:5173/*` and your production domain) and limit their API scope to only the services required (Maps JavaScript, Air Quality, Places).
*   **Server-Side Proxy**: `gateway/` brokers every secret-bearing API call (Strava OAuth token exchange/refresh/deauthorize + photo proxy, Google Maps Isochrones) same-origin under `/api/*`, so unrestricted API secrets never reach the browser — only referrer-restricted public browser keys (Google Maps JS) ship in the client bundles, which is their designed use.

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

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository and create a feature branch.
2. Ensure changes are localized to the specific project directory you are modifying.
3. Keep changes simple, clean, and well-documented.
4. Open a pull request describing the changes and testing completed.

## License

This repository is licensed under the [MIT License](LICENSE).
