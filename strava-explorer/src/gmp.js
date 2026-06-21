// strava-explorer/gmp.js
import { initializeFollowCamera } from './followCamera.js'; // Import initializer

// --- Module-Level Variables ---
let map3d = null;
let elevator = null;
let previousPolyline = null;
let routeMarkers = [];
let photoMarkers = new Map(); // Stores { marker, popover } pairs, key = photo.unique_id
let trackingMarker = null;
let photoLoadSessionId = 0;

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
        GoogleMapsLoader.setOptions({ key: apiKey, v: 'alpha', libraries });
        return GoogleMapsLoader.importLibrary;
    }

    // Compatibility path for @googlemaps/js-api-loader v1.x in existing installs.
    // v2.x exposes setOptions/importLibrary and package.json targets that path.
    const LoaderClass = GoogleMapsLoader.Loader ?? loaderModule.Loader;
    const loader = new LoaderClass({
        apiKey,
        version: 'alpha',
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
        // Pass the module-level showError and updateTrackingMarker
        initializeFollowCamera(map3d, LatLng, getClientElevation, showError, updateTrackingMarker);

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

    // Create new 3D Polyline clamped to ground with normalized literals
    const pathLiterals = decodedPathLatLng.map((point) => ({
        lat: typeof point.lat === 'function' ? point.lat() : (point.lat ?? 0),
        lng: typeof point.lng === 'function' ? point.lng() : (point.lng ?? 0),
        altitude: Number.isFinite(point.altitude) ? point.altitude : 10
    }));

    const routePolyline = new Polyline3DElement({
        path: pathLiterals, // Pass plain LatLngAltitudeLiteral objects
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
        const lat = typeof point.lat === 'function' ? point.lat() : (point.lat ?? 0);
        const lng = typeof point.lng === 'function' ? point.lng() : (point.lng ?? 0);
        const marker = new Marker3DInteractiveElement({
            position: { lat, lng },
            altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
            title: `${label} of activity route`,
            label,
        });
        const pin = new PinElement({
            background: color,
            borderColor: color === '#ffffff' ? '#e5e7eb' : '#ffffff',
            glyphColor: '#ffffff',
            scale: 1.0,
        });
        marker.append(pin);
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

function resizeImageToDataUrl(imageUrl, targetWidth, targetHeight) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw a white border and background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            
            // Draw image inside (inset by 4px for border)
            const border = 4;
            ctx.drawImage(img, border, border, targetWidth - border * 2, targetHeight - border * 2);
            
            try {
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } catch (e) {
                console.warn("Canvas resize failed (CORS):", e);
                resolve(imageUrl); // Fallback
            }
        };
        img.onerror = () => {
            resolve(imageUrl);
        };
        img.src = imageUrl;
    });
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

    // Increment session ID to cancel any active loads
    photoLoadSessionId++;
    const currentSession = photoLoadSessionId;

    showLoading(true, `Processing ${photosData.length} photos...`);
    try {
        const locatedPhotos = photosData.filter((photo) => photo.location?.length === 2 && photo.unique_id);

        if (locatedPhotos.length === 0) {
            console.log("No valid locations found in photo data.");
            showLoading(false);
            return;
        }

        locatedPhotos.forEach(async (photo) => {
            if (!photo.location || photo.location.length !== 2 || !photo.unique_id) return; // Skip if no location or ID

            const lat = photo.location[0];
            const lng = photo.location[1];

            if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
            
            // Prefer the high-res 1000 or 600 url for resizing to ensure quality, fallback to 100
            const photoUrlToResize = photo.urls?.["600"] || photo.urls?.["1000"] || photo.urls?.["100"];
            if (!photoUrlToResize) return;

            const proxiedUrl = getMarkerPhotoUrl(photoUrlToResize);
            
            // Resize image to exactly 100x100 pixels
            const resizedDataUrl = await resizeImageToDataUrl(proxiedUrl, 100, 100);

            // Guard against race conditions (e.g. route changed while loading)
            if (currentSession !== photoLoadSessionId) {
                console.log("[displayPhotoMarkers] Discarding loaded photo due to session change.");
                return;
            }

            // Create Popover
            const popover = new PopoverElement({
                open: false,
            });

            // Let the popover scale wider than default if screen permits
            popover.style.setProperty('--gmp-popover-max-width', '500px');

            // Populate Popover Content
            const popoverImageUrl = photo.urls?.["1000"] || photo.urls?.["600"] || photo.urls?.["100"]; // Fallback
            
            const popoverBody = document.createElement('div');
            popoverBody.style.width = 'clamp(280px, 33vw, 480px)';
            popoverBody.style.display = 'flex';
            popoverBody.style.flexDirection = 'column';
            popoverBody.style.gap = '8px';

            const popoverImage = document.createElement('img');
            popoverImage.src = popoverImageUrl;
            popoverImage.style.width = '100%';
            popoverImage.style.maxHeight = '50vh';
            popoverImage.style.objectFit = 'contain';
            popoverImage.style.display = 'block';
            popoverImage.style.borderRadius = '4px';
            popoverImage.onerror = () => { popoverImage.alt = 'Image failed to load'; };

            const popoverCaption = document.createElement('p');
            popoverCaption.textContent = photo.caption || 'No caption';
            popoverCaption.style.fontSize = '12px';
            popoverCaption.style.color = '#555';
            popoverCaption.style.margin = '0';

            popoverBody.append(popoverImage);
            popoverBody.append(popoverCaption);

            // Create popover header with a close toggle
            const popoverHeader = document.createElement('div');
            popoverHeader.slot = 'header';
            popoverHeader.style.display = 'flex';
            popoverHeader.style.justifyContent = 'space-between';
            popoverHeader.style.alignItems = 'center';
            popoverHeader.style.width = '100%';
            popoverHeader.style.paddingRight = '8px';

            const popoverHeading = document.createElement('h3');
            popoverHeading.textContent = photo.caption || 'Activity photo';
            popoverHeading.style.margin = '0';
            popoverHeading.style.fontSize = '14px';
            popoverHeading.style.fontWeight = '600';

            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.border = 'none';
            closeButton.style.background = 'transparent';
            closeButton.style.fontSize = '20px';
            closeButton.style.fontWeight = 'bold';
            closeButton.style.cursor = 'pointer';
            closeButton.style.padding = '4px 8px';
            closeButton.style.lineHeight = '1';
            closeButton.style.color = '#6b7280';
            closeButton.style.borderRadius = '4px';
            closeButton.style.display = 'inline-flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            closeButton.ariaLabel = 'Close popover';

            closeButton.addEventListener('mouseenter', () => { closeButton.style.color = '#111827'; });
            closeButton.addEventListener('mouseleave', () => { closeButton.style.color = '#6b7280'; });
            closeButton.addEventListener('click', () => {
                popover.open = false;
            });

            popoverHeader.appendChild(popoverHeading);
            popoverHeader.appendChild(closeButton);

            popover.append(popoverHeader);
            popover.append(popoverBody);

            // Create Marker3DInteractiveElement with popover target
            const marker = new Marker3DInteractiveElement({
                position: { lat, lng },
                altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
                title: photo.caption || `Activity photo ${photo.unique_id}`,
                drawsWhenOccluded: true,
                gmpPopoverTargetElement: popover,
                sizePreserved: true,
            });

            // Create custom photo thumbnail using HTMLTemplateElement
            const template = document.createElement('template');
            const img = document.createElement('img');
            img.src = resizedDataUrl;
            img.setAttribute('width', '100');
            img.setAttribute('height', '100');
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.borderRadius = '4px';
            img.style.border = '2px solid #ffffff';
            img.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            template.content.appendChild(img);
            marker.append(template);

            // Add Click Listener to Marker for camera fly-to
            marker.addEventListener('gmp-click', async () => {
                console.log("Clicked Photo Marker:", photo.unique_id);
                // Close other open popovers
                photoMarkers.forEach(({ popover: otherPopover }, key) => {
                    if (key !== photo.unique_id) {
                        otherPopover.open = false;
                    }
                });
                // Fly closer
                const trueElevation = await getClientElevation({ lat, lng });
                flyToLocation({ lat, lng, altitude: trueElevation + 72 }, 850, 66, map3d.heading, 900);
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
    if (!map3d || !Marker3DInteractiveElement || !AltitudeMode) return;
    
    if (!trackingMarker) {
        try {
            trackingMarker = new Marker3DElement({
                altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
                title: 'Tour Position',
                extruded: true,
                drawsWhenOccluded: true
            });
            console.log("[updateTrackingMarker] Created trackingMarker singleton volumetric Marker3DElement.");
        } catch (e) {
            console.error("[updateTrackingMarker] Failed to initialize tracking marker:", e);
            return;
        }
    }
    
    if (!position) {
        if (trackingMarker.parentNode) {
            try {
                map3d.removeChild(trackingMarker);
            } catch (e) {
                console.warn("[updateTrackingMarker] Error removing marker:", e);
            }
        }
        return;
    }
    
    const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
    const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
    // Support both altitude and elevationM, fallback to 10
    try {
        trackingMarker.position = { lat, lng, altitude: 5 }; // Boost relative to ground directly by 5 meters
        if (!trackingMarker.parentNode) {
            map3d.append(trackingMarker);
        }
    } catch (e) {
        console.warn("[updateTrackingMarker] Error updating position:", e);
    }
}