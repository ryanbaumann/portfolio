# Email list and post comments

Two reader-facing features on the writing pages, both deliberately thin:

- **Email list** — a zero-client-JS form on `/writing/` and under every field
  note that POSTs to the gateway's `/api/subscribe` route, which stores the
  address in a [Resend audience](https://resend.com/docs/dashboard/audiences/introduction).
  Nothing is ever sent automatically: updates go out as Resend **broadcasts**
  composed in the dashboard, whenever there is something worth announcing.
- **Comments** — GitHub Discussions rendered on each field note by
  [giscus](https://giscus.app). Readers sign in with GitHub inside the widget
  to post or react. No comment database, no moderation backend to run —
  threads live on the repo and are moderated like any other Discussion.

## Email list setup (one time)

1. In the Resend dashboard, create an **Audience** (e.g. "Field notes").
2. Copy its audience ID and set `RESEND_AUDIENCE_ID` on the Cloud Run service
   (Secret Manager reference, like `RESEND_API_KEY` — see `deploy.yml`).
   Locally, add it to `.env` (`npm run setup` now asks for it).
3. Done. Until both `RESEND_API_KEY` and `RESEND_AUDIENCE_ID` are set the
   route answers `503` and the form shows a friendly "not configured" page,
   so the site keeps working keyless.

Sending an update: Resend → Broadcasts → compose → pick the audience → send
or schedule. Broadcast templates include `{{{RESEND_UNSUBSCRIBE_URL}}}`; keep
the one-click unsubscribe link in every send — the subscribe form and the
privacy page promise it.

Route behavior (`gateway/server.js`): honeypot + 5/min/IP rate limit, 303 to
`/subscribed/` on success, 409-from-Resend (already subscribed) treated as
success, provider failures return an HTML error page. Unit tests:
`gateway/test/server.test.js` ("subscribe route …").

## Comments setup (one time)

The embed is config-gated: `portfolio/content/site.json` → `comments`. It
renders nothing (and loads no script) until every field is filled, so the
site stays inert until you flip it on.

1. Enable **Discussions** on the `ryanbaumann/portfolio` repo
   (Settings → General → Features).
2. Create a Discussions category for comments — an **Announcements-type**
   category is recommended so only giscus/maintainers can open threads
   (the current config expects one named `Field note comments`).
3. Install the [giscus GitHub App](https://github.com/apps/giscus) on the repo.
4. Open [giscus.app](https://giscus.app), enter the repo, pick the category,
   and copy the generated `data-category-id` into `comments.categoryId` in
   `site.json` (`repoId` is already filled in). Rebuild and deploy.

Notes:

- Mapping is `pathname` with `strict` on, so each post URL gets exactly one
  thread.
- The widget follows the site's theme toggle (light/dark/system) via a small
  inline script in `build.mjs` (`commentsSection`).
- The private `/writer/` preview build never renders the embed.
- To turn comments off, blank `categoryId` and rebuild.
