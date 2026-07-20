---
name: google-maps-environment-apis
description: Use for Google Maps Platform Environment APIs work, including Air Quality API, Pollen API, Solar API, Weather API, environmental heatmap tiles, current/forecast/history requests, Maps JavaScript API tile overlays, key security, quotas, caching, attribution, health recommendation UX, and migrations from PurpleAir or other environmental data sources.
---

# Google Maps Platform Environment APIs

Use this repo-local skill when a task touches Google Maps Platform environmental data, environmental tile overlays, or an environmental-data migration strategy in `demos/aqi-map/` or `demos/strava-explorer/`.

## What Google currently offers

Google Maps Platform groups these as Environment APIs:

- **Air Quality API**: current, forecast, historical, and heatmap-tile air-quality data for supported countries/regions. Official docs describe real-time, historical, and forecasted air quality for over 100 countries at 500 m × 500 m resolution, including 70+ AQ indexes, pollutants, and health recommendations.
- **Pollen API**: daily pollen forecast and pollen heatmap tiles for supported countries/regions. Official docs describe over 65-country coverage at 1 km × 1 km resolution, with pollen types/plants, indexes, and health recommendations.
- **Solar API**: building-level rooftop solar potential, data layers, and GeoTIFF rasters for supported areas; useful for solar suitability rather than AQI maps.
- **Weather API**: current conditions, hourly/daily forecasts, and hourly history for a location; useful context alongside air quality, smoke, and outdoor activity planning.

## Official references to check first

- Environment APIs overview: https://developers.google.com/maps/environment
- Air Quality API overview: https://developers.google.com/maps/documentation/air-quality/overview
- Air Quality API heatmap tiles: https://developers.google.com/maps/documentation/air-quality/heatmap-tiles
- Air Quality API current conditions: https://developers.google.com/maps/documentation/air-quality/current-conditions
- Air Quality API forecast: https://developers.google.com/maps/documentation/air-quality/forecast
- Air Quality API history: https://developers.google.com/maps/documentation/air-quality/history
- Air Quality API web service best practices: https://developers.google.com/maps/documentation/air-quality/web-service-best-practices
- Pollen API overview: https://developers.google.com/maps/documentation/pollen/overview
- Solar API overview: https://developers.google.com/maps/documentation/solar/overview
- Weather API product page/docs entry: https://mapsplatform.google.com/maps-products/weather/
- Google Maps Platform API security best practices: https://developers.google.com/maps/api-security-best-practices
- Maps JavaScript API tile overlays: https://developers.google.com/maps/documentation/javascript/maptypes

## Quick workflow

1. Identify the environmental product and data shape:
   - Point-in-time values: current conditions/current weather/current pollen forecast.
   - Time series: air-quality history, forecast, weather hourly/daily forecast.
   - Raster/tile overlays: Air Quality heatmap tiles, Pollen heatmap tiles, Solar data layers/GeoTIFF.
   - Building/site analysis: Solar building insights.
2. Check country/region coverage, data resolution, available indexes/pollutants/plants, and terms/attribution before implementation.
3. Decide whether requests can be made from the browser. If a key or endpoint needs stronger protection, add a minimal backend/proxy plan instead of exposing secrets.
4. Keep browser API keys restricted by HTTP referrer and enabled APIs. Never commit real keys, tokens, or generated `.env.*` files.
5. Cache and debounce aggressively. Environmental data typically changes hourly or daily; do not refetch on every pan/zoom event without viewport/zoom thresholds and cache keys.
6. For Maps JavaScript overlays, prefer tile overlays for raster heatmaps and deck.gl/Data layer/Advanced Markers for vector or point data.
7. Preserve environmental-health UX: clearly label index, pollutant/type, time, units, source, and last-updated time; avoid overstating medical claims.

## Air Quality API guidance for AQI maps

- Use **current conditions** when the user selects a point or when summarizing the map center.
- Use **forecast** for “next 24–96 hours” experiences, planning, and outdoor-activity recommendations.
- Use **history** for charts and retrospective comparisons; check endpoint limits before requesting long time ranges.
- Use **heatmap tiles** for map-wide raster AQI/pollutant visualization instead of trying to interpolate sparse points client-side when Google coverage meets the product need.
- Send only the documented tile path and API key query parameter. The production endpoint rejects an extra `solution_id` query parameter with `INVALID_ARGUMENT`, leaving the overlay empty.
- Use a clear index selector. Google supports many local AQ indexes; choose a default that matches product geography and label it explicitly.
- Include pollutant details and health recommendations as explanatory panels, not just colors.
- For PurpleAir migrations, decide whether Google Air Quality replaces, supplements, or calibrates the sensor network. PurpleAir point sensors and Google modeled AQ data have different coverage, latency, resolution, and semantics.

## Pollen API guidance

- Use forecast data for location detail panels and daily planning.
- Use heatmap tiles for map-wide pollen type layers.
- Let users switch between tree, grass, and weed pollen when the API/layer supports it.
- Label severity/index definitions and include health recommendations without making clinical claims.

## Solar API guidance

- Use building insights for a selected rooftop/address.
- Use data layers/GeoTIFF for richer solar analysis workflows; expect raster handling, caching, and possibly server-side processing.
- Document regional availability and any EEA-specific behavior or terms if the target users or billing account are in scope.

## Weather API guidance

- Use weather as context for AQI and outdoor route planning: wind, temperature, precipitation, hourly forecasts, and daily forecasts.
- Avoid mixing weather timestamps with AQI timestamps without showing both update times.
- Cache by location grid and forecast issue time where possible.

## Maps JavaScript API integration patterns

- 2D raster overlays: use `ImageMapType`/overlay map types for environmental heatmap tiles, with bounded zoom and opacity controls.
- 2D vector/points: use Advanced Markers for small sets, marker clustering for medium sets, and deck.gl for dense or animated layers.
- 3D visualizations: use `maps3d` elements only when altitude/camera storytelling is required; otherwise prefer simpler 2D overlays.
- Analytics/large datasets: consider precomputing tiles or server-side aggregation instead of shipping raw data to the browser.

## Security, quota, and privacy checklist

- Browser keys: restrict by HTTP referrer and by only the APIs needed.
- Server keys/service credentials: keep server-only and out of browser bundles.
- Do not log precise user locations unless necessary; round or grid-cache locations when product requirements allow it.
- Debounce map interactions and cap parallel requests.
- Use exponential backoff only for safe retries; show clear user-facing rate-limit/error states.
- Document billing/quota impacts in PRs whenever adding an Environment API endpoint or increasing request frequency.

## PR checklist

- Identify enabled APIs, key restrictions, local dev origins, and any required environment variables.
- Cite whether the change uses current, forecast, history, heatmap tile, or building/data-layer endpoints.
- State coverage/resolution assumptions and any untested countries/regions.
- List validation commands and any browser/API behavior that could not be tested without credentials.
