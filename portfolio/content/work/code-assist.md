---
title: Google Maps Platform Code Assist
org: Google
role: Product incubation, GTM & engineering lead
period: 2024 – present
summary: Led the cross-functional team that turned field demand for accurate AI-generated Maps code into a Google-hosted MCP service grounded in official docs and samples.
tags: ["mcp", "applied ai", "developer platforms"]
links: [{"label": "Docs", "url": "https://developers.google.com/maps/ai/code-assist"}, {"label": "Launch blog", "url": "https://mapsplatform.google.com/resources/blog/announcing-code-assist-toolkit-bring-google-maps-platform-expertise-to-your-ai-coding-assistant/"}, {"label": "GitHub", "url": "https://github.com/googlemaps/platform-ai"}, {"label": "Video", "url": "https://youtu.be/L2V58kKIHvc"}]
image: /img/work/code-assist.svg
imageAlt: Panel showing Code Assist as an MCP server connecting AI coding agents to retrieved Google Maps Platform documentation
featured: true
order: 1
---

## The goal

Developers increasingly let their agents read the docs for them. When an AI generates wrong Google Maps Platform code, the developer blames the platform, not the model. The goal: make AI coding agents generate correct, current platform code, and turn that field pain into a product surface we could operate and improve.

## What shipped

I led the team that built and shipped Code Assist: an MCP server that grounds AI coding agents in official Google Maps Platform documentation, code samples, and architecture guides via retrieval. We took it from a GitHub alpha to a Google-hosted remote MCP service. It runs in Claude Code, Cursor, Antigravity, Gemini CLI, and any MCP client.

With it connected, agents pull current docs instead of relying on training-data memory. That means real API surfaces, current best practices, and far fewer hallucinated parameters.

## What I learned

Developer experience can be shipped as product. The interface is a tool call, the quality bar is an eval suite, and the distribution channel is every agent harness a developer already uses. That framing changed how we prioritize everything else.
