# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-07-11

### Added — Single-container portfolio gateway
- **`gateway/`**: a zero-npm-dependency Node >=20 ES-module server
  (`gateway/server.js` + `gateway/lib/`) that is now the single entry point
  for the whole repo in production. It serves the portfolio landing page
  (`gateway/public/`), every app's static build (routed from the new root
  `apps.json` manifest, with a local-dev fallback to each app's
  `dev_build_dir`), and same-origin `/api/*` proxies for every
  secret-bearing call: Strava OAuth token exchange/refresh/deauthorize +
  photo proxy (ported from `strava-explorer/server/broker.js`, which is
  left intact for standalone use), Google Maps Isochrones, and PurpleAir
  sensor data. Every proxy endpoint returns `503` with a JSON error instead
  of crashing when its secret env var is unset, so the gateway always boots
  and smoke-tests keyless. Adds path-traversal-safe static serving, MIME
  typing, hashed-asset vs. HTML cache-control policy, security headers
  (including HSTS) on every response, and per-route rate limiting.
- **Portfolio landing page** (`gateway/public/index.html`): dependency-free
  dark-theme hero + responsive app card grid, hydrated from `/api/apps`
  with a baked-in static fallback, accessible (landmarks, skip link, AA
  contrast, `prefers-reduced-motion`), no trackers.
- **`apps.json`**: root-level manifest — adding a folder + an entry here is
  the entire process for adding a new demo app (see AGENTS.md's "Adding a
  new demo app").
- **Root `Dockerfile`**: multi-stage build, one `node:20-slim` builder
  stage per app, a slim non-root runtime stage carrying only `gateway/` +
  each app's static output + `apps.json`. Plus `.dockerignore`. Updated to accept `VITE_GMP_API_KEY` and `VITE_STRAVA_CLIENT_ID` build arguments.
- **`scripts/build-local.mjs`**: builds every app from `apps.json` and
  stages output under `apps/<name>/` exactly like the Dockerfile's runtime
  stage — the one code path both CI and humans use to answer "does it
  build," since Docker itself isn't always available.
- **`scripts/smoke.mjs`**: dependency-free end-to-end smoke test — route
  liveness, HTML/asset-reference resolution for every app, the
  `apps.json` <-> `/api/apps` contract, the `/<app>` -> `/<app>/` redirect,
  Strava OAuth URL shape, a secret-leak scan (Google/Mapbox/Stripe key
  patterns, PEM blocks, `client_secret`, a PurpleAir-key heuristic) over
  every served asset, and keyless proxy behavior. Wired as `npm run smoke`.
- **CI/CD**: rewrote `.github/workflows/ci.yml` (strava-explorer lint+test,
  plus a new secrets-free build-all + smoke job; dropped the old Playwright
  step, superseded by the smoke test) and `.github/workflows/deploy.yml`
  (single Cloud Build + Cloud Run deploy via Workload Identity Federation,
  replacing the old GCS-bucket + separate-broker deploy). Added
  `.github/dependabot.yml` for weekly npm updates per app dir plus
  GitHub Actions. Passing `VITE_GMP_API_KEY` and `VITE_STRAVA_CLIENT_ID` build arguments to `gcloud builds submit`.
- **Real screenshots**: Generated and added high-resolution visual previews for `aqi-map` and `isochrones` landing cards, wired up via `apps.json` as `/previews/aqi-map.jpg` and `/previews/isochrones.jpg`.

### Changed
- `strava-explorer` and `isochrones` Vite configs now read `BASE_PATH` (env)
  for their build `base`, so the gateway can mount them at
  `/strava-explorer/` and `/isochrones/`; `strava.js` defaults the OAuth
  broker base and redirect URI to same-origin when unset, and no longer
  skips the Strava deauthorize network call just because that base is the
  same-origin empty-string default.
- `aqi-map` no longer requires a PurpleAir key in the browser: it fetches
  Mapbox config from `/api/config/aqi-map` (falling back to
  `window.AQI_MAP_CONFIG` for local `npm start`) and calls
  `/api/purpleair/sensors` instead of PurpleAir directly.
- Added an accessible "&larr; trails.ninja" home link to each app's UI.


### Fixed (found via the new smoke test / gateway code review)
- A keyless `strava-explorer` build was dead-code-eliminating the entire
  Strava OAuth authorize URL: esbuild statically proves
  `if (!STRAVA_CLIENT_ID) return null` is always true when
  `VITE_STRAVA_CLIENT_ID` is unset, and strips the unreachable URL
  construction below it. `scripts/build-local.mjs` now defaults it to an
  obvious placeholder when unset (client IDs aren't secret — Strava puts
  them directly in the authorize URL every user sees).
- `gateway/lib/strava.js` and `gateway/lib/isochrones.js` checked broker
  configuration before validating the request body, so a keyless server
  503'd on a malformed request instead of 400ing.
- A cache-control heuristic was flagging ordinary hyphenated filenames
  (`strava-explorer.jpg`, coincidentally 8 characters) as content-hashed
  and handing them a year-long immutable cache.
- Re-enabled dynamic resolution of `STRAVA_REDIRECT_URI` by removing legacy
  `.env.production` and `.env.development` files from the frontend subdirectories
  that were silently overriding the dynamic fallback with hardcoded `localhost:5173`
  values during Vite builds.

## [Unreleased] - 2026-07-03

### Changed / Improved (Workstreams B & E)
- **Shared Utilities (B4)**: Created `src/geo.js` containing pure mathematical and geospatial utilities (`haversineKm`, `bearingDeg`, `lerp`, `lerpAngle`, `clamp`, `samplePointAlongLine`, `samplePointAlongLineExact`, `calculateCumulativeDistances`, `downsamplePath`, `smoothPath`, and `calculateElevationLoss`). These are independent of `google.maps` to enable modularity and testing.
- **Unit/Telemetry Formatting (B4)**: Created `src/units.js` consolidating imperial and metric unit conversions (`KM_PER_MILE`, `MILES_PER_KM`, `FEET_PER_METER`, `M_PER_FT`, `MPS_TO_MPH`) and formatters (`formatDistance`, `formatElevation`, `formatSpeed`, `formatDuration`).
- **Unified LatLng Normalization (B4)**: Created `src/latlng.js` with `toLatLngLiteral()` to clean up inline coordinate conversions in the codebase.
- **Logging Discipline (B3)**: Created `src/log.js` containing a development-only `debug()` logger and always-on `warn()` and `error()` functions. Replaced all console statements in the application with these functions.
- **GMP Modernization (E1-E4)**:
  - Switched the Maps JavaScript API loader channel to `'beta'`.
  - Added internal attribution tracking ID: `gmp_git_agentskills_v1`.
  - Implemented asynchronous waiting for `gmp-steadystate` event on `Map3DElement` before initiating flights to eliminate visual camera jumps on route loads.
  - Added event listeners for `gmp-error` on `Map3DElement` to gracefully report WebGL initialization errors.
  - Consolidated fallback altitude handling under the named constant `DEFAULT_ALTITUDE_M` = 10.
- **Package Maintenance and Cleanups (B1, B2)**:
  - Renamed package to `"strava-3d-explorer"`, marked it private, updated scripts to support `"vitest"` for testing, and added `"lint": "eslint src/"`.
  - Deleted historical files and dead weight (`MIGRATION_PLAN.md`, `strava-explorer/PLAN.md`, `resources/strava-v3.md`, `debug.js`, `scripts/curl_test.sh`, and `static/line.svg`).
  - Removed dead athlete profile blocks, CSS rules, and old canvas tags from `index.html`.
- **Docs and Licenses (B5)**:
  - Replicated project MIT license to the repository root `LICENSE` file.
  - Documented the modular client architecture and security constraints in `README.md` and added a cost warning note.
  - Updated `AGENTS.md` with package requirements, testing instructions, and references to the `isochrones/` project.

## [Unreleased] - 2026-06-24

### Added
- **Isochrones Demo**: Added a new [isochrones/](isochrones/) Vite + Node demo that reuses `VITE_GMP_API_KEY`, proxies Isochrones API requests through a local server, and visualizes selectable reachability polygons for delivery, commute, and response-planning use cases.
- **Premium Dark Mode UI**: Overhauled [index.html](strava-explorer/index.html) with a premium glassmorphism theme, translucent control panels, custom telemetry grid, and custom-styled form controls (sliders, selects).
- **Start/Finish 3D Pins**: Added custom green (`#4CAF50`) and red (`#F44336`) standard `PinElement` markers for the start and finish of Strava routes in [gmp.js](strava-explorer/src/gmp.js).
- **Dynamic Tour Timing**: The follow-camera fly-through duration now scales based on route length instead of a fixed time, improving the visual pacing on both short trails and long rides.
- **Auto-Pop Photo Milestones**: Photo markers automatically pop up larger for exactly 3 seconds as the follow-camera flyby sweeps past their coordinates in [followCamera.js](strava-explorer/src/followCamera.js), then auto-close. Triggers are automatically armed/disarmed on timeline scrubs.
- **Overlapping Photo Clustering (Anti-Flicker)**: Implemented 10-meter spatial photo grouping in [gmp.js](strava-explorer/src/gmp.js) that collapses overlapping photos into a single volumetric 3D marker with a dynamically drawn count badge and a paginated slide-show popover.

### Changed / Improved
- **Isochrones Environment Configuration**: Configured the [isochrones/](isochrones/) demo to load `GMP_SERVER_API_KEY` (with `VITE_GMP_API_KEY` fallback) from a local `.env` file using Node's native `process.loadEnvFile()` in [server.js](isochrones/server.js), aligning it with key security best practices.
- **Aspect-Ratio Thumbnail Rendering**: Updated `resizeImageToDataUrl` in [gmp.js](strava-explorer/src/gmp.js) to preserve the source image's aspect ratio dynamically instead of forcing a square crop.
- **Maps JS API Version**: Switched back to the `alpha` build channel in [gmp.js](strava-explorer/src/gmp.js) to gain access to the fixed 3D custom element observer loop, allowing clean, non-deprecated usage of `PinElement`.
- **Enhanced Camera Smoothing**: Blended multiple look-ahead route coordinates and implemented a frame-rate-aware yaw rate limit in [followCamera.js](strava-explorer/src/followCamera.js) to prevent sudden camera jumps or "rubber-banding" around switchbacks.
- **Improved Elevation Tracking**: Connected elevation profile clicks directly to tracking markers and follow-camera progress, enabling fluid map scrub previews.
- **Shareable URL Parameters & Deep-Linking**: Implemented serialization of date filters, activity selection, and all follow-camera settings to query parameters using `history.replaceState()`. Includes intelligent deep-linking that safely auto-loads shared activities.
- **Floating HUD Share Button**: Added a beautiful glass-morphism "Share Tour" button with built-in clipboard copying and visual feedback.
- **Compact UI Optimization**: Removed static debug HUD badge and tightened vertical padding between the sidebar title and the "Pick a route" section.
- **Documentation Restructuring**: Cleaned up the root directory by renaming the cryptic `Hs.md` to [HOSTING.md](strava-explorer/HOSTING.md), and resolved duplication of hosting instructions in [README.md](strava-explorer/README.md) by replacing it with a concise reference to [HOSTING.md](strava-explorer/HOSTING.md).
- **README Simplification**: Restructured the user-facing README files across all three projects (root, `strava-explorer`, and `aqi-map`) to focus on basic, easy-to-follow overviews and standard open-source sections including terms of service compliance, security guidelines, and licensing.
- **Image Optimization & Preview**: Resized and compressed a large 11MB screenshot to a web-optimized [strava-explorer.jpg](strava-explorer/strava-explorer.jpg) (325KB) using macOS `sips` and added it as a visual preview to the top of [README.md](strava-explorer/README.md).

### Fixed
- **Security Hardening**: Untracked local `.env.development` and `.env.production` files to ensure they respect `.gitignore` and are not accidentally committed, and replaced an internal Googleplex redirect URI with a generic placeholder.
- **Synchronized Follow-Camera & Marker Tracking**: Fixed an issue where the follow-camera and tracking marker fell out of sync during the 3D route animation in [followCamera.js](strava-explorer/src/followCamera.js). Refactored the engine to use a 15-point rolling average across the full route array, re-enabled spatial LERP interpolation on the camera center to eliminate high-speed speed-up jank, and bound the tracking marker directly to the final interpolated camera center.
- **Mountainous Camera Tilt & Elevation Avoidance**: Fixed camera looking too vertical (staring straight down) in mountainous regions in [followCamera.js](strava-explorer/src/followCamera.js) by replacing the tilt drop with a dynamic tilt boost (raising tilt up to 85 degrees to look ahead at climbs) and reduced range zoom aggressiveness to make camera mesh avoidance less conservative.
- **3D Photo Marker Stack Overflow & Rendering**: Fixed another `RangeError: Maximum call stack size exceeded` crash by refactoring `displayPhotoMarkers` in [gmp.js](strava-explorer/src/gmp.js) to use `HTMLTemplateElement` wrapping a direct `HTMLImageElement` instead of using the custom `<gmp-pin>` element, which has dynamic rendering/observing loops when combined with remote images and popover bindings. Connected the popover to the marker using `gmpPopoverTargetElement` instead of setting `positionAnchor: marker` on the popover element.
- **Call Stack Overflow & Deprecation Errors**: Fixed a `RangeError: Maximum call stack size exceeded` recursion loop and `<gmp-pin>` deprecation warnings by updating Google Maps loader to `alpha` and directly appending the `PinElement` object (`marker.append(pin)`) instead of the deprecated, recursive `pin.element` property.
- **Reference Errors**: Fixed ReferenceErrors where `temp_token` and `getTourSettings` were undefined during URL state parsing and authentication flow.
- **Custom Pin Image Deprecation**: Swapped deprecated `glyph` to `glyphSrc` for loading photo URLs onto custom `PinElement` markers, preventing WebGL/Maps 3D serialization failures.
- **3D Photo Marker Sizing**: Replaced custom unscalable `HTMLTemplateElement` image billboards with properly proportioned, natively scalable `PinElement` structures.

---

## [1.1.0] - 2026-06-20

### Added
- Cloud Run token broker for OAuth flow, separating `STRAVA_CLIENT_SECRET` from client-side bundle.
- GCS + Cloud CDN static assets build and deployment scripts.

### Changed
- Refactored Strava activity processing to store access and refresh tokens locally in browser `localStorage`.

---

## [1.0.0] - 2026-06-19

### Added
- Initial project structure.
- `strava-explorer/`: Vite + Google Maps Platform 3D Maps app for 3D route viewing.
- `aqi-map/`: Mapbox GL + PurpleAir hyperlocal AQI map.
