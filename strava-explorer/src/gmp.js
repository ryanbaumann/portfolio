// strava-explorer/gmp.js
import { initializeFollowCamera } from './followCamera.js'; // Import initializer

// --- Module-Level Variables ---
let map3d = null;
let elevator = null;
let previousPolyline = null;
let routeMarkers = [];
let photoMarkers = new Map(); // Stores { marker, popover } pairs, key = photo.unique_id
let trackingMarker = null;

// Follow Camera state moved to followCamera.js
// GMP Class variables (populated in initMap)
let Map3DElement, Marker3DElement, Marker3DInteractiveElement, Polyline3DElement, AltitudeMode, MapMode, PinElement, PopoverElement;
let ElevationService, ElevationElement; // Removed Place
let LatLng, LatLngBounds, encoding;

// --- Helper Functions (Dependencies - will be passed or imported if moved to utils) ---
let showLoading = (isLoading, text) => console.log(`Loading: ${isLoading}, Text: ${text}`);
let showError = (message) => console.error(`Error: ${message}`);
const PHOTO_PROXY_BASE_URL = (import.meta.env.VITE_STRAVA_AUTH_BASE_URL || '').replace(/\/$/, '');

// Function to set helper dependencies (called from index.js)
export function setHelpers(helpers) {
    showLoading = helpers.showLoading;
    showError = helpers.showError;
}


async function loadGoogleMapsApi(apiKey, libraries) {
    const GoogleMapsLoader = await import('@googlemaps/js-api-loader');
    const loaderModule = GoogleMapsLoader.default ?? GoogleMapsLoader;

    if (typeof GoogleMapsLoader.setOptions === 'function' && typeof GoogleMapsLoader.importLibrary === 'function') {
        GoogleMapsLoader.setOptions({ key: apiKey, v: 'weekly', libraries });
        return GoogleMapsLoader.importLibrary;
    }

    // Compatibility path for @googlemaps/js-api-loader v1.x in existing installs.
    // v2.x exposes setOptions/importLibrary and package.json targets that path.
    const LoaderClass = GoogleMapsLoader.Loader ?? loaderModule.Loader;
    const loader = new LoaderClass({
        apiKey,
        version: 'weekly',
        libraries,
    });
    await loader.load();
    return google.maps.importLibrary.bind(google.maps);
}

// --- Map Initialization ---
export async function initMap(mapHostElement, apiKey) {
    if (!mapHostElement) throw new Error("Map host element is required.");
    if (!apiKey) throw new Error("Google Maps API Key is required.");

    showLoading(true, "Loading Google Maps...");
    const libraries = ["maps3d", "marker", "elevation", "places", "geometry", "core"];

    try {
        const importLibrary = await loadGoogleMapsApi(apiKey, libraries);
        console.log("Google Maps API loaded.");

        // Import necessary classes *after* API is loaded
        ({ Map3DElement, Marker3DElement, Marker3DInteractiveElement, Polyline3DElement, AltitudeMode, MapMode, PopoverElement } = await importLibrary("maps3d"));
        ({ PinElement } = await importLibrary("marker")); // Keep PinElement if default marker appearance is customized later
        ({ ElevationService, ElevationElement } = await importLibrary("elevation"));
        // ({ Place } = await importLibrary("places")); // Removed Place import
        ({ LatLng, LatLngBounds } = await importLibrary("core"));
        ({ encoding } = await importLibrary("geometry"));

        // Instantiate services
        elevator = new ElevationService();

        // Instantiate the 3D Map
        map3d = new Map3DElement({
            center: { lat: 32.6141, lng: -114.34411, altitude: 1000000 }, // Start high up
            range: 1000000, // Wide initial range
            tilt: 0, // Start looking straight down
            heading: 0,
            mode: MapMode.HYBRID, // Or SATELLITE
            defaultUIHidden: true, // Hide default controls; app provides custom accessible controls
        });
        mapHostElement.appendChild(map3d);
        console.log("3D Map initialized.");

        // Initialize Follow Camera module after map and dependencies are ready
        // Pass the module-level showError, which might be updated by setHelpers
        initializeFollowCamera(map3d, LatLng, getClientElevation, showError);

        showLoading(false);
        return map3d; // Return the map instance

    } catch (error) {
        console.error("Map Initialization failed:", error);
        showError(`Map initialization failed: ${error.message}. Check API key or network connection.`);
        showLoading(false);
        throw error; // Re-throw
    }
}

// --- Elevation Helpers ---
export async function getClientElevation(latLng) { // latLng = { lat: number, lng: number }
    if (!elevator) {
        console.warn("ElevationService not initialized.");
        return 10; // Default elevation
    }
    try {
        const { results } = await elevator.getElevationForLocations({ locations: [latLng] });
        return results?.[0]?.elevation ?? 10; // Return elevation or default
    } catch (e) {
        console.error("Elevation lookup failed:", e);
        showError(`Elevation lookup error: ${e.message}`);
        return 10; // Default on error
    }
}

export async function getElevationsForPoints(locations) { // locations = [{ lat, lng }, ...]
    if (!elevator || locations.length === 0) return locations.map(() => 10); // Default if no service/locations
    const batchSize = 200; // API limit often around 512, use smaller batches
    let allElevations = [];
    showLoading(true, `Fetching ${locations.length} elevations...`);
    try {
        for (let i = 0; i < locations.length; i += batchSize) {
            const batchLocations = locations.slice(i, i + batchSize);
            const { results } = await elevator.getElevationForLocations({ locations: batchLocations });
            const elevations = results.map(result => result?.elevation ?? 10); // Default to 10 if null
            allElevations.push(...elevations);
        }
    } catch (e) {
        console.error(`Elevation fetch error:`, e);
        showError(`Elevation fetch error: ${e.message}`);
        // Fill remaining with default if error occurred mid-batch
        const remaining = locations.length - allElevations.length;
        if (remaining > 0) {
            allElevations.push(...Array(remaining).fill(10));
        }
    } finally {
        showLoading(false);
    }
    return allElevations;
}

// --- Camera Helper ---
export async function flyToLocation(targetCoords, range = 1000, tilt = 60, heading = 0, duration = 1500) {
    if (!map3d || !targetCoords) return;
    // Ensure targetCoords has altitude if not provided
    const centerWithAltitude = {
        lat: targetCoords.lat,
        lng: targetCoords.lng,
        altitude: targetCoords.altitude ?? await getClientElevation(targetCoords) // Fetch if missing
    };

    const endCamera = { center: centerWithAltitude, range, tilt, heading };
    try {
        showLoading(true, "Moving camera...");
        await map3d.flyCameraTo({ endCamera, durationMillis: duration });
    } catch (error) {
        if (error.name === 'AbortError' || error.message?.includes('interrupted')) {
           console.log("Camera animation interrupted.");
        } else {
            console.error("flyCameraTo error:", error);
            showError(`Camera movement error: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}


export async function frameRoute(decodedPathLatLng, options = {}) {
    if (!decodedPathLatLng || decodedPathLatLng.length === 0) return;
    const LatLngBoundsClass = LatLngBounds;
    const bounds = new LatLngBoundsClass();
    decodedPathLatLng.forEach((point) => bounds.extend(point));
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter().toJSON();
    const ne = bounds.getNorthEast().toJSON();
    const sw = bounds.getSouthWest().toJSON();
    let diagonalDistance = 5000;
    if (google?.maps?.geometry?.spherical && LatLng) {
        diagonalDistance = google.maps.geometry.spherical.computeDistanceBetween(
            new LatLng(ne.lat, ne.lng),
            new LatLng(sw.lat, sw.lng)
        );
    }
    const range = Math.max(900, diagonalDistance * (options.rangeMultiplier ?? 1.45));
    await flyToLocation(center, range, options.tilt ?? 62, options.heading ?? 0, options.duration ?? 1400);
}

export async function flyToRoutePoint(decodedPathLatLng, routePoint = 'start') {
    if (!decodedPathLatLng || decodedPathLatLng.length === 0) return;
    const point = routePoint === 'finish' ? decodedPathLatLng[decodedPathLatLng.length - 1] : decodedPathLatLng[0];
    const heading = routePoint === 'finish' ? (map3d?.heading ?? 0) + 180 : map3d?.heading ?? 0;
    await flyToLocation(point.toJSON(), 650, 72, heading, 1200);
}

export async function orbitCurrentView(duration = 9000) {
    if (!map3d?.flyCameraAround) return;
    try {
        showLoading(true, 'Orbiting route...');
        await map3d.flyCameraAround({ camera: { center: map3d.center, range: map3d.range, tilt: Math.max(map3d.tilt ?? 65, 65), heading: map3d.heading ?? 0 }, durationMillis: duration, repeatCount: 1 });
    } catch (error) {
        if (!(error.name === 'AbortError' || error.message?.includes('interrupted'))) {
            console.error('flyCameraAround error:', error);
            showError(`Camera orbit error: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

// --- Polyline Handling ---
export function decodePolyline(polylineString) {
    if (!encoding) {
        showError("Geometry library (encoding) not loaded.");
        return [];
    }
    if (!polylineString || typeof polylineString !== 'string' || polylineString.trim() === '') {
        showError("Invalid polyline string provided for decoding.");
        return [];
    }
    try {
        const decodedPath = encoding.decodePath(polylineString);
        if (!decodedPath || decodedPath.length === 0) {
            throw new Error("Decoded path is empty or invalid.");
        }
        console.log(`Successfully decoded polyline. Path length: ${decodedPath.length}`);
        return decodedPath; // Returns array of LatLng objects
    } catch (e) {
        console.error("GMP polyline decoding failed:", e);
        showError(`Failed to decode activity route: ${e.message}`);
        return []; // Return empty on error
    }
}

export function displayPolyline(decodedPathLatLng) { // Expects array of LatLng objects
    if (!map3d || !Polyline3DElement || !AltitudeMode) {
        showError("Map or necessary 3D components not ready for polyline.");
        return null;
    }
    if (!decodedPathLatLng || decodedPathLatLng.length === 0) {
        showError("Cannot display empty or invalid polyline path.");
        return null;
    }

    console.log(`[displayPolyline] Displaying polyline with ${decodedPathLatLng.length} points.`);

    // Remove previous polyline
    removePreviousPolyline();
    clearRouteMarkers();

    // Create new 3D Polyline clamped to ground
    const routePolyline = new Polyline3DElement({
        path: decodedPathLatLng, // Pass the array of LatLng objects directly
        strokeColor: '#ff4d2e',
        strokeWidth: 14,
        outerColor: '#ffffff',
        outerWidth: 0.65,
        altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
    });

    // Add polyline to map
    map3d.appendChild(routePolyline);
    previousPolyline = routePolyline; // Store reference
    addRouteEndpointMarkers(decodedPathLatLng);
    console.log(`[displayPolyline] Appended routePolyline to map.`);
    return routePolyline; // Return the created element
}

function addRouteEndpointMarkers(path) {
    if (!map3d || !Marker3DElement || !AltitudeMode || path.length < 2) return;
    const endpoints = [
        { label: 'Start', point: path[0], color: '#22c55e' },
        { label: 'Finish', point: path[path.length - 1], color: '#ef4444' },
    ];
    endpoints.forEach(({ label, point, color }) => {
        const marker = new Marker3DElement({
            position: { lat: point.lat(), lng: point.lng(), altitude: 24 },
            altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
            title: `${label} of activity route`,
            extruded: true,
            label,
        });
        marker.style.setProperty('--gmp-marker-color', color);
        map3d.append(marker);
        routeMarkers.push(marker);
    });
}

export function clearRouteMarkers() {
    routeMarkers.forEach((marker) => {
        try { map3d?.removeChild(marker); } catch (e) { console.warn('Error removing route marker', e); }
    });
    routeMarkers = [];
    updateTrackingMarker(null);
}

export function removePreviousPolyline() {
    if (previousPolyline && map3d) {
        try {
            console.log(`[removePreviousPolyline] Attempting to remove previous polyline.`);
            map3d.removeChild(previousPolyline);
            console.log(`[removePreviousPolyline] Successfully removed previous polyline.`);
        } catch (e) {
            console.warn("[removePreviousPolyline] Could not remove previous polyline:", e);
        } finally {
             previousPolyline = null;
        }
    }
    clearRouteMarkers();
}


function getMarkerPhotoUrl(imageUrl) {
    if (!imageUrl || !PHOTO_PROXY_BASE_URL) return imageUrl;
    try {
        const url = new URL(imageUrl);
        if (url.protocol === 'https:' && url.hostname === 'dgtzuqphqg23d.cloudfront.net') {
            return `${PHOTO_PROXY_BASE_URL}/api/photo-proxy?url=${encodeURIComponent(url.href)}`;
        }
    } catch (error) {
        console.warn('Invalid photo marker URL:', imageUrl, error);
    }
    return imageUrl;
}

function createPhotoBillboardTemplate(imageUrl, caption) {
    const template = document.createElement('template');
    const image = document.createElement('img');

    // Maps 3D custom marker slots accept an HTMLImageElement directly inside
    // the template. Use the Strava photo as that direct child so the marker is
    // the actual photo, not a renderer-dependent SVG wrapper around the photo.
    image.crossOrigin = 'anonymous';
    image.src = getMarkerPhotoUrl(imageUrl);
    image.alt = caption ? `Activity photo: ${caption}` : 'Activity photo marker';
    image.loading = 'eager';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.width = 96;
    image.height = 96;
    image.style.cssText = `
        width: 96px;
        height: 96px;
        object-fit: cover;
        border-radius: 16px;
        border: 4px solid #ffffff;
        background: #e5e7eb;
        box-shadow: 0 14px 28px rgba(15,23,42,.38), 0 0 0 1px rgba(79,70,229,.32);
        cursor: pointer;
    `;
    image.onerror = () => { image.alt = 'Activity photo preview unavailable'; };

    template.content.append(image);
    return template;
}

// --- Photo Marker Handling ---
export async function displayPhotoMarkers(photosData) { // photosData = array from Strava API
    if (!map3d || !Marker3DInteractiveElement || !PopoverElement || !AltitudeMode) {
        showError("Map or necessary 3D components not ready for photo markers.");
        return;
    }

    // Cleanup previous markers and popovers
    clearPhotoMarkers();

    if (!photosData || photosData.length === 0) {
        console.log("No photos data provided to display.");
        return;
    }

    showLoading(true, `Processing ${photosData.length} photos...`);
    try {
        const locatedPhotos = photosData.filter((photo) => photo.location?.length === 2 && photo.unique_id);

        if (locatedPhotos.length === 0) {
            console.log("No valid locations found in photo data.");
            showLoading(false);
            return;
        }

        locatedPhotos.forEach((photo) => {
            if (!photo.location || photo.location.length !== 2 || !photo.unique_id) return; // Skip if no location or ID

            const lat = photo.location[0];
            const lng = photo.location[1];

            if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
            const position = { lat, lng, altitude: 42 };
            const photoThumbUrl = photo.urls?.["600"] || photo.urls?.["1000"] || photo.urls?.["100"];

            // Create an interactive 3D billboard marker. The altitude is relative to
            // terrain so photo cards float consistently above the photorealistic mesh
            // instead of inheriting sea-level elevation twice.
            const marker = new Marker3DInteractiveElement({
                position: position,
                altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
                title: photo.caption || `Activity photo ${photo.unique_id}`,
                extruded: true,
                drawsWhenOccluded: true,
            });
            marker.append(createPhotoBillboardTemplate(photoThumbUrl, photo.caption));

            // Create Popover
            const popover = new PopoverElement({
                positionAnchor: marker,
                open: false,
            });

            // Populate Popover Content
            const popoverImageUrl = photo.urls?.["1000"] || photo.urls?.["600"] || photo.urls?.["100"]; // Fallback
            const popoverImage = document.createElement('img');
            popoverImage.src = popoverImageUrl;
            popoverImage.style.maxWidth = '300px';
            popoverImage.style.maxHeight = '300px';
            popoverImage.style.display = 'block';
            popoverImage.style.marginBottom = '8px';
            popoverImage.onerror = () => { popoverImage.alt = 'Image failed to load'; };

            const popoverCaption = document.createElement('p');
            popoverCaption.textContent = photo.caption || 'No caption';
            popoverCaption.style.fontSize = '12px';
            popoverCaption.style.color = '#555';

            const popoverHeading = document.createElement('h3');
            popoverHeading.slot = 'header';
            popoverHeading.textContent = photo.caption || 'Activity photo';
            popover.append(popoverHeading);
            popover.append(popoverImage);
            popover.append(popoverCaption);

            // Add Click Listener to Toggle Popover
            marker.addEventListener('gmp-click', () => {
                console.log("Clicked Photo Marker:", photo.unique_id);
                // Close other open popovers
                photoMarkers.forEach(({ popover: otherPopover }, key) => {
                    if (key !== photo.unique_id) {
                        otherPopover.open = false;
                    }
                });
                // Toggle this popover
                popover.open = !popover.open;
                // Fly closer
                flyToLocation({ lat, lng, altitude: 72 }, 850, 66, map3d.heading, 900);
            });

            // Add Marker and Popover to Map
            map3d.append(marker);
            map3d.append(popover);

            // Store Marker and Popover References
            photoMarkers.set(photo.unique_id, { marker, popover });
            console.log(`[displayPhotoMarkers] Appended marker/popover for photo ${photo.unique_id}`);
        });

    } catch (error) {
        console.error("Error processing or displaying photo markers:", error);
        showError(`Failed to display photos: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

export function clearPhotoMarkers() {
    if (photoMarkers.size > 0 && map3d) {
        console.log(`[clearPhotoMarkers] Clearing ${photoMarkers.size} photo markers and popovers.`);
        photoMarkers.forEach(({ marker, popover }) => {
            try { map3d.removeChild(marker); } catch(e) { console.warn("Error removing marker", e); }
            try { map3d.removeChild(popover); } catch(e) { console.warn("Error removing popover", e); }
        });
        photoMarkers.clear(); // Clear the map
    }
}

// --- Utility ---
export function getMapInstance() {
    return map3d;
}

export function getLatLngClass() {
    return LatLng;
}

// --- Follow Camera Implementation (Moved to followCamera.js) ---
export function getLatLngBoundsClass() {
    return LatLngBounds;
}

export function getElevationElementClass() {
    return ElevationElement;
}

// --- Downsampling Function (Handles LatLng objects) ---
// Moved here as it's primarily used for the GMP Elevation Widget path
export function downsamplePath(path, maxPoints) { // path = array of LatLng objects
    console.log(`[downsamplePath] Called with path length: ${path?.length}, maxPoints: ${maxPoints}`);
    if (!path || path.length <= maxPoints) {
        return path; // No need to downsample
    }

    const originalLength = path.length;
    const keepEvery = Math.ceil(originalLength / maxPoints);
    const newPath = [];

    for (let i = 0; i < originalLength; i += keepEvery) {
        newPath.push(path[i]);
    }

    // Ensure the last point is always included
    if (newPath.length > 0 && path.length > 0 && newPath[newPath.length - 1] !== path[originalLength - 1]) {
         // Check if the last element added is actually the last element of the original path
         const lastOriginalPoint = path[originalLength - 1];
         const lastAddedPoint = newPath[newPath.length - 1];
         // Compare LatLng objects (need to compare lat/lng values)
         if (lastAddedPoint.lat() !== lastOriginalPoint.lat() || lastAddedPoint.lng() !== lastOriginalPoint.lng()) {
            newPath.push(lastOriginalPoint);
         }
    } else if (newPath.length === 0 && path.length > 0) {
        // If keepEvery was larger than length, add the first and last points at least
        newPath.push(path[0]);
        if (originalLength > 1) {
            newPath.push(path[originalLength - 1]);
        }
    }


    console.log(`[downsamplePath] Returning new path. Length: ${newPath?.length}`);
    return newPath;
}

export function updateTrackingMarker(position, color = '#3b82f6') {
    if (!map3d || !Marker3DElement || !AltitudeMode) return;
    
    if (!position) {
        if (trackingMarker) {
            try { map3d.removeChild(trackingMarker); } catch (e) {}
            trackingMarker = null;
        }
        return;
    }
    
    const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
    const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
    const altitude = (position.altitude ?? 10) + 5; // offset slightly above route
    
    if (trackingMarker) {
        trackingMarker.position = { lat, lng, altitude };
    } else {
        trackingMarker = new Marker3DElement({
            position: { lat, lng, altitude },
            altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
            title: 'Tour Position',
            extruded: true,
        });
        trackingMarker.style.setProperty('--gmp-marker-color', color);
        map3d.append(trackingMarker);
    }
}