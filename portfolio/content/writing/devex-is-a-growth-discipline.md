---
title: DevX Is a Growth Discipline
slug: devx-is-a-growth-discipline
aliases: ["/writing/devex-is-a-growth-discipline/"]
summary: DevX teams should own developer friction from discovery through distribution, product improvement, and measurable growth.
date: 2026-07-14
updated: 2026-07-15
canonical: https://ryanbaumann.dev/writing/devx-is-a-growth-discipline/
image: /assets/devx-growth-header.png
imageAlt: A four-stage DevX loop moves from observed friction to a shipped fix, distribution in builder workflows, and rising measured outcomes.
socialImage: /social/devx-growth-discipline.jpg
shareTitle: DevX Is a Growth Discipline
shareSummary: Own the friction, ship the fix, distribute the experience, and measure the outcome.
shareImageAlt: DevX Is a Growth Discipline, with a product, distribution, and measurement loop beside observed user and API engagement growth.
tags: ["developer experience", "growth", "distribution", "ai"]
order: 1
---

DevX is a growth discipline. The job is not to publish more documentation. The job is to find the friction that stops a builder, fix it in the product or experience, put that fix where people work, and prove that it improved an outcome.

Between early 2025 and 2026, our open-source ecosystem more than doubled its unique active users, with strong growth in API engagement. During that period, I helped lead distribution strategy across major UI frameworks and AI agent platforms, working with teams across product, engineering, UX, and technical writing. We treated product, distribution, and measurement as one system without confusing presence in a workflow with proof of adoption.

## Own the friction

Developer friction shows up everywhere: failed first runs, abandoned evaluations, support tickets, GitHub issues, field conversations, and user research. DevX needs one view across those signals. More importantly, DevX needs to own what happens next.

Our [Voice of Developer program](/work/voice-of-developer/) groups repeated friction from Discord, Stack Overflow, GitHub issues, support, field work, and dogfood sessions into ranked product opportunities. That makes the constraint visible. DevX ownership starts there: choose what to solve, ship the change, and measure what happened.

When builders work through coding agents instead of reading every platform layer themselves, DevX has to design for the person making the decision and the agent acting inside the task.

## Ship the fix where builders work

A great experience has no impact if builders never encounter it. Documentation is one distribution surface, not the whole strategy. The path also needs to appear in the editor, agent, search result, sample, template, or tool where the work begins.

Client libraries distribute executable product behavior. [Code Assist](/work/code-assist/) distributes [current official documentation and samples](https://developers.google.com/maps/ai/code-assist) inside compatible MCP clients. [Agent skills](/work/agent-skills/) distribute [versioned, repeatable workflows](https://github.com/googlemaps/agent-skills) across Web, Android, iOS, and Web Services. We use task-based evals as a release gate for each skill.

Distribution cannot be an afterthought. Design the experience so it can travel, then make it the default in the workflows that already have reach.

## Measure and own outcomes

Traditional feedback loops are slow. Interviews, support themes, and developer surveys remain useful, but they do not always turn into a clear product decision quickly. [Agent evaluations](/work/agentic-evals/) shorten one part of that loop. A coding agent attempts a representative task. Its trace shows where it stalled or chose the wrong path. A rubric scores the result against a no-context baseline and informs a ship-or-hold decision.

Evals do not replace user research. An eval delta tests whether the experience can complete the task. Product telemetry shows whether builders found it, completed the journey, and returned. Direct research explains why people behaved that way. Together, those signals let a DevX team test a specific hypothesis without pretending one score explains the user.

![An agent evaluation loop moves from a representative task through an agent trace and rubric comparison to a ship-or-hold decision, then repeats using telemetry and research.](/assets/devx-eval-loop.png)

This is the discipline: own the friction, solve it, improve the product, ship the better experience into the workflow, and measure the impact. Then run the loop again. We are still experimenting with every part of it, and that is the point.
