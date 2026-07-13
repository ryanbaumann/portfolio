# Ryan Baumann Portfolio

Ryan Baumann's site — [work](https://www.ryanbaumann-portfolio.com/work/),
writing, talks, and the demo lab — from 15+ years building developer platforms
as a growth engine, currently as Head of Developer Experience at Google Maps
Platform. Served at the root of
[ryanbaumann-portfolio.com](https://www.ryanbaumann-portfolio.com/).

Built to be **bare bones, fast, and easy to update**: a zero-dependency
static site generator over a flat-file markdown CMS. No framework, no
database, no client-side JavaScript. Every page is a single request.

## Quickstart

```bash
node build.mjs   # renders content/ into dist/
node serve.mjs   # preview at http://localhost:4000
```

That's the whole toolchain. Node 20+, no `npm install`.

## How it works

```
content/            the CMS — flat files, edit and rebuild
  site.json         identity, intro, section intros, links
  work/*.md         case studies (front matter + markdown body)
  writing/*.md      blog posts (the blog is live; posts appear as files land)
  talks/*.md        talks, videos, and decks
  pages/*.md        standalone pages (e.g. /about/)
static/             copied verbatim (favicon, decks/, previews/, images)
build.mjs           the entire generator (~500 lines, zero deps)
style.css           the entire design system, inlined at build time
serve.mjs           tiny preview server
```

The homepage Demos section and nav item are fed by `../apps.json` (the
gateway's app manifest) when it exists — in a standalone deployment of this
folder they simply disappear.

Each collection folder has a `_TEMPLATE.md` showing its front-matter
schema. Underscore-prefixed files are ignored; `draft: true` entries are also skipped by the build, which makes work-in-progress files safe to commit.

## Updating the site

Adding anything is: copy the template, write markdown, `node build.mjs`. New blog posts have a paved path from the repo root:

```bash
npm run new:post -- "Developer experience is a growth engine" --summary "Why developer experience should be managed like a growth channel."
npm run new:post -- "External launch" --external https://example.com/launch
npm run new:post -- "Ready to publish" --publish
```

New posts are drafts with `noindex: true` by default. Review the generated copy and use `--publish` only when the entry is ready. The build validates content before it writes a deployable site: required titles and summaries, exact ISO dates for writing, valid URLs, duplicate slugs, image alt text, missing static assets, broken internal links, and unsafe `draft` / `noindex` combinations. Published writing entries also appear in `/feed.xml`, so adding or editing a post is edit → build → deploy → CDN cache refresh.

The repo ships generic agent skills that encode the standards, so any AI coding
agent can maintain the site in the same voice and style:

- `../.agents/skills/portfolio-content/` — the CMS how-to (schemas, where things go, new content types)
- `../.agents/skills/portfolio-writing/` — how Ryan writes (voice, structure, banned words)
- `../.agents/skills/portfolio-design/` — how Ryan designs (principles, tokens, performance budget)
- `../.agents/skills/portfolio-presenting/` — how Ryan presents (demo-first format, adding decks)

## Deploying

`dist/` is plain static files — host it anywhere (GitHub Pages, Cloud Run,
a bucket, any CDN). In production it serves at the domain root (the default
`BASE_PATH=/`). To serve under a subpath instead:

```bash
BASE_PATH=/some-subpath/ node build.mjs
```

## License

MIT
