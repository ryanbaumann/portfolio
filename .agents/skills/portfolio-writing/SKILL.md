---
name: portfolio-writing
description: How Ryan writes. Use whenever drafting or editing any prose for this site — work case studies, blog posts, page copy, talk abstracts, even link summaries.
---

# How Ryan writes

## Voice

- **First person, active, direct.** "I built the eval suite," not "an eval suite was developed."
- **Outcome first.** Lead every piece — and most paragraphs — with what happened or what it moved. Context comes second.
- **Metrics are the spine, chosen with taste.** Lead with numbers, but pick ones that are safe for a public post from Ryan's personal brand. Safe to state with the real number: public, verifiable stats (npm download counts for the open-source libraries, published platform scale); metrics from prior companies (Mapbox, Instabase, Caterpillar, Google Cloud); and current-employer figures that are either a couple of years old or tied to something publicly launched for at least several months. If a safe claim has a number, use it.
- **Be careful with recent internal current-employer metrics.** Recent Google Maps Platform usage and growth figures (unique active users, API engagement) are both internal and sales-pitchy. Do not publish precise percentages for them: use qualitative, understated framing instead ("significant growth," "more than doubled," "grew substantially"). When a metric is recent, internal, and about the current platform, prefer to understate or omit it. When unsure, understate.
- **Growth-backwards framing.** Every work story starts from the adoption, revenue, or reach goal it served, then shows what shipped, then what the durable lesson is. Not "here's a thing I made."
- **Leader-practitioner, always.** "I set the strategy, and stay in the work" — pair every strategy claim with the concrete artifact: the trace reviewed, the eval written, the app shipped.
- **Short sentences. Concrete nouns. Varied rhythm.** Favor clarity, but do not stack sentences with the same subject-verb template. Break up runs like "Activation says... Retention says... Expansion says..." by combining related ideas, changing sentence length, or making the causal relationship explicit. The calibration reference for rhythm is Ryan's hand-written post [Spatial analytics with GeoJSON in BigQuery](https://cloud.google.com/blog/topics/developers-practitioners/using-geojson-bigquery-geospatial-analytics): purpose-first openings, cause and effect wired in with "because" and "instead of," and one longer layered sentence set against short direct ones. When a draft reads as a drumbeat of same-shape sentences, merge related ones until it sounds like that post. Read every paragraph aloud: it should sound conversational, not like a glossary or generated checklist. Cut hype adjectives entirely: never "cutting-edge," "revolutionary," "innovative," "world-class," "passionate." The evidence carries the excitement.
- **No em-dashes.** Use a period, a comma, or a colon instead. An em-dash is fine only when truly unavoidable.
- **Never overstate. Credit the team.** Most work here shipped with teams across product, engineering, UX, DevX, DRE, technical writing, and field engineering. Default to "Our team built… I led the strategy and stayed close to the work," not "I built" or "I led the team that built." Every claim needs a real artifact or verifiable number behind it. When unsure, understate. Do not dilute genuinely individual work: an authored library or a 0→1 product role is yours to state plainly.
- **Generalize third-party tools; name first-party surfaces.** Name Ryan's own and first-party surfaces (AI Studio, the open-source libraries). Do not enumerate specific third-party or competitor AI agent products — name-brand IDEs, assistants, or agent apps. Use "AI Studio and other compatible agent environments." This keeps the site a builder's portfolio, not a product catalog, and avoids reading like tool-shopping or looking for work elsewhere.
- **A dev brand, not a product pitch.** This is Ryan's portfolio, not an employer's marketing page. Describe shipped work and link public artifacts, but do not adopt a product-marketing tone or over-brand every noun. Prefer "hosted MCP service" to "Google-hosted MCP service" when the brand is not the point. Keep legitimate public links; cut salesy product-name enumerations and internal product framings.
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

Posts live here first. This site owns the canonical URL and RSS feed. Substack
documents RSS archive import but does not document a reliable external
canonical control or write API. For ongoing syndication:

1. Publish and verify the Field Note here first.
2. Publish a short Substack excerpt or Note with a tracked link to the full post.
3. Do not mirror the full body unless a verified Substack setting can point its
   canonical URL back to this site.
4. Keep subscriber ownership and campaign naming aligned with
   `docs/SYNDICATION.md`.

## Things Ryan never writes

- Passive voice for his own work.
- "We're excited to announce…"
- Geospatial jargon when a plain word exists ("map data," not "geospatial information layers").
- Anything that reads like a resume bullet transplanted into prose.
- Em-dashes.
- Solo credit for team work.
- Precise recent internal current-employer usage or growth numbers (use qualitative framing; prior-company and public/verifiable metrics keep their real numbers).
- Enumerated lists of third-party or competitor AI tools ("AI Studio and other compatible agent environments," not a name-brand list).
- Employer product-marketing tone that reads like he is selling the platform or looking for work elsewhere.
