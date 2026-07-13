---
title: Google Maps Platform Agent Skills
org: Google
role: Product, GTM & engineering lead
period: 2025 – present
summary: Portable skill modules that teach AI agents how to build with the platform across Web, Android, iOS, and Web Services. Installed with one command.
tags: ["agent skills", "applied ai", "distribution"]
links: [{"label": "GitHub", "url": "https://github.com/googlemaps/agent-skills"}, {"label": "Docs", "url": "https://developers.google.com/maps/ai/agent-skills"}, {"label": "Video", "url": "https://youtu.be/NEk37sPlgaY"}]
image: /img/work/agent-skills.svg
imageAlt: Terminal panel showing the one-line install command npx skills add googlemaps/agent-skills
featured: true
order: 3
---

## The goal

Grounded retrieval (Code Assist) tells an agent what's true. It doesn't teach an agent how to work. The goal: package the workflows too, so any agent can build with the platform the way an experienced platform engineer would.

## What shipped

I led the launch of Google Maps Platform agent skills: portable modules for building across Web, Android, iOS, and Web Services. One command, `npx skills add googlemaps/agent-skills`, installs them in AI Studio, Antigravity, Claude Code, and Replit. The repo also works as a Gemini CLI extension and integrates with Lovable. Each skill is gated by evals before it ships.

Skills and Code Assist run as one system: skills teach the workflow, the MCP server grounds the details in retrieved documentation.

## What I learned

Skills turn platform expertise into a distributable artifact. Instead of hoping developers read a guide, the platform ships its know-how into the agent session itself. Install counts and skill invocations then become adoption signals you can actually measure.
