# Strava OAuth broker

This directory contains the small Cloud Run service used by `npm run deploy:gcp`.

## Purpose

The static Vite frontend must not publish the Strava client secret in a browser-exposed `VITE_` variable. This broker keeps `STRAVA_CLIENT_SECRET` in Cloud Run/Secret Manager and exposes only the minimal endpoints needed by the browser:

- `POST /api/strava/token` with `{ "code": "..." }` exchanges a Strava authorization code for Strava's token payload.
- `POST /api/strava/refresh` with `{ "refresh_token": "..." }` refreshes a Strava access token.
- `POST /api/strava/deauthorize` with `{ "access_token": "..." }` revokes the current Strava token during logout.
- `GET /api/photo-proxy?url=...` fetches Strava's CloudFront-hosted activity photos with CORS headers so Google Maps 3D can use them as custom marker images.
- `GET /healthz` returns `{ "ok": true }` for Cloud Run smoke checks.

The broker intentionally does not proxy Strava activity APIs or store activity data. The frontend still calls Strava activity endpoints directly with the current athlete's bearer token.

## Runtime environment

Required Cloud Run variables:

```dotenv
STRAVA_CLIENT_ID=YOUR_STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET=YOUR_STRAVA_CLIENT_SECRET
ALLOWED_ORIGIN=https://storage.googleapis.com
```

Optional overrides:

```dotenv
STRAVA_TOKEN_URL=https://www.strava.com/oauth/token
STRAVA_DEAUTHORIZE_URL=https://www.strava.com/oauth/deauthorize
PORT=8080
MAX_PHOTO_PROXY_BYTES=8388608
```

`deploy-gcp.sh` stores `STRAVA_CLIENT_SECRET` in Secret Manager, grants the default Cloud Run runtime service account `roles/secretmanager.secretAccessor`, and injects the secret into Cloud Run with `--set-secrets`.

## Local smoke check

```bash
PORT=19080 \
STRAVA_CLIENT_ID=dummy \
STRAVA_CLIENT_SECRET=dummy \
node server.js
```

Then open `http://127.0.0.1:19080/healthz`.
