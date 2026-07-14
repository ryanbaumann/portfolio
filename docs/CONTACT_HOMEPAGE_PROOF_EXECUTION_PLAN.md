# Contact, homepage, and proof execution plan

Approved July 14, 2026.

## Goals

1. Suppress obvious SEO, AEO, web-design, backlink, and lead-generation spam without losing plausible real messages.
2. Add low-friction bot verification and preserve fail-open delivery when classifiers or verification services fail.
3. Reduce homepage density and the vertical gap after the primary call to action.
4. Make calls to action consistent and purposeful across the site.
5. Prefer real public artifacts and screenshots over repetitive claim-heavy cards.
6. Remove, qualify, or source claims that overstate Ryan's role or the available evidence.

## Stage 1: Contact protection

- Separate deterministic and Gemini classification from request orchestration.
- Use `allow`, `review`, and `reject` outcomes. Only high-confidence advertising spam may be dropped.
- Deliver ambiguous, malformed-model, timeout, and verification-outage cases.
- Keep name and email outside classifier requests and sanitize logs.
- Add a honeypot and low-friction human verification. Treat provider outages as fail-open.
- Record `generate_lead` only after the email provider confirms delivery.
- Add a frozen spam/ham dataset with a zero-tolerance critical-ham false-drop gate.

## Stage 2: Claims

- Reconcile live copy with `docs/PORTFOLIO_EVIDENCE_LEDGER.md`.
- Remove or qualify unsupported Mapbox superlatives, durability claims, and ambiguous secret/client-JavaScript claims.
- Keep periods, populations, and team attribution attached to internal growth metrics.
- Prefer durable public measures such as `1M+ weekly downloads` over volatile point values.

## Stage 3: Homepage and calls to action

- Use one primary hero CTA and one final contact CTA.
- Replace the seven-section homepage with: hero, selected work, live demos, current writing, and contact close.
- Remove the standalone proof grid and five-step operating-system explanation.
- Target at least a 35% reduction from the 8,216px mobile baseline.
- Check 320px, 390px, 768px, and 1440px layouts with no horizontal overflow.

## Stage 4: Visual evidence

- Keep strong live-demo and public-product screenshots.
- Replace the highest-priority repetitive artifact cards when a sourced public artifact is available.
- Record source URL, retrieval date, and reuse basis for new public assets.
- Preserve intrinsic dimensions, responsive `height: auto`, and accurate alt text.

## Stage 5: Verification and launch review

- Run focused contact tests, portfolio tests/build, gateway tests, local build staging, and smoke tests as practical.
- Validate the frozen classifier dataset without sending private submissions to external services.
- Capture key pages at desktop and mobile sizes and inspect the final diff for claims and secrets.
- Update `CHANGELOG.md`, `LEARNINGS.md`, and durable skills when the implementation reveals reusable guidance.

## Stop conditions

- Potentially real contact messages are never automatically rejected.
- Obvious advertising spam is suppressed without being counted as a delivered lead.
- Claims on prominent surfaces are either publicly sourced, explicitly approved internal outcomes, or removed.
- The homepage is materially shorter, visually evidenced, and has a clear action hierarchy.
