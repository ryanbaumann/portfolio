// strava-explorer/src/geo.js

export const DEFAULT_ALTITUDE_M = 10;

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation.
 */
export function lerp(start, end, amt) {
    amt = clamp(amt, 0, 1);
    return (1 - amt) * start + amt * end;
}

/**
 * Shortest angle interpolation (degrees).
 */
export function lerpAngle(start, end, amt) {
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

/**
 * Haversine distance in km between two lat/lng coordinates.
 * @param {{lat: number, lng: number}} p1
 * @param {{lat: number, lng: number}} p2
 * @returns {number} Distance in kilometers
 */
export function haversineKm(p1, p2) {
    if (!p1 || !p2) return 0;
    const R = 6371; // Earth radius in km
    const lat1 = p1.lat;
    const lng1 = p1.lng;
    const lat2 = p2.lat;
    const lng2 = p2.lng;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Bearing in degrees between two lat/lng coordinates.
 * @param {{lat: number, lng: number}} p1
 * @param {{lat: number, lng: number}} p2
 * @returns {number} Bearing in degrees (0-360)
 */
export function bearingDeg(p1, p2) {
    if (!p1 || !p2) return 0;
    const lat1 = p1.lat * Math.PI / 180;
    const lng1 = p1.lng * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const lng2 = p2.lng * Math.PI / 180;

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
}

/**
 * Sample a point along a line at a specific distance in km.
 * @param {Array<{lat: number, lng: number, altitude?: number}>} coords
 * @param {number} distance - Distance in kilometers
 * @param {number} defaultAltitude
 * @returns {{point: {lat: number, lng: number, altitude: number}, bearing: number} | null}
 */
export function samplePointAlongLine(coords, distance, defaultAltitude = DEFAULT_ALTITUDE_M) {
    if (!coords || coords.length < 2 || distance < 0) return null;

    let cumulativeDistance = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        if (!p1 || !p2) continue;
        const segmentDistance = haversineKm(p1, p2);

        if (segmentDistance <= 0) continue;

        const epsilon = 1e-9;
        if (cumulativeDistance + segmentDistance >= distance - epsilon) {
            const fraction = Math.max(0, Math.min(1, (distance - cumulativeDistance) / segmentDistance));
            const bearing = bearingDeg(p1, p2);
            const lat = p1.lat + (p2.lat - p1.lat) * fraction;
            const lng = p1.lng + (p2.lng - p1.lng) * fraction;
            const alt1 = p1.altitude ?? defaultAltitude;
            const alt2 = p2.altitude ?? defaultAltitude;
            const altitude = alt1 + (alt2 - alt1) * fraction;

            return {
                point: { lat, lng, altitude },
                bearing
            };
        }
        cumulativeDistance += segmentDistance;
    }

    if (coords.length >= 2) {
        const lastPoint = coords[coords.length - 1];
        const secondLastPoint = coords[coords.length - 2];
        if (!lastPoint || !secondLastPoint) return null;
        const bearing = bearingDeg(secondLastPoint, lastPoint);
        return {
            point: {
                lat: lastPoint.lat,
                lng: lastPoint.lng,
                altitude: lastPoint.altitude ?? defaultAltitude
            },
            bearing
        };
    }

    return null;
}

/**
 * Exact sample of a point along a line at a specific distance using cumulative distances array.
 * @param {Array<{lat: number, lng: number, altitude?: number}>} coords
 * @param {Float64Array|number[]} cumDists
 * @param {number} distance - Distance in kilometers
 * @param {number} defaultAltitude
 * @returns {{lat: number, lng: number, altitude: number} | null}
 */
export function samplePointAlongLineExact(coords, cumDists, distance, defaultAltitude = DEFAULT_ALTITUDE_M) {
    if (!coords || coords.length < 2 || !cumDists || distance < 0) return null;
    
    let idx = 0;
    while (idx < cumDists.length - 1 && cumDists[idx + 1] < distance) {
        idx++;
    }
    
    if (idx >= coords.length - 1) {
        const last = coords[coords.length - 1];
        return {
            lat: last.lat,
            lng: last.lng,
            altitude: last.altitude ?? defaultAltitude
        };
    }
    
    const p1 = coords[idx];
    const p2 = coords[idx + 1];
    const d1 = cumDists[idx];
    const d2 = cumDists[idx + 1];
    const segmentD = d2 - d1;
    if (segmentD <= 0) {
        return {
            lat: p1.lat,
            lng: p1.lng,
            altitude: p1.altitude ?? defaultAltitude
        };
    }
    
    const fraction = clamp((distance - d1) / segmentD, 0, 1);
    const lat = p1.lat + (p2.lat - p1.lat) * fraction;
    const lng = p1.lng + (p2.lng - p1.lng) * fraction;
    const alt1 = p1.altitude ?? defaultAltitude;
    const alt2 = p2.altitude ?? defaultAltitude;
    const altitude = alt1 + (alt2 - alt1) * fraction;
    
    return { lat, lng, altitude };
}

/**
 * Calculates cumulative distances along a coordinate path.
 * @param {Array<{lat: number, lng: number}>} coords
 * @returns {Float64Array}
 */
export function calculateCumulativeDistances(coords) {
    if (!coords || coords.length === 0) return new Float64Array(0);
    const cumDists = new Float64Array(coords.length);
    cumDists[0] = 0;
    let totalD = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        totalD += haversineKm(coords[i], coords[i + 1]);
        cumDists[i + 1] = totalD;
    }
    return cumDists;
}

/**
 * Downsamples path to a max number of points, keeping start/end.
 * @param {Array<{lat: number, lng: number, altitude?: number}>} path
 * @param {number} maxPoints
 * @returns {Array<{lat: number, lng: number, altitude?: number}>}
 */
export function downsamplePath(path, maxPoints) {
    if (!path || path.length <= maxPoints) {
        return path;
    }

    const originalLength = path.length;
    const keepEvery = Math.ceil(originalLength / maxPoints);
    const newPath = [];

    for (let i = 0; i < originalLength; i += keepEvery) {
        newPath.push(path[i]);
    }

    // Ensure the last point is always included
    if (newPath.length > 0 && path.length > 0) {
        const lastOriginalPoint = path[originalLength - 1];
        const lastAddedPoint = newPath[newPath.length - 1];
        const getLat = (p) => typeof p.lat === 'function' ? p.lat() : p.lat;
        const getLng = (p) => typeof p.lng === 'function' ? p.lng() : p.lng;
        if (getLat(lastAddedPoint) !== getLat(lastOriginalPoint) || getLng(lastAddedPoint) !== getLng(lastOriginalPoint)) {
            newPath.push(lastOriginalPoint);
        }
    } else if (newPath.length === 0 && path.length > 0) {
        newPath.push(path[0]);
        if (originalLength > 1) {
            newPath.push(path[originalLength - 1]);
        }
    }

    return newPath;
}

/**
 * Applies a rolling average across a window of points to smooth the path.
 * @param {Array<{lat: number, lng: number, altitude?: number}>} coords
 * @param {number} windowSize
 * @param {number} defaultAltitude
 * @returns {Array<{lat: number, lng: number, altitude: number}>}
 */
export function smoothPath(coords, windowSize = 15, defaultAltitude = DEFAULT_ALTITUDE_M) {
    if (!coords || coords.length === 0) return [];
    const halfWindow = Math.floor(windowSize / 2);
    const smoothed = [];
    
    for (let i = 0; i < coords.length; i++) {
        let latSum = 0, lngSum = 0, altSum = 0;
        let count = 0;
        for (let j = i - halfWindow; j <= i + halfWindow; j++) {
            if (j >= 0 && j < coords.length) {
                latSum += coords[j].lat;
                lngSum += coords[j].lng;
                altSum += coords[j].altitude ?? defaultAltitude;
                count++;
            }
        }
        smoothed.push({
            lat: latSum / count,
            lng: lngSum / count,
            altitude: altSum / count
        });
    }
    return smoothed;
}

/**
 * Calculate total elevation loss.
 * @param {number[]} altitudeData
 * @returns {number} Total elevation loss (absolute value)
 */
export function calculateElevationLoss(altitudeData) {
    if (!altitudeData || altitudeData.length < 2) {
        return 0;
    }
    let totalLoss = 0;
    for (let i = 1; i < altitudeData.length; i++) {
        const diff = altitudeData[i] - altitudeData[i - 1];
        if (diff < 0) {
            totalLoss -= diff;
        }
    }
    return totalLoss;
}
