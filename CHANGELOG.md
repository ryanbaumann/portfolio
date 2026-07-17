# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added a site-first Field Notes syndication runbook covering Substack, LinkedIn, and X workflows, consent-safe list migration, UTM attribution, and practical channel experiments.
- Added permanent `/lab/` and `/labs/` redirects to the canonical `/demos/` route.
- Added an `apple-touch-icon.png` and explicit `thumbnail` meta tag to the site `<head>` for better crawler visual citation and brand previews.
- Enhanced the `sitemap.xml` generator to output `<image:image>` and `<image:loc>` nodes for pages with cover images to optimize visual search indexing.

### Changed
- Reworked the site hierarchy around Field Notes first, Contact second, and Ryan’s Lab as the featured project surface, with a quieter theme control and clearer mobile/desktop calls to action.
- Simplified and refreshed the About, Resume, Contact, Privacy, homepage, and Lab copy; removed the duplicate resume portrait; and corrected stale availability, hosting, and project claims.
- Kept analytics enabled by default on the canonical production host, documented that behavior on the Privacy page, restricted campaign parameters to allowlisted UTM values, and added confirmed subscription conversion tracking.
- Migrated Field Notes subscriptions from Resend's retired Audience API to Contacts with a dedicated Segment and Topic, including safe resubscription behavior and updated setup/deployment documentation.
- Standardized reader-facing references to “Ryan’s Lab” while retaining `/demos/` and `labs:*` as technical route and command names.
- Changed "Google Maps Platform" to "Google Maps" in the job titles and profile headlines across the site (`site.json`, `about.md`, `resume.md`).
- Optimized above-the-fold Largest Contentful Paint (LCP) by setting hero images to `loading="eager"`.
- Shifted the social card generator (`social-cards.mjs`) to output compressed `.jpg` files at 70% quality instead of `.png`.
- Updated the `portfolio-review` skill to mandate optimized JPEG social preview images under 200KB.
- Converted all existing social preview images to compressed JPEGs, dropping file sizes from up to 1.3MB down to under 200KB, and updated all corresponding references in the content files.
- Updated `portfolio/build.mjs` to support standard `1200x630` social share images alongside the previous `1200x627` format, maintaining backward compatibility.
- Injected `meta.summary` as a visible `.lede` paragraph on detail pages and standalone pages to enhance DOM readability and AI discoverability (AEO).
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
