---
title: Google Maps Platform Code Assist
org: Google
role: Product & engineering lead
period: 2024 – present
summary: An MCP server that gives any AI coding agent grounded Google Maps Platform expertise — taken from GitHub alpha to Google-hosted remote service.
tags: ["mcp", "applied ai", "developer platforms"]
links: [{"label": "Docs", "url": "https://developers.google.com/maps/ai/code-assist"}, {"label": "Launch blog", "url": "https://mapsplatform.google.com/resources/blog/announcing-code-assist-toolkit-bring-google-maps-platform-expertise-to-your-ai-coding-assistant/"}, {"label": "GitHub", "url": "https://github.com/googlemaps/platform-ai"}, {"label": "Video", "url": "https://youtu.be/L2V58kKIHvc"}]
featured: true
order: 1
---

## The goal

Developers increasingly don't read docs — their agents do. If an AI coding assistant generates wrong or outdated Google Maps Platform code, the developer blames the platform, not the model. The growth goal: make every AI coding agent generate production-quality platform code, so the platform wins the developer at the moment of first code generation.

## What shipped

Code Assist is an MCP server that grounds any AI coding agent in fresh, official Google Maps Platform documentation, code samples, and architecture content via retrieval. I led it from an alpha on GitHub and npm to a Google-hosted remote MCP service — now the primary connection method — that runs in Claude Code, Cursor, Antigravity, Gemini CLI, and any MCP client.

Every non-trivial line an agent writes can be grounded in retrieved docs instead of training-data memory — which means correct API surface, current best practices, and fewer hallucinated parameters.

## Why it matters

This is developer experience as product, not content: the interface is a tool call, the quality bar is an eval suite, and the distribution channel is every agent harness a developer already uses. It's a template for how any developer platform earns adoption in an agent-mediated world.
