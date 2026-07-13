export const STRAVA_PHOTO_HOST = 'dgtzuqphqg23d.cloudfront.net';

/**
 * Route supported Strava photos through the broker. An empty broker base is
 * intentional and produces the gateway's same-origin `/api/photo-proxy` URL.
 */
export function proxiedPhotoUrl(imageUrl, brokerBaseUrl = '') {
    if (!imageUrl) return imageUrl;
    try {
        const url = new URL(imageUrl);
        if (url.protocol === 'https:' && !url.username && !url.password
            && (!url.port || url.port === '443') && url.hostname === STRAVA_PHOTO_HOST) {
            const base = String(brokerBaseUrl).replace(/\/$/, '');
            return `${base}/api/photo-proxy?url=${encodeURIComponent(url.href)}`;
        }
    } catch {
        // Preserve unsupported/invalid values for the caller's normal image
        // error handling rather than attempting to proxy arbitrary input.
    }
    return imageUrl;
}
