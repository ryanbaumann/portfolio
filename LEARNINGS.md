# Repository Learnings

This log captures durable lessons discovered while building and maintaining the portfolio and demo lab, keeping the root instructions lean.

## 2026-07-17 - `node --test <dir>/` stopped accepting a bare directory argument

Context: `portfolio/package.json` ran its suite with `node --test test/`, which passed on the Node 22 minors CI had been using.
Learning: On Node v22.22, `node --test test/` fails with `Cannot find module .../test` — the runner resolves the bare directory as an entry module instead of a test pattern. An explicit glob (`node --test test/*.test.mjs`) behaves identically on old and new minors.
Evidence: The same checkout, same suite: directory form exits 1 with `MODULE_NOT_FOUND`; glob form runs all 23 tests green.
Use next time: Point `--test` at explicit glob patterns, not a bare directory, anywhere a Node minor bump can land before the script is revisited.

## 2026-07-17 - Reader features should reuse the boundaries the site already has

Context: Adding an email list and post comments could easily have meant a database, an auth system, and a moderation surface — none of which this zero-dependency container wants.
Learning: Route new reader features through boundaries that already exist. Subscriptions became one gateway route into the Resend account the contact form already uses (audience membership here, sends composed as dashboard broadcasts); comments became GitHub Discussions rendered by giscus, config-gated in `site.json` so the build stays script-free until the IDs are deliberately filled in.
Evidence: `/api/subscribe` in `gateway/server.js` (honeypot + rate limit + keyless 503, mirroring `/api/contact`), `commentsSection`/`subscribeSection` in `portfolio/build.mjs`, setup runbook in `docs/EMAIL_LIST_AND_COMMENTS.md`.
Use next time: Before adding a stateful feature, check whether an existing provider account, the gateway's route patterns, or GitHub itself can hold the state; wire the feature to fail closed (inert markup, JSON/HTML 503) when its configuration is absent.

## 2026-07-16 - Let the resident agent adapt portable prompts

Context: Agent harnesses use different global instruction files, skill directories, import mechanisms, and reload behavior. A dedicated cross-harness installer duplicated knowledge that the resident coding agent can inspect directly.
Learning: Keep one vendor-neutral prompt as the source of truth and publish a bounded self-install task packet. Tell the resident agent the desired end state, preservation rules, prohibited configuration changes, and verification evidence. Let it choose the current native mechanism for its environment.
Evidence: `agent-scripts/coding-agent-loop/README.md` now gives users one copyable install request. The role files state when they apply and that they narrow rather than expand authority.
Use next time: Prefer a self-install instruction over adapter code when the target is another capable agent and installation is a small, inspectable configuration task. Add tooling only after repeated installation failures show that deterministic automation is needed.

## 2026-07-16 - Private release previews need an identity boundary

Context: A shared dashboard password cannot satisfy an account-specific review workflow or provide a useful audit boundary for release decisions.
Learning: Protect the release dashboard with Google OAuth, restrict the accepted verified email server-side, use an exact HTTPS callback origin, and keep GitHub write credentials only in the gateway. The browser may render drafts but never receives a GitHub token.
Evidence: `gateway/lib/googleAuth.js` exchanges the authorization code server-side, asks Google to validate the ID token, checks the allowed email, and signs a short-lived HttpOnly session.
Use next time: Register the exact callback URL before deployment and keep any future coding-agent feedback integration behind the same authenticated gateway boundary.

## 2026-07-16 - Review requests need an explicit handoff

Context: A direct edit box and publish controls do not show an author what happens between a draft and release.
Learning: Make the review handoff visible in the dashboard: save the concrete draft first, collect a short author note, and create one review request that names the exact file, branch, and the writing, review, and design skills the agent must use. Keep the review token scoped to Issues, separate from the Contents token.
Evidence: `requestWritingReview` opens a GitHub issue with those review lanes, and the writer dashboard links back to the issue after submission.
Use next time: Do not let a review request silently publish, edit, or skip the rendered preview. Require an explicit follow-up action for each of those transitions.

## 2026-07-16 - Agent instructions and executable scripts need separate namespaces

Context: The repository already used `scripts/` for executable build and maintenance programs, while a growing collection of copyable agent prompts also needed a memorable GitHub home.
Learning: Store prompts, role contracts, and behavioral evals under `agent-scripts/`, with one self-contained folder per artifact. Keep the canonical prompt in that package and use `portfolio/content/scripts/` only for the reader-facing summary and source links. This makes the trust boundary visible and avoids maintaining two prompt copies.
Evidence: `agent-scripts/coding-agent-loop/` contains the canonical prompt, role overlays, README, and 16-case specification; `portfolio/content/scripts/loop-engineering-coding-agent.md` links to those files and the build publishes `/scripts/`.
Use next time: Copy `agent-scripts/_TEMPLATE/`, add eval cases before tuning behavior, then add one portfolio summary entry. Never put prompt text in the executable `scripts/` tree or duplicate the canonical prompt in CMS prose.

## 2026-07-15 - Initial Release

Context: Preparing the repository for its initial public release.
Learning: Compressed the prior learnings log for the initial public launch to keep history clean.
Evidence: Initial commit of the public repository.
Use next time: Document future durable lessons here using this format.

## 2026-07-16 - Copy taste: metrics, third-party tools, and humble voice

Context: Reviewed copy and claims across the site with Ryan. Prior guidance said
"metrics are the spine, use the number," which pushed precise internal
current-employer growth figures (300% users, ~200% API engagement) onto public
pages.
Learning: This is a personal dev brand, not an employer marketing page. Three
taste rules emerged. (1) Metrics: real numbers are fine for public/verifiable
stats (npm downloads), prior-company results, and aged or long-public
current-employer work; recent internal current-employer usage or growth figures
read as internal and sales-pitchy, so use qualitative, understated framing
instead. (2) Third-party tools: name first-party surfaces (AI Studio), never
enumerate competitor AI products (name-brand IDEs, assistants, agent apps), which
reads like tool-shopping or looking for work elsewhere. (3) Voice: default to
"Our team built… I led the strategy and stayed close to the work," crediting
cross-functional partners, without diluting genuinely individual work.
Evidence: Session with Ryan; changes folded into `portfolio-writing`,
`portfolio-review`, and `docs/PORTFOLIO_EVIDENCE_LEDGER.md`.
Use next time: Follow the updated skills and ledger. Keep HITL artifacts (PR and
commit messages) high-level; do not expose internal specifics.
