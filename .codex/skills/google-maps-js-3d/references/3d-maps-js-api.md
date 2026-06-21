# Google Maps JavaScript API 3D Technical Reference

This reference is for implementation details that should not bloat `SKILL.md`. Prefer current official Google documentation before making production-sensitive API changes.

## Official docs and examples

Core docs:

- 3D Maps overview: https://developers.google.com/maps/documentation/javascript/3d-maps/overview
- 3D Maps reference: https://developers.google.com/maps/documentation/javascript/reference/3d-map
- 3D drawing reference: https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw
- Load the Maps JavaScript API: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Maps JavaScript API release notes: https://developers.google.com/maps/documentation/javascript/releases

Camera and interaction:

- Camera position sample: https://developers.google.com/maps/documentation/javascript/examples/3d/camera-position
- Animate the camera docs: https://developers.google.com/maps/documentation/javascript/3d/animate-camera
- Animate camera sample: https://developers.google.com/maps/documentation/javascript/examples/3d/move-camera
- Camera restrictions/interactions: https://developers.google.com/maps/documentation/javascript/3d/interaction

Markers and popovers:

- Marker overview: https://developers.google.com/maps/documentation/javascript/3d/marker-overview
- Create markers sample: https://developers.google.com/maps/documentation/javascript/examples/3d/marker
- Clickable markers sample: https://developers.google.com/maps/documentation/javascript/examples/3d/marker-interactive
- Marker click camera sample: https://developers.google.com/maps/documentation/javascript/examples/3d/marker-click-event
- Accessible markers docs: https://developers.google.com/maps/documentation/javascript/3d/marker-accessible
- Accessible markers sample: https://developers.google.com/maps/documentation/javascript/examples/3d/marker-accessible
- Customize markers sample: https://developers.google.com/maps/documentation/javascript/examples/3d/marker-customization
- Popovers docs: https://developers.google.com/maps/documentation/javascript/3d/popovers
- Popover marker sample: https://developers.google.com/maps/documentation/javascript/examples/3d/popover-marker

Drawing:

- Basic polyline sample: https://developers.google.com/maps/documentation/javascript/examples/3d/polyline
- Polygon click event sample: https://developers.google.com/maps/documentation/javascript/examples/3d/polygon-click-event

Places on 3D maps:

- Place Autocomplete Widget on 3D Maps sample: https://developers.google.com/maps/documentation/javascript/examples/3d/places-autocomplete
- Places UI Kit basic place autocomplete: https://developers.google.com/maps/documentation/javascript/places-ui-kit/basic-autocomplete

## Loading and release channels

- `strava-explorer/src/gmp.js` currently uses `@googlemaps/js-api-loader`. Keep that single loading path unless the task is explicitly a loader migration.
- The 3D library is imported with `await google.maps.importLibrary("maps3d")` after the API loader resolves.
- Some 3D features are release-channel-dependent. Verify whether the repo's `version` setting (`alpha`, `beta`, `weekly`, or `quarterly`) is required before relying on a property or custom element.
- Do not mix a dynamic loader with a raw `<script src="https://maps.googleapis.com/maps/api/js?...">` tag in the same app.

Minimal app-aligned loading shape:

```js
const loader = new Loader({
  apiKey,
  version: "alpha",
  libraries: ["maps3d", "marker", "elevation", "geometry", "core"],
});

await loader.load();
const {
  Map3DElement,
  Marker3DElement,
  Marker3DInteractiveElement,
  Polyline3DElement,
  PopoverElement,
  AltitudeMode,
  MapMode,
} = await google.maps.importLibrary("maps3d");
```

## Map3DElement and camera state

Create the map with an explicit camera and mode. At minimum, be intentional about:

- `center`: latitude, longitude, and altitude when altitude affects the view.
- `range`: distance from camera to center.
- `tilt`: 0 for top-down, larger values for oblique 3D perspective.
- `heading`: compass direction in degrees.
- `mode`: prefer `MapMode.HYBRID` or `MapMode.SATELLITE` when constants are imported.
- `defaultUIDisabled`: useful when custom app controls replace default controls.

Pattern:

```js
const map3d = new Map3DElement({
  center: { lat: 32.6141, lng: -114.34411, altitude: 1000000 },
  range: 1000000,
  tilt: 0,
  heading: 0,
  mode: MapMode.HYBRID,
  defaultUIDisabled: true,
});
mapHostElement.appendChild(map3d);
```

## Camera animation

Use `flyCameraTo` for a destination move and `flyCameraAround` for orbit-like motion. Treat animation calls as async operations that may be interrupted by user input or a newer animation.

Pattern:

```js
await map3d.flyCameraTo({
  endCamera: {
    center: { lat, lng, altitude },
    range: 1200,
    tilt: 65,
    heading: 30,
  },
  durationMillis: 1500,
});
```

Implementation notes:

- Suppress noisy user-facing errors for expected `AbortError`/interruption paths.
- For route-follow behavior, clamp indexes and guard empty paths before starting animation.
- Consider reduced-motion users before auto-playing long camera paths.
- Use camera restrictions sparingly; they help when users should stay near a route but can make exploration feel broken if too tight.

## Altitude modes and coordinates

3D overlays and popovers can interpret altitude differently. Choose deliberately:

- `AltitudeMode.CLAMP_TO_GROUND`: good default for Strava route polylines that should follow terrain.
- `AltitudeMode.RELATIVE_TO_GROUND`: useful when a marker/popover should float above terrain.
- `AltitudeMode.ABSOLUTE`: useful for true altitude above sea level or fixed-height examples.

Rules:

- Validate `lat` in `[-90, 90]` and `lng` in `[-180, 180]` before appending map elements.
- If altitude comes from Elevation API, handle missing values with safe defaults.
- Document whether altitude is original activity data, Elevation API data, or a visual offset.

## 3D markers

Use the marker type based on interaction and scale:

- `Marker3DElement`: best for passive 3D marker sets and better performance at high marker counts.
- `Marker3DInteractiveElement`: required when markers should emit `gmp-click`, own focus behavior, or anchor popovers.
- HTML/custom marker elements provide more customization but can cost more performance; avoid them for very large sets.

### Custom Markers using `PinElement`

To style interactive markers with custom backgrounds, border colors, or glyphs (e.g. text/image overlays):
1. Load `"marker"` library dynamically: `const { PinElement } = await google.maps.importLibrary("marker");`
2. Instantiate `PinElement` with your styles or modern `glyphSrc` image URL.
3. **CRITICAL:** Append the `PinElement` instance itself (`marker.append(pin)`). In modern Maps SDKs, `PinElement` extends `HTMLElement` directly. Calling the deprecated `.element` property or passing non-DOM objects triggers infinite recursion and a `RangeError: Maximum call stack size exceeded` crash in the custom element observer.
4. **CRITICAL:** Use `glyphSrc` for remote/dynamic image URLs; do not use the deprecated `glyph` property with URLs.

PinElement pattern:

```js
const { PinElement } = await google.maps.importLibrary("marker");
const { Marker3DInteractiveElement, AltitudeMode } = await google.maps.importLibrary("maps3d");

const pin = new PinElement({
  background: "#4CAF50", // green for start, etc.
  borderColor: "#ffffff",
  glyphSrc: "https://example.com/marker-icon.png", // Use glyphSrc for custom URL images!
  scale: 1.2
});

const marker = new Marker3DInteractiveElement({
  position: { lat: 37.7749, lng: -122.4194, altitude: 0 },
  altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
  title: "Start Point"
});

// CRITICAL: Append the pin directly, not pin.element
marker.append(pin);
map3d.append(marker);
```

Clickable marker pattern:

```js
const marker = new Marker3DInteractiveElement({
  position: { lat, lng, altitude },
  altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
  title: "Activity photo location",
});

marker.addEventListener("gmp-click", () => {
  popover.open = !popover.open;
});

map3d.append(marker);
```

Accessibility notes:

- Set `title` on interactive markers.
- Keep clickable markers keyboard reachable.
- Make target sizes and marker scale usable on touch devices.
- When a popover has important content, provide a useful header slot.

## PopoverElement

Use popovers for map-anchored details. They can attach to a coordinate or to an interactive marker. Popovers are surfaced as dialogs to screen readers, so content should be concise and understandable.

Marker-attached pattern:

```js
const popover = new PopoverElement({
  open: false,
  positionAnchor: marker,
});

const heading = document.createElement("h3");
heading.slot = "header";
heading.textContent = "Photo";
popover.append(heading, image, caption);

map3d.append(marker);
map3d.append(popover);
```

Rules:

- Popovers do not become visible just because they are created; set `open` when needed.
- If light-dismiss behavior is changed, document why multiple popovers should remain open.
- Remove stale popovers when replacing activity/photo data.

## 3D polylines and polygons

Use 3D draw elements for routes and areas:

- `Polyline3DElement` for passive route lines.
- `Polyline3DInteractiveElement` when the route itself should receive `gmp-click`.
- `Polygon3DElement`/interactive polygon elements for area visualization.

Route polyline pattern:

```js
const routePolyline = new Polyline3DElement({
  coordinates: decodedPathLatLng,
  strokeColor: "red",
  strokeWidth: 20,
  outerColor: "white",
  outerWidth: 0.5,
  altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
});
map3d.append(routePolyline);
```

Implementation notes:

- Remove previous route elements before appending new route elements.
- For dense activity polylines, consider downsampling for camera animation while preserving a full-detail display path if performance allows.
- Use high-contrast stroke/outer colors over satellite or hybrid imagery.
- Avoid making route overlays interactive unless the product needs route-level click behavior.

## Places widgets on 3D maps

When adding Place Autocomplete or Places UI Kit to 3D maps:

- Load the required Places library/component explicitly and separately from `maps3d`.
- Request only needed fields.
- Define selection behavior: fly camera to place, add/update a marker, open a popover, or constrain route search.
- Avoid adding geocoding/Places calls to high-frequency events such as camera movement.

## Performance and cleanup

- Reuse singleton services such as ElevationService.
- Batch Elevation API calls and keep batch sizes near documented limits with fallback behavior.
- Remove stale map children for previous routes/photos/popovers to avoid leaks.
- Avoid per-frame DOM creation during camera animation.
- Prefer passive 3D markers for many points and interactive markers only where needed.
- Keep console logging free of API keys, tokens, and private route details.

## Test matrix for 3D changes

For non-trivial code changes, test:

- No route loaded, empty route, invalid polyline, and normal route.
- Long route with many points.
- Route with photos and route without photos.
- Elevation API success, partial missing elevations, and failure fallback.
- Camera animation interruption by user interaction or route switch.
- Mobile viewport with sidebar/panel open and closed.
- Keyboard access to follow-camera controls and marker/popover interactions.
