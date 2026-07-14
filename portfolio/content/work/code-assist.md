---
title: Google Maps Platform Code Assist
org: Google
role: Product and engineering lead
period: 2024 – present
summary: Led the cross-functional team that turned field demand for accurate AI-generated Maps code into a Google-hosted MCP service grounded in official docs and samples.
tags: ["mcp", "applied ai", "developer platforms"]
links: [{"label": "Docs", "url": "https://developers.google.com/maps/ai/code-assist"}, {"label": "Launch blog", "url": "https://mapsplatform.google.com/resources/blog/announcing-code-assist-toolkit-bring-google-maps-platform-expertise-to-your-ai-coding-assistant/"}, {"label": "GitHub", "url": "https://github.com/googlemaps/platform-ai"}, {"label": "Video", "url": "https://youtu.be/L2V58kKIHvc"}]
image: /img/work/code-assist-docs.png
imageAlt: Official Code Assist documentation showing its experimental status, MCP grounding, public sources, and retrieval tools
featured: true
order: 1
---

## The goal

Developers increasingly let their agents read the docs for them. When an AI generates wrong Google Maps Platform code, the developer blames the platform, not the model. The goal: make AI coding agents generate correct, current platform code, and turn that field pain into a product surface we could operate and improve.

## What shipped

I led the team that built and shipped Code Assist: an MCP server that grounds AI coding agents in official Google Maps Platform documentation, code samples, and architecture guides via retrieval. We took it from a GitHub alpha to a Google-hosted remote MCP service. It runs in Claude Code, Cursor, Antigravity, Gemini CLI, and any MCP client.

With it connected, agents retrieve current official docs instead of relying only on training memory. That gives the agent current API surfaces, code samples, and architecture guidance inside the task.

## What I learned

Current documentation is most useful when the agent can retrieve it inside the task, and an eval checks the result.
