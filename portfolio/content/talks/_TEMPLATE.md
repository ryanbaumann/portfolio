---
title: Talk title
venue: Conference / channel name
type: talk
date: 2026-01-15
summary: One sentence on what the talk covers.
links: [{"label": "Slides", "url": "/decks/my-deck.pdf"}, {"label": "Watch", "url": "https://example.com"}]
draft: true
noindex: true
order: 99
---

Files starting with `_` are skipped by the build — copy to `<slug>.md` to
publish. `type` is free-form and shows in the list row: `video`, `deck`,
`talk`, `workshop`, `series`, whatever fits.

To attach a slide deck or any other static asset: drop the file into
`static/decks/` (it's copied verbatim into the built site) and link it with
a root-relative URL like `/decks/my-deck.pdf` in `links`.

Leave the body empty for a list-only entry, or write speaker notes /
an abstract here to get a page at `/talks/<slug>/`.
