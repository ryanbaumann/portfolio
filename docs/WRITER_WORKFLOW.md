# Draft and scheduled essay workflow

Essays support three publishing states from front matter:

```yaml
# Private writer preview only
draft: true
noindex: true

# Public on the next deploy
draft: false
noindex: false

# Public on the first scheduled deploy after this UTC time
draft: false
noindex: false
publishAt: 2099-07-14T16:00:00Z
```

Create a safe draft with `npm run new:post -- "Essay title"`. Use `--publish` for immediate publication or `--schedule 2099-07-14T16:00:00Z` to scaffold a scheduled essay.

## Writer page

Production builds a second copy at `/writer/`. It includes drafts and future essays, is excluded from public app discovery, forces `noindex, nofollow`, disables analytics, and is protected by Google OAuth. Only `rsbaumann@gmail.com` is accepted by default. Point `WRITER_PUBLIC_ORIGIN` at the production HTTPS origin (for example, `https://ryanbaumann-dashboardfolio.admin.com`) and register `${WRITER_PUBLIC_ORIGIN}/auth/google/callback` as an authorized redirect URI in the Google Cloud OAuth client.

The release dashboard makes the workflow explicit: open the private preview, edit the Markdown, save the draft, leave a review note, and request agentic review before publishing. A review request creates a GitHub issue with the content file, branch, and the required `portfolio-writing`, `portfolio-review`, and `portfolio-design` review lanes. A connected coding agent can pick up that issue, leave findings, and make a follow-up commit. Return to the dashboard to review that iteration in the private preview, then schedule or publish it. Publish now still requires an explicit browser confirmation. Every save creates a focused commit on `main` through the GitHub Contents API; the normal push deploy handles immediate publication, and an hourly scheduled deploy publishes due timestamps.

Required runtime configuration:

- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`: the server-side Google OAuth web-client credentials.
- `GOOGLE_OAUTH_SESSION_SECRET`: a long random value used only to sign short-lived dashboard sessions.
- `WRITER_PUBLIC_ORIGIN`: the exact HTTPS dashboard origin, with no path or trailing slash.
- `GOOGLE_OAUTH_ALLOWED_EMAIL`: optional override, defaults to `rsbaumann@gmail.com`.
- `GITHUB_CONTENT_TOKEN`: a fine-grained GitHub token restricted to this repository with **Contents: read and write**. Store it in Secret Manager.
- `GITHUB_REVIEW_TOKEN`: a dedicated fine-grained GitHub token with **Issues: read and write**. Required to submit agent-review requests; it never reaches the browser.
- `GITHUB_CONTENT_REPOSITORY`: optional, defaults to `ryanbaumann/Portfolio`.
- `GITHUB_CONTENT_BRANCH`: optional, defaults to `main`.

Attach the OAuth client secret, session secret, and GitHub token to the Cloud Run service as secret-backed environment variables. The client ID, allowed email, and public origin may be regular runtime environment variables. Never use `VITE_` names or Docker build arguments for them.

GitHub's Contents permission applies to the whole repository, not only the writing folder. The application restricts updates to `portfolio/content/writing/<slug>.md`, but the token itself cannot be path-scoped. Use a fine-grained token dedicated to this service, rotate it regularly, and never expose it to browser code. The configured branch must allow Contents API commits; protected branches that require pull requests reject the update with an actionable error. If that is your policy, set `GITHUB_CONTENT_BRANCH` to a dedicated publishing branch and merge its changes through the normal PR workflow.

## Important confidentiality limit

This repository is public. A Markdown draft committed here can still be read in GitHub history even when its rendered preview is OAuth-protected. Assets under `portfolio/static/` are also copied to the public build. Use this workflow for unfinished writing, not confidential or embargoed material. Confidential drafts require a private content repository or store.

Scheduled publication is not exact to the minute. GitHub's hourly schedule can be delayed, so an essay appears at or shortly after `publishAt`. Use the manual deploy workflow when exact timing matters.
