# Agent scripts

Reusable prompts, role contracts, evaluation sets, and operating playbooks for
software agents. This directory is for instructions that an agent reads. The
repository's root `scripts/` directory remains reserved for executable build and
maintenance tooling.

Each script is a self-contained folder:

```text
agent-scripts/<script-name>/
  README.md          # purpose, installation, and operating notes
  SYSTEM_PROMPT.md   # canonical vendor-neutral instruction
  roles/             # optional role-specific overlays
  evals/             # behavioral regression and capability cases
```

## Available scripts

- [Loop Engineering Coding Agent](coding-agent-loop/README.md): a bounded,
  evidence-driven operating contract for coding agents and multi-agent
  orchestrators.

## Add a script

1. Create one kebab-case folder with a canonical `SYSTEM_PROMPT.md`.
2. Write a README that states the trigger, inputs, installation options,
   permissions, and verification method.
3. Add role overlays only when responsibilities genuinely differ.
4. Add regression cases before tuning the prompt. Include cases where the agent
   should act and cases where it must not act.
5. Keep model IDs and vendor-specific configuration outside the evergreen
   prompt. Document optional adapters separately.
6. Add an optional reader-facing field note under `portfolio/content/writing/`
   and rebuild the portfolio.

When several harnesses can consume the same prompt, include a short task packet
that users can give their existing agent to install it. Tell that agent to use
native global instructions, preserve existing guidance, keep optional roles out
of always-on context, and verify the result.

Prompt text is policy, not enforcement. Sandboxing, network restrictions,
protected paths, approval gates, and audit logging belong in the agent harness.
