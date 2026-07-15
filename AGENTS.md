# AGENTS.md

## Project Overview

This repository contains Ryan Baumann's demo apps and portfolio, served
together behind one zero-dependency Node gateway as a single Cloud Run
container. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full
picture.

- `portfolio/`: zero-dependency static site generator over a flat-file
  markdown CMS (`content/`). This is the site at the root path — home, work,
  writing (the blog), talks, demos, about. Staged for extraction into its own
  repo; portable portfolio workflows live under `.agents/skills/portfolio-*`
  for content, writing, design, and presenting. Its build reads the root `apps.json` (when present) to render
  the homepage Demos section and nav.
- `demos/strava-explorer/`: Vite app for exploring Strava activities on Google Maps Platform 3D Maps.
- `demos/aqi-map/`: Vite app rendering Air Quality API heatmap tiles and point conditions on a 2D Google map.
- `demos/isochrones/`: Vite + Node app for reachability analysis using Google Maps Platform Isochrones.
- `gateway/`: zero-npm-dependency Node server that serves the portfolio at
  the root path, every demo app's static build (both routed via the root
  `apps.json` manifest, most-specific path first), and same-origin `/api/*`
  proxies for every secret-bearing call (Strava OAuth, Isochrones). This is
  what actually runs in production; the per-app dev servers above are for
  local development only.

## Paved paths (use these before doing it by hand)

- **Add a demo app:** `npm run new:demo -- my-demo --title "My Demo"` —
  scaffolds the folder and wires apps.json, the Dockerfile, and dependabot.
  The homepage card, nav item, gateway route, container build, and smoke
  coverage all follow from the apps.json entry.
  Use `--visibility unlisted` for direct-link previews or `--visibility private`
  for a password-gated demo; private scaffolds print the required server env var.
- **Add a blog post:** `npm run new:post -- "Post title"` (add
  `--external <url>` for a link-out entry). Voice guidance:
  `.agents/skills/portfolio-writing/SKILL.md`.
- **Schedule an essay:** `npm run new:post -- "Post title" --schedule 2026-07-14T16:00:00Z`. Preview and manage drafts at the private `/writer/` app. See `docs/WRITER_WORKFLOW.md`; public-repo drafts are not confidential.
- **Regenerate demo screenshots:** `npm run previews` (uses
  strava-explorer's Playwright; `BASE_URL=https://www.ryanbaumann-portfolio.com`
  to shoot production).
- **Regenerate artifact cards:** `node scripts/artifact-cards.mjs` rebuilds
  the SVG artifact cards used on work, writing, and talks pages when no
  honest screenshot exists.

Prefer small, reviewable changes. Keep app-specific code, commands, and dependencies inside the app directory you are modifying. Only use npm for dependency management (do not use yarn or other package managers).

## Agent Workflow

1. Start by reading the relevant `package.json`, README, and the files you plan to change.
2. Use `rg`/`find` for discovery; do not use `ls -R` or `grep -R`.
3. Keep implementation details in source files and durable task workflows in local skills under `.agents/skills/`.
4. Before editing secrets, auth flows, map API usage, or build config, identify the affected runtime and required environment variables.
5. After changes, run the narrowest relevant validation command first, then a full app build when practical.

## Commands

Run commands from the app directory unless noted.

### `demos/strava-explorer/`

- Install: `npm install` (Only use npm, never yarn).
- Dev server: `npm run dev`.
- Production build: `npm run build`.
- Preview build: `npm run preview`.
- Run unit/integration tests: `npm run test` (runs vitest).
- Run linter: `npm run lint` (runs eslint).

### `demos/aqi-map/`

- Install: `npm install`.
- Dev server: `npm run dev`.
- Production build: `npm run build`.

### `portfolio/`

- No install needed (zero dependencies).
- Build: `node build.mjs` (or `npm run build`). It is mounted at the site
  root, so the default `BASE_PATH=/` is also the production value.
- Preview: `node serve.mjs` (after building).
- New blog post: `npm run new:post -- "Title"` from the repo root.
- Content, voice, design, and presentation standards live in `.agents/skills/portfolio-*`.

### `demos/isochrones/`

- Install: `npm install`.
- Dev server: `npm run dev`.
- Production build: `npm run build`.

### Root / `gateway/` (container build, run this before checking in a container-facing change)

- Generate a `.env` file interactively to load all local keys: `npm run setup`
- Build every app and stage its static output under `apps/<name>/`, exactly
  like the Dockerfile's runtime stage does: `node scripts/build-local.mjs`
  (from the repo root; equivalent to `npm run build` if you've added the
  root `package.json`'s script).
- Run the gateway against that staged output: `node gateway/server.js` (or
  `npm start`), then open `http://localhost:8080/`.
- Gateway unit tests (zero deps, `node:test`): `cd gateway && npm test`.
  Do not run raw `node --test` here: it imports `server.js` without
  `NODE_ENV=test` and used to hang forever (see LEARNINGS.md 2026-07-12).
  `server.js` now also guards `listen()` on `NODE_TEST_CONTEXT`, but
  `npm test` (which sets `NODE_ENV=test`) is the supported path.
- End-to-end smoke test (route liveness, asset resolution, OAuth URL shape,
  secret-leak scan, keyless proxy behavior): `node scripts/smoke.mjs` (or
  `npm run smoke`). This is what CI runs instead of the old Playwright
  suite; run it after any gateway, apps.json, or per-app build-output
  change.
- `APPS_ROOT` (default `./apps` relative to cwd) picks where the gateway
  looks for built apps; if an app isn't there, it falls back to that app's
  `dev_build_dir` from `apps.json` so `node gateway/server.js` also works
  straight after `npm run build` inside a single app directory, with no
  staging step.

## Environment Variables and Secrets

- Never commit real API keys, OAuth client secrets, access tokens, refresh tokens, or generated `.env.*` files.
- `demos/strava-explorer` expects Google Maps Platform and Strava configuration through Vite `import.meta.env` variables. Preserve the `VITE_` prefix for browser-exposed variables. Anything with `VITE_` is inlined into the browser bundle by Vite — never put a real secret in a `VITE_`-prefixed variable (see `docs/ARCHITECTURE.md` rule 2).
- If you encounter hard-coded credentials or tokens, prefer moving them to documented environment variables and note required API restrictions in the PR.
- For Google Maps Platform browser keys, document required API restrictions, HTTP referrer restrictions, billing/quota expectations, and local development origins.
- The gateway's server-side secrets are non-`VITE_` env vars read directly
  by Node: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `GMP_SERVER_API_KEY`.
  Every `/api/*` proxy endpoint returns `503` with a JSON error (never a
  crash) when its secret is unset, so the gateway always boots and
  smoke-tests keyless.

## Code Style

- Use modern JavaScript modules in `demos/strava-explorer/src/`, `demos/aqi-map/src/`, and `demos/isochrones/src/`; preserve the existing no-framework Vite architecture unless explicitly asked to migrate.
- Keep `portfolio/` dependency-free: its build is `node build.mjs`; client JavaScript is limited to small inline theme and consent-controlled analytics helpers (see `.agents/skills/portfolio-design/SKILL.md`).
- Use descriptive names for geospatial values: `lat`, `lng`, `altitude`, `bounds`, `coordinates`, `polyline`, `featureCollection`.
- Avoid broad rewrites, hidden formatting churn, and unrelated dependency upgrades.
- Do not add `try`/`catch` blocks around imports.

## Mapping and Geospatial Guidelines

- Prefer official SDK/library APIs over hand-rolled loaders.
- In Google Maps Platform work, prefer `google.maps.importLibrary()` after the API loader has resolved.
- Prefer Advanced Markers or the app's current 3D marker elements over legacy `google.maps.Marker` in new Google Maps code.
- For 3D custom markers, append an `HTMLTemplateElement` or `PinElement` to `Marker3DInteractiveElement`; raw DOM children are rejected by Maps 3D slot validation.
- Keep map container CSS isolated so global styles and utility frameworks do not accidentally override map internals.
- Validate latitude/longitude ranges before rendering or sending geospatial data to APIs.
- Batch API calls with documented limits and graceful fallback behavior.

## Frontend and UX Guidelines

- Design mobile-first, then add larger-layout enhancements.
- Prefer resilient CSS: fluid sizing with `clamp()`, component-level responsiveness with container queries where useful, and viewport media queries for major page-shell changes.
- Keep controls keyboard-accessible and screen-reader-friendly with explicit labels, useful `alt` text, focus styles, and semantic elements.
- Respect reduced-motion preferences for camera, map, and UI animation work.
- If a perceptible web UI change is made, run or document a browser/screenshot check when the environment allows it.

## Adding a new demo app

**Fast path:** `npm run new:demo -- my-demo --title "My Demo"` does all of
the below in one command. The manual steps, for when the scaffold doesn't
fit:

Apps are folders under `demos/` (`docs/ARCHITECTURE.md` design rule 1): the gateway
discovers whatever is listed in the root `apps.json`, so adding a demo is
just adding a folder plus a manifest entry. No gateway code changes needed.

1. `mkdir demos/my-demo` at the repo root and build it like the existing apps: a
   `package.json` with a `build` script that emits static output (`dist/`
   or `build/`) and an `engines.node >= 20` field. Keep its dependencies and
   config inside `my-demo/` only.
2. If the app needs a secret-bearing API call, do not call the third-party
   API directly from the browser — add a proxy module under `gateway/lib/`
   (follow the pattern in `gateway/lib/isochrones.js`: validate input, read the secret from a
   non-`VITE_` env var, return `503` with a JSON error if it's unset, add a
   10s upstream timeout) and wire a route for it in `gateway/server.js`.
3. Add an entry to the root `apps.json`:
   ```json
   {
     "name": "my-demo",
     "title": "My Demo",
     "description": "One line, shown on the landing page card.",
     "path": "/my-demo/",
    "dev_build_dir": "demos/my-demo/dist",
     "tags": ["..."],
     "preview": null
   }
   ```
   `dev_build_dir` is also the local-dev fallback: `node gateway/server.js`
   will serve straight from it if `apps/my-demo/` (the staged/container
   layout) doesn't exist yet.
4. Add a builder stage for it in the root `Dockerfile` (copy the pattern of
   the other `*-builder` stages: `npm ci`, set `BASE_PATH=/my-demo/` if the
   app's bundler supports a configurable base path, `npm run build`) and a
   matching `COPY --from=my-demo-builder ... ./apps/my-demo` in the runtime
   stage.
5. Run `node scripts/build-local.mjs && node scripts/smoke.mjs` — the smoke
   test picks up the new app automatically from `apps.json` (route
   liveness, asset resolution, and the secret-leak scan all iterate over
   every listed app) and will fail loudly if something's missing.
6. If your app needs npm dependency updates over time, add it to
   `.github/dependabot.yml` alongside the other app directories.

## Local Skills

Use these repo-local skills when the task matches their scope:

- `.agents/skills/google-maps-platform/SKILL.md` for broad Google Maps Platform, key-security, quota, Places, Routes, and general Maps JavaScript API work.
- `.agents/skills/google-maps-js-3d/SKILL.md` for focused Maps JavaScript API 3D Maps work: `Map3DElement`, `maps3d`, 3D markers, popovers, altitude, drawing, and camera behavior.
- `.agents/skills/google-maps-js-2d/SKILL.md` for focused Maps JavaScript API 2D Maps work: loader/imports, vector maps, Advanced Markers, overlays, deck.gl, WebGLOverlayView, Places widgets, and Mapbox-to-Google migration work.
- `.agents/skills/google-maps-environment-apis/SKILL.md` for Google Maps Platform Environment APIs: Air Quality, Pollen, Solar, Weather, environmental heatmap tiles, quota, caching, source labeling, and environmental-data migrations.
- `.agents/skills/frontend-responsive-design/SKILL.md` for responsive layout, accessibility, CSS architecture, Tailwind utility usage, and visual QA work.
- `.agents/skills/portfolio-review/SKILL.md` for the mandatory pre-publication audit of copy, claims, links, canonicals, redirects, images, metadata, accessibility, and rendered desktop/mobile output.

## The agentic loop

1. Read this file and the relevant `.agents/skills/*/SKILL.md` before changing a surface it governs (styling changes require `portfolio-design`, prose requires `portfolio-writing`).
2. Do the work in small, reviewable commits.
3. Run the narrowest validation first, then the app build, then `node scripts/smoke.mjs` for gateway/apps.json changes.
4. Before finishing, update `CHANGELOG.md` (every user-visible or behavioral change) and `LEARNINGS.md` (every surprise, root-caused bug, or environment gotcha, using the Context/Learning/Evidence/Use next time format).
5. If a learning is durable, fold it into the matching skill in the same PR. The changelog records what happened, the learning log records why, and skills encode what to do next time.

Every publishable portfolio content change must also run the `portfolio-review` skill. Use a maker/checker loop with at least one independent read-only reviewer; essays and multi-surface pages should separate copy/claims, links/URL ownership, and visual/rendered QA when agents are available. Deterministic checks run before and after each correction pass. Stop after at most three review rounds, stop earlier when all lanes are clean, and escalate unresolved evidence or taste decisions to Ryan instead of self-approving.

## Pull Request Expectations

- Summarize changed behavior and cite touched files.
- List every validation command run and whether it passed, failed, or was limited by environment.
- Call out any untested browser/API behavior, required environment variables, or migration follow-ups.
