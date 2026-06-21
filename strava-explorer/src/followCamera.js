// strava-explorer/src/followCamera.js

// --- Module-Level Variables ---
let map3d = null;
let LatLng = null; // To be initialized
let getClientElevation = async () => 10; // Placeholder, to be initialized
let showError = (message) => console.error(`Error: ${message}`); // Placeholder

// Follow Camera State
let followCameraActive = false; // Is the animation currently running (playing)?
let followCameraTimeoutId = null; // Timeout ID for any delays
let followCameraAnimationId = null; // requestAnimationFrame ID
let followCameraCoords = []; // Coordinates of the current route
let followCameraSamples = []; // Precomputed camera samples
let followCameraBaseDuration = 90000; // Dynamic base duration (ms) for the full tour
let followCameraPathDistance = 0; // Total distance of the path in km
let followCameraCumulativeDistances = null; // Float64Array of cumulative distances for exact snapping
let followCameraSpeedMultiplier = 1.0; // Current speed multiplier

// Tour Configurable Settings
let cameraHeightOffset = 120; // meters of terrain clearance around the path point
let cameraRangeOffset = 760; // meters range
let cameraTiltOffset = 64; // degrees tilt
let cameraSmoothness = 0.18; // LERP factor; higher defaults reduce lag during fly-throughs
let filteredHeading = null;
let lastCameraUpdateTime = null;
let lastTargetAltitude = null;

// Animation Progress variables
let currentProgress = 0; // 0.0 to 1.0 (tour progress)
let lastFrameTime = null; // Timestamp of the last frame

// Callbacks
let onProgressUpdate = null; // function(progress, distanceElapsedKm)
let onPlaybackStateChange = null; // function(state) -> 'playing' | 'paused' | 'stopped'

let updateTrackingMarkerCb = null; // Placeholder

/**
 * Initializes the follow camera module with necessary dependencies.
 */
export function initializeFollowCamera(mapInstance, latLngClass, elevationGetter, errorReporter, trackingMarkerUpdater) {
    map3d = mapInstance;
    LatLng = latLngClass;
    getClientElevation = elevationGetter;
    showError = errorReporter;
    updateTrackingMarkerCb = trackingMarkerUpdater;
    console.log("Follow Camera module initialized.");
}

/**
 * Register callbacks for tour status updates.
 */
export function registerTourCallbacks(progressCb, stateCb) {
    onProgressUpdate = progressCb;
    onPlaybackStateChange = stateCb;
}

/**
 * Set tour camera settings.
 */
export function setTourSettings({ height, range, tilt, smoothness }) {
    if (typeof height === 'number') cameraHeightOffset = height;
    if (typeof range === 'number') cameraRangeOffset = range;
    if (typeof tilt === 'number') cameraTiltOffset = tilt;
    if (typeof smoothness === 'number') cameraSmoothness = smoothness;
    
    // If not currently playing, render immediately so user sees the setting change
    if (!followCameraActive && followCameraSamples.length > 0) {
        updateCameraForProgress(currentProgress, true);
    }
}

/**
 * Get current tour settings.
 */
export function getTourSettings() {
    return {
        height: cameraHeightOffset,
        range: cameraRangeOffset,
        tilt: cameraTiltOffset,
        smoothness: cameraSmoothness
    };
}

/**
 * Get current tour stats.
 */
export function getTourState() {
    return {
        active: followCameraActive,
        progress: currentProgress,
        pathDistance: followCameraPathDistance
    };
}

/**
 * Updates the speed multiplier.
 */
export function setFollowCameraSpeed(multiplier) {
    if (typeof multiplier === 'number' && multiplier > 0) {
        followCameraSpeedMultiplier = multiplier;
        console.log(`Follow camera speed set to: ${multiplier}x`);
    }
}

// --- Helper Functions ---

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function analyzeUpcomingTerrain(distanceAlongPath, windowKm = 0.5) {
    const sampleCount = 6;
    let minAlt = Infinity;
    let maxAlt = -Infinity;
    
    for (let i = 0; i <= sampleCount; i++) {
        const dist = distanceAlongPath + (windowKm * (i / sampleCount));
        const sample = samplePointAlongLine(followCameraSamples, clamp(dist, 0, followCameraPathDistance));
        if (sample?.point?.altitude != null) {
            minAlt = Math.min(minAlt, sample.point.altitude);
            maxAlt = Math.max(maxAlt, sample.point.altitude);
        }
    }
    
    if (minAlt === Infinity) return { variance: 0, maxAlt: 0 };
    return { variance: Math.max(0, maxAlt - minAlt), maxAlt };
}

function calculateTourDuration(pathDistanceKm) {
    if (!Number.isFinite(pathDistanceKm) || pathDistanceKm <= 0) return 90000;
    // Keep short activities brisk, but give long routes more time so camera ground
    // speed does not become frantic. The duration tops out at five minutes.
    return clamp(75000 + pathDistanceKm * 2500, 75000, 300000);
}

function calculateTerrainClearanceAltitude(distanceAlongPath, fallbackAltitude) {
    const sampleWindowKm = Math.min(0.55, Math.max(0.12, followCameraPathDistance * 0.02));
    const sampleDistances = [
        distanceAlongPath - sampleWindowKm,
        distanceAlongPath,
        distanceAlongPath + sampleWindowKm,
        distanceAlongPath + sampleWindowKm * 2,
        distanceAlongPath + sampleWindowKm * 3
    ];

    let highestTerrainAltitude = fallbackAltitude ?? 10;
    sampleDistances.forEach((distanceKm) => {
        const sample = samplePointAlongLine(followCameraSamples, clamp(distanceKm, 0, followCameraPathDistance));
        if (sample?.point?.altitude != null) {
            highestTerrainAltitude = Math.max(highestTerrainAltitude, sample.point.altitude);
        }
    });

    return highestTerrainAltitude + cameraHeightOffset;
}


/** Linear interpolation */
function lerp(start, end, amt) {
    amt = clamp(amt, 0, 1);
    return (1 - amt) * start + amt * end;
}

/** Shortest angle interpolation (degrees) */
function lerpAngle(start, end, amt) {
    amt = clamp(amt, 0, 1);
    const difference = Math.abs(end - start);
    if (difference > 180) {
        if (end > start) {
            start += 360;
        } else {
            end += 360;
        }
    }
    let value = lerp(start, end, amt);
    return (value + 360) % 360;
}

/** Haversine distance in km */
function haversineDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const R = 6371;
    const lat1 = typeof p1.lat === 'function' ? p1.lat() : (p1.lat ?? 0);
    const lng1 = typeof p1.lng === 'function' ? p1.lng() : (p1.lng ?? 0);
    const lat2 = typeof p2.lat === 'function' ? p2.lat() : (p2.lat ?? 0);
    const lng2 = typeof p2.lng === 'function' ? p2.lng() : (p2.lng ?? 0);
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** Bearing in degrees */
function calculateBearing(p1, p2) {
    if (!p1 || !p2) return 0;
    const lat1 = (typeof p1.lat === 'function' ? p1.lat() : (p1.lat ?? 0)) * Math.PI / 180;
    const lng1 = (typeof p1.lng === 'function' ? p1.lng() : (p1.lng ?? 0)) * Math.PI / 180;
    const lat2 = (typeof p2.lat === 'function' ? p2.lat() : (p2.lat ?? 0)) * Math.PI / 180;
    const lng2 = (typeof p2.lng === 'function' ? p2.lng() : (p2.lng ?? 0)) * Math.PI / 180;

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
}

/** Sample a point along a line at a specific distance in km */
export function samplePointAlongLine(coords, distance) {
    if (!coords || coords.length < 2 || distance < 0 || !LatLng) return null;

    let cumulativeDistance = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        if (!p1 || !p2) continue;
        const segmentDistance = haversineDistance(p1, p2);

        if (segmentDistance <= 0) continue;

        const epsilon = 1e-9;
        if (cumulativeDistance + segmentDistance >= distance - epsilon) {
            const fraction = Math.max(0, Math.min(1, (distance - cumulativeDistance) / segmentDistance));
            const bearing = calculateBearing(p1, p2);
            const lat1 = typeof p1.lat === 'function' ? p1.lat() : (p1.lat ?? 0);
            const lng1 = typeof p1.lng === 'function' ? p1.lng() : (p1.lng ?? 0);
            const lat2 = typeof p2.lat === 'function' ? p2.lat() : (p2.lat ?? 0);
            const lng2 = typeof p2.lng === 'function' ? p2.lng() : (p2.lng ?? 0);
            const lat = lat1 + (lat2 - lat1) * fraction;
            const lng = lng1 + (lng2 - lng1) * fraction;
            const alt1 = p1.altitude ?? 10;
            const alt2 = p2.altitude ?? 10;
            const altitude = alt1 + (alt2 - alt1) * fraction;

            const pt = new LatLng(lat, lng);
            pt.altitude = altitude;
            return { point: pt, bearing: bearing };
        }
        cumulativeDistance += segmentDistance;
    }

    if (coords.length >= 2) {
        const lastPoint = coords[coords.length - 1];
        const secondLastPoint = coords[coords.length - 2];
        if (!lastPoint || !secondLastPoint) return null;
        const bearing = calculateBearing(secondLastPoint, lastPoint);
        const lastPointWithAlt = new LatLng(lastPoint.lat(), lastPoint.lng());
        lastPointWithAlt.altitude = lastPoint.altitude ?? 10;
        return { point: lastPointWithAlt, bearing: bearing };
    }

    return null;
}

function samplePointAlongLineExact(coords, cumDists, distance) {
    if (!coords || coords.length < 2 || !cumDists || distance < 0 || !LatLng) return null;
    
    // Fast Integer Scan (O(1) sequential during playback, or binary search)
    let idx = 0;
    while (idx < cumDists.length - 1 && cumDists[idx + 1] < distance) {
        idx++;
    }
    
    if (idx >= coords.length - 1) {
        const last = coords[coords.length - 1];
        const pt = new LatLng(typeof last.lat === 'function' ? last.lat() : last.lat, typeof last.lng === 'function' ? last.lng() : last.lng);
        pt.altitude = last.altitude ?? 10;
        return pt;
    }
    
    const p1 = coords[idx];
    const p2 = coords[idx + 1];
    const d1 = cumDists[idx];
    const d2 = cumDists[idx + 1];
    const segmentD = d2 - d1;
    if (segmentD <= 0) {
        const pt = new LatLng(typeof p1.lat === 'function' ? p1.lat() : p1.lat, typeof p1.lng === 'function' ? p1.lng() : p1.lng);
        pt.altitude = p1.altitude ?? 10;
        return pt;
    }
    
    const fraction = clamp((distance - d1) / segmentD, 0, 1);
    const lat1 = typeof p1.lat === 'function' ? p1.lat() : (p1.lat ?? 0);
    const lng1 = typeof p1.lng === 'function' ? p1.lng() : (p1.lng ?? 0);
    const lat2 = typeof p2.lat === 'function' ? p2.lat() : (p2.lat ?? 0);
    const lng2 = typeof p2.lng === 'function' ? p2.lng() : (p2.lng ?? 0);
    
    const lat = lat1 + (lat2 - lat1) * fraction;
    const lng = lng1 + (lng2 - lng1) * fraction;
    const alt1 = p1.altitude ?? 10;
    const alt2 = p2.altitude ?? 10;
    const altitude = alt1 + (alt2 - alt1) * fraction;
    
    const pt = new LatLng(lat, lng);
    pt.altitude = altitude;
    return pt;
}

/** Precompute samples along the route */
async function buildFollowCameraSamples(routeCoords) {
    const maxSamples = 160;
    const keepEvery = Math.max(1, Math.ceil(routeCoords.length / maxSamples));
    const samples = [];

    for (let i = 0; i < routeCoords.length; i += keepEvery) {
        samples.push(routeCoords[i]);
    }
    const last = routeCoords[routeCoords.length - 1];
    if (samples[samples.length - 1] !== last) samples.push(last);

    const enriched = [];
    for (const point of samples) {
        const lat = typeof point.lat === 'function' ? point.lat() : (point.lat ?? 0);
        const lng = typeof point.lng === 'function' ? point.lng() : (point.lng ?? 0);
        let altitude = point.altitude;
        if (altitude == null) {
            altitude = await getClientElevation({ lat, lng });
        }
        const pt = new LatLng(lat, lng);
        pt.altitude = altitude;
        enriched.push(pt);
    }
    return enriched;
}

/**
 * Loads a new route's coordinates into the follow camera module.
 * Precomputes the camera samples and calculates path distance.
 */
export async function loadTourRoute(routeCoords) {
    if (!routeCoords || routeCoords.length < 2) return;
    console.log("Loading new route coordinates for follow tour...");
    followCameraCoords = routeCoords;
    followCameraSamples = await buildFollowCameraSamples(routeCoords);
    
    // Calculate high-fidelity cumulative distances for exact polyline snapping
    followCameraCumulativeDistances = new Float64Array(routeCoords.length);
    followCameraCumulativeDistances[0] = 0;
    let totalD = 0;
    for (let i = 0; i < routeCoords.length - 1; i++) {
        totalD += haversineDistance(routeCoords[i], routeCoords[i + 1]);
        followCameraCumulativeDistances[i + 1] = totalD;
    }
    followCameraPathDistance = totalD;
    followCameraBaseDuration = calculateTourDuration(followCameraPathDistance);
    console.log(`Follow camera duration set to ${(followCameraBaseDuration / 1000).toFixed(0)}s for ${followCameraPathDistance.toFixed(1)} km (Exact snap array built: ${followCameraCumulativeDistances.length} points).`);
    
    // Smart profile defaults assessment based on terrain and elevation gain
    let globalMinAlt = Infinity;
    let globalMaxAlt = -Infinity;
    followCameraSamples.forEach(p => {
        const alt = typeof p.altitude === 'number' ? p.altitude : (typeof p.altitude === 'function' ? p.altitude() : 10);
        globalMinAlt = Math.min(globalMinAlt, alt);
        globalMaxAlt = Math.max(globalMaxAlt, alt);
    });
    const totalElevationGain = Math.max(0, globalMaxAlt - globalMinAlt);
    
    if (totalElevationGain > 450) { // High Alpine Climb
        cameraHeightOffset = 180;
        cameraRangeOffset = 1150;
        cameraTiltOffset = 42;
        console.log(`[loadTourRoute] Smart Profile: High Alpine. Gain: ${totalElevationGain.toFixed(0)}m. Set tight tilt and high range.`);
    } else if (totalElevationGain > 120) { // Rolling Hills / Moderate
        cameraHeightOffset = 130;
        cameraRangeOffset = 760;
        cameraTiltOffset = 58;
        console.log(`[loadTourRoute] Smart Profile: Rolling Hills. Gain: ${totalElevationGain.toFixed(0)}m.`);
    } else { // Flat Coastal / Urban
        cameraHeightOffset = 85;
        cameraRangeOffset = 460;
        cameraTiltOffset = 68;
        console.log(`[loadTourRoute] Smart Profile: Flat Coastal. Gain: ${totalElevationGain.toFixed(0)}m. Set scenic close range.`);
    }
    
    currentProgress = 0;
    filteredHeading = null;
    lastCameraUpdateTime = null;
    lastTargetAltitude = null;
    if (onProgressUpdate) onProgressUpdate(0, 0);
}

/**
 * Clears the currently loaded route coordinates.
 */
export function clearTourRoute() {
    followCameraCoords = [];
    followCameraSamples = [];
    followCameraCumulativeDistances = null;
    followCameraPathDistance = 0;
    currentProgress = 0;
    filteredHeading = null;
    lastCameraUpdateTime = null;
    if (onProgressUpdate) onProgressUpdate(0, 0);
}

/**
 * Play or resume the tour.
 */
export async function playFollowCamera(routeCoords) {
    if (!map3d) {
        showError("Cannot start follow camera: Map not initialized.");
        return;
    }
    
    // If not active, but we need to load new coordinates
    if (routeCoords && (followCameraCoords !== routeCoords || followCameraSamples.length === 0)) {
        await loadTourRoute(routeCoords);
        if (isNaN(followCameraPathDistance) || followCameraPathDistance <= 0) {
            showError("Invalid route distance. Cannot play tour.");
            return;
        }
    }
    
    if (followCameraSamples.length === 0) {
        showError("No route loaded to tour.");
        return;
    }

    if (followCameraActive) return; // Already playing

    console.log("Playing follow camera tour.");
    followCameraActive = true;
    lastFrameTime = null; // Reset frame timestamp
    
    // Stop any pending delays
    if (followCameraTimeoutId) {
        clearTimeout(followCameraTimeoutId);
        followCameraTimeoutId = null;
    }
    
    if (onPlaybackStateChange) onPlaybackStateChange('playing');
    
    followCameraAnimationId = window.requestAnimationFrame(frame);
}

/**
 * Pause the tour.
 */
export function pauseFollowCamera() {
    if (!followCameraActive) return;
    console.log("Pausing follow camera tour.");
    followCameraActive = false;
    lastFrameTime = null;
    
    if (followCameraAnimationId) {
        window.cancelAnimationFrame(followCameraAnimationId);
        followCameraAnimationId = null;
    }
    
    if (onPlaybackStateChange) onPlaybackStateChange('paused');
}

/**
 * Stop and reset the tour.
 */
export function stopFollowCamera() {
    console.log("Stopping and resetting follow camera tour.");
    followCameraActive = false;
    lastFrameTime = null;
    currentProgress = 0; // Reset progress
    
    if (followCameraAnimationId) {
        window.cancelAnimationFrame(followCameraAnimationId);
        followCameraAnimationId = null;
    }
    if (followCameraTimeoutId) {
        clearTimeout(followCameraTimeoutId);
        followCameraTimeoutId = null;
    }
    
    // Return camera to start of route
    if (followCameraSamples.length > 0) {
        updateCameraForProgress(0, true);
    }
    
    if (onProgressUpdate) onProgressUpdate(0, 0);
    if (onPlaybackStateChange) onPlaybackStateChange('stopped');
    if (typeof updateTrackingMarkerCb === 'function') {
        updateTrackingMarkerCb(null);
    }
}

/**
 * Scrub/Seek the tour to a specific progress (0.0 to 1.0).
 */
export function setFollowCameraProgress(progress) {
    if (followCameraSamples.length === 0) return;
    currentProgress = Math.max(0, Math.min(1, progress));
    
    // Update camera position snap-to-target immediately (smoothness = 1.0 during scrubbing)
    updateCameraForProgress(currentProgress, true);
    
    const distanceElapsedKm = followCameraPathDistance * currentProgress;
    if (onProgressUpdate) onProgressUpdate(currentProgress, distanceElapsedKm);
}

/**
 * The animation frame function.
 */
function frame(time) {
    if (!followCameraActive || !map3d) {
        lastFrameTime = null;
        followCameraAnimationId = null;
        return;
    }

    if (!lastFrameTime) {
        lastFrameTime = time;
        followCameraAnimationId = window.requestAnimationFrame(frame);
        return;
    }

    const deltaTime = time - lastFrameTime;
    lastFrameTime = time;

    // Calculate route-relative progress from a distance-aware duration. The speed
    // multiplier stays sensitive because the base pace is already normalized by route length.
    const progressDelta = (deltaTime * followCameraSpeedMultiplier) / followCameraBaseDuration;
    currentProgress += progressDelta;

    if (currentProgress >= 1) {
        currentProgress = 1;
        followCameraActive = false;
        lastFrameTime = null;
        console.log("Follow camera animation finished.");
        
        const distanceElapsedKm = followCameraPathDistance * currentProgress;
        if (onProgressUpdate) onProgressUpdate(currentProgress, distanceElapsedKm);
        if (onPlaybackStateChange) onPlaybackStateChange('stopped');
        return;
    }

    updateCameraForProgress(currentProgress, false);

    const distanceElapsedKm = followCameraPathDistance * currentProgress;
    if (onProgressUpdate) onProgressUpdate(currentProgress, distanceElapsedKm);

    if (followCameraActive) {
        followCameraAnimationId = window.requestAnimationFrame(frame);
    } else {
        followCameraAnimationId = null;
    }
}

/**
 * Update the 3D camera properties based on the progress fraction.
 */
export function updateCameraForProgress(progress, snapDirectly = false) {
    if (!map3d || !followCameraSamples || followCameraSamples.length < 2) return;

    const distanceAlongPath = followCameraPathDistance * progress;
    const alongCoords = samplePointAlongLine(followCameraSamples, distanceAlongPath);

    if (!alongCoords || !alongCoords.point) return;

    const upcomingTerrain = analyzeUpcomingTerrain(distanceAlongPath, 0.5);
    const varianceMeters = upcomingTerrain.variance;

    // Aggressive Spatial Elevation Anti-Clipping (Part 1)
    const varianceFactor = clamp(varianceMeters / 150, 0, 1);
    const dynamicHeightBoost = varianceFactor * 150; // Push up to 150m above for steep climbs
    const dynamicRangeBoost = varianceMeters * 25; // Inflate range aggressively by 25x variance
    const dynamicTiltDrop = varianceFactor * 45; // Slam tilt from horizontal down toorbital drop

    const baseClearance = calculateTerrainClearanceAltitude(distanceAlongPath, alongCoords.point.altitude ?? 10);
    const rawTargetAltitude = Math.max(baseClearance, upcomingTerrain.maxAlt + cameraHeightOffset + dynamicHeightBoost);

    // Velocity Slope Clamping (Jank Prevention)
    const maxAltitudeDeltaPerFrame = 4.0 * followCameraSpeedMultiplier;
    let targetCameraAltitude = rawTargetAltitude;
    if (lastTargetAltitude !== null && !snapDirectly) {
        const targetDelta = rawTargetAltitude - lastTargetAltitude;
        const clampedDelta = clamp(targetDelta, -maxAltitudeDeltaPerFrame, maxAltitudeDeltaPerFrame);
        targetCameraAltitude = lastTargetAltitude + clampedDelta;
    }
    lastTargetAltitude = targetCameraAltitude;

    // Cinematic Inertia View (Time-Based 8-second Future Bearing)
    const currentDurationMs = followCameraBaseDuration / followCameraSpeedMultiplier;
    const kmPerMs = followCameraPathDistance / currentDurationMs;
    const lookAheadMs = 8000; 
    const lookAheadDistanceKm = clamp(kmPerMs * lookAheadMs, 0.05, 0.55);

    const lookAheadSample = samplePointAlongLine(
        followCameraSamples,
        Math.min(followCameraPathDistance, distanceAlongPath + lookAheadDistanceKm)
    );
    let smoothedBearing = lookAheadSample ? lookAheadSample.bearing : alongCoords.bearing;

    const now = performance.now();
    if (snapDirectly || filteredHeading == null || lastCameraUpdateTime == null) {
        filteredHeading = smoothedBearing;
    } else {
        const elapsedSeconds = Math.max(0.001, (now - lastCameraUpdateTime) / 1000);
        const maxTurnDegrees = clamp(95 * elapsedSeconds, 1.2, 8);
        const signedDelta = ((((smoothedBearing - filteredHeading) % 360) + 540) % 360) - 180;
        filteredHeading = (filteredHeading + clamp(signedDelta, -maxTurnDegrees, maxTurnDegrees) + 360) % 360;
        smoothedBearing = filteredHeading;
    }
    lastCameraUpdateTime = now;

    const targetCameraPosition = {
        center: { lat: alongCoords.point.lat(), lng: alongCoords.point.lng(), altitude: targetCameraAltitude },
        heading: smoothedBearing,
        range: clamp(cameraRangeOffset + dynamicRangeBoost, 200, 3500),
        tilt: clamp(cameraTiltOffset - dynamicTiltDrop, 20, 85),
    };

    if (typeof updateTrackingMarkerCb === 'function') {
        const exactPoint = samplePointAlongLineExact(followCameraCoords, followCameraCumulativeDistances, distanceAlongPath);
        if (exactPoint) {
            updateTrackingMarkerCb({
                lat: typeof exactPoint.lat === 'function' ? exactPoint.lat() : exactPoint.lat,
                lng: typeof exactPoint.lng === 'function' ? exactPoint.lng() : exactPoint.lng,
                altitude: exactPoint.altitude ?? 10
            });
        }
    }

    // If scrubbing or snapping directly, set the camera directly without LERP interpolation.
    // During playback, bias the user-facing smoothness upward so the camera tracks the
    // route without the old over-smoothed lag that made corners feel rubber-banded.
    const factor = snapDirectly ? 1.0 : Math.max(cameraSmoothness, 0.14);

    const currentCamera = {
        center: map3d.center,
        heading: map3d.heading,
        range: map3d.range,
        tilt: map3d.tilt
    };

    const interpolatedCamera = {
        center: {
            lat: lerp(currentCamera.center.lat, targetCameraPosition.center.lat, factor),
            lng: lerp(currentCamera.center.lng, targetCameraPosition.center.lng, factor),
            altitude: lerp(currentCamera.center.altitude, targetCameraPosition.center.altitude, factor)
        },
        heading: lerpAngle(currentCamera.heading, targetCameraPosition.heading, factor),
        range: lerp(currentCamera.range, targetCameraPosition.range, factor),
        tilt: lerp(currentCamera.tilt, targetCameraPosition.tilt, factor)
    };

    if (!isNaN(interpolatedCamera.center.lat) && !isNaN(interpolatedCamera.center.lng) && !isNaN(interpolatedCamera.center.altitude) && !isNaN(interpolatedCamera.heading)) {
        map3d.center = interpolatedCamera.center;
        map3d.heading = interpolatedCamera.heading;
        map3d.range = Math.max(10, interpolatedCamera.range);
        map3d.tilt = clamp(interpolatedCamera.tilt, 0, 85);
    }
}

/**
 * Backward compatibility wrapper for old setFollowCameraState API
 */
export function setFollowCameraState(isActive, routeCoords, useDelay = false) {
    if (isActive) {
        playFollowCamera(routeCoords);
    } else {
        pauseFollowCamera();
    }
}