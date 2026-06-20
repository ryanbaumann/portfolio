#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="geojson-bq-blog"
ACCOUNT="rsbaumann@gmail.com"
REPO="ryanbaumann/trails.ninja"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-actions-provider"
SA_NAME="github-actions-deployer"

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
