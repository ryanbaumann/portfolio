# Repository Learnings

This log captures durable lessons discovered while building and maintaining the portfolio and demo lab, keeping the root instructions lean.

## 2026-07-18 - Social automation should stop at an editable draft

Context: A new Field Note needed to create useful LinkedIn and X starting points without granting a merge workflow authority to publish externally.
Learning: Trigger only for newly added draft files, create one Buffer draft per explicitly configured channel, and leave editing, timing, and publication in Buffer. Do not repeat external staging on a workflow rerun. Once someone edits a Buffer draft, exact-copy matching is no longer an idempotency key.
Evidence: Buffer's GraphQL API supports `saveToDraft: true`, returns the created post ID, and documents that the post remains unpublished until explicitly scheduled. The workflow now limits merge-time staging to its first attempt; a partial failure is recovered by explicitly staging the missing channel from Writer.
Use next time: Separate generation from publication, scope automation to added content, provide a front-matter opt-out, use exact destination IDs, and keep automatic retries side-effect free unless the external API supports a durable idempotency key.

## 2026-07-18 - Separate content ownership, social orchestration, and publishing approval

Context: Field Notes needed a manageable path from one canonical post to Substack, LinkedIn, X, and possible future social channels.
Learning: Keep the portfolio as the canonical archive, use Buffer as the multi-network approval queue, and keep Substack manual until it offers a supported ongoing publishing API. Generate channel-specific drafts, but require an explicit approval action before any external post is created. Direct per-network integrations add credential, API-review, versioning, and retry complexity before the publishing cadence proves that work is necessary.
Evidence: Substack documents RSS archive import and manual copy-and-paste, not an ongoing post-creation API. LinkedIn's Posts API requires OAuth permissions and versioned requests. X charges for API writes. Buffer supports LinkedIn, X, and other networks through one API and can retain API-created posts as drafts awaiting approval.
Use next time: Start new social channels in the shared approval calendar. Keep credentials out of the public repository and browser, require explicit confirmation for Writer actions, and suppress automatic external effects on workflow reruns.

## 2026-07-18 - Primary content belongs in primary navigation

Context: Field Notes appeared as a special header button beside Contact while the rest of the site destinations lived in the primary navigation. On mobile, that split forced the navigation onto a second full-height row and obscured the intended content hierarchy.
Learning: Put the site’s main reader destination first in the semantic primary navigation. Reserve header actions for utilities, and keep mobile navigation in one horizontally scrollable row so 44-pixel targets do not require a second tier. When links overflow, retain a visible native scroll affordance.
Evidence: The rendered header now leads with Field Notes in the primary nav, removes the duplicate Field Notes action, and keeps branding, visibly scrollable navigation, Contact, and the theme control on one mobile row. A build regression test asserts the nav order.
Use next time: Start hierarchy changes from the semantic link order, then let the mobile layout preserve that order without duplicating destinations as calls to action.

## 2026-07-17 - Navigation and card affordances need structural regression tests

Context: A homepage hierarchy pass removed Resume from the primary header and left Talks out, while collection rows made only the title clickable even though their image and summary looked like one interactive result.
Learning: Global navigation destinations and card-sized interaction targets are product behavior, not styling details. Test the rendered primary nav and require a single semantic anchor to wrap every clickable result so pointer, keyboard, and analytics behavior stay aligned.
Evidence: Portfolio build tests now assert Work, Talks, and Resume in the primary nav, verify that writing and talk row anchors contain the image, title, summary, and metadata, and confirm that bodyless work cards honor their declared internal destination.
Use next time: When restructuring the header or collection layouts, update hierarchy without deleting established destinations, and verify both the complete rendered anchor boundary and its final `href` before accepting the visual change.

## 2026-07-17 - Pin every portfolio GCP command to its authorized project

Context: The local gcloud default can point at an unrelated Google Cloud project even when the repository's deployment variables correctly name the portfolio project.
Learning: This repository is authorized to use only `geojson-bq-blog`. Every command must pass that exact project explicitly; never infer authority from the active gcloud configuration and never use `gmp-demos-ryanbaumann` here.
Evidence: Ryan explicitly confirmed the project boundary. The deploy preflight now fails unless `GCP_PROJECT_ID` equals `geojson-bq-blog`, and the repository and domain-migration instructions record the same guardrail.
Use next time: Before any Google Cloud read or write, resolve the target from repository configuration, confirm it is exactly `geojson-bq-blog`, and include `--project geojson-bq-blog` or a validated equivalent in the command.

## 2026-07-17 - A domain cutover includes generated binaries and dependent origins

Context: Replacing canonical URL strings did not update domain text already rasterized into social-card JPEGs, and the Lab metadata still pointed at removed PNG variants. The deploy smoke also moved to the new host before DNS was ready, while writer OAuth retained a host-bound old origin.
Learning: Prepare the code first, map and certify the new host against the current service, then deploy the canonical change. Regenerate binary assets, validate absolute metadata assets, and migrate every host-bound integration such as OAuth callbacks and cookies in the same cutover.
Evidence: Social cards were regenerated with `ryanbaumann.dev`; Lab metadata now resolves to JPEGs; production smoke checks redirects, feed, sitemap, canonicals, and social assets; the domain runbook orders DNS before the cutover deploy and includes writer OAuth.
Use next time: Treat a domain move as a dependency inventory, not a string replacement. Check generated text in images, absolute asset URLs, deployment health targets, OAuth origins, email senders, analytics, API referrers, and search ownership before changing DNS.

## 2026-07-17 - Distribution and privacy copy must match the deployed data path

Context: The live site loaded privacy-preserving GA4 analytics by default while the Privacy page described an opt-in control, and the email implementation still used Resend's retired Audience API.
Learning: Treat the owned site and email provider as the canonical publishing and subscriber systems, and treat social/newsletter platforms as attributed distribution channels. Privacy copy must describe actual runtime behavior. Campaign values should be narrowly allowlisted before analytics receives them, and provider integrations must be checked against current first-party API documentation rather than inherited terminology.
Evidence: The portfolio now loads GA4 only on the canonical host, sends only bounded `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` values, records confirmed sign-ups, and discloses default-on analytics. `/api/subscribe` now writes Contacts with a dedicated Resend Segment and Topic; gateway and portfolio suites pass.
Use next time: Audit runtime, public disclosure, setup docs, and provider API vocabulary together whenever analytics or subscriptions change. Never infer email consent from a social follow or connection.

## 2026-07-17 - Optimize social previews and sitemaps for AEO/SEO

Context: Large OpenGraph image assets (>1MB PNGs) delay scrapers and AI search engines, and hero image lazy-loading slows Largest Contentful Paint (LCP) performance.
Learning: Shift social card generation from PNG to highly compressed JPEGs (~100KB, quality 70) and mandate JPEG format under 200KB in the review guidelines. Set above-the-fold hero images to eager loading to prevent LCP layout shifts. Additionally, inject `<image:image>` tags into `sitemap.xml` for visual indexing, and configure apple-touch-icon/thumbnail fallbacks in layout headers for answer engines.
Evidence: `scripts/social-cards.mjs` modified to screenshot JPEG type with quality 70, sitemapXml in `portfolio/build.mjs` enhanced with visual metadata schema, and `.agents/skills/portfolio-review/SKILL.md` updated with compression limits. All social images compressed and sitemap generated.
Use next time: Always generate visual social metadata as compressed JPEGs (under 200KB) and configure eager loading for hero images above the fold. Ensure sitemap and header metadata expose visual assets explicitly for answer engine crawlers.

## 2026-07-17 - `node --test <dir>/` stopped accepting a bare directory argument

Context: `portfolio/package.json` ran its suite with `node --test test/`, which passed on the Node 22 minors CI had been using.
Learning: On Node v22.22, `node --test test/` fails with `Cannot find module .../test` — the runner resolves the bare directory as an entry module instead of a test pattern. An explicit glob (`node --test test/*.test.mjs`) behaves identically on old and new minors.
Evidence: The same checkout, same suite: directory form exits 1 with `MODULE_NOT_FOUND`; glob form runs all 23 tests green.
Use next time: Point `--test` at explicit glob patterns, not a bare directory, anywhere a Node minor bump can land before the script is revisited.

## 2026-07-17 - Reader features should reuse the boundaries the site already has

Context: Adding an email list and post comments could easily have meant a database, an auth system, and a moderation surface — none of which this zero-dependency container wants.
Learning: Route new reader features through boundaries that already exist. Subscriptions became one gateway route into the Resend account the contact form already uses (audience membership here, sends composed as dashboard broadcasts); comments became GitHub Discussions rendered by giscus, config-gated in `site.json` so the build stays script-free until the IDs are deliberately filled in.
Evidence: `/api/subscribe` in `gateway/server.js` (honeypot + rate limit + keyless 503, mirroring `/api/contact`), `commentsSection`/`subscribeSection` in `portfolio/build.mjs`, setup runbook in `docs/EMAIL_LIST_AND_COMMENTS.md`.
Use next time: Before adding a stateful feature, check whether an existing provider account, the gateway's route patterns, or GitHub itself can hold the state; wire the feature to fail closed (inert markup, JSON/HTML 503) when its configuration is absent.

## 2026-07-16 - Let the resident agent adapt portable prompts

Context: Agent harnesses use different global instruction files, skill directories, import mechanisms, and reload behavior. A dedicated cross-harness installer duplicated knowledge that the resident coding agent can inspect directly.
Learning: Keep one vendor-neutral prompt as the source of truth and publish a bounded self-install task packet. Tell the resident agent the desired end state, preservation rules, prohibited configuration changes, and verification evidence. Let it choose the current native mechanism for its environment.
Evidence: `agent-scripts/coding-agent-loop/README.md` now gives users one copyable install request. The role files state when they apply and that they narrow rather than expand authority.
Use next time: Prefer a self-install instruction over adapter code when the target is another capable agent and installation is a small, inspectable configuration task. Add tooling only after repeated installation failures show that deterministic automation is needed.

## 2026-07-16 - Private release previews need an identity boundary

Context: A shared dashboard password cannot satisfy an account-specific review workflow or provide a useful audit boundary for release decisions.
Learning: Protect the release dashboard with Google OAuth, restrict the accepted verified email server-side, use an exact HTTPS callback origin, and keep GitHub write credentials only in the gateway. The browser may render drafts but never receives a GitHub token.
Evidence: `gateway/lib/googleAuth.js` exchanges the authorization code server-side, asks Google to validate the ID token, checks the allowed email, and signs a short-lived HttpOnly session.
Use next time: Register the exact callback URL before deployment and keep any future coding-agent feedback integration behind the same authenticated gateway boundary.

## 2026-07-16 - Review requests need an explicit handoff

Context: A direct edit box and publish controls do not show an author what happens between a draft and release.
Learning: Make the review handoff visible in the dashboard: save the concrete draft first, collect a short author note, and create one review request that names the exact file, branch, and the writing, review, and design skills the agent must use. Keep the review token scoped to Issues, separate from the Contents token.
Evidence: `requestWritingReview` opens a GitHub issue with those review lanes, and the writer dashboard links back to the issue after submission.
Use next time: Do not let a review request silently publish, edit, or skip the rendered preview. Require an explicit follow-up action for each of those transitions.

## 2026-07-16 - Agent instructions and executable scripts need separate namespaces

Context: The repository already used `scripts/` for executable build and maintenance programs, while a growing collection of copyable agent prompts also needed a memorable GitHub home.
Learning: Store prompts, role contracts, and behavioral evals under `agent-scripts/`, with one self-contained folder per artifact. Keep the canonical prompt in that package and use `portfolio/content/scripts/` only for the reader-facing summary and source links. This makes the trust boundary visible and avoids maintaining two prompt copies.
Evidence: `agent-scripts/coding-agent-loop/` contains the canonical prompt, role overlays, README, and 16-case specification; `portfolio/content/scripts/loop-engineering-coding-agent.md` links to those files and the build publishes `/scripts/`.
Use next time: Copy `agent-scripts/_TEMPLATE/`, add eval cases before tuning behavior, then add one portfolio summary entry. Never put prompt text in the executable `scripts/` tree or duplicate the canonical prompt in CMS prose.

## 2026-07-15 - Initial Release

Context: Preparing the repository for its initial public release.
Learning: Compressed the prior learnings log for the initial public launch to keep history clean.
Evidence: Initial commit of the public repository.
Use next time: Document future durable lessons here using this format.

## 2026-07-16 - Copy taste: metrics, third-party tools, and humble voice

Context: Reviewed copy and claims across the site with Ryan. Prior guidance said
"metrics are the spine, use the number," which pushed precise internal
current-employer growth figures (300% users, ~200% API engagement) onto public
pages.
Learning: This is a personal dev brand, not an employer marketing page. Three
taste rules emerged. (1) Metrics: real numbers are fine for public/verifiable
stats (npm downloads), prior-company results, and aged or long-public
current-employer work; recent internal current-employer usage or growth figures
read as internal and sales-pitchy, so use qualitative, understated framing
instead. (2) Third-party tools: name first-party surfaces (AI Studio), never
enumerate competitor AI products (name-brand IDEs, assistants, agent apps), which
reads like tool-shopping or looking for work elsewhere. (3) Voice: default to
"Our team built… I led the strategy and stayed close to the work," crediting
cross-functional partners, without diluting genuinely individual work.
Evidence: Session with Ryan; changes folded into `portfolio-writing`,
`portfolio-review`, and `docs/PORTFOLIO_EVIDENCE_LEDGER.md`.
Use next time: Follow the updated skills and ledger. Keep HITL artifacts (PR and
commit messages) high-level; do not expose internal specifics.

## 2026-07-17 - Answer Engine Optimization (AEO) and Standardizing Open Graph Images

Context: Auditing the portfolio for Search Engine Optimization (SEO) and Answer Engine Optimization (AEO) best practices, and checking social thumbnail dimensions.
Learning: AEO prioritizes visible DOM elements over raw metadata (e.g., `<meta>` tags and JSON-LD). Rendering summaries in the visible body text (like a `.lede` paragraph right under the headline) dramatically improves discoverability for AI models (like Perplexity or Google AI Overviews). Additionally, the standard for Open Graph images is 1200x630 pixels. Expanding the build script's image validation to accept both 1200x627 and 1200x630 allows a smooth migration to standard sizes without breaking the build on existing 1200x627 assets.
Evidence: Modified `portfolio/build.mjs` to render `meta.summary` in a `<p class="lede">` paragraph for detail pages and standalone pages, and updated image validation on lines 122 and 213. Ran `node build.mjs` and the smoke tests (`node scripts/smoke.mjs`), which successfully passed.
Use next time: Always render summary metadata visibly in the DOM to assist AI engine indexers. When updating layout/image validation standards, support legacy sizes concurrently to prevent build blockages during migration.
