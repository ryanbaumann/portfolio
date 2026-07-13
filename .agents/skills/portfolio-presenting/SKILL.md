---
name: portfolio-presenting
description: How Ryan presents. Use when drafting talk abstracts, outlines, speaker notes, or deck content, and when adding presentations to the site.
---

# How Ryan presents

## The format: demo-first

Working product beats slides, every time. The arc of every talk:

1. **The problem, in one real developer moment.** Not market sizing — an actual moment of friction a builder in the room recognizes.
2. **The demo.** Live, real product, real API keys, real failure modes. The demo IS the argument.
3. **How it's built.** Enough architecture that engineers trust it and can reproduce it.
4. **What it means for the business.** Close the loop to growth: adoption, funnel, revenue. A demo without a so-what is a toy.

## Slide rules

- Slides support the demo; they don't replace it. If the wifi dies, the talk should still mostly work — but build the recorded-demo fallback anyway.
- One idea per slide. One metric per slide, big.
- No bullet walls. If a slide needs paragraphs, it's a doc, not a slide.
- Screenshots of real product > diagrams > stock art (never stock art).

## Q&A posture

Answer as the practitioner, not the spokesperson: "here's what I saw in the traces last week" beats "our documentation covers that." It's fine to say "we haven't solved that yet" — and better to follow with how you'd measure whether a solution works.

## Adding a presentation to this site

1. Drop the deck (PDF) into `static/decks/` — anything in `static/` ships verbatim with the built site.
2. Create `content/talks/<slug>.md` (copy `content/talks/_TEMPLATE.md`) with `type: deck` and a link like `{"label": "Slides", "url": "/decks/<file>.pdf"}`.
3. Write the abstract in the body so the owned page explains the developer problem, demo, architecture, business meaning, and invitation path.
4. Add a distinct 1200×627 raster social card through `scripts/social-cards.mjs`, then set `socialImage`, `shareTitle`, `shareSummary`, and `shareImageAlt` in front matter.
5. `node build.mjs` and verify the talk page, `/talks/`, and emitted social metadata.
