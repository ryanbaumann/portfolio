---
title: Post title
summary: One-sentence description shown in lists and previews.
date: 2026-01-15
updated: 2026-01-15
canonical: https://www.ryanbaumann-portfolio.com/writing/post-title/
image: /previews/portfolio.jpg
imageAlt: Ryan Baumann Portfolio preview card
tags: ["developer experience"]
draft: true
noindex: true
order: 99
---

Files starting with `_` are skipped by the build — copy to `<slug>.md` to
publish. Two kinds of writing entries:

1. **A post hosted here**: write the body in markdown below the front
   matter. It renders at `/writing/<slug>/`. Use the writing skill
   (`../../../.agents/skills/portfolio-writing/SKILL.md`) for voice.
2. **An external piece** (LinkedIn, a launch blog): add
   `external: https://...` to the front matter and leave the body empty.
   It lists with an outbound link.

Drafts are safe by default: set `draft: false` or remove it before publishing. Hosted posts should use ISO dates, a canonical URL, tags, and image alt text. Entries sort by `order`, then `date` descending; published entries appear in `/feed.xml`.
