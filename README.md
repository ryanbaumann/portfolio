# Ryan Baumann's Portfolio site

![Ryan Baumann Portfolio homepage screenshot](portfolio/static/previews/portfolio.jpg)

This repo is the public home for Ryan Baumann's portfolio and demo lab. It is part personal site, part runnable reference architecture, and part proof that developer experience work should ship as real artifacts.

The live site is https://www.ryanbaumann-portfolio.com/.

## What is inside

* **Portfolio site** at `/`: a zero-dependency static site over a flat-file markdown CMS. It covers work, Field Notes, talks, and demos with only small inline theme and consent helpers.
* **[Agent scripts](agent-scripts/README.md)**: reusable, vendor-neutral prompts, role contracts, and behavioral evals for software agents.
* **Demo lab** under app paths: Strava 3D Explorer, Air Quality Map, and Isochrones, each built as a self-contained app.
* **Gateway** in `gateway/`: a zero-npm-dependency Node server that serves the site, mounts each demo, and keeps secret-bearing API calls behind same-origin `/api/*` routes.
* **Cloud Run container**: one deployable artifact for the site and every demo.

The portfolio narrative is intentionally grounded: solution architecture, developer experience, forward-deployed incubation at Google Maps Platform, and product growth leadership. The codebase backs that up with live apps, public docs, shipped links, tests, smoke checks, and a changelog.

## Start here

| Goal | Command |
| --- | --- |
| Configure local secrets | `npm run setup` |
| Build the whole container locally | `npm run build` |
| Run the production gateway locally | `npm start` |
| Smoke-test routes, assets, proxies, and secret leaks | `npm run smoke` |
| Add a demo app | `npm run new:demo -- my-demo --title "My Demo"` |
| Add a blog post | `npm run new:post -- "Post title"` |
| Regenerate demo screenshots | `npm run previews` |

## Apps

* **[Site / Portfolio](portfolio/README.md)**, served at `/`: Ryan's home page, work, writing, talks, and demo index.
* **[Agent scripts](agent-scripts/README.md)**: copyable system prompts and role overlays with versioned regression cases.
* **[Strava 3D Explorer](demos/strava-explorer/README.md)**: visualize Strava routes, endpoints, and photos in Google Maps Platform Photorealistic 3D.
* **[Air Quality Map](demos/aqi-map/README.md)**: inspect live Air Quality API heatmap tiles and point conditions on a 2D Google map.
* **[Isochrones](demos/isochrones/README.md)**: analyze delivery, commute, and response reachability with live-regenerating isochrone bands.

## Local development

```bash
npm run setup
npm run build
npm start
```

Open `http://localhost:8080/`. Then run:

```bash
npm run smoke
```

Each app can also run on its own dev server:

```bash
cd demos/strava-explorer && npm install && npm run dev
cd demos/aqi-map && npm install && npm run dev
cd demos/isochrones && npm install && npm run dev
cd portfolio && node build.mjs && node serve.mjs
```

## Architecture in one paragraph

`portfolio/` builds static HTML into `portfolio/dist/`. Each demo builds its own static bundle. `scripts/build-local.mjs` stages those outputs under `apps/<name>/`, matching the Docker runtime layout. `gateway/server.js` serves the portfolio at the root, mounts demo apps from `apps.json` by most-specific path first, and proxies secret-bearing calls through server-side routes. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Security posture

* Never commit API keys, OAuth secrets, access tokens, refresh tokens, or generated `.env.*` files.
* Browser-exposed Google Maps keys must use `VITE_` variables, API restrictions, and HTTP referrer restrictions.
* Public OAuth client configuration uses `STRAVA_CLIENT_ID`; actual server-side secrets stay in Node env vars such as `STRAVA_CLIENT_SECRET`, `GMP_SERVER_API_KEY`, and `RESEND_API_KEY`.
* Gateway proxy endpoints return keyless `503` JSON responses instead of crashing, so smoke tests can run without secrets.

## Deploy

`.github/workflows/deploy.yml` builds the container with Cloud Build and deploys it to Cloud Run on pushes to `main` using Workload Identity Federation.

## Cost and terms

Google Maps Platform usage may incur costs. For prototypes, consider the Maps Demo Key: https://mapsplatform.google.com/maps-demo-key.

These projects integrate Google Maps Platform and Strava APIs. Use them in compliance with the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms), [Google Maps End User Additional Terms](https://maps.google.com/help/terms_maps.html), [Google Privacy Policy](https://policies.google.com/privacy), and the [Strava Developer Agreement](https://www.strava.com/legal/api).

## Contributing

Small, focused PRs are welcome. Keep app-specific code, commands, and dependencies inside the app directory you are modifying. Use npm only. Include the validation commands you ran.

## License

MIT. See [LICENSE](LICENSE).
