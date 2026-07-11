# trails.ninja — Single-Container Portfolio Architecture

One container, one Cloud Run service, every demo app served as static assets
behind a tiny zero-dependency Node gateway that also brokers all secret-bearing
API calls. No access tokens or API secrets ever reach the browser.

```
                        ┌─────────────────────────────────────────────┐
                        │  Cloud Run service: trails-ninja            │
                        │                                             │
 https://trails.ninja ─►│  gateway/server.js (node:20-slim, no deps)  │
                        │   ├── /                → portfolio landing  │
                        │   ├── /strava-explorer/→ static dist        │
                        │   ├── /aqi-map/        → static build       │
                        │   ├── /isochrones/     → static dist        │
                        │   └── /api/*           → secret proxy layer │
                        │        ├── /api/strava/*      (OAuth broker)│
                        │        ├── /api/isochrones    (GMP server)  │
                        │        └── /api/purpleair/*   (sensor data) │
                        └─────────────────────────────────────────────┘
                                    ▲
                secrets via Cloud Run env / Secret Manager:
                STRAVA_CLIENT_SECRET, GMP_SERVER_API_KEY, PURPLEAIR_API_KEY
```

## Design rules

1. **Apps are folders.** Any top-level directory with a `package.json` whose
   `npm run build` emits static output (`dist/` or `build/`) is an app. The
   gateway serves it at `/<folder-name>/`. Adding a demo = adding a folder
   (see AGENTS.md "Adding a new demo app").
2. **Browser keys vs. server secrets.** Referrer-restricted browser keys
   (Google Maps JS, Mapbox public token) live in the client bundles — that is
   their designed use. Anything unrestricted (Strava client secret, PurpleAir
   key, Google server API key) lives only in the gateway environment and is
   reachable only through `/api/*` with validation + rate limiting.
3. **Same-origin by default.** In the container, clients call `/api/...` on
   their own origin — no CORS, no cross-origin token endpoints. OAuth redirect
   URIs derive from `window.location.origin` unless explicitly overridden.
4. **Smoke tests are dependency-free.** `scripts/smoke.mjs` uses plain `fetch`
   against a running gateway: route liveness, HTML sanity, OAuth URL shape,
   and a leaked-secret grep over every built asset. No Playwright required.
5. **CI never hands secrets to forks.** PR jobs build + smoke with dummy env
   only. Deploy runs on `main` pushes via Workload Identity Federation.

## Build

Root `Dockerfile` is multi-stage: one stage per app runs `npm ci && npm run
build`, the runtime stage copies each static output plus `gateway/` into
`node:20-slim` and runs as the non-root `node` user.

## Deploy

`.github/workflows/deploy.yml` builds the image with Cloud Build and deploys
to Cloud Run on pushes to `main`. Required repo configuration:

| Kind    | Name               | Purpose                              |
|---------|--------------------|--------------------------------------|
| secret  | `GCP_WIF_PROVIDER` | Workload Identity Federation provider|
| secret  | `GCP_SA_EMAIL`     | Deploy service account               |
| var     | `GCP_PROJECT_ID`   | Target project                       |
| var     | `GCP_REGION`       | Cloud Run region                     |

Runtime secrets (`STRAVA_CLIENT_SECRET`, `GMP_SERVER_API_KEY`,
`PURPLEAIR_API_KEY`, `ALLOWED_ORIGIN`) are set on the Cloud Run service —
ideally as Secret Manager references — never in the image or repo.
