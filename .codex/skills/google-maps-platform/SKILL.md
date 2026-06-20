# Google Maps Platform Skill

Use this skill for tasks that touch Google Maps Platform, Maps JavaScript API, 3D Maps, markers, elevation, geometry, Places, Routes, API keys, quotas, billing, or map runtime behavior in `strava-explorer/`.

## Primary References

Prefer current official docs before changing API usage:

- Maps JavaScript API best practices: https://developers.google.com/maps/documentation/javascript/best-practices
- Maps JavaScript API loading/import libraries: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- 3D Maps documentation: https://developers.google.com/maps/documentation/javascript/3d-maps/overview
- Advanced Markers documentation: https://developers.google.com/maps/documentation/javascript/advanced-markers/overview
- Google Maps Platform API security best practices: https://developers.google.com/maps/api-security-best-practices
- Quotas and monitoring: https://developers.google.com/maps/documentation/javascript/usage-and-billing

## Workflow

1. Identify the feature surface: loader, library imports, map element, camera, markers, elevation, geometry, Places, Routes, billing/security, or CSS container behavior.
2. Read the existing code first, especially `strava-explorer/src/gmp.js`, `strava-explorer/src/followCamera.js`, `strava-explorer/src/index.js`, and `strava-explorer/index.html` when relevant.
3. Verify current API behavior against official Google docs if the change depends on a recently updated or experimental API.
4. Keep API loading centralized. Do not add duplicate script tags or parallel loader mechanisms.
5. Import Maps JavaScript libraries with `google.maps.importLibrary()` after the loader resolves.
6. Prefer modern marker APIs: Advanced Markers for 2D maps and the existing 3D marker elements for 3D maps. Do not introduce legacy `google.maps.Marker` in new code.
7. Keep map-specific CSS scoped to map hosts, panels, controls, and custom marker/popover elements to avoid conflicts with Google-rendered DOM.
8. Batch or debounce external calls such as Elevation, Places, Routes, and geocoding. Handle partial failures gracefully and show user-facing errors only when actionable.
9. Preserve user privacy: do not log Strava tokens, precise private activity details, or raw API credentials.
10. Validate with `yarn build` or `npm run build` from `strava-explorer/` after implementation.

## Key Security Checklist

- Browser API keys must be restricted by HTTP referrer and allowed APIs.
- Server-capable secrets must not be exposed in Vite `VITE_` variables.
- Document local origins needed for development, such as `http://localhost:*`.
- Mention quota/budget implications when adding new Google Maps Platform services or higher-frequency calls.

## UX Checklist

- Map controls must have labels and visible focus states.
- Camera/flyover animations should respect `prefers-reduced-motion` when practical.
- Loading and error states should not block map interaction longer than needed.
- Mobile layouts should keep map gestures usable and avoid panels covering critical controls.
