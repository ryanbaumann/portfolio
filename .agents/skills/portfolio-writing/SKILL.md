---
name: portfolio-writing
description: How Ryan writes. Use whenever drafting or editing any prose for this site — work case studies, blog posts, page copy, talk abstracts, even link summaries.
---

# How Ryan writes

## Voice

- **First person, active, direct.** "I built the eval suite," not "an eval suite was developed."
- **Outcome first.** Lead every piece — and most paragraphs — with what happened or what it moved. Context comes second.
- **Metrics are the spine.** 10M+ apps, 300%+ reach, $5M ARR, nine months, 3 patents. If a claim has a number, use the number. If it doesn't, question the claim.
- **Growth-backwards framing.** Every work story starts from the adoption, revenue, or reach goal it served, then shows what shipped, then what the durable lesson is. Not "here's a thing I made."
- **Leader-practitioner, always.** "I set the strategy, and stay in the work" — pair every strategy claim with the concrete artifact: the trace reviewed, the eval written, the app shipped.
- **Short sentences. Concrete nouns.** Cut hype adjectives entirely: never "cutting-edge," "revolutionary," "innovative," "world-class," "passionate." The evidence carries the excitement.
- **No em-dashes.** Use a period, a comma, or a colon instead. An em-dash is fine only when truly unavoidable.
- **Never overstate.** For a team launch, credit the team: "I led the team that," not "I built." Every claim needs a real number or artifact behind it. When unsure, understate.
- **Cut, don't polish.** If a piece of content is not differentiated, cut it. Don't spend time making weak content sound better.

## Structure for work entries

Three sections, in order, each 1–2 short paragraphs:

1. `## The goal` — the business/growth problem, stated plainly.
2. `## What shipped` — what was actually built or led, with links to real artifacts.
3. `## What I learned`: the durable lesson, stated plainly.

## Structure for blog posts

- A title that states the thesis, not the topic ("Developer experience is a growth engine," not "Thoughts on DevX").
- First paragraph: the claim and why the reader should care. No throat-clearing.
- Evidence from real work — link the artifact every time.
- End with what to do about it, not a summary.

## Review gate

Before calling public prose ready, run the `portfolio-review` skill. Inventory every material claim, verify it against `docs/PORTFOLIO_EVIDENCE_LEDGER.md` or a primary source, check attribution and causality, then use an independent copy/claims reviewer. Unsupported copy is removed or qualified, never polished into plausibility.

## Syndicating a post to Substack

Posts live here first. This site owns the canonical URL, has an RSS feed at
`/feed.xml`, and lets Google credit the original. Substack has no reliable
RSS auto-import, so mirroring is a manual copy either way. When cross-posting:

1. Publish here first: `npm run new:post -- "Title"`, write it, `node portfolio/build.mjs`.
2. Paste the body into a new Substack post.
3. In Substack, set the canonical URL to the post's URL on this site
   (`https://www.ryanbaumann-portfolio.com/writing/<slug>/`) so search
   engines credit the original, not the mirror.
4. For a post that started on Substack, do the reverse: add a hosted-here
   entry with `canonical` pointing at the Substack URL (see
   `content/writing/vibing-with-maps.md`), or leave it as an `external`
   link-out. Never let two live URLs claim the same canonical.

## Things Ryan never writes

- Passive voice for his own work.
- "We're excited to announce…"
- Geospatial jargon when a plain word exists ("map data," not "geospatial information layers").
- Anything that reads like a resume bullet transplanted into prose.
- Em-dashes.
- Solo credit for team work.
