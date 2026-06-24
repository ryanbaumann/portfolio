# ISOCros — Google Maps Platform Isochrones Demo

ISOCros is a small Vite + Node demo that showcases the Google Maps Platform Isochrones API on an interactive Google Map. It is designed around three common reachability workflows:

- **Delivery promise**: compare 10/20/30+ minute service areas from a hub.
- **Commute catchment**: flip travel direction to understand who can arrive at a destination within a target time.
- **Response coverage**: inspect time-band gaps for field teams, clinics, or emergency-style service planning.

The visual design uses nested, selectable isochrone polygons with a drill-down statistics panel that reports approximate area in square kilometers for each time band.

## Prerequisites

- Node.js 20 or newer.
- A Google Maps Platform API key in the same environment variable used by `strava-explorer`:

```dotenv
VITE_GMP_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY
```

Enable these Google Maps Platform products on the key's Google Cloud project:

- Maps JavaScript API
- Isochrones API

For production, restrict the key by HTTP referrer and limit API access to the APIs above.

## Run locally

```bash
cd isocros
npm install
VITE_GMP_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY npm run dev
```

Open `http://localhost:5174`.

## Build and preview

```bash
cd isocros
npm run build
VITE_GMP_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY npm run preview
```

The app calls the Isochrones REST endpoint through `server.js` at `/api/isochrone`. This avoids browser CORS limitations for REST web services and keeps request validation in one local demo proxy.

## Notes

- Drive mode is capped at 60 minutes by the Isochrones API; the server validates this before proxying.
- Coordinates are validated in the browser and server before rendering or sending requests.
- The demo uses `DEMO_MAP_ID` for Advanced Marker support in local prototyping.
