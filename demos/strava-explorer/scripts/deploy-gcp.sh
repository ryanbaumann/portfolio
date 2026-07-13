#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
ACCOUNT="${GCLOUD_ACCOUNT:-}"
REGION="${GCP_REGION:-us-central1}"
LOCATION="${GCS_LOCATION:-US}"
BUCKET="${GCS_BUCKET:-}"
SERVICE="${CLOUD_RUN_SERVICE:-strava-explorer-broker}"
PUBLIC="${GCS_PUBLIC:-true}"
DEPLOY_BACKEND="${DEPLOY_BACKEND:-false}"

usage() {
  echo "Usage: $0 --project <GCP_PROJECT_ID> --account <GCLOUD_ACCOUNT> [options]" >&2
  echo "" >&2
  echo "Required parameters (or set via environment variables):" >&2
  echo "  --project         GCP Project ID (env: GCP_PROJECT_ID)" >&2
  echo "  --account         Google Cloud Account email (env: GCLOUD_ACCOUNT)" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --region          GCP Region (default: us-central1, env: GCP_REGION)" >&2
  echo "  --location        GCS Location (default: US, env: GCS_LOCATION)" >&2
  echo "  --bucket          GCS Bucket name (default: <project-id>-strava-explorer, env: GCS_BUCKET)" >&2
  echo "  --service         Cloud Run Service name (default: strava-explorer-broker, env: CLOUD_RUN_SERVICE)" >&2
  echo "  --private         Make GCS bucket private" >&2
  echo "  --public          Make GCS bucket public (default)" >&2
  echo "  --deploy-backend  Force redeploy Cloud Run broker (default: false)" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --account) ACCOUNT="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --location) LOCATION="$2"; shift 2 ;;
    --bucket) BUCKET="$2"; shift 2 ;;
    --service) SERVICE="$2"; shift 2 ;;
    --private) PUBLIC="false"; shift ;;
    --public) PUBLIC="true"; shift ;;
    --deploy-backend) DEPLOY_BACKEND="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; usage ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: GCP Project ID is required." >&2
  usage
fi

if [[ -z "$ACCOUNT" ]]; then
  echo "Error: Google Cloud Account is required." >&2
  usage
fi

if [[ -z "$BUCKET" ]]; then
  BUCKET="${PROJECT_ID}-strava-explorer"
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required. Install Google Cloud SDK and run: gcloud auth login $ACCOUNT" >&2
  exit 127
fi

for name in STRAVA_CLIENT_SECRET VITE_STRAVA_CLIENT_ID VITE_GMP_API_KEY; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 2
  fi
done

gcloud config set account "$ACCOUNT" >/dev/null
gcloud config set project "$PROJECT_ID" >/dev/null

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com secretmanager.googleapis.com maps-backend.googleapis.com tile.googleapis.com elevation-backend.googleapis.com --project "$PROJECT_ID"

export VITE_STRAVA_REDIRECT_URI="${VITE_STRAVA_REDIRECT_URI:-https://storage.googleapis.com/${BUCKET}/index.html}"
FRONTEND_ORIGIN="$(node -e "console.log(new URL(process.env.VITE_STRAVA_REDIRECT_URI).origin)")"

# Get existing broker URL if it exists
BROKER_URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)' 2>/dev/null || echo "")"

if [[ -n "$BROKER_URL" && "${DEPLOY_BACKEND:-false}" != "true" ]]; then
  echo ">>> [SKIP] Cloud Run backend deployment skipped."
  echo ">>> [INFO] Using existing Cloud Run broker at: $BROKER_URL"
  echo ">>> [INFO] Pass --deploy-backend or set DEPLOY_BACKEND=true to force a redeployment."
else
  echo ">>> [DEPLOY] Deploying Cloud Run broker..."
  if ! gcloud secrets describe strava-client-secret --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf "%s" "$STRAVA_CLIENT_SECRET" | gcloud secrets create strava-client-secret --project "$PROJECT_ID" --replication-policy=automatic --data-file=- >/dev/null
  else
    printf "%s" "$STRAVA_CLIENT_SECRET" | gcloud secrets versions add strava-client-secret --project "$PROJECT_ID" --data-file=- >/dev/null
  fi

  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")"
  gcloud secrets add-iam-policy-binding strava-client-secret \
    --project "$PROJECT_ID" \
    --member "serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role roles/secretmanager.secretAccessor >/dev/null

  BROKER_URL="$(gcloud run deploy "$SERVICE" \
    --source server \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --allow-unauthenticated \
    --set-env-vars "STRAVA_CLIENT_ID=${VITE_STRAVA_CLIENT_ID},ALLOWED_ORIGIN=${FRONTEND_ORIGIN}" \
    --set-secrets "STRAVA_CLIENT_SECRET=strava-client-secret:latest" \
    --format='value(status.url)')"
fi

export VITE_STRAVA_AUTH_BASE_URL="$BROKER_URL"

PUBLIC_FLAG="--private"
if [[ "$PUBLIC" == "true" ]]; then
  PUBLIC_FLAG="--public"
fi
./scripts/deploy-gcs.sh --project "$PROJECT_ID" --bucket "$BUCKET" --location "$LOCATION" "$PUBLIC_FLAG"

echo "Cloud Run broker: $BROKER_URL"
echo "Static frontend: https://storage.googleapis.com/$BUCKET/index.html"
echo "Set the Strava app callback domain/redirect URI to match: $VITE_STRAVA_REDIRECT_URI"
