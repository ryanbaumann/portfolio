// strava-explorer/src/photos.js

/**
 * Group photos that are close to each other (within 10 meters / 0.01 km) to prevent overlaps and flicker.
 * @param {Array} photosData - Array of photo objects.
 * @param {Function} distanceFn - Function to calculate distance (in km) between two {lat, lng} points.
 * @returns {Array} Array of grouped photos: { lat, lng, photos: [...] }
 */
export function groupPhotosByProximity(photosData, distanceFn) {
    if (!photosData || photosData.length === 0) {
        return [];
    }

    // Filter only photos with valid location and unique_id
    const locatedPhotos = photosData.filter((photo) => photo.location?.length === 2 && photo.unique_id);

    const photoGroups = [];
    locatedPhotos.forEach(photo => {
        const lat = photo.location[0];
        const lng = photo.location[1];
        
        let foundGroup = null;
        for (const group of photoGroups) {
            const dist = distanceFn({ lat, lng }, { lat: group.lat, lng: group.lng });
            if (dist < 0.01) { // 10 meters
                foundGroup = group;
                break;
            }
        }
        if (foundGroup) {
            foundGroup.photos.push(photo);
        } else {
            photoGroups.push({
                lat,
                lng,
                photos: [photo]
            });
        }
    });

    return photoGroups;
}
