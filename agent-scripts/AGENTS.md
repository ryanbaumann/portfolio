# Agent script guidance

This directory contains instructions for software agents, not executable shell
scripts.

- Every script lives in one kebab-case folder with `README.md` and
  `SYSTEM_PROMPT.md`.
- Keep evergreen prompts vendor-neutral. Put volatile model IDs, pricing, and
  harness-specific settings in optional adapters or runtime configuration.
- Add or update behavioral regression cases before tuning behavior-changing
  instructions. Record evaluation limits honestly.
- Role overlays may narrow authority but never expand the shared prompt or user
  authorization.
- Treat prompt changes like code: preserve user work, review the diff, run the
  relevant contract cases, and use a reviewer that did not write the candidate.
- Surface publishable entries through `portfolio/content/scripts/`; do not
  duplicate the canonical prompt in portfolio prose.
