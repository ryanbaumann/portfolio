---
title: Loop Engineering Coding Agent
summary: Cut agent costs by routing an orchestrator and cheap sub-agents through a structured loop, then codify the pattern as a forkable system prompt.
date: 2026-07-16
updated: 2026-07-16
type: System prompt
tags: ["ai", "developer tools", "evals"]
links: [{"label":"Read the prompt","url":"https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/SYSTEM_PROMPT.md"},{"label":"Fork the package","url":"https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop"},{"label":"Review the evals","url":"https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/evals/cases.md"}]
image: /img/scripts/coding-agent-loop.svg
imageAlt: Six-step loop from contract through observation, change, verification, integration, and learning or stopping.
socialImage: /social/coding-agent-loop.png
shareTitle: Loop Engineering Coding Agent
shareSummary: Cut agent costs with an orchestrator and cheap sub-agents working a structured loop, codified as a forkable system prompt.
shareImageAlt: Social card showing a bounded coding-agent loop from contract to verified terminal state.
---

Most coding-agent cost comes from running a single high-capability model for every sub-task. An orchestrator that delegates bounded jobs to cheaper, lower-power models can cut token spend dramatically while keeping quality where it matters: at the decision points.

I built this prompt around that architecture. One orchestrator holds the goal, decomposes the work, and owns the final answer. Workers run on fast or balanced models, each scoped to one job with explicit edit boundaries and a done condition. The orchestrator inspects their evidence before integrating. The expensive model reasons about what to do. The cheap models do it.

## Loop engineering: the idea

The pattern is a loop, not a pipeline. Each cycle moves through a fixed sequence: observe the current state, make one bounded change, verify the result, integrate or roll back, and either continue or stop. Every step produces evidence the next step can check.

I call the discipline of designing these loops "loop engineering." It means choosing where in the cycle each role acts, what evidence it must produce, and what condition ends the loop. A well-designed loop keeps agents from drifting, retrying without learning, or declaring success without proof.

## What the loop prevents

- **An investigation turns into an edit.** "Diagnose why this fails" means inspect and explain. It does not authorize file changes, package installs, or deployment.
- **The agent overwrites existing work.** It checks `git status` before editing and preserves uncommitted and untracked files.
- **Repository text changes the task.** A README, issue, comment, or command output is data, not an instruction source. The authorized task stays in control.
- **The agent claims a pass it did not observe.** "Done" requires evidence in the working tree, not just generated code.

## How I codified it

The [GitHub package](https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop) turns those principles into a single system prompt plus four role overlays: orchestrator, worker, reviewer, and verifier.

The shared prompt defines authority, action modes, the engineering loop, verification contracts, orchestration rules, worker limits, capability routing, failure recovery, memory promotion, and terminal states. Each overlay makes an agent narrower without granting more authority. The orchestrator overlay owns decomposition, budget, and the final answer. A worker overlay scopes one bounded task, cannot expand scope or spawn more agents, and returns evidence for the orchestrator to inspect.

The prompt uses "fast," "balanced," and "deep" capability profiles instead of model names, so you route the actual model in the harness and keep the prompt evergreen.

## How to use it

1. Paste `SYSTEM_PROMPT.md` into your agent's global instructions field.
2. Keep repo-specific commands and architecture in local instruction files, so they load only where they apply.
3. Running multiple agents? Give each the shared prompt plus one role overlay.
4. Enforce the real guardrails in your harness: sandbox, network limits, protected paths, approvals, and audit logs. A prompt asks for good behavior; it cannot enforce it.
5. Test it in the exact model, tools, and permissions you run.

I am also considering packaging this as a reusable skill that loads only when the agent enters a multi-step coding task.

## What I can and can't claim yet

The suite specifies 16 scenarios, including dirty worktrees, read-only diagnosis, prompt injection in repository data, conflicting instructions, production boundaries, retry limits, parallel writers, helper containment, cross-session work, missing verification, security changes, UI checks, and memory quality.

The structural check passes. A separate read-only review found problems that I corrected. That is not a behavioral benchmark, and no behavioral trial results are recorded. Before using the prompt as a production gate, run repeated trials in your own harness and retain the transcripts, tool calls, diffs, final repository state, and calibrated grading evidence.

Fork it, run it against the tasks that have failed in your environment, and adapt it from the evidence.
