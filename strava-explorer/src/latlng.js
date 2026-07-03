// strava-explorer/src/latlng.js

/**
 * Extracts a plain LatLng literal from a Google Maps LatLng object or a literal.
 * @param {object} p - A LatLng-like object (either with lat/lng as functions or properties)
 * @returns {{lat: number, lng: number}}
 */
export function toLatLngLiteral(p) {
    if (!p) return { lat: 0, lng: 0 };
    const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
    const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
    return {
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0
    };
}
