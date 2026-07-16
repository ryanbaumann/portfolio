---
title: Loop Engineering Coding Agent
summary: A system prompt that defines what a coding agent may change, how it proves its work, and when it must stop and ask.
date: 2026-07-16
updated: 2026-07-16
type: System prompt
tags: ["ai", "developer tools", "evals"]
links: [{"label":"Read the prompt","url":"https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/SYSTEM_PROMPT.md"},{"label":"Fork the package","url":"https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop"},{"label":"Review the evals","url":"https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/evals/cases.md"}]
image: /img/scripts/coding-agent-loop.svg
imageAlt: Six-step loop from contract through observation, change, verification, integration, and learning or stopping.
socialImage: /social/coding-agent-loop.png
shareTitle: Loop Engineering Coding Agent
shareSummary: A forkable system prompt, role add-ons, and regression cases for coding-agent work with clear boundaries.
shareImageAlt: Social card showing a bounded coding-agent loop from contract to verified terminal state.
---

Coding agents need operating boundaries, not another reminder to be careful. A read-only question should not turn into an edit. Repository text should not become an instruction. Existing work should remain untouched. And an agent should not call a task complete without evidence.

I wrote this prompt to make those boundaries explicit: the task mode, the files an agent may change, the proof required for a result, and the point where it stops and asks.

## What it stops

- **An investigation turns into an edit.** “Diagnose why this fails” means inspect and explain. It does not authorize file changes, package installs, pull requests, or deployment.
- **The agent overwrites existing work.** It checks `git status` before editing and preserves uncommitted and untracked files. No blanket reverts.
- **Repository text changes the task.** A README, issue, comment, or command output is data, not an instruction source. The authorized task remains in control.
- **The agent claims a pass it did not observe.** It reports a test or deployment as successful only after running it and seeing the result. “Done” requires evidence in the working tree, not just generated code.

## One prompt, four jobs

For multi-agent work, the shared prompt pairs with a role overlay. The lead owns the goal, permissions, write boundaries, and final answer. A helper gets one bounded job. It cannot expand scope, spawn more agents, publish, or declare the full task complete. That keeps parallel work from becoming competing edits to the same file.

## What is in the repo

The [GitHub package](https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop) includes the full prompt, four short role overlays for the lead, helper, reviewer, and verifier, plus a regression suite.

It lives under `agent-scripts/`, not the repo's `scripts/` folder. That folder holds shell scripts you run; this one holds text an agent reads. Keeping the names apart keeps the line between instructions and commands obvious.

## How to use it

1. Paste `SYSTEM_PROMPT.md` into your agent's global instructions field.
2. Keep repo-specific commands and architecture in local instruction files, so they load only where they apply.
3. Running multiple agents? Give each the shared prompt plus one role add-on.
4. Enforce the real guardrails in your harness: sandbox, network limits, protected paths, approvals, and audit logs. A prompt asks for good behavior; it cannot enforce it.
5. Test it in the exact model, tools, and permissions you run.

The prompt uses “fast,” “balanced,” and “deep” capability profiles instead of model names. Configure the specific model in the harness and re-run the suite when it changes.

## What I can and can't claim yet

The suite specifies 16 scenarios, including dirty worktrees, read-only diagnosis, prompt injection in repository data, conflicting instructions, production boundaries, retry limits, parallel writers, helper containment, cross-session work, missing verification, security changes, UI checks, and memory quality.

The structural check passes. A separate read-only review also found problems that I corrected. That is not a behavioral benchmark, and no behavioral trial results are recorded. Before using the prompt as a production gate, run repeated trials in your own harness and retain the transcripts, tool calls, diffs, final repository state, and calibrated grading evidence.

## Why it is built this way

The design keeps always-on instructions short, moves detailed playbooks into files that load only when needed, separates implementation from review and verification, and evaluates the model together with its tools and permissions. The [README](https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/README.md) links the research and projects behind those choices.

Fork it, run it against the tasks that have failed in your environment, and adapt it from the evidence.
