// strava-explorer/src/demoData.js

// Generate coordinates for Alpine Ride (18 points)
const alpineCoords = [];
const alpineAltitudes = [];
const alpineDistances = [];
const alpineLatLngs = [];

const startAlpineLat = 46.508;
const startAlpineLng = 11.838;
let currentDistAlpine = 0;

for (let i = 0; i < 18; i++) {
    const lat = startAlpineLat + i * 0.003;
    const lng = startAlpineLng + i * 0.002;
    const altitude = 1200 + i * 65 - (i % 3 === 0 ? 15 : 0); // Mountainous climb with some small dips
    if (i > 0) {
        // Calculate distance from previous point (rough approximation)
        currentDistAlpine += 450;
    }
    alpineCoords.push({ lat, lng, altitude });
    alpineAltitudes.push(altitude);
    alpineDistances.push(currentDistAlpine);
    alpineLatLngs.push([lat, lng]);
}

// Generate coordinates for Coastal Run (18 points)
const coastalCoords = [];
const coastalAltitudes = [];
const coastalDistances = [];
const coastalLatLngs = [];

const startCoastalLat = 36.958;
const startCoastalLng = -122.028;
let currentDistCoastal = 0;

for (let i = 0; i < 18; i++) {
    const lat = startCoastalLat + i * 0.0015;
    const lng = startCoastalLng + i * 0.0025;
    const altitude = 5 + (i % 4) * 2; // Flat/undulating coastal trail
    if (i > 0) {
        currentDistCoastal += 250;
    }
    coastalCoords.push({ lat, lng, altitude });
    coastalAltitudes.push(altitude);
    coastalDistances.push(currentDistCoastal);
    coastalLatLngs.push([lat, lng]);
}

export const demoActivities = [
    {
        id: "demo-alpine-ride",
        name: "Alpine Ride 🚴",
        distance: currentDistAlpine,
        moving_time: 4200,
        total_elevation_gain: 1105,
        average_speed: currentDistAlpine / 4200,
        max_speed: 13.5,
        demo: true,
        map: {
            polyline: "demo:" + JSON.stringify(alpineCoords),
            summary_polyline: "demo"
        },
        streams: {
            altitudeStream: { data: alpineAltitudes },
            distanceStream: { data: alpineDistances },
            latlngStream: { data: alpineLatLngs }
        },
        photos: [
            {
                unique_id: "demo_photo_alpine_1",
                location: [alpineCoords[4].lat, alpineCoords[4].lng],
                urls: {
                    "100": "https://picsum.photos/id/1018/100/100",
                    "600": "https://picsum.photos/id/1018/600/400",
                    "1000": "https://picsum.photos/id/1018/1000/600"
                }
            },
            {
                unique_id: "demo_photo_alpine_2",
                location: [alpineCoords[12].lat, alpineCoords[12].lng],
                urls: {
                    "100": "https://picsum.photos/id/1019/100/100",
                    "600": "https://picsum.photos/id/1019/600/400",
                    "1000": "https://picsum.photos/id/1019/1000/600"
                }
            }
        ]
    },
    {
        id: "demo-coastal-run",
        name: "Coastal Run 🏃",
        distance: currentDistCoastal,
        moving_time: 2100,
        total_elevation_gain: 28,
        average_speed: currentDistCoastal / 2100,
        max_speed: 4.8,
        demo: true,
        map: {
            polyline: "demo:" + JSON.stringify(coastalCoords),
            summary_polyline: "demo"
        },
        streams: {
            altitudeStream: { data: coastalAltitudes },
            distanceStream: { data: coastalDistances },
            latlngStream: { data: coastalLatLngs }
        },
        photos: [
            {
                unique_id: "demo_photo_coastal_1",
                location: [coastalCoords[5].lat, coastalCoords[5].lng],
                urls: {
                    "100": "https://picsum.photos/id/1015/100/100",
                    "600": "https://picsum.photos/id/1015/600/400",
                    "1000": "https://picsum.photos/id/1015/1000/600"
                }
            },
            {
                unique_id: "demo_photo_coastal_2",
                location: [coastalCoords[13].lat, coastalCoords[13].lng],
                urls: {
                    "100": "https://picsum.photos/id/1016/100/100",
                    "600": "https://picsum.photos/id/1016/600/400",
                    "1000": "https://picsum.photos/id/1016/1000/600"
                }
            }
        ]
    }
];
