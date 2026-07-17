# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added an email list: a subscribe form on the writing index and under every field note posts to the new gateway route `/api/subscribe`, which stores the address in a Resend audience (honeypot + rate limit, `503` until `RESEND_AUDIENCE_ID` is configured). Updates go out as Resend broadcasts composed in the dashboard; a `/subscribed/` confirmation page and a privacy-policy section cover the flow. See `docs/EMAIL_LIST_AND_COMMENTS.md`.
- Added reader comments on field notes via giscus (GitHub Discussions): config-gated in `site.json` (renders nothing until `categoryId` is filled from giscus.app), theme-synced with the site's light/dark toggle, lazy-loaded, and excluded from the private writer preview.
- Expanded the writer dashboard to support previewing, editing, and requesting agent reviews on all content collections (pages, writing, work, talks, scripts) instead of just drafts.
- Added a Google OAuth-protected release dashboard for private draft previews, direct Markdown edits, and publish or schedule controls.
- Added an agent-review request flow with an optional author comment and a GitHub issue containing the required writing, content-review, and design review lanes.
- Published an `agent-scripts/` collection with a vendor-neutral coding-agent system prompt, orchestrator and worker role overlays, a starter template, and 16 specified behavioral regression scenarios.
- Added Agent Scripts to the portfolio navigation, homepage, sitemap, metadata, and a dedicated `/scripts/` collection with deterministic artifact and social visuals.

### Changed
- Simplified the gateway's three writer form endpoints (publish/save/review) onto one shared handler with the same auth, origin, and redirect behavior, and generalized the contact-form HTML response page for reuse by the subscribe route.
- Deduplicated the three hero-image render blocks in `portfolio/build.mjs` into a single `heroImage` helper.
- Fixed the portfolio test script for newer Node 22 minors: `node --test test/` no longer accepts a bare directory, so it now uses an explicit glob (see LEARNINGS.md 2026-07-17).
- Updated the Atlas demo URL in apps.json to the new Cloud Run instance.
- Added a copyable self-install task packet for the Loop Engineering Coding Agent, clarified when each optional role overlay applies, and made its structural check work without ripgrep.
- Reframed the Loop Engineering Coding Agent page around token-efficient orchestration, lower-cost worker agents, and the evidence loop behind the system prompt.
- Rewrote the Loop Engineering Coding Agent page for a more direct, evidence-based explanation of its boundaries, package contents, and evaluation limits.
- Reviewed copy and claims across the site for a humble, durable dev-brand voice: qualitative framing for recent internal growth figures, generalized third-party agent tools to first-party surfaces, and team-credited leader-practitioner phrasing.
- Encoded the copy taste rules into `portfolio-writing`, `portfolio-review`, and the evidence ledger so future work follows them.

## [1.0.0] - 2026-07-15

### Added
- Initial public release of the Ryan Baumann portfolio and demo lab.
