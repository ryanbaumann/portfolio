# Learnings

## 2026-07-15 — Cloud Build ignores nested markdown files due to recursive ignore pattern

Context: Static site content pages (`/about/`, `/contact/`, and other work/writing detail pages) returned 404 in production, while running successfully locally and passing the local gateway unit/smoke tests.
Learning: `gcloud builds submit` respects `.gcloudignore`. If a generic pattern like `*.md` is specified, it matches recursively across all directories, excluding all content markdown files from the Cloud Build source context. This causes the static site generator to compile successfully but with zero CMS entries or standalone pages, producing 404s for any page other than the static directories.
Evidence: The Cloud Build build logs showed `[portfolio] built 5 pages` instead of the expected 26. Changing `.gcloudignore` to use the anchored `/*.md` pattern matches only root markdown files and resolves the missing content in the built image.
Use next time: Anchor file-type ignore patterns (like `*.md` or `*.json`) in `.gcloudignore` with a leading slash (`/*.md`) to prevent ignoring content and config files nested in nested directories.

## 2026-07-15: Published content renames need server redirects, not duplicate pages

Context: The first essay used `devex` in its public URL, while the preferred term and future title are `DevX`.
Learning: Changing a slug and canonical tag is not enough. Published links need one declarative alias that the static build validates and the runtime turns into a permanent redirect. Rendering HTML at both paths creates duplicate content and does not guarantee an HTTP redirect.
Evidence: The build now emits `redirects.json` from front-matter aliases, the gateway returns HTTP 308 while preserving the query string, and tests cover the runtime behavior.
Use next time: When renaming a work, writing, or talk detail page, set the new `slug`, append the previous path to `aliases`, update `canonical`, and verify both the new 200 response and old 308 response.

## 2026-07-15: Lab source, visibility, and API runtime are independent contracts

Context: New labs can be authored in the portfolio, imported from a public repository, or built from confidential source while still sharing one gateway.
Learning: Source location (`workspace` or immutable artifact), listing/access (`public`, `unlisted`, or `private`), and API ownership (`none`, gateway, or authenticated upstream) must be modeled independently. Coupling them creates skipped CI, leaked source, or APIs that bypass the private static gate.
Evidence: The manifest now drives dynamic package CI and container staging; trusted deploy verifies private artifacts; private upstream requests require the owning app session and a fixed service identity.
Use next time: Choose one value on each axis, register it in `apps.json`, and make CI prove the declared build, route, auth denial, and runtime configuration before cutover.

## 2026-07-14: Light/Dark theme compatibility in SVG graphics using native CSS variables

Context: Redesigning artifact cards (thumbnails) to look consistent in both light and dark modes without maintaining multiple static assets.
Learning: Inline SVG graphic assets can use CSS Custom Properties (e.g. `var(--surface)`) that resolve directly to the hosting site's document variables when embedded inline. When referenced as images (e.g. `<img>`), SVGs can still resolve native media queries like `@media (prefers-color-scheme: dark)` inside their `<style>` tags to match the client's system theme dynamically.
Evidence: Updated the `scripts/artifact-cards.mjs` generator script to output system-theme-aware styles. Verified that the resulting SVG artifact cards transition cleanly on the portfolio index pages when toggling dark mode.

## 2026-07-15: A routing manifest cannot double as an external-link catalog

Context: Two GitHub URLs were placed in the `path` field of private `apps.json` entries and CI was changed to skip their builds and routes.
Learning: `apps.json` is executable deployment metadata. A green build that skips an entry proves nothing, and gateway password auth cannot protect another host. External or source links need separate fields or portfolio content; hosted apps need internal routes and complete build/runtime wiring.
Evidence: Both records resolved as unavailable, were filtered from public discovery, could never match a request pathname, and received no build, route, asset, API, or preview checks. `npm run check:labs` now rejects that incomplete state.
Use next time: Classify the project first, keep `path` internal, and require every manifest record to pass the same package, Docker, CI, gateway, privacy, and smoke contract.


## 2026-07-14: Node `--env-file` crashes if the specified file does not exist

Context: Executing `npm start` which runs `node --env-file=.env gateway/server.js` fails with an unhandled exit code when `.env` is absent.
Learning: Node's native `--env-file` flag does not fail silently or fall back to system env when the file is missing; it throws a fatal startup exception (`node: .env: not found`). To ensure the server starts gracefully without requiring a setup flow in CI/CD or clean clones, a dummy `.env` file should be touched or verified before startup.
Evidence: Running `touch .env && npm start` successfully resolved the startup crash.
Use next time: Always verify or initialize a blank environment file before executing scripts using Node's `--env-file` flag.

## 2026-07-14: Optimizing Cloud Run for zero-cost idleness with snappy cold starts

Context: The deployment workflow kept one warm instance (`--min-instances 1`) to avoid cold start latency, which incurred continuous idle billing.
Learning: For a zero-npm-dependency Node.js gateway that starts in milliseconds, a warm instance is unnecessary. Scaling to zero (`--min-instances 0`) reduces costs to $0.00 when idle. To keep the first request snappy, Cloud Run's Startup CPU Boost (`--cpu-boost`) temporarily allocates extra CPU during container startup, shortening cold start times to a fraction of a second.
Evidence: Updated `.github/workflows/deploy.yml` with `--min-instances 0` and `--cpu-boost`. Since the Node.js gateway has no heavy dependencies and starts in under 20ms, it is a perfect candidate for zero-instance scaling without degrading user experience.
Use next time: For lightweight containers (e.g., zero-npm-dependency Go/Rust/Node gateways), scale to 0 and enable `--cpu-boost` rather than paying for warm standby instances.

## 2026-07-14: Configure gitleaks ignore configuration for mock credentials

Context: The `secret-scan` GitHub Action failed on mock credentials in `.agents/skills` reference documentation (like `YOUR_API_KEY` and mock `pageToken` strings) and build artifacts (`aqi-map/build/bundle.js` and `strava-explorer/build/bundle.js`).
Learning: To keep reference documentation and build artifacts in the repository without triggering false positives in Gitleaks scans, configure a `.gitleaks.toml` file at the repository root and define path regexes under the `[allowlist]` block.
Evidence: The `gitleaks detect --no-git -v` command failed locally due to these false positives, but passed with `no leaks found` once `.gitleaks.toml` was added.
Use next time: Place `.gitleaks.toml` at the root directory of repositories using `gitleaks` to cleanly isolate documentation-only paths and generated folders.

## 2026-07-14: Never put a comment inside a backslash-continued shell command

Context: A generated edit to `.github/workflows/deploy.yml` inserted a `# comment` line between `--port 8080 \` and `--min-instances 1` in the `gcloud run deploy` invocation.
Learning: A backslash continuation joins the next physical line onto the command, so a comment line there comments out the rest of the joined line and turns every following flag line into a separate (failing) command. The flag silently never reaches the command and, under `set -e`, the step dies.
Evidence: Caught in review before commit; reproduced with `bash -n` plus a joined-line trace, then fixed by moving the comment above the whole command.
Use next time: In multi-line shell commands, comments go above the command, never between continued lines. When reviewing agent-generated workflow edits, read continued commands as one joined line.

## 2026-07-14: Contact filtering needs a delivery-first third state

Context: The contact route silently dropped any message matching a broad keyword or dotted-Gmail heuristic, and treated any Gemini response containing `SPAM` as final.
Learning: A personal contact form should distinguish obvious advertising from uncertain mail. Only a bot-only trap should silently suppress a submission; deterministic and model classifications should create inbox-filterable review labels until a frozen inference eval proves a zero-false-drop threshold. Model output must still be structured and category-gated, and every ambiguous, malformed, or failed classifier result must reach the owner.
Evidence: The old route could discard legitimate messages, sent visitor identity fields to Gemini, and redirected suppressed spam with `delivered=1`. The new tri-state module excludes identity fields, tags suspected advertising, fails open, and reserves lead analytics for Resend-confirmed delivery.
Use next time: Freeze legitimate and advertising cases before tuning a classifier. Make false-positive prevention a blocking gate, keep PII outside model calls, and never let anti-spam decisions masquerade as provider-confirmed business events.

## 2026-07-13: Demo source paths belong in the manifest

Context: Demo packages moved from repository-root folders into `demos/`, while their public URLs and staged container paths needed to remain unchanged.
Learning: Repository source location, public route, and runtime staging location are separate concerns. Build tooling must derive the source package from `dev_build_dir` instead of assuming an app's manifest name is also a top-level folder.
Evidence: The old build-local path lookup coupled `app.name` to the repository root. The migration now resolves nested source directories from `dev_build_dir`, preserves all three public routes, and has a focused regression test plus the staged 17-route smoke test.
Use next time: Add or move demos by updating `dev_build_dir` and the documented build surfaces; never reconstruct a source path from the public app name.

## 2026-07-13: Empty proxy bases must still produce same-origin URLs

Context: Strava photo proxy support existed, but production left `VITE_STRAVA_AUTH_BASE_URL` empty because the gateway is same-origin.
Learning: An empty proxy base is a valid deployment mode, not a reason to bypass the proxy. URL helpers must distinguish an absent image URL from an intentionally empty broker origin.
Evidence: The client returned raw CloudFront URLs whenever the base string was empty, so Maps 3D canvas reads still hit responses without CORS. A pure URL helper now maps allowlisted photos to `/api/photo-proxy` for the default deployment and has unit coverage for same-origin, cross-origin, and unsupported URLs.
Use next time: Test URL builders with the exact production default, including empty-origin configuration, before treating proxy wiring as complete.

## 2026-07-13: Private visibility must fail closed at manifest load and static routing

Context: The gateway gated static files only when an app was both `private` and had an `auth` object.
Learning: Security metadata cannot be optional after a resource is marked private. Validate the manifest at boot, then gate every private request before availability checks or static serving.
Evidence: A private entry with missing or malformed auth metadata previously fell through to `serveFromDir`. Manifest validation now rejects it, direct index and asset requests return an auth response, missing secrets return `503`, and integration tests cover public, unlisted, private, authenticated, and missing-secret paths.
Use next time: Make the secure state the outer condition, reject incomplete configuration early, and include direct static-asset requests in authorization tests.

## 2026-07-13: A root setup file only works when every build path loads it

Context: `npm run setup` wrote browser and server configuration to the root `.env`, while Vite builds ran from app directories and never read that file.
Learning: A setup wizard and a build runner form one contract. The runner must load the generated file explicitly, preserve already-exported variables, and never log values.
Evidence: The staged build now loads the root `.env` before spawning app builds, and setup prompts separately for restricted browser keys, the server key, and optional contact configuration.
Use next time: Test setup output variable names against the actual build/deploy inputs and keep browser-public `VITE_*` values separate from server-only credentials.

## 2026-07-13: Contact pages should hide owner email addresses at the rendering layer

Context: The portfolio needed contact UX without exposing Ryan's personal email address in the HTML.
Learning: A static portfolio can still keep the owner's address private by posting to a same-origin backend route and reading the recipient from server-only environment variables. The public form should collect the visitor's reply address, while the server uses `CONTACT_TO_EMAIL` and provider credentials such as `RESEND_API_KEY`.
Evidence: Today's pass removed public `mailto:` links to Ryan's address, added `/contact/`, and routed submissions through `/api/contact`. The route returns a setup message when mail credentials are missing instead of leaking a fallback address.
Use next time: Never solve portfolio contact by adding a visible owner email. Add or reuse a backend form route, document the server-only env vars, and make missing-provider behavior explicit.

## 2026-07-12: AEO works best when the page and schema say the same thing

Context: A repo-wide copy pass needed to improve search and answer-engine clarity without adding vague keyword stuffing.
Learning: For a personal portfolio, the strongest answer-engine optimization is a tight visible summary plus matching structured data. The homepage should say who Ryan is, what he works on, and what proof exists; JSON-LD should reinforce that same claim with `ProfilePage`, `Person`, and concrete `knowsAbout` topics.
Evidence: Today's pass added visible proof points in `site.json` and rendered them on the homepage, then aligned `ProfilePage` and `Person` JSON-LD around the same answer-engine summary instead of adding hidden claims.
Use next time: Do not hide AEO in metadata only. Put the answer on the page first, keep it verifiable, then mirror it in schema.

## 2026-07-11 — Vite environment variables overriding dynamic behavior

Context: We were trying to configure the Strava OAuth app to use a dynamic redirect URI `new URL(..., window.location.origin).href` so that it would work seamlessly on both `localhost:8080` and the production domain `ryanbaumann-portfolio.com`.
Learning: Vite bakes environment variables starting with `VITE_` into the static bundle at build time. Legacy files like `.env.production` or `.env.development` inside the frontend subdirectories (e.g. `strava-explorer/`) that contain hardcoded values (like `VITE_STRAVA_REDIRECT_URI=http://localhost:5173/`) will silently override dynamic JavaScript logic and break the app in unexpected environments.
Evidence: The Strava OAuth flow failed because the `redirect_uri` in the browser URL was hardcoded to `http://localhost:5173/` or `https://YOUR_PRODUCTION_DOMAIN/` instead of detecting the actual origin.
Use next time: When centralizing secrets to a root `.env` or gateway, proactively search for and remove legacy frontend `.env` files in subdirectories that might inject stale values at build time.

## 2026-07-12 — Local `.env` files cause false positives in keyless CI smoke tests

Context: A post-build `secret-leak scan` designed for CI was failing locally. It correctly identified `AIza...` inside the built `isochrones/dist` JavaScript bundle.
Learning: Vite inlines `VITE_` variables into static bundles. While a CI pipeline runs without an `.env` file (resulting in a keyless build that passes the secret scan), running `npm run build` locally picks up any unversioned `.env` files containing real API keys and embeds them into the bundle.
Evidence: The `smoke.mjs` script threw an error `Error: Google API key (AIza...) in apps/isochrones/assets/index-BdY-bDij.js` when run locally, because `isochrones/.env` was present in the working tree.
Use next time: If a CI-focused secret scanner fails when running locally, check if local unversioned `.env` files are being picked up by the build process and baked into the output. Remove or rename them temporarily to test the keyless build behavior.

## 2026-07-12: CI "slowness" was actually a hang

Context: CI felt way too slow, and 10 stuck runs had piled up. The build-and-smoke job ran raw `node --test` in `gateway/`, which imports `server.js` without `NODE_ENV=test`.
Learning: `server.listen()` ran during the test import, so the process never exited; every run hung until GitHub's 6-hour job timeout. Every other job finished in under a minute.
Evidence: 10 stuck workflow runs, each alive for hours, while non-gateway jobs consistently finished in under a minute.
Use next time: When CI is reported as "slow," read per-job step timings first. A hang looks like slowness from the outside. Use `npm test` (sets `NODE_ENV=test`), guard `listen()` on `NODE_TEST_CONTEXT`, and give every job a timeout plus cancel-in-progress concurrency.

## 2026-07-12: Skills only work if they're read before changing the surface

Context: A previous UI pass added a Google Fonts import, 3D tilt card hovers, gradient hero text, and scroll-reveal animations.
Learning: All four violated the documented design system in `.agents/skills/portfolio-design/SKILL.md` (system fonts, hover = accent border + 2px lift, novelty budget on writing, not chrome). Nobody read the skill before touching `style.css`.
Evidence: Today's refresh pulled the CSS back to match the skill; the webfont import, tilt hovers, gradient text, and scroll reveals are gone.
Use next time: Read the governing skill before changing a surface it covers. If a deviation is wanted, update the skill deliberately in the same PR instead of drifting from it.

## 2026-07-12: The remote proxy blocks fetching external images

Context: The remote agent environment's network proxy blocks fetching external assets; YouTube thumbnails and screenshots of external sites returned 403 CONNECT denials.
Learning: There's no way to fetch an honest external screenshot in this environment when one doesn't already exist in the repo, so the fallback has to be something built from real facts, not a fabricated mockup.
Evidence: Direct fetches for external thumbnails and site screenshots failed with 403 CONNECT denials from the proxy.
Use next time: Use a real screenshot or preview shot where one exists. Where none exists, generate an SVG artifact card (`scripts/artifact-cards.mjs`) that states only facts already in the entry copy (real commands, real published stats). Never mock a product UI or fabricate a screenshot.

## 2026-07-12: Missing height: auto in CSS causes aspect ratio distortion when HTML dimensions do not match the physical image

Context: The front page hero image was rendering distorted (squished) because the HTML template had hardcoded `width="960" height="600"` (16:10 aspect ratio), while the physical image was actually `1200x687` (~16:9 aspect ratio). Additionally, CSS styled the width to `min(100%, 34rem)` but did not specify `height: auto;`.
Learning: Without `height: auto;` in CSS, modern browsers fall back to the aspect ratio inferred from the HTML `width` and `height` attributes (default browser stylesheets assign `aspect-ratio: attr(width) / attr(height)`). If these attributes do not match the actual physical image's aspect ratio, the image stretches/squishes. Furthermore, omitting `width` and `height` attributes on other images (like `.article-hero` on detail pages) causes Cumulative Layout Shift (CLS) when pages load.
Evidence: Changing the HTML attributes of `.hero-image` to `width="1200" height="687"` and adding `height: auto;` in CSS resolved the distortion. Adding a zero-dependency image dimension parser helper `getImageDimensions` in `build.mjs` to automatically extract dimensions from SVG and JPEG files at build time and inject them as HTML `width`/`height` attributes resolved CLS across all detail/standalone pages.
Use next time: Always specify `height: auto` on responsive images in CSS, ensure HTML dimension attributes match the actual physical image size, and dynamically parse/inject image dimensions at build time for dynamic content images.

## 2026-07-12: Stale repository filters in deploy workflows cause silent workflow skips

Context: Cloud Run deployments on merges to `main` were silently skipping because `.github/workflows/deploy.yml` had a conditional constraint `if: github.repository == 'ryanbaumann/trails.ninja'`.
Learning: When a repository is moved or renamed, GitHub Actions workflows that filter jobs by `github.repository` must have their hardcoded values updated to the new repository slug. Otherwise, the jobs will evaluate to `false` and skip silently on push/PR triggers.
Evidence: Changing the condition to `if: github.repository == 'ryanbaumann/Portfolio' || github.repository == 'ryanbaumann/portfolio'` allowed the deployment workflow to execute.
Use next time: Always check and update workflow files for stale `github.repository` checks when renaming, moving, or cloning a repository.

## 2026-07-12: Stale Workload Identity Federation attribute conditions block CI deployments

Context: After fixing the workflow skip condition, the `google-github-actions/auth` step failed with an `unauthorized_client` error stating "The given credential is rejected by the attribute condition."
Learning: Google Cloud Workload Identity Federation (WIF) providers validate inbound OIDC tokens against an attribute condition. If the GitHub repository is renamed, the `assertion.repository` claim changes, causing the token to be rejected if the WIF provider condition still strictly expects the old repository name.
Evidence: The WIF provider `github-actions-provider` had the condition `assertion.repository == 'ryanbaumann/trails.ninja'`. Updating it via `gcloud iam workload-identity-pools providers update-oidc` to match `ryanbaumann/Portfolio` resolved the auth failure.
Use next time: When renaming a repository that uses GCP Workload Identity Federation, remember to update the provider's attribute condition in the Google Cloud Console or via `gcloud`, in addition to updating the workflow files.

## 2026-07-12: Stale Workload Identity Federation IAM bindings block CI impersonation

Context: After fixing the WIF attribute condition, the GitHub Actions token was accepted, but the subsequent `gcloud builds submit` step failed with `Permission 'iam.serviceAccounts.getAccessToken' denied on resource`.
Learning: In Google Cloud Workload Identity Federation, authenticating as a WIF principal is only half the battle. That principal must also have the `roles/iam.workloadIdentityUser` role bound on the Service Account it needs to impersonate. If the repository is renamed, the mapped principal (e.g., `principalSet://.../attribute.repository/NEW_REPO`) changes, and the old IAM binding on the service account will no longer grant access.
Evidence: The service account `github-actions-deployer` only allowed impersonation from `attribute.repository/ryanbaumann/trails.ninja`. Adding a new IAM policy binding for `attribute.repository/ryanbaumann/Portfolio` via `gcloud iam service-accounts add-iam-policy-binding` restored the GitHub Action's ability to impersonate the service account.
Use next time: When renaming a repository that uses GCP WIF with Service Account Impersonation, you must update BOTH the WIF provider's attribute condition AND the Service Account's IAM policy bindings to allow the new mapped principal.

## 2026-07-13: Case sensitivity in WIF Service Account IAM bindings blocks CI impersonation

Context: After fixing the WIF attribute condition and IAM bindings to match the new `ryanbaumann/portfolio` repository name, the `google-github-actions/auth` step succeeded, but `gcloud builds submit` still failed with `Permission 'iam.serviceAccounts.getAccessToken' denied on resource`.
Learning: Google Cloud IAM policies are strictly case-sensitive. While GitHub Actions might normalize repository names in some contexts, the actual token's `repository` claim and the Google Cloud IAM bindings evaluate strings exactly. The GitHub token presented the lowercase `ryanbaumann/portfolio`, but the Google Cloud service account policy was strictly bound to the uppercase `attribute.repository/ryanbaumann/Portfolio`.
Evidence: Running `gcloud iam service-accounts get-iam-policy` showed the binding was explicitly for `attribute.repository/ryanbaumann/Portfolio`. Adding a new explicit binding for the lowercase `attribute.repository/ryanbaumann/portfolio` and ensuring the service account held `roles/iam.serviceAccountTokenCreator` resolved the permission denial immediately, allowing the CI/CD job to complete successfully.
Use next time: When diagnosing Workload Identity Federation permission issues, always verify the exact case of the claims presented in the OIDC token against the exact case written in the IAM policy bindings. A mismatch in casing will result in a hard `PERMISSION_DENIED`.

## 2026-07-12: External planning docs need public access or exported assets

Context: A public-readiness pass referenced a Google Doc for image and thumbnail source material.
Learning: The agent environment cannot use a private or account-gated Google Doc as an asset source, even when the URL is provided in the prompt. Public portfolio image passes should rely on checked-in assets, public direct image URLs, or exported files committed under `portfolio/static/`.
Evidence: Opening `https://docs.google.com/document/d/1pkIYPenH9mrjlCg3EoBkBL1tYUZBwrnnCmqeRUkGtRs/edit?tab=t.mkssxc4q84rl` from the browsing tool returned no readable document content.
Use next time: If a source doc contains real images, export or attach those assets before the implementation pass. Otherwise use existing real screenshots first and generated artifact cards only where no honest screenshot exists.

## 2026-07-12: Mobile map demos need dynamic viewport units and explicit touch targets

Context: A mobile-readiness pass found the demos used desktop-friendly `100vh` map shells and panels, plus mobile controls that were reachable but not reliably comfortable on browser UIs with collapsing address bars.
Learning: Map demos should pair `100svh` or `100dvh` with safe-area padding, 44px touch targets, visible focus rings, and a clear mobile panel model. Bottom sheets should default to a useful state and prevent drag gestures from scrolling the page underneath.
Evidence: Updating Strava Explorer's bottom sheet default to half-height, using `visualViewport`, and adding `touch-action`/safe-area CSS made the primary route and tour controls immediately reachable. Updating Air Quality and Isochrones mobile CSS gave the map a stable sticky viewport and made panel controls scroll independently below it.
Use next time: For every new map demo, test the narrow layout first: map remains usable, controls remain reachable by touch and keyboard, panels account for safe areas, and no essential action depends on desktop hover.
## 2026-07-13: Scheduled static content still needs a rebuild

Context: Essays needed an explicit future publication time while the portfolio remained an immutable static build in one Cloud Run image.
Learning: A timestamp can safely exclude future content at build time, but a running static revision cannot make detail pages, indexes, RSS, and sitemap appear together. Freeze one build time, filter every output consumer with it, and schedule a rebuild after the timestamp.
Evidence: Fixed-time fixtures now prove future essays are absent from every public output, present in the private writer build, and public at the first build after `publishAt`; the deploy workflow rebuilds hourly.
Use next time: Treat scheduled publication as a build/deploy concern unless the application has a real runtime content store and renderer.

## 2026-07-13: A protected preview does not make a public-repo draft confidential

Context: The new writer route protects rendered draft pages with a server-side password, signed cookie, no-store caching, and noindex headers.
Learning: Route protection only covers the rendered site. Markdown committed to a public repository and assets copied from a public static directory remain readable outside the preview.
Evidence: The writer workflow documents the boundary explicitly, keeps preview analytics off, and reserves this path for unfinished but non-confidential writing.
Use next time: Put embargoed content and draft-only assets in a private source before claiming confidentiality; do not rely on a password in front of a build derived from public source.

## 2026-07-13: Docker ignore patterns can silently erase a flat-file CMS

Context: The container context ignored `*.md`, while the portfolio builder treats missing collection directories as empty and can still complete successfully.
Learning: A broad Docker ignore pattern matches nested content too. For a Markdown-backed static site, scope root-document exclusions explicitly and verify a known content route after staging or deployment.
Evidence: Changing the pattern to `/*.md` keeps root documentation out of the context while `portfolio/content/**/*.md` remains available; the smoke suite checks `/about/` and the other generated sections.
Use next time: When build inputs are content files, test both build success and expected content presence; an empty successful build is not a valid release.

## 2026-07-13: Private generated output needs an explicit ignore rule

Context: The writer build emits rendered drafts to `portfolio/writer-dist/`, but only the public `dist/` directory was ignored.
Learning: A new output directory containing non-public previews is a disclosure risk even when its deployed route is authenticated.
Evidence: `portfolio/.gitignore` now ignores `writer-dist/`, and `git check-ignore` verifies the generated dashboard is excluded before commits.
Use next time: Add ignore coverage in the same change that introduces any generated preview, export, or private build directory.

## 2026-07-14: Explicit layout constraints are required for HTML/CSS generated infographics

Context: The `portable-infographic-architect` script generated a very tall, vertically stacked infographic for a blog post. While it rendered well standalone, the extreme vertical aspect ratio hijacked the reading experience by pushing all prose below the fold when embedded in an essay.
Learning: Large language models default to vertical stacking (flex-direction: column) when generating HTML/CSS cards for infographics unless explicitly constrained otherwise. A long vertical image works on Pinterest but fails catastrophically as a hero image or embedded asset in an essay.
Evidence: The initial DevX essay thumbnail was unreadably tall. Passing "WIDESCREEN LANDSCAPE 16:9 ASPECT RATIO REQUIRED. Arrange items horizontally side-by-side, NOT vertically." to the script's `--text` parameter successfully forced the LLM to generate a horizontal layout that fit perfectly within the blog design without stretching.
Use next time: When using the `portable-infographic-architect` for blog thumbnails, hero images, or essay embeds, explicitly command the script to use a landscape/widescreen layout and horizontal item arrangement in the prompt. Do not leave the aspect ratio up to the model.

## 2026-07-15: Image-generation settings can outpace an installed SDK

Context: The DevX essay visual pass required Gemini 3.1 Flash Image at 1K with high thinking, but the locally installed Python SDK did not expose `image_size` or `thinking_level` in its typed configuration objects.
Learning: Model support and client-library support can land at different times. Feature-detect optional SDK fields, and use the official REST request shape when a required generation setting is supported by the model but absent from the installed client.
Evidence: Compatibility helpers keep the infographic skill runnable on the current SDK, while the successful final image requests used `imageConfig.imageSize: "1K"` and `thinkingConfig.thinkingLevel: "high"` through the Gemini API.
Use next time: Confirm required image settings against the live client types before a render loop. Archive the exact model, request configuration, prompt, and uncropped source beside the finished asset.

## 2026-07-15: Content quality needs separate deterministic and judgment gates

Context: The DevX essay passed copy, redirect, and visual review, but an independent final check still found JPEG bytes stored behind a `.png` extension after the composition itself looked complete.
Learning: A polished render cannot prove its file contract, and a green build cannot prove voice, causality, or taste. Public content needs deterministic checks for facts that tools can establish, plus independent reviewers for copy, claims, URL ownership, and visual judgment.
Evidence: File-signature inspection caught the mislabeled social source; build and HTTP checks proved canonicals and 308 aliases; desktop/mobile captures exposed the actual reading experience; separate reviewers found issues the maker pass missed.
Use next time: Run the `portfolio-review` maker/checker loop for every publishable change. Inventory claims and assets, verify mechanically first, split independent review by surface, correct one focused set of findings, and stop within three rounds or ask Ryan to decide.
