---
title: Agentic Eval Suite & Agent Engine Optimization
org: Google
role: Strategy & engineering lead
period: 2024 – present
summary: Task-based evals that set the launch bar for the platform's AI context products, plus benchmarking of how agents build with the platform across engines.
tags: ["evals", "context engineering", "growth"]
image: /img/work/agentic-evals.svg
imageAlt: Panel showing the eval loop, from task to agent run to scored result to launch decision
featured: true
order: 5
---

## The goal

"The demo looked good" is not a launch bar. We needed objective answers to two questions. Does our context actually make agents better at building with us? And when a developer asks an agent to build something in our category, how do we do?

## What shipped

My team and I built the agentic eval suite for Google Maps Platform: task-based evaluations that measure grounded code-generation accuracy, tool-call behavior, token cost, and end-to-end task completion across agent harnesses and models. Results are benchmarked against a no-context baseline, so every launch, including Code Assist and agent skills, ships with a measured delta behind it.

I also started Agent Engine Optimization: benchmarking end-to-end developer workflows in Claude Code, Codex, and Antigravity, and working with model teams using evals, curated context, and signals from real developer usage.

## What I learned

Measurement turns developer experience investments into decisions. Once every piece of context has a baseline and a delta, you stop arguing about taste and put the effort where the number moves.
