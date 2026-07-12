---
title: Google Maps Platform Agent Skills
org: Google
role: Product & engineering lead
period: 2025 – present
summary: Portable skill modules that teach AI agents to ship production-ready platform code across Web, Android, iOS, and Web Services — installed with one command.
tags: ["agent skills", "applied ai", "distribution"]
links: [{"label": "GitHub", "url": "https://github.com/googlemaps/agent-skills"}, {"label": "Docs", "url": "https://developers.google.com/maps/ai/agent-skills"}, {"label": "Video", "url": "https://youtu.be/NEk37sPlgaY"}]
featured: true
order: 2
---

## The goal

Grounded retrieval (Code Assist) tells an agent *what's true*; it doesn't teach an agent *how to work*. The goal was a second layer of the developer experience: packaged, portable expertise that turns any agent into a competent platform engineer — and a new distribution surface for the platform itself.

## What shipped

Google Maps Platform agent skills: skill modules for production-ready code across Web, Android, iOS, and Web Services. One install — `npx skills add googlemaps/agent-skills` — and it runs in AI Studio, Antigravity, Claude Code, and Replit; the same repo doubles as a Gemini CLI extension and installs into Lovable. I led the launch, the eval model that gates each skill, and the distribution mechanics — including remote skill hosting — to reach the most users with the least friction.

Skills and Code Assist are designed as one system: skills teach the agent workflows through token-efficient progressive disclosure, while the MCP server grounds every non-trivial line in retrieved documentation.

## Why it matters

Skills turn platform expertise into a distributable artifact. Instead of hoping developers find the right guide, the platform ships its own senior engineer into every agent session. For a developer platform business, that changes the funnel: install-time is the new signup, and skill usage is a measurable leading indicator of adoption.
