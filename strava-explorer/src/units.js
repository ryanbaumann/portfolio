// strava-explorer/src/units.js

export const KM_PER_MILE = 1.609344;
export const MILES_PER_KM = 0.621371;
export const FEET_PER_METER = 3.28084;
export const M_PER_FT = 0.3048;
export const MPS_TO_MPH = 2.23694;

/**
 * Formats distance from meters.
 * @param {number} meters - The distance in meters.
 * @param {boolean} useImperial - Whether to format in miles or kilometers.
 * @returns {string} Formatted distance string (e.g. "12.34 mi" or "19.86 km").
 */
export function formatDistance(meters, useImperial = true) {
    if (!Number.isFinite(meters) || meters < 0) return useImperial ? "0.00 mi" : "0.00 km";
    if (useImperial) {
        const miles = (meters / 1000) * MILES_PER_KM;
        return `${miles.toFixed(2)} mi`;
    } else {
        const km = meters / 1000;
        return `${km.toFixed(2)} km`;
    }
}

/**
 * Formats elevation in meters or feet.
 * @param {number} meters - The elevation in meters.
 * @param {boolean} useImperial - Whether to format in feet or meters.
 * @returns {string} Formatted elevation string (e.g. "1,234 ft" or "376 m").
 */
export function formatElevation(meters, useImperial = true) {
    if (!Number.isFinite(meters)) return useImperial ? "0 ft" : "0 m";
    if (useImperial) {
        const feet = meters * FEET_PER_METER;
        return `${feet.toFixed(0)} ft`;
    } else {
        return `${meters.toFixed(0)} m`;
    }
}

/**
 * Formats speed from meters per second to mph or km/h.
 * @param {number} mps - Speed in meters per second.
 * @param {boolean} useImperial - Whether to format in mph or km/h.
 * @returns {string} Formatted speed string (e.g. "12.3 mph" or "19.8 km/h").
 */
export function formatSpeed(mps, useImperial = true) {
    if (!Number.isFinite(mps) || mps < 0) return useImperial ? "0.0 mph" : "0.0 km/h";
    if (useImperial) {
        const mph = mps * MPS_TO_MPH;
        return `${mph.toFixed(1)} mph`;
    } else {
        const kmh = mps * 3.6;
        return `${kmh.toFixed(1)} km/h`;
    }
}

/**
 * Formats duration from seconds into H:MM:SS or M:SS format.
 * @param {number} seconds - The duration in seconds.
 * @returns {string} Formatted duration (e.g. "1:23:45").
 */
export function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
