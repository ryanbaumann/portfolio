# trails.ninja — Single-Container Architecture

One container, one Cloud Run service: Ryan's site (the static-built
portfolio) at the root path, every demo app as static assets under its own
path, and a tiny zero-dependency Node gateway that routes between them and
brokers all secret-bearing API calls. No access tokens or API secrets ever
reach the browser.

```
                        ┌─────────────────────────────────────────────┐
                        │  Cloud Run service: trails-ninja            │
                        │                                             │
 https://trails.ninja ─►│  gateway/server.js (node:20-slim, no deps)  │
                        │   ├── /                → site (portfolio    │
                        │   │    /work/ /writing/ /talks/ /demos/ …   │
                        │   │    built static by portfolio/build.mjs) │
                        │   ├── /strava-explorer/→ static dist        │
                        │   ├── /aqi-map/        → static dist        │
                        │   ├── /isochrones/     → static dist        │
                        │   ├── /portfolio/*     → 308 redirect to /* │
                        │   └── /api/*           → secret proxy layer │
                        │        ├── /api/strava/*      (OAuth broker)│
                        │        └── /api/isochrones    (GMP server)  │
                        └─────────────────────────────────────────────┘
                                    ▲
                secrets via Cloud Run env / Secret Manager:
                STRAVA_CLIENT_SECRET, GMP_SERVER_API_KEY
```

Routing is manifest-driven: `apps.json` at the repo root lists every app
with its mount `path`. The gateway matches the most specific path first, so
the root-mounted portfolio (`path: "/"`) is the catch-all after every demo
path has had its chance.

## Design rules

1. **Apps are folders.** Any top-level directory with a `package.json` whose
   `npm run build` emits static output, plus an `apps.json` entry, is an
   app; the gateway serves it at its manifest `path`. The same manifest
   feeds the homepage Demos section and nav (`portfolio/build.mjs`), the
   local staging build, and the smoke test. Adding a demo =
   `npm run new:demo -- <name>` (scaffolds the folder and every wiring
   point), or by hand per AGENTS.md "Adding a new demo app".
2. **Browser keys vs. server secrets.** Anything `VITE_`-prefixed is inlined
   into the browser bundle by Vite and must be public client config only:
   referrer-restricted browser keys (Maps JS / Air Quality / Places) and
   OAuth client IDs — that is their designed use. Anything unrestricted
   (Strava client secret, Google server API key) lives only in the gateway
   environment as non-`VITE_` vars, reachable only through `/api/*` with
   validation + rate limiting. A missing secret returns a JSON `503`, never
   a crash — the container always boots keyless.
3. **Same-origin by default.** In the container, clients call `/api/...` on
   their own origin — no CORS, no cross-origin token endpoints. OAuth redirect
   URIs derive from `window.location.origin` unless explicitly overridden.
4. **Smoke tests are dependency-free.** `scripts/smoke.mjs` uses plain `fetch`
   against a running gateway: route liveness, HTML sanity, navigation
   invariants (every demo and every site page links back home), the
   apps.json ↔ `/api/apps` contract, OAuth URL shape, and a leaked-secret
   grep over every built asset. No Playwright required; must pass keyless.
5. **CI never hands secrets to forks.** PR jobs build + smoke with dummy env
   only. Deploy runs on `main` pushes via Workload Identity Federation.
6. **The portfolio stays extractable.** `portfolio/` is a self-contained,
   zero-dependency static site (flat-file markdown CMS, zero client JS).
   Its only tie to this repo is optional: when `../apps.json` exists, the
   build renders the Demos section and nav item; when it doesn't, they
   disappear cleanly.

## Build

Root `Dockerfile` is multi-stage: one stage per app runs `npm ci && npm run
build` (the portfolio stage is dependency-free: `node build.mjs`), the
runtime stage copies each static output plus `gateway/` into `node:20-slim`
and runs as the non-root `node` user. `scripts/build-local.mjs` performs the
equivalent arrangement without Docker; CI and humans both use it.

## Deploy

`.github/workflows/deploy.yml` builds the image with Cloud Build — public
`VITE_*` build args threaded through `cloudbuild.yaml` substitutions — and
deploys to Cloud Run on pushes to `main`. Required repo configuration:

| Kind    | Name                    | Purpose                              |
|---------|-------------------------|--------------------------------------|
| secret  | `GCP_WIF_PROVIDER`      | Workload Identity Federation provider|
| secret  | `GCP_SA_EMAIL`          | Deploy service account               |
| secret  | `VITE_GMP_API_KEY`      | Referrer-restricted Maps browser key |
| secret  | `VITE_STRAVA_CLIENT_ID` | Strava OAuth client ID (public)      |
| var     | `GCP_PROJECT_ID`        | Target project                       |
| var     | `GCP_REGION`            | Cloud Run region                     |

Runtime secrets (`STRAVA_CLIENT_SECRET`, `GMP_SERVER_API_KEY`) are set on
the Cloud Run service — as Secret Manager references — never in the image or
repo.

## Paved paths

| I want to… | Run |
|---|---|
| Add a demo app | `npm run new:demo -- my-demo --title "My Demo"` |
| Add a blog post | `npm run new:post -- "Post title"` |
| Add a work entry / talk | copy the `_TEMPLATE.md` in `portfolio/content/<collection>/` |
| Regenerate demo screenshots | `npm run previews` (or `BASE_URL=https://trails.ninja npm run previews`) |
| Verify everything | `npm run build && npm run smoke` |
