# Trails Ninja Geospatial Projects

This repository contains lightweight, static-friendly geospatial web applications designed to explore routes and environmental data on interactive maps.

## Projects

*   **[Strava 3D Explorer](strava-explorer/README.md)**: A Vite-powered web application to visualize Strava routes, endpoints, and photos in Google Maps Platform Photorealistic 3D with follow-camera animations.
*   **[Hyperlocal AQI Map](aqi-map/README.md)**: A Browserify-powered 2D Mapbox GL map that interpolates real-time PurpleAir sensor data to render local air quality index (AQI) contours.
*   **[Isochrones](isochrones/README.md)**: A Vite + Node Google Maps Platform demo for analyzing delivery, commute, and response reachability with selectable Isochrones API polygons.

## Getting Started

Each project is self-contained. Navigate to the project's directory and follow its README:

```bash
# To run the Strava 3D Explorer
cd strava-explorer
npm install
npm run dev

# To run the Hyperlocal AQI Map
cd aqi-map
npm install
npm start

# To run the Isochrones Demo
cd isochrones
npm install
# Set up your .env file first (see isochrones/README.md)
npm run dev
```

## Security Best Practices

To keep these projects clean and secure, adhere to the following best practices:
*   **No Hardcoded Secrets**: Never commit API keys, client secrets, access tokens, or generated `.env.*` files. Use environment files locally (which are excluded via `.gitignore`).
*   **Key Restrictions**: Always restrict Google Maps browser keys by referrer (e.g., `http://localhost:5173/*` and your production domain) and limit their API scope to only the services required.
*   **Backend Broker**: The Strava Explorer uses a secure backend broker design (Node dev-server middleware locally, and Cloud Run in production) so the Strava client secret is never exposed to the user's browser.

## Cost Note

> [!NOTE]
> Google Maps Platform usage may incur costs. Consider using the free Maps Demo Key for prototyping: https://mapsplatform.google.com/maps-demo-key.

## Terms of Service Compliance

These projects integrate third-party APIs. By using them, you agree to comply with their respective Terms of Service:
*   **Google Maps Platform**: Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup). Users of applications using these features are also bound by the [Google Maps End User Additional Terms of Service](https://maps.google.com/help/terms_maps.html) and [Google Privacy Policy](https://policies.google.com/privacy).
*   **Strava**: Subject to the [Strava Developer Agreement](https://www.strava.com/legal/api).
*   **Mapbox**: Subject to the [Mapbox Terms of Service](https://www.mapbox.com/legal/tos).
*   **PurpleAir**: Subject to the [PurpleAir Terms of Service](https://www.purpleair.com/terms-of-service).

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository and create a feature branch.
2. Ensure changes are localized to the specific project directory you are modifying.
3. Keep changes simple, clean, and well-documented.
4. Open a pull request describing the changes and testing completed.

## License

This repository is licensed under the [MIT License](LICENSE).
