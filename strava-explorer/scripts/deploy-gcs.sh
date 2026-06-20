#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
BUCKET="${GCS_BUCKET:-}"
LOCATION="${GCS_LOCATION:-US}"
PUBLIC="${GCS_PUBLIC:-true}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --bucket) BUCKET="$2"; shift 2 ;;
    --location) LOCATION="$2"; shift 2 ;;
    --private) PUBLIC="false"; shift ;;
    --public) PUBLIC="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ID" || -z "$BUCKET" ]]; then
  cat >&2 <<USAGE
Usage: npm run deploy:gcs -- --project YOUR_GCP_PROJECT --bucket YOUR_BUCKET_NAME [--location US] [--public|--private]

Required build-time environment variables:
  VITE_STRAVA_CLIENT_ID
  VITE_STRAVA_REDIRECT_URI
  VITE_GMP_API_KEY
Optional:
  VITE_STRAVA_API_BASE_URL (defaults to https://www.strava.com/api/v3)
USAGE
  exit 2
fi

for name in VITE_STRAVA_CLIENT_ID VITE_STRAVA_REDIRECT_URI VITE_GMP_API_KEY; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 2
  fi
done

npm run build

gcloud config set project "$PROJECT_ID" >/dev/null
if ! gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" --project "$PROJECT_ID" --location "$LOCATION" --uniform-bucket-level-access
fi

gcloud storage rsync --recursive --delete-unmatched-destination-objects dist "gs://$BUCKET"
gcloud storage objects update "gs://$BUCKET/**" --cache-control="public,max-age=31536000,immutable" >/dev/null || true
gcloud storage objects update "gs://$BUCKET/index.html" --cache-control="no-cache,max-age=0" >/dev/null

gcloud storage buckets update "gs://$BUCKET" --web-main-page-suffix=index.html --web-error-page=index.html >/dev/null

if [[ "$PUBLIC" == "true" ]]; then
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member=allUsers --role=roles/storage.objectViewer >/dev/null
  echo "Deployed to: https://storage.googleapis.com/$BUCKET/index.html"
  echo "Also try: http://$BUCKET.storage.googleapis.com/index.html"
else
  echo "Deployed private bucket gs://$BUCKET. Put Cloud CDN/HTTPS Load Balancer or authenticated proxy in front of it."
fi
