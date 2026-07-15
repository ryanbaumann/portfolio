---
name: portfolio-review
description: Audit publishable portfolio copy, content completeness, claims, links, canonicals, redirects, images, social metadata, accessibility, and rendered presentation. Use for every public content addition or meaningful edit before it is considered ready for review or publication.
---

# Portfolio review

Treat review as a bounded evidence loop, not a vibe check. Read the portfolio writing, design, and content skills before reviewing their surfaces.

## 1. Inventory the change

- Run `git status --short` before work and inspect the focused diff.
- List every changed public claim, link, canonical or alias, image, alt string, and metadata field.
- Identify the intended reader action and the one idea each visual must communicate.
- Use `docs/PORTFOLIO_EVIDENCE_LEDGER.md` for existing claims. Add durable new evidence there when a material claim will recur.

## 2. Audit copy and claims

- Lead with the outcome and concrete work. Cut throat-clearing, generic summaries, repeated conclusions, and unsupported superlatives.
- Check every number, date range, attribution, role, causal statement, and current product fact against a primary source, checked-in artifact, or Ryan-approved internal evidence.
- Distinguish observed correlation from causation. Put unrelated evidence in separately labeled groups.
- Credit team work accurately. Remove or qualify anything the evidence does not support.
- Verify that the opening states the thesis, each section advances it, and the ending tells the reader what to do.
- Search the changed prose for banned voice patterns such as passive self-credit, hype adjectives, resume bullets, and em dashes; then perform a human-quality read because style cannot be proven by a regex.

## 3. Audit links and URL ownership

- Run the portfolio build to validate internal links, assets, duplicate slugs, canonical rules, and aliases.
- Open material external links or fetch them with a real GET. Confirm the destination supports the adjacent claim; do not treat a successful status alone as evidence.
- For a renamed page, verify the new canonical and social URLs in rendered HTML and test every old path, with and without a trailing slash, for an HTTP 308 to the clean root-relative target. Confirm query strings survive.
- Keep one canonical owner. Do not publish duplicate local and external canonicals.

## 4. Audit images and metadata

- Require every hosted essay to have three distinct assets: a 1200x675 thesis header, a 1200x627 social preview, and at least one 1200x675 inline mechanism or evidence image.
- Prefer real screenshots and artifacts. Generated visuals must show a mechanism or evidence, never invent metrics, UI, logos, or product behavior.
- Iterate with the lower-cost image model; render the approved final prompt with the quality model. Save exact prompts, model IDs, aspect ratio, size, thinking setting, and post-processing in `docs/`.
- Inspect file signatures with `file`; never trust an extension. Verify physical dimensions and generated HTML `width`/`height` attributes.
- Write literal, asset-specific alt text. Do not reuse the header description for the social or inline image.
- Inspect the rendered page at desktop and narrow mobile widths. Check legibility, crop, padding, hierarchy, dark/light behavior when relevant, and whether the image earns its space.

## 5. Run the maker/checker loop

For every publishable content change, use at least one independent read-only reviewer after the maker pass. For an essay or multi-surface page, split review into these lanes when agents are available:

1. Copy and claim integrity.
2. Links, canonical ownership, redirects, and metadata.
3. Visual taste, image truthfulness, accessibility, desktop, and mobile rendering.

Give reviewers the raw diff, rendered page, and assets. Do not give them the intended verdict. Ask for actionable blockers, not rewritten taste preferences.

After each review round: classify findings, make one focused correction pass, rerun deterministic checks, and request a fresh read-only review. Stop after at most three rounds. Stop earlier when all lanes are clean. If a material claim, source, or design decision remains unresolved, return `NEEDS_HUMAN`; do not average reviewer opinions or declare victory.

Use deterministic tools and lower-cost models for inventory and mechanical checks, a balanced model for edits, and the strongest justified model only for final cross-surface synthesis or unresolved ambiguity. The maker is never the only grader.

## 6. Required verification

Run the narrowest relevant checks, then the complete content path when practical:

```bash
cd portfolio && npm test && npm run build
cd ../gateway && npm test
cd .. && node scripts/build-local.mjs && node scripts/smoke.mjs
```

Also verify changed image signatures and dimensions, inspect desktop/mobile browser captures, and test affected redirects with HTTP requests. Report every command and result. Do not claim browser, link, or image review without captured evidence.

Finish only when the diff is focused, the worktree contains no secrets or accidental generated files, documentation is updated, independent review is clean, and deterministic checks pass or their exact limitation is disclosed.
