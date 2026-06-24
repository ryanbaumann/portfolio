# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-06-21

### Added
- **ISOCros Isochrones Demo**: Added a new [isocros/](file:///Users/ryanbaumann/projects/trails.ninja/isocros/) Vite + Node demo that reuses `VITE_GMP_API_KEY`, proxies Isochrones API requests through a local server, and visualizes selectable reachability polygons for delivery, commute, and response-planning use cases.
- **Premium Dark Mode UI**: Overhauled [index.html](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/index.html) with a premium glassmorphism theme, translucent control panels, custom telemetry grid, and custom-styled form controls (sliders, selects).
- **Start/Finish 3D Pins**: Added custom green (`#4CAF50`) and red (`#F44336`) standard `PinElement` markers for the start and finish of Strava routes in [gmp.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/gmp.js).
- **Dynamic Tour Timing**: The follow-camera fly-through duration now scales based on route length instead of a fixed time, improving the visual pacing on both short trails and long rides.
- **Auto-Pop Photo Milestones**: Photo markers automatically pop up larger for exactly 3 seconds as the follow-camera flyby sweeps past their coordinates in [followCamera.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/followCamera.js), then auto-close. Triggers are automatically armed/disarmed on timeline scrubs.
- **Overlapping Photo Clustering (Anti-Flicker)**: Implemented 10-meter spatial photo grouping in [gmp.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/gmp.js) that collapses overlapping photos into a single volumetric 3D marker with a dynamically drawn count badge and a paginated slide-show popover.

### Changed / Improved
- **Aspect-Ratio Thumbnail Rendering**: Updated `resizeImageToDataUrl` in [gmp.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/gmp.js) to preserve the source image's aspect ratio dynamically instead of forcing a square crop.
- **Maps JS API Version**: Switched back to the `alpha` build channel in [gmp.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/gmp.js) to gain access to the fixed 3D custom element observer loop, allowing clean, non-deprecated usage of `PinElement`.
- **Enhanced Camera Smoothing**: Blended multiple look-ahead route coordinates and implemented a frame-rate-aware yaw rate limit in [followCamera.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/followCamera.js) to prevent sudden camera jumps or "rubber-banding" around switchbacks.
- **Improved Elevation Tracking**: Connected elevation profile clicks directly to tracking markers and follow-camera progress, enabling fluid map scrub previews.
- **Shareable URL Parameters & Deep-Linking**: Implemented serialization of date filters, activity selection, and all follow-camera settings to query parameters using `history.replaceState()`. Includes intelligent deep-linking that safely auto-loads shared activities.
- **Floating HUD Share Button**: Added a beautiful glass-morphism "Share Tour" button with built-in clipboard copying and visual feedback.
- **Compact UI Optimization**: Removed static debug HUD badge and tightened vertical padding between the sidebar title and the "Pick a route" section.
- **Documentation Restructuring**: Cleaned up the root directory by renaming the cryptic `Hs.md` to [HOSTING.md](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/HOSTING.md), and resolved duplication of hosting instructions in [README.md](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/README.md) by replacing it with a concise reference to [HOSTING.md](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/HOSTING.md).
- **README Simplification**: Restructured the user-facing README files across all three projects (root, `strava-explorer`, and `aqi-map`) to focus on basic, easy-to-follow overviews and standard open-source sections including terms of service compliance, security guidelines, and licensing.
- **Image Optimization & Preview**: Resized and compressed a large 11MB screenshot to a web-optimized [strava-explorer.jpg](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/strava-explorer.jpg) (325KB) using macOS `sips` and added it as a visual preview to the top of [README.md](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/README.md).

### Fixed
- **Security Hardening**: Untracked local `.env.development` and `.env.production` files to ensure they respect `.gitignore` and are not accidentally committed, and replaced an internal Googleplex redirect URI with a generic placeholder.
- **Synchronized Follow-Camera & Marker Tracking**: Fixed an issue where the follow-camera and tracking marker fell out of sync during the 3D route animation in [followCamera.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/followCamera.js). Refactored the engine to use a 15-point rolling average across the full route array, re-enabled spatial LERP interpolation on the camera center to eliminate high-speed speed-up jank, and bound the tracking marker directly to the final interpolated camera center.
- **Mountainous Camera Tilt & Elevation Avoidance**: Fixed camera looking too vertical (staring straight down) in mountainous regions in [followCamera.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/followCamera.js) by replacing the tilt drop with a dynamic tilt boost (raising tilt up to 85 degrees to look ahead at climbs) and reduced range zoom aggressiveness to make camera mesh avoidance less conservative.
- **3D Photo Marker Stack Overflow & Rendering**: Fixed another `RangeError: Maximum call stack size exceeded` crash by refactoring `displayPhotoMarkers` in [gmp.js](file:///Users/ryanbaumann/projects/trails.ninja/strava-explorer/src/gmp.js) to use `HTMLTemplateElement` wrapping a direct `HTMLImageElement` instead of using the custom `<gmp-pin>` element, which has dynamic rendering/observing loops when combined with remote images and popover bindings. Connected the popover to the marker using `gmpPopoverTargetElement` instead of setting `positionAnchor: marker` on the popover element.
- **Call Stack Overflow & Deprecation Errors**: Fixed a `RangeError: Maximum call stack size exceeded` recursion loop and `<gmp-pin>` deprecation warnings by updating Google Maps loader to `alpha` and directly appending the `PinElement` object (`marker.append(pin)`) instead of the deprecated, recursive `pin.element` property.
- **Reference Errors**: Fixed ReferenceErrors where `temp_token` and `getTourSettings` were undefined during URL state parsing and authentication flow.
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
