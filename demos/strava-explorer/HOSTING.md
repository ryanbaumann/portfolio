# Strava Explorer Hosting and Deployment Strategy

## Deployment architecture for 2026 Strava API changes

Strava announced a revised Developer Program on June 1, 2026. The parts that matter for this app are: Standard tier is self-service but limited to up to 10 athletes unless you qualify for higher capacity; Standard tier developers need a Strava subscription after the June 2026 transition; some club and segment endpoints are deprecated or restricted on September 1, 2026; and on June 1, 2027 Strava requires bearer tokens in request headers and moves the API base URL from `https://www.strava.com/api/v3` to the new `api-v3.strava.com` host. The current app already sends bearer tokens in headers and does not depend on club or segment-explore endpoints.

### Recommended deployment model

For sharing with many people, use a two-tier deployment:

1. **Static frontend on GCS + Cloud CDN** for the Vite build in `dist/`. This is the cheapest serving path, can be public, supports a custom HTTPS domain, and lets the Google Maps browser key be locked to exact HTTP referrers.
2. **Small Cloud Run OAuth/token broker** before broad public launch. The current static-only app can deploy today, but Vite exposes every `VITE_` value to the browser, so `VITE_STRAVA_CLIENT_SECRET` is not appropriate for a public app. A Cloud Run broker should own `STRAVA_CLIENT_SECRET`, perform `POST /oauth/token` and refresh-token exchanges server-side, return the Strava token payload only to the current browser session, implement logout by calling Strava's current revoke endpoint, and avoid server-side activity storage by default. Keep the broker direct-to-Strava; do not make it an API intermediary, pass-through proxy for third parties, MCP server, or data aggregation layer.
3. **No server-side Strava data persistence by default.** Keep selected activity data in browser memory/local storage only when needed for the user's current session. If server caching is added, cap it below Strava's current 7-day cache policy and support immediate deletion.

A public GCS bucket is acceptable for the frontend because activity data is fetched only after each athlete authenticates. A private bucket alone is less useful for sharing; if you need private hosting, put Cloud CDN + HTTPS Load Balancer, Firebase Hosting, App Engine, or Cloud Run in front of the same static assets.

### Security and compliance checklist

- Register the exact production origin in Strava's API settings and use it as `VITE_STRAVA_REDIRECT_URI`.
- Keep Strava access to the authenticated user's own data only; do not display one athlete's Strava data to another person.
- Do not use Strava data for AI/ML training, RAG, embeddings, benchmarking, analytics aggregation, or an app-hosted MCP server. Strava's official MCP is for a subscriber's personal use and is not a replacement auth path for this public web app.
- Keep requests direct and scoped: this app needs recent activities, activity details, streams, and activity photos; it does not need club, segment-explore, write, upload, or webhook endpoints.
- Configure a Google Maps browser key restricted to Maps JavaScript API, Map Tiles / Photorealistic 3D, and Elevation API, with HTTP referrers for localhost and the production domain only.
- Add GCP budget alerts and quota alerts for Maps JavaScript, Map Tiles, and Elevation. Elevation is batched in the app, but broad sharing can still create billable traffic.
- Publish a privacy policy and a deletion contact before scaling beyond personal use.

### Environment variables

Static GCS build variables:

```dotenv
VITE_STRAVA_CLIENT_ID=YOUR_STRAVA_CLIENT_ID
VITE_STRAVA_REDIRECT_URI=https://YOUR_DOMAIN_OR_BUCKET_HOST/index.html
VITE_GMP_API_KEY=YOUR_RESTRICTED_GOOGLE_MAPS_BROWSER_KEY
# Production builds should point at the Cloud Run broker created by npm run deploy:gcp.
VITE_STRAVA_AUTH_BASE_URL=https://YOUR_CLOUD_RUN_BROKER_URL
# Optional compatibility switch. Use the Strava changelog's active host when the migration window opens.
VITE_STRAVA_API_BASE_URL=https://www.strava.com/api/v3
```

Static-only local development still supports `VITE_STRAVA_CLIENT_SECRET`, but do not use or publish a browser-exposed Strava client secret for a public deployment. The Cloud Run broker uses non-`VITE_` `STRAVA_CLIENT_SECRET` from Secret Manager and the frontend calls it through `VITE_STRAVA_AUTH_BASE_URL`.

### Deploy the full GCP architecture

The repo includes an opinionated deploy command for your GCP project and Google account, creating a GCS frontend bucket, Secret Manager, and a Cloud Run OAuth broker. Run it from `demos/strava-explorer/` after installing/authenticating the Google Cloud CLI and creating a Strava app:

```bash
export VITE_STRAVA_CLIENT_ID=12345
export STRAVA_CLIENT_SECRET=YOUR_STRAVA_CLIENT_SECRET
export VITE_GMP_API_KEY=YOUR_RESTRICTED_GOOGLE_MAPS_BROWSER_KEY
# Replace flags with your own GCP project ID and account email
npm run deploy:gcp -- --project YOUR_GCP_PROJECT_ID --account YOUR_GCLOUD_ACCOUNT_EMAIL
```

Override defaults with flags such as `--project`, `--account`, `--bucket`, `--region`, or `--private`. The command enables required GCP services, stores the Strava client secret in Secret Manager, deploys the broker to Cloud Run, builds the frontend with `VITE_STRAVA_AUTH_BASE_URL`, and publishes `dist/` to GCS.

### Deploy only the public GCS frontend

Authenticate the Google Cloud CLI first, then run from `demos/strava-explorer/`:

```bash
export VITE_STRAVA_CLIENT_ID=12345
export VITE_STRAVA_REDIRECT_URI=https://storage.googleapis.com/YOUR_BUCKET/index.html
export VITE_GMP_API_KEY=YOUR_RESTRICTED_GOOGLE_MAPS_BROWSER_KEY
npm run deploy:gcs -- --project YOUR_GCP_PROJECT --bucket YOUR_GLOBALLY_UNIQUE_BUCKET --location US --public
```

The command builds the app, creates the bucket if needed, syncs `dist/`, configures static website metadata, sets long-lived cache headers on hashed assets, keeps `index.html` uncached, and grants public object read access when `--public` is used.

### When to choose Cloud Run or App Engine instead

Choose **Cloud Run** when you are ready to remove `VITE_STRAVA_CLIENT_SECRET` from the browser, support many athletes, add deletion workflows, or add a small backend-for-frontend. Cloud Run can also serve the static Vite assets, but the cheapest long-term design is usually Cloud CDN/GCS for assets plus a min-instances-zero Cloud Run broker for OAuth.

Choose **App Engine** only if you prefer its operational model. It is simple, but Cloud Run is generally more flexible for a small OAuth broker and avoids keeping frontend assets coupled to the backend runtime.

### Strava migration watchlist

- Before September 1, 2026, verify the app still avoids the deprecated Club Activities, Club Administrators, Club Members, and restricted Explore Segments endpoints.
- Before January 4, 2027 / June 1, 2027, test `VITE_STRAVA_API_BASE_URL` against Strava's new API host as it becomes available, then update production config without changing source code.
- Before scaling beyond 10 athletes, request or qualify for the appropriate Strava access tier in the API Settings Dashboard.
