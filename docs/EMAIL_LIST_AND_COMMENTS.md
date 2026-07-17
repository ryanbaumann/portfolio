# Email list and post comments

Two reader-facing features on the writing pages, both deliberately thin:

- **Email list** — a zero-client-JS form on `/writing/` and under every field
  note that POSTs to the gateway's `/api/subscribe` route, which stores the
  address as a global [Resend Contact](https://resend.com/docs/dashboard/audiences/introduction),
  adds it to the Field Notes Segment, and opts it into the Field Notes Topic.
  Nothing is ever sent automatically: updates go out as Resend **broadcasts**
  composed in the dashboard, whenever there is something worth announcing.
- **Comments** — GitHub Discussions rendered on each field note by
  [giscus](https://giscus.app). Readers sign in with GitHub inside the widget
  to post or react. No comment database or moderation backend is required;
  threads live on the repo and are moderated like any other Discussion.

## Email list setup (one time)

1. In Resend, create a **Segment** named `Field Notes` for internal sending.
2. Create a user-facing **Topic** named `Field Notes` for subscription
   preferences.
3. Set `RESEND_SEGMENT_ID` and `RESEND_TOPIC_ID` on the Cloud Run service,
   along with `RESEND_API_KEY`. Use Secret Manager references as shown in
   `deploy.yml`. Locally, `npm run setup` asks for all three values.
4. Until all three values are set, the
   route answers `503` and the form shows a friendly "not configured" page,
   so the site keeps working keyless.

Sending an update: Resend → Broadcasts → compose → select the Field Notes
Segment and Topic → send or schedule. Keep the unsubscribe link in every
marketing send.

Route behavior (`gateway/server.js`): honeypot + 5/min/IP rate limit, 303 to
`/subscribed/` on success, and re-opt-in of an existing Contact on a repeated
submission. Provider failures return an HTML error page. Unit tests:
`gateway/test/server.test.js` ("subscribe route …").

## Comments setup (one time)

The embed is config-gated: `portfolio/content/site.json` → `comments`. It
renders nothing (and loads no script) until every field is filled, so the
site stays inert until you flip it on.

1. Enable **Discussions** on the `ryanbaumann/portfolio` repo
   (Settings → General → Features).
2. Create a Discussions category for comments. An **Announcements-type**
   category is recommended so only giscus/maintainers can open threads
   (the current config uses `Announcements`).
3. Install the [giscus GitHub App](https://github.com/apps/giscus) on the repo.
4. Open [giscus.app](https://giscus.app), enter the repo, pick the category,
   and copy the generated `data-category-id` into `comments.categoryId` in
   `site.json` (`repoId` is already filled in). Rebuild and deploy.

Notes:

- Mapping is `pathname`. Strict matching is off to preserve existing threads.
- The widget follows the site's theme toggle (light/dark/system) via a small
  inline script in `build.mjs` (`commentsSection`).
- The private `/writer/` preview build never renders the embed.
- To turn comments off, blank `categoryId` and rebuild.
