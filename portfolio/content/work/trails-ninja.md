---
title: trails.ninja — The Lab
org: Personal
role: Builder
period: ongoing
summary: This site — the homepage you're on plus live demo apps, one container, zero secrets in the browser, agent-maintainable by design.
tags: ["side project", "self-hosted", "reference apps"]
links: [{"label": "The demos", "url": "/demos/"}, {"label": "Source", "url": "https://github.com/ryanbaumann/trails.ninja"}]
image: /previews/strava-explorer.jpg
imageAlt: The Strava 3D Explorer flying a route through Chamonix in Photorealistic 3D, with photos anchored along the path
order: 11
---

## What it is

trails.ninja is where I stay in the work — and you're on it. This site and a set of [live demo apps](/demos/) ship from a single Cloud Run container behind a zero-dependency Node gateway:

- **[Strava 3D Explorer](/strava-explorer/)** — fly your rides and runs in Photorealistic 3D with photos anchored along the route.
- **[Air Quality Map](/aqi-map/)** — live air-quality heatmap with click-to-inspect pollutant detail.
- **[Isochrones](/isochrones/)** — how far can you get in 10, 20, 30 minutes? Live-regenerating reachability bands.

## Why it exists

I don't believe you can lead developer experience from a slide deck. Building and operating real apps — OAuth flows, API quotas, key restrictions, cold starts, CI/CD — keeps my judgment calibrated to what developers actually hit. Most of the platform opinions I bring to work were earned debugging something here first.

The repo is also a working example of what I ship at work: agent-ready by design. Skills encode the voice and design system, `npm run new:demo` scaffolds and wires a new demo in one command, `npm run new:post` does the same for a blog post, and CI smoke-tests every route keyless. The whole stack is intentionally boring: no framework, no client JS on this site, one container, fast deploys. Boring is a feature.
