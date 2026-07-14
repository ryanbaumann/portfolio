---
title: Ryan Baumann Demo Lab
org: Personal
role: Builder
period: ongoing
summary: This site plus its live demo apps. One container, no secrets shipped to the browser, and a reference architecture for agent-maintained portfolios.
tags: ["side project", "self-hosted", "reference apps"]
links: [{"label": "The demos", "url": "/demos/"}, {"label": "Source", "url": "https://github.com/ryanbaumann/Portfolio"}]
image: /previews/strava-explorer.jpg
imageAlt: The Strava 3D Explorer flying a route through Chamonix in Photorealistic 3D, with photos anchored along the path
order: 12
---

## The goal

You're on it right now. This portfolio and its [live demo apps](/demos/) ship from a single Cloud Run container behind a zero-dependency Node gateway:

- **[Strava 3D Explorer](/strava-explorer/)**: fly your rides and runs in Photorealistic 3D, with your photos anchored along the route.
- **[Air Quality Map](/aqi-map/)**: a live air-quality heatmap with click-to-inspect pollutant detail.
- **[Isochrones](/isochrones/)**: reachability bands showing how far you can travel in 10, 20, or 30 minutes.

## What shipped

These demos are where I test OAuth flows, API quotas, key restrictions, cold starts, and CI/CD against real apps. The platform opinions I bring to work get debugged here first.

## What I learned

The repo is also a working example of what I ship at work: it's built to be maintained by agents. Skills encode the voice and design system, `npm run new:demo` wires a new demo in one command, CI smoke-tests every route without keys, and a changelog plus learning log keep every agent session building on the last one. The stack is deliberately boring: no framework, only small inline scripts for theme and consent-controlled analytics, one container, fast deploys. Boring is a feature.
