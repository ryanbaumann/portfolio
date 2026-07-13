# Ryan Baumann Portfolio Strategy and Execution Plan

Status: approved strategy, ready for implementation  
Date: 2026-07-13  
Scope: portfolio positioning, information architecture, copy, visual design,
responsive UX, owned writing, social previews, contact conversion, measurement,
and the next 12–24 months of portfolio development.

This is the authoritative execution brief for the portfolio strategy. It
supersedes the brand, copy, UX, social, and content-planning portions of
`docs/PORTFOLIO_OVERHAUL_PLAN.md`. The older plan remains useful for its
separate gateway, private-demo, security, and CI workstreams.

## Start here in a new session

1. Read the repository `AGENTS.md` and this document.
2. Run `git status --short` before editing.
3. Read the skill for each surface before changing it:
   - `.agents/skills/portfolio-writing/SKILL.md` for prose.
   - `.agents/skills/portfolio-design/SKILL.md` for layout or visual work.
   - `.agents/skills/portfolio-content/SKILL.md` for CMS/content changes.
   - `.agents/skills/frontend-responsive-design/SKILL.md` for responsive UI.
   - `agent-platform-eval-flywheel` before implementing the optional Gemini
     contact qualifier.
4. Reconfirm that public claims and source URLs still resolve. Do not reopen
   settled positioning decisions unless new evidence conflicts with them.
5. Execute the work in the waves below. Use isolated worktrees for parallel
   writers and keep one owner for overlapping generator files.
6. Use an independent reviewer for the final UX, privacy, analytics, and claim
   verification pass.

## Terminal goal

The site should make two readers reach the same conclusion:

- An exceptional principal engineer should want to build on Ryan's team.
- A CPO or VP Engineering should believe Ryan can recruit and lead that team,
  turn developer friction into shipped product, and grow an AI-native platform.

The finished site should position Ryan as a leader in Developer Experience and
Forward Deployed Engineering, with deep cross-functional operating experience
across product, engineering, and GTM.

The category thesis is:

> Developer experience is a growth system. AI makes it a product surface.

The site should demonstrate that thesis through real artifacts, public metrics,
working demos, concise writing, and a clear path to contact Ryan. It should not
claim or imply that Ryan is currently available for outside consulting or
advisory work while employed at Google.

## Settled strategy decisions

### Outcome priority for the next 12–24 months

1. Recruit the strongest possible team, regardless of Ryan's future company.
2. Create credible pull for an executive role.
3. Increase speaking and media opportunities.
4. Keep the door open for future advisory and board roles.
5. Consulting is not marketed while Ryan is at Google.
6. Continue building influence inside Ryan's current Google role.

### Highest-value readers

1. Chief Product Officers.
2. Vice Presidents of Engineering.
3. Principal-level developers and engineers.
4. Conference organizers, media, founders, and other relevant leaders.

The homepage must therefore sell the mission to builders and the operating
leverage to executives. It should not split into separate executive and
developer identities.

### Public category and role language

Lead with:

- Developer Experience, or DevX.
- Forward Deployed Engineering, or FDE.
- AI-native developer platforms.

Support that category with Ryan's ability to work across product, engineering,
and GTM. Do not lead with a generic `product/GTM/engineering leader` label.

### Availability and conversion

- Ryan cannot accept outside consulting or advisory work while at Google.
- The site must not say `available for consulting`, `available for advisory`,
  or equivalent language.
- A contact category may say `Future advisory or board conversation` so the
  long-term door remains open without advertising present availability.
- The primary conversion is a delivered contact-form message.
- The form should categorize the request before asking for a message.

### Domain

- Continue using the current canonical host for this implementation.
- Do not attempt a domain migration or acquire a domain in this workstream.
- Keep canonical-host configuration centralized so a later domain change is
  mechanical.
- `ryanbaumann.com` is reference material only unless Ryan later reacquires it.

### Public assets

- Publicly available Google and Mapbox screenshots, logos, diagrams, eval
  outputs, and public artifacts are approved for use.
- Record the public source URL and retrieval date for each reused artifact.
- Do not use private/internal assets merely because a public product is shown.
- Do not imply endorsement beyond Ryan's documented role.

### Analytics

- No GA4 property or Search Console property currently exists.
- Begin with the portfolio only, not authenticated or personalized demo flows.
- Use one GA4 property and one web stream for the canonical host.
- Use global Basic Consent Mode: load no Google analytics request before
  explicit consent.
- Do not measure demo behavior until its privacy boundary and event payloads
  have been independently reviewed.

### Optional Gemini qualifier

- Keep it simple and optional.
- The ordinary contact form must always work.
- The model may process the opportunity description.
- Keep name and email outside the model call.
- The visitor reviews and explicitly sends the generated summary.
- The model must not schedule, send, promise availability, or make commitments.

## Approved evidence and claim language

### Proof points approved for public use

- Led a 20+ person organization.
- Unique active users grew 300% from March 2025 through March 2026.
- API engagement grew approximately 200% over the same period.
- The growth came through open-source client-library work, including React and
  Compose, with AI distribution and agent integrations that included AI Studio,
  Lovable, and Replit.
- `@vis.gl/react-google-maps` reached approximately 1.5 million weekly
  downloads when verified on 2026-07-13. Prefer the durable homepage language
  `1M+ weekly downloads`; put the dated 1.5M value in supporting copy.
- Eval-driven context engineering is an approved operating method.
- Agent integrations drove significant growth, but do not attach an unverified
  percentage to a single partner or integration.

### Exact approved metric copy

Proof strip:

> 300% growth in unique active users · ~200% growth in API engagement · March
> 2025–March 2026

Case-study headline:

> OSS client libraries grew active reach 300% in one year

Case-study body:

> From March 2025 to March 2026, our open-source client libraries grew unique
> active users 300% and API engagement approximately 200%. I led the team's
> client-library and AI distribution strategy across React, Compose, AI Studio,
> Lovable, and Replit.

Keep the two metrics separate. Credit the team. Do not say that one integration
caused the entire increase.

### Claim-handling rule

Every material claim must have one status in an evidence ledger:

- `public-source`: link the public source.
- `approved-internal`: Ryan approved it, but the source is not public.
- `observable`: demonstrate it with an artifact or behavior.
- `qualify`: narrow the language before publishing.
- `remove`: omit until it can be supported.

Avoid absolutes such as `every launch`, `every tutorial`, `far fewer
hallucinations`, or `cheapest acquisition channel` unless the evidence supports
the exact scope.

## Authentic Ryan voice

Archived Ryan writing establishes the useful lineage:

- Direct identity: `Engineer. Bike rider. Map hacker. Problem solver.`
- Concrete problem first.
- A visible target or working result.
- Numbered steps, commands, and real tools.
- Short transitions such as `So let's fix this`, `Now the fun part`, and
  `Boom`.
- A practical conclusion or question rather than a generic summary.

Reference material:

- Archived homepage:
  https://web.archive.org/web/20191015182423/https://www.ryanbaumann.com/
- Vector heatmap walkthrough:
  https://web.archive.org/web/20190919182256/https://www.ryanbaumann.com/blog/2017/5/29/big-data-vector-heatmaps-with-mapbox-gl
- AthleteDataViz architecture:
  https://web.archive.org/web/20190723092401/https://www.ryanbaumann.com/blog/2015/10/25/building-athletedataviz-using-hosted-services-part-1
- Jupyter map walkthrough:
  https://web.archive.org/web/20201108120516/https://www.ryanbaumann.com/blog/2016/4/3/embedding-mapbox-plots-in-jupyter-notebooks

The modern voice should feel like a senior leader who still has dirt under his
fingernails. Keep the problem-first clarity and evidence. Cut throat-clearing,
corporate biography, and AI hype.

## Working positioning and homepage copy

This copy is the implementation starting point. The content writer may tighten
it using the portfolio-writing skill, but must preserve its hierarchy and
claims.

Eyebrow:

> DEVX · FORWARD DEPLOYED ENGINEERING · AI-NATIVE PLATFORMS

Headline:

> I build the teams and systems that make developer platforms grow.

Subhead:

> I lead Developer Experience and forward-deployed engineering from field
> signal to shipped product: context, tools, evals, distribution, and the teams
> behind them.

Primary CTA:

> Build with me

Secondary CTA:

> See the operating system

Supporting category definition:

> AI Developer Experience is the product, context, evals, and distribution
> system that lets developers and their agents succeed with a platform.

Recommended durable proof bar:

- `20+ person organization`
- `300% active-user growth`
- `~200% API-engagement growth`
- `1M+ weekly React-library downloads`

The detailed evidence should carry the March 2025–March 2026 period and the
dated 1.5M download observation.

## Information architecture

### Primary navigation

Expose no more than four primary routes plus the conversion CTA:

> Work · Field Notes · Lab · About · Build with Ryan

Resume, Talks, and secondary destinations may live under About or in the
footer. The final implementation must remain useful without client-side
navigation JavaScript.

### Homepage sequence

1. Category-defining hero with one primary and one secondary CTA.
2. Attributable proof bar.
3. The AI Developer Experience operating system.
4. Build with Ryan recruiting section.
5. Demo Lab.
6. Hosted Field Notes.
7. Speaking and media.
8. Earlier Mapbox and Google Cloud foundation.
9. Short personal note and final categorized contact CTA.

### Operating-system visual

The homepage should show this relationship rather than explaining it in a long
paragraph:

```text
FIELD SIGNAL
    ↓
SHIP THE TOOL
    ↓
EVALUATE THE EXPERIENCE
    ↓
DISTRIBUTE INTO THE DEVELOPER WORKFLOW
    ↓
MEASURE ADOPTION AND GROWTH
```

Map existing work into it:

- Signal: Voice of Developer.
- Ship: Code Assist Toolkit and Agent Skills.
- Evaluate: Agentic Evals and context-engineering work.
- Distribute: client libraries, AI Studio, Lovable, and Replit.
- Grow: active users, API engagement, downloads, and adoption.

### Work-entry structure

Each flagship story should follow:

```text
Observable change
→ attributable outcome
→ real artifact
→ Ryan's operating decision
→ what it proves about AI Developer Experience
```

Use the portfolio-writing skill's `The goal`, `What shipped`, and `What I
learned` structure for the final detail pages.

## Visual system

### Keep

- Warm paper in light mode and deep navy in dark mode.
- System typography.
- One blue accent.
- Monospace metadata.
- Generous whitespace.
- One-column prose near 44rem.
- Semantic landmarks, skip links, visible focus, and lazy loading.
- The zero-dependency portfolio generator and minimal client JavaScript.
- Real demo screenshots and honest artifact cards as fallbacks.
- The AQI and Isochrones split-panel visual language.

### Change

- Make the thesis and evidence bold. Do not add decorative gradients,
  animation, or generic AI visual effects.
- Replace the default/About neon-circuitry image. It is generic and its current
  alt text inaccurately describes it as the homepage.
- Replace the top three repetitive terminal cards with distinct, real evidence:
  a retrieval/tool trace, eval comparison, architecture diagram, shipped UI,
  install flow, or adoption chart.
- Resolve intrinsic dimensions for inline Markdown images to prevent layout
  shift.
- Make external SVG artifact themes consistent with the selected page theme or
  use raster/social-specific assets where appropriate.
- Remove `transition: all`; constrain transitions to the properties that move.
- Add an explicit reduced-motion override for cross-document transitions.
- Give the theme button an announced state and a system option, or document a
  smaller accessible alternative.

Boldness must come from point of view, evidence, typography, and real
artifacts. Never fabricate product UI.

## Responsive and accessibility findings

The audit used actual Playwright BrowserContexts at 390×844, 768×1024, and
1440×1000 for Home, Work, About, and Contact. All 12 runs returned HTTP 200
with no console errors, page errors, failed requests, or document-level
horizontal overflow.

### P1 findings

1. At 390×844, the first homepage CTA begins at y=929. The first viewport is
   consumed by the long introduction.
2. The mobile nav exposes 185px of a 338–344px scroll area. Resume, Contact,
   and About are hidden without an affordance.
3. Mobile header controls are 34–36px high, below the 44px target.
4. Mobile page heights are excessive: Home 10,081px, Work 6,151px, About
   4,071px, and Contact 1,807px.
5. The Contact submit button begins at y=1470 on mobile.
6. The faint text token does not meet the repository's 4.5:1 target across all
   light and dark surfaces.
7. Inline Markdown images lack intrinsic dimensions.
8. Top AI case studies look interchangeable because their artifact cards use
   the same visual composition.

### Responsive acceptance criteria

- Positioning, proof, and the primary CTA appear within the first 844px at
  390px width.
- No essential nav route is hidden without a clear affordance.
- Primary interactive targets are at least 44×44 CSS pixels.
- Functional text meets 4.5:1 contrast.
- There is no document-level horizontal overflow.
- Every local image has intrinsic dimensions.
- Keyboard order, focus visibility, landmarks, and skip links remain correct.
- Reduced-motion preferences are respected.
- No page has an indefinite loading state without an actionable fallback.

### Demo observations

- Keep AQI and Isochrones' clear first-use copy, map-first mobile hierarchy,
  source attribution, and return-to-Ryan link.
- Keep Strava's distinction between `Connect Strava` and `Try the demo`.
- Add a timed, actionable Strava loading failure. Headless Chrome remained at
  `Loading Google Maps`; this may be WebGL-specific and must be checked on a
  real device before calling it a production defect.
- Replace Isochrones emoji scenario icons with deterministic SVGs if missing
  glyphs reproduce outside the audit environment.
- Add responsive `srcset`/sizes or optimized variants for large demo previews.

Audit screenshots were written under `/tmp/portfolio-ux-audit` during the
2026-07-13 review. They are ephemeral evidence, not repository assets.

## Owned writing and distribution

All current writing entries link directly to external sites. That prevents the
portfolio from controlling the reading experience, canonical authority, social
image, conversion path, and related work.

Use this publishing sequence:

```text
Publish the canonical essay here
→ generate its owned social card
→ syndicate an excerpt or mirror to LinkedIn/Substack
→ point canonical metadata back to this site
```

### First three cornerstone essays

1. `Developer Experience Is a Growth Discipline`
2. `The Next Platform Interface Is an Agent Session`
3. `Evals Turn AI Developer Experience Into an Operating System`

Each essay should start with the claim, use public work as evidence, and end
with what a CPO, VP Engineering, or principal builder should do next.

### Ongoing Field Notes

Use a shorter recurring format:

1. Problem.
2. Experiment.
3. Evidence.
4. What changed.
5. What to do next.

Publish here first, then syndicate. Avoid generic weekly roundups unless each
item supports the core DevX/FDE category.

## Social-preview system

Separate on-page art from social art. Generate an honest 1200×627 PNG or JPG
for every owned share route and demo.

Add or support these content fields:

- `socialImage`
- `shareTitle`
- `shareSummary`
- `shareImageAlt`

Emit and validate:

- Absolute `og:image` and `twitter:image` URLs.
- `og:image:width`, `og:image:height`, and MIME type.
- `twitter:image:alt`.
- Canonical URL and `og:url`.
- Correct `summary_large_image` selection after fallbacks resolve.
- A successful HTTP response with the expected image type and dimensions.

Standardize AQI, Isochrones, and Strava metadata. Remove the legacy
`Trails Ninja`/`3D Strava Explorer` naming split.

Official reference:
https://www.linkedin.com/help/linkedin/answer/a566445

### Social-card content rule

Each card should communicate one claim or show one real artifact. Do not make
every post a branded terminal card. A consistent frame is useful; identical
evidence is not.

## Contact experience

### Deterministic form

Intent categories:

- `Build or join an exceptional team`
- `Executive opportunity`
- `Speaking or media`
- `Future advisory or board conversation`
- `Other`

Do not include a current consulting category. Near the future-advisory option,
make it clear that Ryan is not taking outside advisory work while at Google.

Primary prompt:

> What are you trying to build, and where is the developer experience breaking
> down?

Render provider success and failure using the portfolio layout. A provider-
confirmed success is the only initial lead-conversion event.

### Optional Gemini enhancement

Label the feature as an optional action such as `Sharpen my note`, not as the
only way to contact Ryan.

Flow:

1. Visitor selects an intent.
2. Visitor writes an opportunity description.
3. The server sends only the opportunity description and low-cardinality
   intent to Gemini.
4. The model returns an editable structured result:
   - What I heard.
   - Why Ryan may be relevant.
   - The next useful question.
5. The visitor reviews the text, adds name/email outside the model step, and
   explicitly submits.

Use `gemini-3.1-flash-lite` or its current stable replacement only after
checking official documentation. It is suited to constrained, low-latency
structured output, not open-ended autonomous behavior.

Official reference:
https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite

Guardrails:

- Server-side call only.
- Strict input-length cap and output schema.
- Rate limiting and timeout.
- No automatic sending, scheduling, availability claims, or commitments.
- No name/email in model input.
- Do not log raw opportunity text by default.
- Deterministic form remains available on timeout or model failure.
- Explicit disclosure and visitor review before submission.

### Eval requirement for the qualifier

Apply the Agent Quality Flywheel before launch:

1. Establish the static form as the baseline.
2. Build a dataset with normal, ambiguous, irrelevant, prompt-injection, and
   PII-containing opportunity descriptions.
3. Grade schema validity, intent accuracy, tone, privacy behavior, and whether
   the output invents availability or commitments.
4. Keep the optimizer separate from the evaluator.
5. Use an explicit launch threshold. Suggested minimums:
   - 100% schema validity.
   - 100% refusal to invent availability or commitments.
   - 100% exclusion of name/email fields from model payloads.
   - At least 90% correct intent classification on the approved dataset.
6. Compare form completion and delivered-lead rate against the static form.
7. Require human approval before shipping the experiment broadly.

## Analytics and privacy plan

### Recommended architecture

- One GA4 property and one web stream for the canonical host.
- Direct `gtag.js`, not GTM, because the site has no advertising tag stack.
- Global Basic Consent Mode.
- No Google request before explicit consent.
- Advertising storage and personalization remain denied.
- No User-ID or Ads linking.
- Disable measurement on localhost and tests except explicit debug mode.
- Add a Privacy page and persistent analytics-settings link.
- Create and link Search Console after the canonical stream is healthy.

Official references:

- Consent Mode:
  https://developers.google.com/tag-platform/security/concepts/consent-mode
- Consent implementation:
  https://developers.google.com/tag-platform/security/guides/consent
- Recommended events:
  https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events
- Key events:
  https://support.google.com/analytics/answer/13128484
- Search Console integration:
  https://support.google.com/analytics/answer/10737381

### Initial event vocabulary

- `page_view`: manually sanitized page location and referrer.
- `scroll`: deep-read signal.
- `click`: outbound links.
- `select_content`: work, writing, talk, demo, or CTA selection.
- `share`: owned-content sharing.
- `form_start`: contact interaction began.
- `form_submit`: browser submitted; not a conversion.
- `generate_lead`: contact provider confirmed delivery; initial key event.
- `demo_activate`: deferred until each demo passes privacy review.

Use only checked-in slugs and low-cardinality categories. Never send message
text, model text, email, names, OAuth values, activity IDs, place names, exact
coordinates, route geometry, photos, or raw errors.

### Strava privacy boundary

Do not add a normal automatic GA tag to Strava Explorer. Its URL state can
contain OAuth `code`, `state`, `scope`, `activity_id`, dates, and camera
values. It also uses `history.replaceState`.

Before any Strava measurement:

- Disable history-change pageviews.
- Send manually sanitized `page_location` values.
- Allowlist only approved campaign parameters.
- Configure email and query-parameter redaction as defense in depth.
- Verify that the initial OAuth callback URL cannot reach GA.
- Never send activity metadata or location information.
- Independently inspect every analytics request in Playwright or Tag Assistant.

Enhanced measurement reference:
https://support.google.com/analytics/answer/9216061

Data-redaction reference:
https://support.google.com/analytics/answer/13544947

### Reports that matter

1. Authority and distribution:
   source/campaign → landing page → deep read, share, or proof selection.
2. Demo proof:
   demo view → first meaningful value → case study or contact. Add only after
   privacy approval.
3. Opportunity funnel:
   contact view → form start → submit → provider-confirmed lead, grouped by
   structured intent.

Use UTMs only on external distribution. Never add UTMs to internal links.

## Next 12–24 months of portfolio development

### First 90 days

1. Ship the new positioning, homepage hierarchy, mobile navigation, proof bar,
   and categorized contact funnel.
2. Add `Build with Ryan`, explaining the problems the team works on, Ryan's
   operating principles, and what principal builders can own and learn.
3. Publish the first three canonical essays.
4. Build the AI DevX operating-system diagram.
5. Replace generic/default imagery and the top three repetitive artifact
   cards with real evidence.
6. Ship the social-card pipeline and consistent demo metadata.
7. Establish privacy-aware portfolio analytics.

### Three to six months

8. Publish an AI Developer Experience scorecard or benchmark comparing:
   - docs-only developer experience;
   - structured context or skills;
   - agent task completion;
   - error or hallucination rate;
   - time to first successful result.
9. Publish an agent-ready platform checklist or field guide.
10. Add owned talk pages with abstracts, video clips, slides, evidence, and an
    `Invite Ryan` CTA.
11. Establish the short Field Notes publishing cadence.
12. Test the optional contact qualifier against the static form.

### Six to twelve months

13. Publish a sanitized, end-to-end case study that shows field signal,
    implementation, eval, distribution, and growth.
14. Build a demo that runs one developer task through docs-only, MCP/context,
    agent skill, and forward-deployed assistance.
15. Produce a short speaking reel and one signature keynote.
16. Publish the first `State of AI Developer Experience` report.

### Twelve to twenty-four months

17. Repeat the benchmark with comparable year-over-year data.
18. Convene a small practitioner roundtable or community for AI DevX and FDE
    leaders.
19. Publish Ryan's operating principles for recruiting and leading elite DevX
    teams.
20. Grow a public library of reusable eval datasets, scorecards, diagrams, and
    implementation notes.

## Execution waves and subagent task capsules

### Wave 0: baseline and evidence

#### Task 0.1: Claim and artifact ledger

Owner: read-only evidence researcher.  
Model tier: Tier 1 for extraction, Tier 2 for ambiguous claim review.

Scope:

- Inventory every public claim in `site.json`, pages, work, talks, writing, and
  demo metadata.
- Assign one claim status from the evidence model above.
- Record exact text, source URL, date, owner/team attribution, approved public
  form, and any required qualifier.
- Inventory candidate public screenshots, diagrams, evals, videos, logos, and
  photos with their source URLs.
- Confirm the current npm download observation and record its date.

Acceptance:

- Every headline, proof-strip value, and flagship case-study claim has a
  decision.
- No private artifact enters the implementation queue.
- The 300% and ~200% metrics retain their separate definitions and period.

#### Task 0.2: Baseline build and visual record

Owner: verifier.

Scope:

- Run the current portfolio build and root smoke path.
- Capture baseline Playwright screenshots at 390×844, 768×1024, and
  1440×1000 in light and dark modes for all representative templates.
- Record focus order, contrast, overflow, first CTA position, metadata, and
  console/network failures.

Acceptance:

- Baseline artifacts and machine-readable measurements are available for
  before/after comparison.
- Existing failures are recorded without being attributed to the new work.

### Wave 1: strategy, content, and real evidence

These tasks can run in parallel only in isolated worktrees with explicit file
ownership.

#### Task 1.1: Positioning and information-architecture specification

Owner: product/IA strategist, read-only.

Scope:

- Turn the settled decisions into the final page journey and content map.
- Limit primary navigation to four destinations plus CTA.
- Map every existing item to keep, revise, move, or cut.
- Produce the mobile-first homepage wireframe and CTA placement spec.

Acceptance:

- The homepage serves principal builders plus CPO/VP Engineering readers.
- Recruiting is primary, executive pull is second, and speaking is third.
- No current consulting availability is implied.

#### Task 1.2: Copy and content rewrite

Owner: portfolio-writing subagent in an isolated worktree.  
Files: `portfolio/content/**`, `apps.json` descriptions when needed.  
Do not edit `portfolio/build.mjs` or `portfolio/style.css`.

Scope:

- Rewrite global role, tagline, introduction, section copy, About, Contact,
  Resume focus, work summaries, and selected work bodies.
- Apply the exact approved metrics.
- Replace generic topic titles with thesis or outcome titles where appropriate.
- Preserve useful map, cycling, and practitioner detail without letting it
  replace the DevX/FDE category.
- Add drafts of the first three canonical essays.

Acceptance:

- Hero uses one promise, one proof sentence, and two actions.
- Every flagship story begins with an outcome or observable change.
- Team work credits the team.
- There are no em dashes, hype adjectives, unsupported absolutes, or present
  consulting-availability claims.
- Content build passes in the isolated worktree.

#### Task 1.3: Evidence asset preparation

Owner: design/content evidence subagent in an isolated worktree.  
Files: approved static asset paths only.

Scope:

- Download or recreate only approved public artifacts with source records.
- Prepare distinct evidence for the top three AI DevX stories.
- Replace the misleading default/About image with an honest artifact or photo.
- Provide literal alt text and intrinsic dimensions.

Acceptance:

- Each top story is visually distinguishable by the evidence it shows.
- No fabricated product UI or private screenshot is included.
- Asset sizes are suitable for responsive delivery.

### Wave 2: portfolio shell and conversion

Use one writer for `portfolio/build.mjs` and `portfolio/style.css`. Contact and
social generator changes that touch the same files follow sequentially.

#### Task 2.1: Homepage shell and responsive design

Owner: portfolio-design/frontend implementer.  
Files: `portfolio/build.mjs`, `portfolio/style.css`, minimal supporting files.

Scope:

- Implement the approved navigation and homepage order.
- Add the operating-system visual and Build with Ryan section.
- Put positioning, proof, and CTA inside the first mobile viewport.
- Repair mobile navigation, target sizes, faint-text contrast, theme state,
  reduced motion, image dimensions, and responsive image delivery.
- Preserve semantic HTML and the zero-dependency architecture.

Acceptance:

- Meets every responsive acceptance criterion in this document.
- No primary page regresses in keyboard order or semantics.
- Portfolio build passes.
- Updated Playwright screenshots show the intended change.

#### Task 2.2: Contact conversion flow

Owner: portfolio/gateway implementer after Task 2.1.  
Files: portfolio contact rendering, `gateway/server.js`, focused tests.

Scope:

- Add the approved intent categories.
- Add the opportunity-focused message prompt.
- Render success, validation errors, and provider failure inside the site
  visual system.
- Make provider-confirmed success observable without counting failed attempts.
- Add plain-language processing disclosure and link to Privacy.

Acceptance:

- Keyboard and screen-reader users can complete every state.
- A failed attempt never looks successful.
- A successful provider response can trigger one `generate_lead` event after
  analytics is added.
- Gateway tests cover validation, provider failure, and success response.

#### Task 2.3: Social-card and metadata pipeline

Owner: build/social implementer after Task 2.1.  
Files: generator metadata, artifact-card tooling, static social assets, demo
entry HTML where required.

Scope:

- Add independent share fields.
- Generate or validate 1200×627 raster share images.
- Fix fallback card type selection.
- Emit complete image dimensions, MIME type, alt, canonical, and `og:url`.
- Standardize metadata for AQI, Isochrones, and Strava.

Acceptance:

- Every owned route has a valid absolute social image.
- Metadata validation checks HTTP status, content type, dimensions, and alt.
- LinkedIn Post Inspector renders representative pages correctly.
- Portfolio, app builds, and root smoke pass.

### Wave 3: owned authority and demo bridges

#### Task 3.1: Canonical essays and talks

Owner: portfolio-writing/content implementer.

Scope:

- Finalize and publish the first three hosted essays.
- Add local talk pages for signature talks with abstract, video/deck, proof,
  and an `Invite Ryan` CTA.
- Verify RSS and canonical metadata.
- Document the LinkedIn/Substack syndication workflow.

Acceptance:

- The site owns at least three thesis-led essays.
- External mirrors point canonical authority back to the portfolio where the
  platform permits it.
- Each essay and talk has a unique social preview and relevant CTA.

#### Task 3.2: Demo-to-portfolio bridges

Owner: one implementer per demo directory, parallelized through isolated
worktrees or strict directory ownership.

Scope:

- Add contextual `How it was built` and `Build with Ryan` links.
- Normalize naming and social metadata.
- Add resilient loading/error behavior where needed.
- Replace nondeterministic emoji icons if the glyph issue reproduces.
- Do not add analytics in this task.

Acceptance:

- Every demo shows value quickly and offers a relevant path back to proof or
  contact.
- No app leaks secrets or changes its authentication boundary.
- Each app's focused build/test passes.

### Wave 4: privacy-aware measurement

#### Task 4.1: GA4/Search Console administration

Owner: analytics configuration worker.  
External-state change: requires Ryan's explicit approval immediately before
creating properties.

Scope:

- Create one GA4 property and web stream.
- Create/verify Search Console for the current canonical host.
- Record the non-secret measurement ID in the approved configuration path.
- Configure retention, email/query redaction, and internal traffic in Testing.
- Disable history-state pageviews.
- Mark only `generate_lead` as the initial key event.

Acceptance:

- No Ads link, User-ID, or advertising personalization is enabled.
- Configuration matches the privacy plan.
- External changes and ownership are documented without recording secrets.

#### Task 4.2: Portfolio consent and analytics foundation

Owner: frontend/privacy implementer.

Scope:

- Add Basic Consent Mode and a persistent settings control.
- Add the Privacy page.
- Add a small direct-tag wrapper with sanitized page location and referrer.
- Disable analytics on localhost/test by default.
- Add `select_content`, `share`, form signals, and provider-confirmed
  `generate_lead`.
- Do not instrument demos.

Acceptance:

- Denial causes no Google request.
- Acceptance produces exactly one sanitized initial page view.
- Contact failure produces no lead; provider success produces exactly one.
- No payload contains form content, model output, PII, or high-cardinality
  values.
- Tag Assistant and browser-network evidence are recorded.

#### Task 4.3: Optional demo analytics privacy review

Owner: independent privacy/security reviewer, read-only first.

Scope:

- Inspect every app URL-state field and first-value moment.
- Propose one low-cardinality `demo_activate` event per app.
- Prove that OAuth, activity, location, geometry, search, photo, and raw error
  data cannot reach analytics.
- Treat Strava as a separate high-risk boundary.

Acceptance:

- No demo code changes occur until the reviewer approves the event contract.
- If approved, each demo emits at most one activation per page/session.
- Synthetic sensitive URLs produce no sensitive analytics payload.

### Wave 5: optional Gemini contact experiment

#### Task 5.1: Baseline and eval dataset

Owner: eval designer, not the future prompt implementer.

Scope:

- Record the static form's completion and delivered-lead baseline.
- Create the approved evaluation dataset and stable rubrics.
- Define the launch threshold before prompt implementation.

#### Task 5.2: Qualifier implementation

Owner: server/frontend implementer.

Scope:

- Implement the optional server-side structured-output call.
- Keep PII out, enforce schema/timeouts/rate limits, and preserve fallback.
- Add explicit visitor review.

#### Task 5.3: Independent evaluation

Owner: evaluator who did not write the prompt.

Scope:

- Run the baseline and candidate across the same dataset.
- Report deltas and clustered failures.
- Block launch if any privacy, commitment, or schema gate fails.

### Wave 6: final integration and launch review

#### Task 6.1: Independent responsive and accessibility review

Owner: verifier who did not implement the shell.

Scope:

- Run Playwright at the approved phone, tablet, and desktop viewports in light
  and dark modes.
- Check keyboard navigation, focus, landmarks, contrast, reduced motion,
  intrinsic image sizes, overflow, console, network failures, and loading
  fallbacks.
- Check at least one real mobile browser.

#### Task 6.2: Claims, social, and privacy review

Owner: evidence/privacy reviewer.

Scope:

- Diff every public metric against the ledger.
- Validate social previews on representative external inspectors.
- Inspect analytics and optional Gemini requests for data leakage.

#### Task 6.3: Integration and durable memory

Owner: root/integrator.

Scope:

- Merge only reviewed, minimal diffs.
- Run the full validation matrix.
- Update `CHANGELOG.md` for user-visible changes.
- Add `LEARNINGS.md` entries for real surprises or root-caused issues only.
- Fold durable procedures into the matching skills.
- Prepare the PR summary and explicit production follow-ups.

## Dependency and concurrency map

```text
Wave 0 evidence + baseline
        ↓
Wave 1 IA ───────────────┐
Wave 1 copy ─────────────┼→ Wave 2 shell
Wave 1 evidence assets ──┘       ↓
                           contact + social (sequential)
                                  ↓
                    owned essays + demo bridges
                                  ↓
                    analytics/privacy foundation
                                  ↓
                      optional Gemini experiment
                                  ↓
                      independent final review
```

Rules:

- Read-only research may run in parallel.
- Parallel writers require isolated worktrees or non-overlapping ownership.
- Only one writer owns `portfolio/build.mjs` and `portfolio/style.css` at a
  time.
- Social, Contact, and Analytics changes that touch the generator are
  sequential.
- Demo writers may run in parallel by directory.
- The final reviewer must not be the implementation author.

## Verification matrix

Run the narrowest check after each task, then the relevant broader checks.

```bash
cd portfolio && npm run build
cd gateway && npm test
cd demos/strava-explorer && npm run lint && npm test && npm run build
cd demos/aqi-map && npm run build
cd demos/isochrones && npm run build
node scripts/build-local.mjs
node scripts/smoke.mjs
```

For visible changes:

- Playwright at 390×844, 768×1024, and 1440×1000.
- Light and dark modes.
- Home, Work, representative work detail, Writing/detail, Talks/detail, About,
  Contact/success/error, and each demo.
- Keyboard-only pass.
- Contrast calculation.
- Horizontal-overflow assertion.
- Console, page-error, request-failure, and indefinite-loading checks.
- Real mobile device spot check.

For metadata and distribution:

- Validate canonical/OG/Twitter/JSON-LD where applicable.
- Validate image HTTP status, MIME type, 1200×627 dimensions, and alt.
- Test representative pages in LinkedIn Post Inspector.
- Verify RSS and sitemap outputs.

For analytics/privacy:

- No analytics request before Basic Consent Mode opt-in.
- Denial persists and sends nothing.
- Exactly one sanitized initial page view after acceptance.
- No OAuth, PII, form text, model text, activity, place, coordinate, geometry,
  photo, or raw-error data in any request.
- Failed contacts do not generate leads.
- Provider-confirmed delivery generates exactly one lead.

## Definition of done

The overhaul is complete only when:

- The homepage visibly owns DevX + FDE for AI-native platforms.
- Principal builders see a compelling reason to work with Ryan.
- CPOs and VP Engineering leaders see attributable operating leverage.
- The approved metrics are accurate, qualified, and visually supported.
- The primary mobile CTA appears in the first viewport.
- Navigation and controls are visible, accessible, and correctly sized.
- The site's strongest work uses real, differentiated evidence.
- At least three canonical essays live on the portfolio.
- Every owned share route has a valid, honest 1200×627 social image.
- Contact intent is structured and successful delivery is measurable.
- The site does not advertise unavailable consulting/advisory work.
- Basic Consent Mode and the Privacy page are correct before GA launches.
- Demos remain uninstrumented until their privacy contracts pass review.
- All relevant builds, tests, smoke checks, and browser checks pass.
- `CHANGELOG.md`, relevant `LEARNINGS.md`, and durable skills are updated.
- Domain migration remains explicitly deferred and does not block launch.

## Sources checked during planning

- Ryan's archived site and posts listed under Authentic Ryan voice.
- npm download API for `@vis.gl/react-google-maps`:
  https://api.npmjs.org/downloads/point/last-week/%40vis.gl%2Freact-google-maps
- Microsoft Agent Experience article:
  https://developer.microsoft.com/blog/the-hidden-variables-in-your-agent-eval
- OpenAI Ramp case study describing an AI Developer Experience team:
  https://openai.com/index/ramp/
- LinkedIn social-image guidance:
  https://www.linkedin.com/help/linkedin/answer/a566445
- Gemini 3.1 Flash-Lite model documentation:
  https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- Google Analytics, Consent Mode, Search Console, enhanced-measurement, and
  redaction references listed in the Analytics section.

## Deferred decisions

Only one strategic decision is intentionally deferred:

- Canonical-domain migration or reacquisition of `ryanbaumann.com`.

It is not a blocker. Keep domain configuration centralized and do not perform
DNS, OAuth callback, referrer restriction, Search Console host migration, or
redirect work until Ryan explicitly selects and controls the future domain.
