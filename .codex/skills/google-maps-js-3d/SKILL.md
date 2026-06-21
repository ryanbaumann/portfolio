---
name: google-maps-js-3d
description: Use for focused Google Maps JavaScript API 3D Maps work in strava-explorer, including Map3DElement, maps3d importLibrary loading, 3D camera animation and restrictions, Marker3DElement and Marker3DInteractiveElement, PopoverElement, Polyline3DElement and Polygon3DElement, altitude modes, Places widgets on 3D maps, performance, quota, accessibility, and release-channel checks.
---

# Google Maps JavaScript API 3D

Use this repo-local skill when a task changes 3D Maps rendering, interaction, camera behavior, overlays, or 3D-specific Google Maps Platform usage in `strava-explorer/`.

## Quick workflow

1. Read the relevant app files first:
   - `strava-explorer/src/gmp.js` for loader setup, `maps3d` imports, map creation, route/photo rendering, elevation, and camera helpers.
   - `strava-explorer/src/followCamera.js` for route-follow camera animation.
   - `strava-explorer/src/index.js` for UI orchestration and helper injection.
   - `strava-explorer/index.html` for map host, sidebar controls, elevation widget, and responsive structure.
2. Check the official docs or the local technical reference before changing 3D API behavior, especially when touching alpha/beta-only APIs.
3. Keep API loading centralized. Do not add duplicate Maps script tags or a second loader.
4. Import 3D classes with `await google.maps.importLibrary("maps3d")` after the existing loader resolves.
5. Validate code changes with `yarn build` or `npm run build` from `strava-explorer/`.
6. For visible 3D/camera changes, run the app and capture a screenshot or manual QA note when the environment allows it.

## Load detailed 3D guidance when needed

Read `references/3d-maps-js-api.md` when the task involves:

- `Map3DElement`, camera options, `flyCameraTo`, `flyCameraAround`, or camera restrictions.
- `Marker3DElement`, `Marker3DInteractiveElement`, accessible markers, custom markers, collision behavior, or marker performance.
- `PopoverElement` behavior, marker-attached popovers, coordinate-anchored popovers, or popover accessibility.
- `Polyline3DElement`, `Polygon3DElement`, interactive overlays, `AltitudeMode`, geodesic/extruded drawing, or route visualization.
- Places Autocomplete or Places UI Kit on 3D maps.
- Release-channel decisions, quota/performance risk, or browser/runtime compatibility.

## Core rules

- Prefer `MapMode.HYBRID`/`MapMode.SATELLITE` constants when available instead of stringly typed modes.
- Treat 3D positions as latitude/longitude/altitude values when altitude matters; document whether altitude is clamped, absolute, or relative.
- Prefer `Marker3DInteractiveElement` for clickable 3D markers and `Marker3DElement` for large passive marker sets.
- For `Marker3DInteractiveElement` custom content, append a `PinElement` or an `HTMLTemplateElement` whose direct content is an `HTMLImageElement` or `SVGElement`. Do not place a `div`, `span`, text node, HTML/CSS card, or other wrapper inside the template; Maps 3D validates the template content type and emits `<gmp-marker-3d-interactive>: The content inside the <template> element is not of type HTMLImageElement or SVGElement` when the direct child is not an image or SVG.
  * **CRITICAL:** When using `PinElement`, you must append the `PinElement` instance directly (e.g. `marker.append(pin)`). In modern Maps SDKs, `PinElement` extends `HTMLElement` directly. Calling the deprecated `.element` property or attempting to append a non-DOM object triggers infinite recursion and a `RangeError: Maximum call stack size exceeded` crash in the custom element observer.
  * **CRITICAL:** When setting a custom URL or image on a `PinElement`, use `glyphSrc` (which natively accepts a URL string) instead of the deprecated `glyph` property to avoid console deprecation warnings and serialization errors in the WebGL context.
- For terrain-friendly visual callouts, prefer `AltitudeMode.RELATIVE_TO_GROUND` with a fixed visual offset. Do not add Elevation API terrain altitude to a relative-to-ground marker position.
- Use `gmp-click` for 3D interactive elements that expose Maps event semantics.
- Use `PopoverElement` for map-anchored details; include concise accessible content and a meaningful header when practical.
- Use `Polyline3DElement` or `Polygon3DElement` for 3D route/area rendering; choose `AltitudeMode.CLAMP_TO_GROUND` for terrain-following activity routes unless product requirements say otherwise.
- Handle camera animation interruptions quietly; do not show user-facing errors for normal cancellation.
- Respect `prefers-reduced-motion` for cinematic, auto-follow, orbit, or long camera animations when practical.
- Avoid per-frame network calls and unbounded marker/polyline/popover creation.
- Never log API keys, Strava tokens, precise private routes, or raw OAuth payloads.


### Custom marker slot validation

Official Maps JavaScript API 3D docs currently limit custom 3D marker drawing to `PinElement`, `HTMLImageElement`, and `SVGElement` content. If using a template, the template must wrap the image or SVG itself, not an HTML card that contains an image. For remote activity-photo markers, prefer a direct `HTMLImageElement` template child. The Maps 3D/WebGL renderer still needs the image to be CORS-readable; Strava CloudFront photo URLs do not send `Access-Control-Allow-Origin`, so deployed marker images should go through the app's same-origin/CORS-enabled photo proxy before being used as marker content. Embedding the remote bitmap as an SVG `<image>` can render as a generic placeholder in the 3D marker renderer even though the outer `SVGElement` passes type validation. Plain HTML and CSS marker cards are not supported in the 3D marker renderer yet.

## Strava route fly-through guidance

- Default follow-camera smoothing should balance steadiness with tracking accuracy; avoid LERP values so low that the camera visibly trails the target route point.
- Blend current route bearing with multiple look-ahead samples, then apply a frame-rate-aware yaw-rate limit to reduce abrupt heading snaps on switchbacks and dense GPS traces.
- Prefer route stream altitude data when available, then fall back to batched Google Elevation lookups; never perform elevation calls per animation frame.
- Keep camera settings user-adjustable, but make defaults good enough for immediate playback after activity load. Keep default values synchronized across `src/followCamera.js`, `src/index.js`, and `index.html`.
- Scale follow-camera duration by route distance and sample nearby/future terrain elevations around the camera target so default pace and clearance remain comfortable on both short and long routes. Reset filtered heading state when loading or clearing a route.

## PR checklist

- Note any release-channel assumption (`alpha`, `beta`, `weekly`, or `quarterly`).
- List enabled APIs/libraries and browser API-key restrictions affected by the change.
- Document quota-sensitive calls such as Elevation, Places, Routes, or geocoding.
- Include validation commands and any manual browser/API behavior that could not be tested.
