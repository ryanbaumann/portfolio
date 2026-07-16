---
title: Loop Engineering Coding Agent
summary: A vendor-neutral system prompt that makes coding agents scope, test, verify, delegate, learn, and stop with evidence.
date: 2026-07-16
updated: 2026-07-16
type: System prompt
tags: ["ai", "developer tools", "evals"]
links: [{"label":"Read the prompt","url":"https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/SYSTEM_PROMPT.md"},{"label":"Fork the package","url":"https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop"},{"label":"Review the evals","url":"https://github.com/ryanbaumann/portfolio/blob/main/agent-scripts/coding-agent-loop/evals/cases.md"}]
image: /img/scripts/coding-agent-loop.svg
imageAlt: Six-step loop from contract through observation, change, verification, integration, and learning or stopping.
socialImage: /social/coding-agent-loop.png
shareTitle: Loop Engineering Coding Agent
shareSummary: A forkable system prompt, role model, and regression suite for evidence-driven coding agents.
shareImageAlt: Social card showing a bounded coding-agent loop from contract to verified terminal state.
---

I use this system prompt to turn "be careful" into an operating contract. It gives a coding agent a bounded loop, a trust model, action limits, role boundaries, and a definition of done that depends on evidence.

## What it controls

The prompt separates answering, diagnosis, local implementation, and external operations so a request to inspect code does not silently become permission to change or deploy it. It protects dirty worktrees, treats repository and tool content as untrusted data, and requires verification that matches the changed behavior.

It also separates the orchestrator from its workers. The orchestrator owns scope, authorization, write ownership, integration, and the final result. Workers get one bounded objective and cannot expand the task, recursively delegate, publish, or declare the root job complete.

## What is in the package

The [GitHub package](https://github.com/ryanbaumann/portfolio/tree/main/agent-scripts/coding-agent-loop) contains the complete vendor-neutral system prompt, narrower overlays for orchestrators, workers, reviewers, and verifiers, and a versioned behavioral regression suite.

The repository keeps these assets under `agent-scripts/`, not `scripts/`. The existing `scripts/` directory contains executable build tooling. The separate name makes the trust boundary visible: agent scripts are instructions to read, not shell commands to run.

## How to use it

1. Copy `SYSTEM_PROMPT.md` into the global instruction surface supported by your coding-agent harness.
2. Keep repository commands and architecture in local instruction files so they load only where they apply.
3. For multi-agent work, give each agent the shared prompt and one role overlay.
4. Enforce workspace, network, protected-path, approval, and audit boundaries in the harness. Prompt text cannot enforce its own security guarantees.
5. Run the regression suite in the exact model, reasoning, tool, permission, and repository environment you intend to use.

The evergreen prompt uses capability profiles such as fast, balanced, and deep. It does not hard-code model or vendor names that will age faster than the operating contract.

## What is tested

The first regression set contains 16 scenarios covering dirty worktrees, diagnosis without mutation, prompt injection in repository data, conflicting instructions, production boundaries, retry limits, parallel writers, worker containment, long-running handoffs, missing verification, security changes, UI checks, and memory quality.

This release includes a passing deterministic structural check and corrections from a separate read-only agent review. That correlated review is not independent proof, and behavioral trial results are not recorded yet. A cross-model benchmark requires repeated runs with captured transcripts, tool calls, diffs, final repository state, and a grader calibrated against human judgment.

## Why this structure

The strongest current harness guidance points in the same direction: keep the always-loaded contract compact, move detailed workflows behind progressive disclosure, make the environment legible to the agent, separate maker and checker responsibilities, and evaluate the model and harness together. The README links the primary research and open-source projects behind those choices.
