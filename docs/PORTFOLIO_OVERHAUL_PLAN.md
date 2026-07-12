# Ryan Baumann Portfolio Overhaul Plan

Date: 2026-07-12
Branch intent: first planning commit for the portfolio overhaul PR.

## North star

Ship a personal portfolio for Ryan Baumann first, with the demos as a lab attached to the portfolio. The public identity should be **Ryan Baumann — Maps, developer experience, and agent-ready platforms**. `trails.ninja` becomes the name of the Strava/outdoor lab or legacy repository/container label only where technically necessary; the canonical public site is `https://www.ryanbaumann-portfolio.com/`.

The site should stay fast, boring, and easy to operate: static portfolio, flat-file CMS, one Node gateway, same-origin API proxies, no committed secrets, and validation that lets a human or agent add content without guessing.

## Research inputs

### Repo findings

- The root package and several docs still use `trails-ninja` / `trails.ninja` as the container/site name, while the portfolio content already uses Ryan Baumann as the visible site name.
- The portfolio is a zero-dependency static site generator over `portfolio/content/**`; `site.json` drives global identity/copy, collection markdown drives work/writing/talks, and `../apps.json` feeds demos.
- The portfolio `layout()` emits only basic title, description, and Open Graph fields. There is no canonical URL, `og:url`, `og:image`, Twitter card metadata, JSON-LD, sitemap, robots file, or RSS/Atom feed.
- Portfolio agent guidance is split across tool-specific `.claude/skills/` and `.codex/skills/` paths, even though the requested direction is generic `AGENTS.md` / `.agents/` workflows.
- The blog CMS is intentionally small but too quiet for scaled editing: unvalidated front matter, filename-only drafts, loose dates, no slug/canonical model, and no broken-link/static-asset validation.
- The gateway already centralizes static serving and secret-bearing API calls. It has body limits, keyless `503`s, timeouts, security headers, path traversal protection, and per-route in-memory limiters, but it has no manifest-level private demo model or shared rate-limit backend.
- The Strava photo proxy exists but production gateway image responses diverge from the standalone broker: the gateway does not emit CORS/CORP headers, and popover images still use raw Strava CloudFront URLs instead of the proxy path.
- CI builds and smokes the staged gateway, but only `strava-explorer` gets app-specific lint/tests, deploy has no concurrency, and deploy does not smoke the deployed URL.

### External public-context findings

Use external content only as source material and links, not as scraped copy.

- LinkedIn search result describes Ryan as an engineering leader with 15+ years scaling builder platform businesses and teams at Google, Mapbox, and Instabase: https://www.linkedin.com/in/ryanbaumann
- GitHub profile confirms the `ryanbaumann` handle, Google Maps developer experience context, San Francisco, Substack link, and outdoors/personality signals: https://github.com/ryanbaumann
- Mapbox article by Ryan about Uber/deck.gl custom layers provides concrete older writing/work context for maps, developer tools, and data visualization: https://medium.com/mapbox/launching-custom-layers-with-uber-2a235841a125
- Mapbox article by Ryan about Tableau Conference provides older public Mapbox/data visualization context: https://blog.mapbox.com/howdy-tableau-conference-da63c8152f67
- Public LinkedIn posts surfaced current Google Maps Platform themes: web components, Architecture Center, Innovators, Geospatial AI, Grounding Lite MCP, and agent platform friendliness.
- Public GitHub gists under `ryanbaumann` show hands-on Mapbox GL JS/deck.gl examples: https://gist.github.com/ryanbaumann/143396c1cbc33efe40a39e137aec6c45

## Naming and brand decisions

1. **Canonical site name:** `Ryan Baumann`.
2. **Short positioning line:** `Maps, developer experience, and agent-ready platforms.`
3. **Portfolio codename for docs/internal PR:** `Ryan Baumann Portfolio`.
4. **Lab/demo language:** `Ryan's demo lab`; `trails.ninja` only for the Strava/outdoor demo/lab case study or historical references that cannot be renamed in one PR.
5. **Canonical production URL:** `https://www.ryanbaumann-portfolio.com/`.
6. **Repository/container names:** migrate user-facing text first; rename package/service identifiers only when deployment fallout is understood.

## Workstreams and subagent tasks

Each task should land as its own commit after review. Prefer small patches over a single rewrite.

### Task 1 — Brand, metadata, and documentation consistency

Owner: content/docs subagent.

Scope:
- Update `package.json`, `README.md`, `docs/ARCHITECTURE.md`, `cloudbuild.yaml`, `Dockerfile` comments, app home links, setup/build/previews/smoke comments, portfolio README, and content where public-facing `trails.ninja` should become Ryan-first language.
- Keep historical changelog entries readable by adding clarifying current-state notes instead of rewriting history wholesale.
- Add `siteUrl`, `canonicalHost`, `socialHandle`, `defaultShareImage`, and related fields to `portfolio/content/site.json`.
- Rename or reposition `portfolio/content/work/trails-ninja.md` as a lab/platform case study without making the whole site sound like `trails.ninja`.

Acceptance criteria:
- A search for `trails.ninja` shows only intentional historical, repository, Strava/outdoor-lab, or migration references.
- App home links consistently return users to `Ryan Baumann` or `Ryan's demo lab` rather than the old umbrella brand.
- README and architecture docs state the canonical domain and explain any legacy service/repo names.
- `npm run build` passes.

### Task 2 — Generic agent workflow migration

Owner: agent-instructions subagent.

Scope:
- Move portable skills/guidance from `portfolio/.claude/skills/*` and repo `.codex/skills/*` into `.agents/skills/*` where practical.
- Update `AGENTS.md`, `portfolio/README.md`, `scripts/new-post.mjs`, `portfolio/static/decks/README.md`, and content templates to point to generic `.agents` guidance.
- Preserve compatibility if any tool-specific path is required by current automation, but make `.agents` canonical.
- Keep the changelog and learning log concise, operational, and loop-friendly.

Acceptance criteria:
- A search for `.claude` and `.codex` finds no canonical instruction references except compatibility notes or archived migration notes.
- `.agents/skills/portfolio-content`, `.agents/skills/portfolio-writing`, `.agents/skills/portfolio-design`, and `.agents/skills/portfolio-presenting` exist or equivalent generic names exist.
- `AGENTS.md` points future agents to generic paths and still includes Google Maps skill guidance.
- `npm run build` passes.

### Task 3 — CMS hardening and blog publishing path

Owner: CMS/build subagent.

Scope:
- Add schema validation to `portfolio/build.mjs` for required fields, valid ISO dates, valid URLs, duplicate slugs, missing image assets, broken internal links, and invalid draft/noindex combinations.
- Support explicit `draft: true`, `slug`, `canonical`, `image`, `imageAlt`, `tags`, `updated`, and `noindex` front matter where needed.
- Update `_TEMPLATE.md` files and `scripts/new-post.mjs` so new posts are safe to scaffold and valid by default.
- Decide how external writing entries work: link-only entries with canonical external URL, or local summary pages that link out.
- Generate RSS or Atom for writing.

Acceptance criteria:
- `cd portfolio && npm run build` fails loudly for bad required fields in a fixture or test mode and passes on current content.
- Existing writing dates are normalized or explicitly modeled as non-article entries.
- New blog posts can be added with one command and produce valid metadata/feed entries.
- README documents add/edit/deploy/cache workflow for any human or agent.

### Task 4 — Copy pass and external-link enrichment

Owner: content subagent.

Scope:
- Rewrite homepage, about, work, writing, talks, and demo descriptions in direct Ryan voice.
- Remove generic AI/product-marketing tropes. Prefer concrete verbs, shipped artifacts, constraints, numbers, and links.
- Add or verify links to Ryan's GitHub, LinkedIn, public Mapbox writing, Google Maps Platform work, Substack/LinkedIn writing, decks/videos, and the GMP Agents Skills page.
- Ensure every major page has at least one image or intentional placeholder slot side-by-side with key copy.

Acceptance criteria:
- No banned AI-slop phrases remain after `rg` checks for obvious tropes.
- Every case study has concrete context, Ryan's role, shipped artifact, and proof/link where public.
- GMP Agents Skills is linked as a prominent project/work item.
- Every page has useful alt text or an explicit placeholder note that is not shipped as broken UX.
- `cd portfolio && npm run build` passes.

### Task 5 — SEO, AEO, social sharing, and discovery

Owner: SEO/build subagent.

Scope:
- Extend `layout()` with canonical URL, `og:url`, `og:image`, `twitter:*`, article metadata, robots controls, and JSON-LD for `Person`, `WebSite`, `BlogPosting`, `CreativeWork`, and/or `SoftwareApplication` where appropriate.
- Generate `sitemap.xml`, `robots.txt`, and RSS/Atom.
- Add clean share links for pages/posts without client-side JavaScript.
- Create or wire a default social image and per-page social images.
- Preserve fast static rendering and no client-side JS unless explicitly justified.

Acceptance criteria:
- Every generated HTML page has canonical, unique description, OG, and Twitter metadata.
- Blog/detail pages emit article metadata and JSON-LD where applicable.
- `sitemap.xml`, `robots.txt`, and feed output are generated in `portfolio/dist`.
- Smoke or a new metadata validation script verifies core tags.
- `npm run build && npm run smoke` passes.

### Task 6 — UI/UX polish and responsive visual QA

Owner: frontend/design subagent.

Scope:
- Rework page layouts mobile-first with strong desktop/narrow/mobile behavior, side-by-side media/copy modules, clean cards, share links, and accessible focus/skip-link behavior.
- Keep CSS resilient with `clamp()`, container-query or viewport-query breakpoints where useful, and light/dark color schemes.
- Ensure demo pages visually return to Ryan's site/lab consistently.
- Run browser screenshot checks after perceptible UI changes.

Acceptance criteria:
- Portfolio pages are readable and polished at mobile, narrow, and desktop widths.
- No layout overflows in main pages, collection pages, or detail pages.
- Skip link and focus states are visible.
- Screenshot artifacts are produced or a clear environment limitation is documented.
- `cd portfolio && npm run build` passes.

### Task 7 — Gateway API key registry, rate limiting, and private demo design

Owner: gateway/security subagent.

Scope:
- Add a gateway config model for per-demo upstream credentials without exposing secrets: server env vars map to named providers/demos, and browser `VITE_*` stays public-only.
- Replace or extend coarse in-memory rate limiting with route-aware policies. Document Cloud Run single-instance tradeoff and recommend Cloud Armor/Redis/Firestore for shared limits if needed.
- Add manifest support for `visibility: public | unlisted | private` and `auth` metadata.
- Implement private demo scaffolding securely enough for planned use: direct path gate before static serving, no `/api/apps` disclosure for unauthorized private demos, signed/session cookie or password hash flow, revocation by env/config, constant-time password checks, secure cookie flags, lockout/rate limits, and tests.
- Keep private demo implementation minimal and auditable; do not invent user accounts unless required.

Acceptance criteria:
- Public demos remain public; unlisted demos are directly accessible but not listed; private demos are not listed and cannot serve static files without auth.
- Password secrets are never committed or exposed to the browser.
- Authorization checks happen before `serveFromDir`.
- Tests cover public/unlisted/private manifest behavior and unauthorized direct access.
- Keyless gateway still boots and returns deterministic `503`s for missing upstream secrets.

### Task 8 — Strava photo CORS fix

Owner: Strava/maps subagent.

Scope:
- Ensure marker and popover photos use the gateway photo proxy for allowed Strava CloudFront URLs.
- Add CORS/CORP headers to gateway binary photo responses if needed for canvas/Maps 3D image consumption and cross-origin proxy-base deployment.
- Keep allowlist, HTTPS-only validation, MIME checks, byte limits, cache policy, and upstream timeout.
- Add unit tests for the headers and unsupported URL behavior.

Acceptance criteria:
- The reported CloudFront CORS error no longer occurs because the browser no longer loads raw Strava CloudFront images for marker/popover UI.
- Gateway proxy responses include the headers needed by the client image/canvas path.
- Unsupported hosts still fail with `400`.
- `cd gateway && node --test` and `cd strava-explorer && npm test` pass.

### Task 9 — CI/CD hardening

Owner: CI/CD subagent.

Scope:
- Expand CI to run package-level checks for portfolio, aqi-map, isochrones, gateway, and strava-explorer where scripts exist.
- Add Docker build verification or a clear Cloud Build-equivalent validation job.
- Add secret scanning beyond the existing smoke regex where practical.
- Add deploy concurrency and post-deploy smoke against the canonical production URL.
- Add preflight checks for required GitHub vars/secrets and document Cloud Run runtime secrets.

Acceptance criteria:
- PR CI remains secrets-free and fork-safe.
- `npm run build`, gateway tests, app tests, smoke, and Docker/build validation are covered.
- Deploy does not race itself and fails clearly on missing config.
- Post-deploy smoke validates `https://www.ryanbaumann-portfolio.com/`.

### Task 10 — Final verification and launch notes

Owner: integrator.

Scope:
- Run full root build/smoke, targeted app tests, gateway tests, and screenshot checks.
- Review generated output for secret leakage and canonical-domain consistency.
- Update `CHANGELOG.md` and `LEARNINGS.md` with concise, useful notes.
- Prepare PR body with changed behavior, validations, untested browser/API behavior, required env vars, and migration follow-ups.

Acceptance criteria:
- Working tree is clean after final commit.
- PR body lists all validation commands and limitations.
- Any remaining production-domain/DNS/OAuth callback steps are explicit.

## Commit plan

1. Planning commit: this document plus changelog note.
2. Brand/docs commit.
3. Agent-guidance migration commit.
4. CMS validation/blog path commit.
5. Copy/content enrichment commit.
6. SEO/social/feed commit.
7. UI/UX polish commit with screenshots.
8. Gateway security/private demos/rate limits commit.
9. Strava photo CORS commit.
10. CI/CD hardening commit.
11. Final verification/changelog/PR cleanup commit.

## Validation strategy

Run the narrowest checks after each task, then the full relevant checks before merging:

- `cd portfolio && npm run build`
- `cd gateway && node --test`
- `cd strava-explorer && npm run lint && npm test && npm run build`
- `cd aqi-map && npm run build`
- `cd isochrones && npm run build`
- `npm run build`
- `npm run smoke`
- Browser screenshot checks for visible UI changes

## Risks and open decisions

- The user provided live credentials for testing. They must not be committed. If used locally, write only to `.env` and rely on existing `.gitignore`/secret scans.
- Renaming Cloud Run service, Artifact Registry paths, or repository names may break deployment and should be separate from copy/metadata cleanup unless explicitly approved.
- Private demos can be password-gated without full accounts, but any claim of strong per-user rate limiting needs a real identity/session model and shared state.
- External content should be linked and summarized, not copied wholesale.
- Canonical domain migration needs OAuth redirect, Google Maps referrer restrictions, Search Console, and DNS verification outside the repo.
