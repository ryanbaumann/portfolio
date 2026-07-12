---
name: content
description: How to add or update content on this site — work entries, blog posts, talks, pages, static assets, or a whole new content type. The CMS is the filesystem.
---

# Updating content

The CMS is `content/` + `build.mjs`. No database, no admin UI: add a markdown
file, run `node build.mjs`, done. Every collection folder has a
`_TEMPLATE.md` (underscore-prefixed files are skipped by the build).

## Front matter

A `---`-delimited block of `key: value` lines. Values that parse as JSON
(arrays, objects, numbers, booleans) are used as such; everything else is a
string. Common keys:

| Key | Used by | Meaning |
|---|---|---|
| `title`, `summary` | all | Shown in lists, cards, and meta tags |
| `order` | all | Sort key (ascending); ties break by `date` descending |
| `featured` | work | `true` puts the entry on the home page |
| `org`, `role`, `period`, `tags`, `links` | work | Card + case-study header |
| `date`, `external` | writing | `external: <url>` = outbound link, no page |
| `venue`, `type`, `links` | talks | Row metadata; `type` is free-form |
| `eyebrow` | pages | Label above the page title |

## Where things go

- **Work case study** → `content/work/<slug>.md`. Body renders at `/work/<slug>/`; no body = card links out to the first `links` URL.
- **Blog post** → `content/writing/<slug>.md` (or `npm run new:post -- "Title"` from the repo root). This is the blog: the section is already designed and routed; posts appear at `/writing/<slug>/` the moment the first file lands. Use the writing skill for voice.
- **Talk / presentation** → `content/talks/<slug>.md`, decks in `static/decks/` (see the presenting skill).
- **Standalone page** → `content/pages/<slug>.md` → `/<slug>/`. Add it to the nav in `build.mjs` `layout()` if it should be globally reachable.
- **Any static asset** (images, PDFs, files) → `static/`, copied verbatim into the site root.
- **Site-wide copy** (name, thesis, section intros, links) → `content/site.json`.

Internal links in content are written root-relative (`/work/`, `/decks/x.pdf`);
the build rebases them if the site is mounted under a subpath.

## Adding a new content type

1. Add `{ name, label, listPage, detailPages }` to `COLLECTIONS` in `build.mjs`.
2. Create `content/<name>/` with a `_TEMPLATE.md`.
3. Add the nav item in `layout()` and a section intro in `site.json` if wanted.
4. `node build.mjs` — the index, rows, and detail pages come for free.

## Verify

```bash
node build.mjs   # prints the page count
node serve.mjs   # preview at http://localhost:4000
```
