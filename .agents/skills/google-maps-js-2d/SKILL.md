---
name: google-maps-js-2d
description: Use for focused Google Maps JavaScript API 2D map work in either app, including API loading, map IDs/vector maps, camera, controls, Advanced Markers, info windows, data-driven styling, GeoJSON/Data layer, deck.gl overlays, WebGLOverlayView, Places widgets, geocoding, performance, accessibility, quota, security, and migration from Mapbox GL to Google Maps JS.
---

# Google Maps JavaScript API 2D

Use this repo-local skill when a task changes 2D Google Maps rendering, map loading, markers, overlays, controls, Places/geocoding widgets, or a Mapbox-to-Google Maps migration path in `demos/aqi-map/` or `demos/strava-explorer/`.

## Quick workflow

1. Identify the target app and runtime before editing:
   - `demos/aqi-map/` is a Vite app using Google Maps Platform Air Quality API heatmap tiles.
   - `demos/strava-explorer/` is a Vite app with centralized Google Maps Platform loading in `demos/strava-explorer/src/gmp.js`.
2. Read the app's `package.json`, README, relevant HTML, and map source files before changing map code.
3. Verify current Maps JavaScript API behavior against official docs when touching loader, library imports, Advanced Markers, data-driven styling, WebGL, deck.gl, Drawing/Heatmap replacements, or release channels.
4. Keep Maps JavaScript API loading centralized. Do not add duplicate script tags, duplicate `Loader` instances, or parallel loader mechanisms.
5. Prefer `google.maps.importLibrary()` after the Maps JavaScript API loader has resolved:
   - `maps` for `Map`, `InfoWindow`, controls, and core camera.
   - `marker` for `AdvancedMarkerElement` and `PinElement`.
   - `places` for Places widgets and services.
   - `geocoding`, `geometry`, or other libraries only when needed.
6. Validate latitude/longitude ranges before rendering, sending requests, or building tile URLs.
7. For visible map/UI changes, run a build plus browser/screenshot QA when the environment allows it.

## Official references to check

- Maps JavaScript API overview: https://developers.google.com/maps/documentation/javascript/overview
- Loading/import libraries: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Map IDs and cloud-based styling: https://developers.google.com/maps/documentation/javascript/map-ids/mapid-over
- Vector map features: https://developers.google.com/maps/documentation/javascript/vector-map
- Advanced Markers: https://developers.google.com/maps/documentation/javascript/advanced-markers/overview
- Data-driven styling: https://developers.google.com/maps/documentation/javascript/dds-boundaries/overview
- Data layer / GeoJSON: https://developers.google.com/maps/documentation/javascript/datalayer
- deck.gl GoogleMapsOverlay: https://developers.google.com/maps/documentation/javascript/deckgl-overlay-view
- WebGL Overlay View: https://developers.google.com/maps/documentation/javascript/webgl
- API security best practices: https://developers.google.com/maps/api-security-best-practices
- Deprecations: https://developers.google.com/maps/deprecations

## 2D implementation rules

- Prefer vector maps with a map ID for new Google Maps JS work so cloud styling, tilt/heading, Advanced Markers, and data-driven styling options remain available.
- Prefer `AdvancedMarkerElement` over legacy `google.maps.Marker` for new markers.
- Use semantic, accessible marker content for interactive markers. Include an accessible label/title and keyboard-operable details where practical. Keep custom marker DOM lightweight and verify console warnings after API changes.
- Use `InfoWindow` for simple details and a custom overlay, Advanced Marker content, or app-side panel for richer interactive UI.
- Prefer official Places widgets/services for search/autocomplete instead of hand-rolled geocoder UX.
- Avoid the Maps JavaScript API Heatmap Layer and Drawing Library for new work: Google deprecated Heatmap Layer in May 2025 and made it unavailable in May 2026; Drawing Library was deprecated in August 2025 and unavailable in May 2026. Prefer deck.gl heatmaps, custom WebGL/canvas overlays, or server-generated tiles for heatmaps; use custom drawing tools or Data layer/editing alternatives for drawing.
- Use deck.gl `GoogleMapsOverlay` for large point clouds, heatmaps, contours, or animated geospatial visualizations that exceed practical DOM marker counts.
- Use `Data` layer/GeoJSON for small-to-moderate feature collections and simple styling; use deck.gl or tiled/vector data for large or frequently changing datasets.
- Batch, debounce, or cache quota-sensitive service calls such as Geocoding, Places, Routes, Environment APIs, and Elevation.
- Keep map container CSS scoped. Avoid global CSS that affects Google-rendered controls or shadow DOM descendants unexpectedly.
- Respect `prefers-reduced-motion` for camera animations, auto-pan, flyovers, or continuous viewport changes.

## Mapbox GL to Google Maps JS migration notes for `demos/aqi-map/`

When migrating `demos/aqi-map/` from Mapbox GL to Google Maps JS:

1. Preserve the existing product behavior first: global AQI map, geocoder/search, clustered sensors, AQI color ramp, sensor popups, contours/isobands, mobile panel, and PurpleAir attribution.
2. Replace Mapbox token/style configuration with documented Google Maps Platform browser API-key configuration. Do not commit real keys.
3. Replace Mapbox Geocoder with Places Autocomplete or Place Autocomplete Element where appropriate.
4. Replace Mapbox clustering with one of:
   - `@googlemaps/markerclusterer` plus Advanced Markers for marker-based clustering.
   - deck.gl aggregation layers for dense AQI visualization.
   - Server/precomputed vector tiles for very large datasets.
5. Replace Mapbox fill/circle/symbol layers with Google Maps Data layer, deck.gl layers, or custom overlays depending on feature count and styling needs.
6. Replace Mapbox globe/projection requirements with Google Maps vector map capabilities; confirm any 3D/globe requirement separately with the 3D skill.
7. Revisit all API keys/tokens and document required API restrictions, HTTP referrers, local development origins, and enabled APIs.

## QA checklist

- Map loads exactly once and no duplicate billing/loading paths are introduced.
- Browser API key restrictions and enabled APIs are documented.
- Search/geocoding has accessible labels and clear loading/error states.
- Marker/detail content is keyboard-accessible where practical.
- Large datasets avoid thousands of DOM markers unless clustered/windowed.
- Tile, API, and service requests are bounded by viewport, zoom, cache, or debounce logic.
- Mobile controls do not cover essential map controls or trap gestures.
- Build command passes from the app directory.
