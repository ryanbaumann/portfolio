# Fieldwork identity migration

Fieldwork is the public brand, GitHub repository name, container repository,
and Cloud Run service name. The canonical public origin remains
`https://ryanbaumann.dev/`, and `portfolio/` remains the internal site package
directory so existing tooling and environment variables do not churn.

## GitHub repository

Rename the repository after the migration branch is pushed:

```bash
gh repo rename fieldwork --repo ryanbaumann/portfolio --yes
git remote set-url origin https://github.com/ryanbaumann/fieldwork.git
```

If the CLI cannot perform the rename, open **Settings → General → Repository
name** in `ryanbaumann/portfolio`, enter `fieldwork`, and confirm. Then update
the local remote with the second command above. GitHub preserves redirects for
old repository URLs, but verify both the repository root and a deep source link:

```bash
curl --head https://github.com/ryanbaumann/portfolio
curl --head https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop
```

Repository Actions secrets, variables, environments, issues, pull requests,
stars, and watchers move with a GitHub repository rename. The deploy workflow's
repository guard must name `ryanbaumann/fieldwork` before merging.

Workload Identity Federation does not update automatically. Before renaming,
add `assertion.repository == 'ryanbaumann/fieldwork'` to the provider condition
and grant the matching `attribute.repository/ryanbaumann/fieldwork` principal
both `roles/iam.workloadIdentityUser` and the repository's existing token-creator
role on the deploy service account. Keep the old repository principal through
the migration window, then remove it in a separately verified cleanup.

## Cloud Run

Cloud Run services cannot be renamed in place. The safe migration is a parallel
service followed by a domain cutover:

1. Create the `fieldwork` Artifact Registry Docker repository in `us-west1`.
2. Create the `fieldwork` Cloud Run service from the current `trails-ninja`
   service configuration, including its service account, scaling settings,
   runtime environment names, Secret Manager references, and public invoker
   policy. Never print or copy secret values.
3. Verify `https://fieldwork-gajikud3na-uw.a.run.app/api/healthz` and run the
   production smoke test against the new direct service URL.
4. Merge the workflow change and confirm the resulting image is stored under
   `us-west1-docker.pkg.dev/geojson-bq-blog/fieldwork/app` and deployed to the
   `fieldwork` service.
5. Cut the domain mappings over with the explicit sequence below, then run
   `node scripts/smoke-production.mjs` against the public origin.
6. Keep `trails-ninja` available during the observation window. Removing it is
   a separate, explicitly approved cleanup after the public domain, writer,
   OAuth, contact, subscription, and Lab paths are verified.

Every Google Cloud command must include `--project geojson-bq-blog` and the
service commands must include `--region us-west1`. For this migration, local
commands also use `--account rsbaumann@gmail.com`.

### Domain mapping cutover

Cloud Run's domain-mapping command has no separate update operation. First
record and verify the current owner:

```bash
gcloud beta run domain-mappings list \
  --account rsbaumann@gmail.com \
  --project geojson-bq-blog \
  --region us-west1 \
  --format='table(metadata.name,spec.routeName,status.conditions[0].status)'
```

Do not start the cutover unless the direct `fieldwork` service smoke is green.
Start with `ryanbaumann.dev`. Although the CLI documents `--force-override`, it
can reject a same-project mapping as already existing. The verified fallback is
an exact delete followed immediately by a recreate:

```bash
gcloud beta run domain-mappings delete \
  --account rsbaumann@gmail.com \
  --project geojson-bq-blog \
  --region us-west1 \
  --domain=DOMAIN \
  --quiet

gcloud beta run domain-mappings create \
  --account rsbaumann@gmail.com \
  --project geojson-bq-blog \
  --region us-west1 \
  --service fieldwork \
  --domain=DOMAIN \
  --force-override
```

This changes live routing, can interrupt HTTPS while a replacement certificate
is provisioned and propagated, and requires explicit approval at execution
time. Reuse the existing DNS records. Wait for the mapping's Ready and
CertificateProvisioned conditions, then verify every published edge before
moving another domain:

```bash
gcloud beta run domain-mappings describe \
  --account rsbaumann@gmail.com \
  --project geojson-bq-blog \
  --region us-west1 \
  --domain DOMAIN \
  --format='yaml(spec.routeName,status.conditions,status.resourceRecords)'
```

Then verify HTTPS, redirects, and the complete production smoke suite. If a
mapping or application check fails, rollback that exact domain with the same
delete-and-recreate sequence using `--service trails-ninja`. The legacy service
remains ready for this purpose.

Once `ryanbaumann.dev` serves `fieldwork` and the strict public production smoke
is green, remove `ROOT_APP_COMPAT_NAME: portfolio` from the deploy workflow.
The three redirect-only mappings may remain on `trails-ninja` during the
observation window as long as their direct-to-canonical redirects pass. Move
them one at a time later rather than accepting three simultaneous certificate
outages.

## Route compatibility

The brand migration does not rename public site paths. Before and after the
cutover:

- compare every `<loc>` in the production and candidate `sitemap.xml` files;
- compare every entry in `redirects.json`;
- verify `/portfolio/` and `/portfolio/work/` still return HTTP 308 redirects
  to `/` and `/work/` with query strings preserved;
- run the complete local build and smoke suite;
- run production smoke against the candidate Cloud Run URL and again against
  `https://ryanbaumann.dev/` after domain cutover.

Do not delete an alias, redirect, the old GitHub redirect, or the legacy Cloud
Run service merely because the new identity is live.
