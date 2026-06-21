# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-06-21

### Added
- **Premium Dark Mode UI**: Overhauled [index.html](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/index.html) with a glassmorphism theme, translucent control panels, custom scrollbars, and modern typography (Outfit/Inter from Google Fonts).
- **Start/Finish 3D Pins**: Added custom green (`#4CAF50`) and red (`#F44336`) standard `PinElement` markers for the start and finish of Strava routes in [gmp.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/gmp.js).
- **Dynamic Tour Timing**: The follow-camera fly-through duration now scales based on route length instead of a fixed time, improving the visual pacing on both short trails and long rides.

### Changed / Improved
- **Enhanced Camera Smoothing**: Blended multiple look-ahead route coordinates and implemented a frame-rate-aware yaw rate limit in [followCamera.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/followCamera.js) to prevent sudden camera jumps or "rubber-banding" around switchbacks.
- **Improved Elevation Tracking**: Connected elevation profile clicks directly to tracking markers and follow-camera progress, enabling fluid map scrub previews.

### Fixed
- **Call Stack Overflow Crash**: Resolved a severe `RangeError: Maximum call stack size exceeded` crash in the Maps 3D custom element observer by appending the native `PinElement` directly (`marker.append(pin)`) instead of the deprecated, recursive `.element` property. In modern Maps JS API libraries, `PinElement` directly extends `HTMLElement`.
- **Custom Pin Image Deprecation**: Swapped deprecated `glyph` to `glyphSrc` for loading photo URLs onto custom `PinElement` markers, preventing WebGL/Maps 3D serialization failures.
- **3D Photo Marker Sizing**: Replaced custom unscalable `HTMLTemplateElement` image billboards with properly proportioned, natively scalable `PinElement` structures.

---

## [1.1.0] - 2026-06-20

### Added
- Cloud Run token broker for OAuth flow, separating `STRAVA_CLIENT_SECRET` from client-side bundle.
- GCS + Cloud CDN static assets build and deployment scripts.

### Changed
- Refactored Strava activity processing to store access and refresh tokens locally in browser `localStorage`.

---

## [1.0.0] - 2026-06-19

### Added
- Initial project structure.
- `strava-explorer/`: Vite + Google Maps Platform 3D Maps app for 3D route viewing.
- `aqi-map/`: Mapbox GL + PurpleAir hyperlocal AQI map.
