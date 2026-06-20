# Google Maps JavaScript API 3D Skill

Use this skill for focused work on Google Maps JavaScript API 3D Maps in `strava-explorer/`, including `Map3DElement`, 3D camera animation, `maps3d` library imports, 3D markers, popovers, 3D polylines/polygons, altitude handling, Places widgets on 3D maps, and 3D-specific performance or UX issues.

This is narrower than the general Google Maps Platform skill. Use this skill whenever the task changes 3D rendering, 3D interaction, or camera behavior.

## Current Official References

Check official docs before changing API behavior, especially because 3D Maps APIs can differ by release channel:

- 3D Maps overview: https://developers.google.com/maps/documentation/javascript/3d-maps/overview
- 3D Maps reference: https://developers.google.com/maps/documentation/javascript/reference/3d-map
- Draw on 3D maps reference: https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw
- Animate camera paths: https://developers.google.com/maps/documentation/javascript/3d/animate-camera
- Camera restrictions and bounds: https://developers.google.com/maps/documentation/javascript/3d/interaction
- 3D popovers: https://developers.google.com/maps/documentation/javascript/3d/popovers
- Place Autocomplete Widget on 3D Maps: https://developers.google.com/maps/documentation/javascript/examples/3d/places-autocomplete
- Maps JavaScript API loading: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Maps JavaScript API release notes: https://developers.google.com/maps/documentation/javascript/releases

## Repo Context

The current `strava-explorer/` 3D implementation is centered in:

- `strava-explorer/src/gmp.js`: API loading, `maps3d` imports, 3D map creation, polyline rendering, photo markers, elevation, and camera helpers.
- `strava-explorer/src/followCamera.js`: route-following camera state and animation.
- `strava-explorer/src/index.js`: Strava activity orchestration, UI events, and helper injection.
- `strava-explorer/index.html`: map host, sidebar controls, elevation widget, and responsive panel structure.

## Research-Grounded Implementation Rules

1. Load Maps JavaScript API once through the existing `@googlemaps/js-api-loader` path unless the task is explicitly to migrate loading strategy.
2. Import 3D classes with `await google.maps.importLibrary("maps3d")` after the loader resolves. Keep imports colocated with initialization and avoid global script-tag duplicates.
3. When using `Map3DElement`, set a renderable `mode` and explicit camera state (`center`, `range`, `tilt`, `heading`, and altitude where needed). A 3D map needs a valid mode to render.
4. Treat 3D coordinates as `LatLngAltitude`-style values when altitude matters. Be explicit about whether altitude is absolute, relative, or clamped by the selected `AltitudeMode`.
5. Prefer `Marker3DInteractiveElement` for clickable 3D markers and non-interactive 3D marker elements for passive markers. Ensure every marker has a valid `position` before appending it.
6. Use `PopoverElement` for marker-attached or location-attached 3D information panels when the content should behave like a map dialog. Keep popover content concise and accessible.
7. Use `Polyline3DElement`/3D draw primitives for route visualization. Choose `AltitudeMode.CLAMP_TO_GROUND` for routes that should follow terrain unless the product explicitly needs absolute altitude.
8. Use `flyCameraTo` for point-to-point camera motion and `flyCameraAround` for orbiting. These methods are asynchronous and may be interrupted; handle animation cancellation without surfacing noisy user errors.
9. Respect `prefers-reduced-motion` for auto-follow, flyover, orbit, and cinematic camera work when practical. Provide a static or shorter-motion path as the fallback.
10. Use camera restrictions only when they improve the product experience, such as preventing users from losing the activity route. Avoid overly tight bounds that fight user exploration.
11. When integrating Places widgets with 3D maps, keep Places loading separate from `maps3d`, request only needed fields, and make selection behavior explicit.
12. Check release notes when relying on beta/alpha-only properties, newly documented camera options, or changed custom element names.

## 3D UX Checklist

- Map host fills the intended viewport and survives mobile browser dynamic toolbar changes.
- Overlay panels do not block essential gestures or hide route/photo interactions on small screens.
- Camera controls and follow-camera toggles have accessible labels, keyboard focus states, and clear disabled/error states.
- Photo markers, route lines, and popovers remain legible against satellite/hybrid imagery.
- Loading, elevation lookup, and animation states are visible without permanently blocking interaction.
- Users can recover from interrupted camera animations, empty routes, missing elevations, and invalid coordinates.

## Performance and Quota Checklist

- Batch Elevation API calls and keep batch sizes documented in code.
- Avoid per-frame network calls during camera animation or pointer interaction.
- Downsample very dense routes before rendering or animation if frame rate suffers, while preserving route shape.
- Reuse and remove DOM/custom elements deliberately to avoid marker, popover, and polyline leaks.
- Avoid logging precise private routes, Strava tokens, or API keys.

## Validation Workflow

1. Run `yarn build` or `npm run build` from `strava-explorer/` for code changes.
2. For visible 3D UI/camera changes, run the dev server and capture a screenshot or short manual QA note when the environment allows it.
3. Test with at least one empty route, one long route, one route with photos, and one camera interruption path when touching route/camera logic.
4. Document required API key restrictions, enabled APIs, release-channel assumptions, and untested browser/API behavior in the PR.
