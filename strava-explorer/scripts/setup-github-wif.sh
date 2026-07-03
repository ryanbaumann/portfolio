#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
ACCOUNT="${GCLOUD_ACCOUNT:-}"
REPO="${GITHUB_REPO:-}"
POOL_ID="${GCP_WIF_POOL:-github-actions-pool}"
PROVIDER_ID="${GCP_WIF_PROVIDER_ID:-github-actions-provider}"
SA_NAME="${GCP_WIF_SA_NAME:-github-actions-deployer}"

usage() {
  echo "Usage: $0 --project <GCP_PROJECT_ID> --account <GCLOUD_ACCOUNT> --repo <GITHUB_REPO> [options]" >&2
  echo "" >&2
  echo "Required parameters (or set via environment variables):" >&2
  echo "  --project       GCP Project ID (env: GCP_PROJECT_ID)" >&2
  echo "  --account       Google Cloud Account email (env: GCLOUD_ACCOUNT)" >&2
  echo "  --repo          GitHub repository owner/name (env: GITHUB_REPO)" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --pool-id       Workload Identity Pool ID (default: github-actions-pool, env: GCP_WIF_POOL)" >&2
  echo "  --provider-id   Workload Identity Provider ID (default: github-actions-provider, env: GCP_WIF_PROVIDER_ID)" >&2
  echo "  --sa-name       Service Account name (default: github-actions-deployer, env: GCP_WIF_SA_NAME)" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --account) ACCOUNT="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --pool-id) POOL_ID="$2"; shift 2 ;;
    --provider-id) PROVIDER_ID="$2"; shift 2 ;;
    --sa-name) SA_NAME="$2"; shift 2 ;;
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

if [[ -z "$REPO" ]]; then
  echo "Error: GitHub Repository is required." >&2
  usage
fi

echo "Configuring gcloud context..."
gcloud config set account "$ACCOUNT" >/dev/null
gcloud config set project "$PROJECT_ID" >/dev/null

echo "Enabling necessary IAM APIs..."
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com --project="$PROJECT_ID"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Creating Workload Identity Pool..."
if ! gcloud iam workload-identity-pools describe "$POOL_ID" --project="$PROJECT_ID" --location="global" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --display-name="GitHub Actions Pool"
fi

echo "Creating Workload Identity Provider..."
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="$POOL_ID" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '$REPO'" \
    --issuer-uri="https://token.actions.githubusercontent.com"
fi

echo "Creating Service Account..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="GitHub Actions Deployer"
fi

echo "Binding IAM Roles to Service Account..."
ROLES=(
  "roles/run.admin"
  "roles/secretmanager.admin"
  "roles/storage.admin"
  "roles/artifactregistry.admin"
  "roles/cloudbuild.builds.editor"
  "roles/iam.serviceAccountUser"
  "roles/serviceusage.serviceUsageAdmin"
)

for role in "${ROLES[@]}"; do
  echo "Binding $role..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role" >/dev/null
done

echo "Allowing GitHub Actions Pool to impersonate Service Account..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}" >/dev/null

PROVIDER_URI="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

echo "=================================================="
echo "WIF Configuration Completed Successfully!"
echo "=================================================="
echo "Please add these secrets to your GitHub Repository settings:"
echo ""
echo "GCP_WIF_PROVIDER: $PROVIDER_URI"
echo "GCP_SA_EMAIL: $SA_EMAIL"
echo "=================================================="
