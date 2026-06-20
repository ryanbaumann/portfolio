// strava-explorer/index.js - Main application orchestrator

import * as strava from './strava.js';
import * as gmp from './gmp.js';
import {
    playFollowCamera,
    pauseFollowCamera,
    stopFollowCamera,
    setFollowCameraProgress,
    setFollowCameraSpeed,
    setTourSettings,
    registerTourCallbacks,
    getTourState,
    updateCameraForProgress,
    loadTourRoute,
    clearTourRoute
} from './followCamera.js';

// --- Module-Level Variables ---
let currentActivityId = null; // Keep track of the currently displayed activity ID
let currentRouteCoords = null; // Store the LatLng array for the current route
let currentActivityElevations = []; // Stores array of { distanceKm, elevationM, lat, lng } objects

// --- DOM Element References ---
let cameraStatusEl, fitRouteButton, flyStartButton, flyFinishButton, orbitRouteButton;
let mapHost, loadingIndicator, loadingText, errorMessageDiv, statsContainer, activityNameEl, activityDistEl, activityTimeEl, activityElevEl, activityAvgSpeedEl, activityMaxSpeedEl, activityTotalLossEl, selectList, activityFilterDiv, startDateInput, endDateInput, activityCountInput, fetchFilteredButton, footerAthleteInfo, footerProfileImg, footerProfileName, logoutButton, stravaConnectButton, stravaAuthDiv;

// Tour Player DOM elements
let tourScrubber, tourPlayBtn, tourStopBtn, playIcon, pauseIcon, tourDistanceElapsed, tourDistanceTotal;
let tourHeightSlider, tourHeightValue, tourRangeSlider, tourRangeValue, tourSmoothnessSlider, tourSmoothnessValue, followCameraSpeedSlider, followCameraSpeedValue;

// Elevation Profile DOM elements
let elevationProfileContainer, elevationPlaceholder, elevationSvg, elevationAreaPath, elevationLinePath, elevationHoverLine, elevationProgressLine, elevationHoverDot, elevationTooltip;

// --- Utility Functions (Passed to Modules) ---
function showLoading(isLoading, text = "Loading...") {
    if (!loadingIndicator || !loadingText) return;
    loadingText.textContent = text;
    loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    if (isLoading) showError(''); // Clear errors when loading starts
}
function showError(message) {
    if (!errorMessageDiv) return;
    errorMessageDiv.textContent = message || '';
    errorMessageDiv.style.display = message ? 'block' : 'none';
    if (message) showLoading(false); // Hide loading if error occurs
}

// --- Initialization ---
async function initApp() {
    console.log("Initializing App...");
    // Get DOM elements
    mapHost = document.getElementById("map3d-host");
    stravaConnectButton = document.getElementById('strava-connect-button');
    stravaAuthDiv = document.getElementById('strava_auth');
    loadingIndicator = document.getElementById('loading-indicator');
    loadingText = document.getElementById('loading-text');
    errorMessageDiv = document.getElementById('error-message');
    statsContainer = document.getElementById('activity-stats');
    activityNameEl = document.getElementById('activity-name');
    activityDistEl = document.getElementById('activity-distance');
    activityTimeEl = document.getElementById('activity-time');
    activityElevEl = document.getElementById('activity-elevation');
    activityAvgSpeedEl = document.getElementById('activity-avg-speed');
    activityMaxSpeedEl = document.getElementById('activity-max-speed');
    activityTotalLossEl = document.getElementById('activity-total-loss');
    activityFilterDiv = document.getElementById('activity-filter');
    startDateInput = document.getElementById('start-date');
    endDateInput = document.getElementById('end-date');
    activityCountInput = document.getElementById('activity-count');
    fetchFilteredButton = document.getElementById('fetch-filtered-activities');
    footerAthleteInfo = document.getElementById('footer-athlete-info');
    footerProfileImg = document.getElementById('footer-strava_profile');
    footerProfileName = document.getElementById('footer-strava-username');
    logoutButton = document.getElementById('logout-button');
    cameraStatusEl = document.getElementById('camera-status');
    fitRouteButton = document.getElementById('fit-route-button');
    flyStartButton = document.getElementById('fly-start-button');
    flyFinishButton = document.getElementById('fly-finish-button');
    orbitRouteButton = document.getElementById('orbit-route-button');

    // Tour player controls
    tourScrubber = document.getElementById('tour-scrubber');
    tourPlayBtn = document.getElementById('tour-play-btn');
    tourStopBtn = document.getElementById('tour-stop-btn');
    playIcon = document.getElementById('play-icon');
    pauseIcon = document.getElementById('pause-icon');
    tourDistanceElapsed = document.getElementById('tour-distance-elapsed');
    tourDistanceTotal = document.getElementById('tour-distance-total');

    // Settings sliders
    followCameraSpeedSlider = document.getElementById('follow-camera-speed-slider');
    followCameraSpeedValue = document.getElementById('follow-camera-speed-value');
    tourHeightSlider = document.getElementById('tour-height-slider');
    tourHeightValue = document.getElementById('tour-height-value');
    tourRangeSlider = document.getElementById('tour-range-slider');
    tourRangeValue = document.getElementById('tour-range-value');
    tourSmoothnessSlider = document.getElementById('tour-smoothness-slider');
    tourSmoothnessValue = document.getElementById('tour-smoothness-value');

    // Elevation Profile DOM
    elevationProfileContainer = document.getElementById('elevation-profile-container');
    elevationPlaceholder = document.getElementById('elevation-placeholder');
    elevationSvg = document.getElementById('elevation-svg');
    elevationAreaPath = document.getElementById('elevation-area');
    elevationLinePath = document.getElementById('elevation-line');
    elevationHoverLine = document.getElementById('elevation-hover-line');
    elevationProgressLine = document.getElementById('elevation-progress-line');
    elevationHoverDot = document.getElementById('elevation-hover-dot');
    elevationTooltip = document.getElementById('elevation-tooltip');

    if (!mapHost || !activityFilterDiv || !fetchFilteredButton || !footerAthleteInfo || !logoutButton || !stravaConnectButton || !stravaAuthDiv || !activityTotalLossEl || !fitRouteButton || !flyStartButton || !flyFinishButton || !orbitRouteButton || !cameraStatusEl || !tourPlayBtn || !tourScrubber || !elevationProfileContainer) {
        showError("Essential HTML elements are missing. Cannot initialize.");
        return;
    }

    // Pass helper functions to modules
    const helpers = { showLoading, showError };
    strava.setHelpers(helpers);
    gmp.setHelpers(helpers);

    // Set initial date inputs for filters
    setInitialDateInputs();

    // Initialize Tour Player listeners & callbacks
    initTourPlayer();

    // Initialize Elevation Profile hover events
    initElevationHover();

    try {
        // Initialize Google Maps Platform
        await gmp.initMap(mapHost, import.meta.env.VITE_GMP_API_KEY);

        // --- Strava Auth Flow ---
        const urlParams = new URLSearchParams(window.location.search);
        const temp_token = urlParams.get('code');

        if (temp_token) {
            // Clear the code from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            const authData = await strava.exchangeToken(temp_token);
            handleSuccessfulAuth(authData);
        } else {
            // Show auth button and set up dynamic link if no code present
            stravaAuthDiv.style.display = 'flex'; // Use flex to maintain centering
            const authUrl = strava.getStravaAuthUrl();
            if (authUrl) {
                stravaConnectButton.addEventListener('click', () => {
                    showLoading(true, "Redirecting to Strava...");
                    window.location.href = authUrl;
                });
            } else {
                 console.error("Could not get Strava Auth URL."); // Error already shown by strava.js
            }
            showLoading(false); // Hide loading if waiting for auth
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        // Error should have been shown by the module that failed (gmp.initMap or strava.exchangeToken)
        showLoading(false);
    }


    fitRouteButton.addEventListener('click', () => runCameraAction('Framing route...', () => gmp.frameRoute(currentRouteCoords)));
    flyStartButton.addEventListener('click', () => runCameraAction('Flying to route start...', () => gmp.flyToRoutePoint(currentRouteCoords, 'start')));
    flyFinishButton.addEventListener('click', () => runCameraAction('Flying to route finish...', () => gmp.flyToRoutePoint(currentRouteCoords, 'finish')));
    orbitRouteButton.addEventListener('click', () => runCameraAction('Orbiting current 3D view...', () => gmp.orbitCurrentView(getReducedMotionPreference() ? 2500 : 9000)));
}

function setCameraControlsEnabled(isEnabled) {
    [fitRouteButton, flyStartButton, flyFinishButton, orbitRouteButton, tourPlayBtn, tourStopBtn, tourScrubber].forEach((el) => {
        if (el) {
            el.disabled = !isEnabled;
            if (isEnabled) {
                el.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                el.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    });

    if (!isEnabled) {
        if (tourStopBtn) {
            tourStopBtn.disabled = true;
            tourStopBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

// --- Authentication Handling ---
function handleSuccessfulAuth(authData) {
    if (!authData || !authData.access_token) {
        showError("Strava authentication succeeded but no access token was received.");
        console.error("Invalid authData received:", authData);
        return;
    }

    stravaAuthDiv.style.display = "none";

    // Update footer profile info
    if (footerProfileImg) footerProfileImg.src = authData.athlete.profile_medium;
    if (footerProfileName) footerProfileName.textContent = `${authData.athlete.firstname} ${authData.athlete.lastname}`;
    if (footerAthleteInfo) footerAthleteInfo.classList.remove('hidden');

    // Show the filter section
    if (activityFilterDiv) activityFilterDiv.classList.remove('hidden');

    // Add listener to the fetch button
    if (fetchFilteredButton) {
        fetchFilteredButton.addEventListener('click', handleFetchFilteredActivities);
    } else {
         console.error("Fetch filtered activities button not found.");
    }

    // Add listener for logout button and make it visible
    if (logoutButton) {
        logoutButton.classList.remove('hidden');
        logoutButton.addEventListener('click', handleLogout);
    } else {
        console.error("Logout button not found.");
    }

    // Trigger initial fetch with default filters
    handleFetchFilteredActivities();
}



function updateCameraStatus(message) {
    if (cameraStatusEl) cameraStatusEl.textContent = message;
}

function getReducedMotionPreference() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

async function runCameraAction(status, action) {
    if (!currentRouteCoords) {
        showError('Load an activity route before using camera controls.');
        return;
    }
    updateCameraStatus(status);
    stopFollowCamera();
    await action();
    updateCameraStatus('Camera synced to the selected activity.');
}

function handleLogout() {
    console.log("Logging out...");
    strava.clearStravaToken(); // Clear token in the strava module
    // Hide footer info and logout button immediately
    if (footerAthleteInfo) footerAthleteInfo.classList.add('hidden');
    if (logoutButton) logoutButton.classList.add('hidden');
    // Reload page to show auth button and clear state
    window.location.href = window.location.pathname;
}


// --- Activity Fetching and Filtering ---
async function handleFetchFilteredActivities() {
    const token = strava.getStravaToken();
    if (!token) {
        showError("Not authenticated with Strava.");
        return;
    }
    if (!startDateInput || !endDateInput || !activityCountInput) {
         showError("Filter input elements not found.");
         return;
    }

    const startDate = startDateInput.value; // YYYY-MM-DD
    const endDate = endDateInput.value;     // YYYY-MM-DD
    const count = parseInt(activityCountInput.value, 10) || 30;

    // Convert dates to Unix timestamps (seconds)
    let beforeTimestamp = null;
    if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        beforeTimestamp = Math.floor(endOfDay.getTime() / 1000);
    }

    let afterTimestamp = null;
    if (startDate) {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        afterTimestamp = Math.floor(startOfDay.getTime() / 1000);
    }

    try {
        const activities = await strava.fetchActivities(token, beforeTimestamp, afterTimestamp, count);
        handleActivitiesResponse(activities);
    } catch (error) {
        // Error should have been shown by strava.fetchActivities
        console.error("Failed to fetch or handle activities:", error);
    }
}

// --- Activity List Handling ---
function handleActivitiesResponse(activities) {
    const actSelectContainer = document.getElementById("act_select");
    selectList = document.getElementById("select_lst"); // Assign to module var
    if (!selectList || !actSelectContainer) {
        showError("Activity selection UI elements not found.");
        return;
    }

    // Filter to only include activities that have GPS data (a summary polyline)
    const gpsActivities = (activities || []).filter(activity => activity.map && activity.map.summary_polyline);

    if (gpsActivities.length === 0) {
        console.log("No GPS-recorded activities found for the selected filters.");
        showError("No GPS-recorded activities found. Manual and indoor activities cannot be explored in 3D.");
        selectList.innerHTML = '<option disabled selected>No GPS activities found</option>';
        actSelectContainer.classList.remove('hidden'); // Show the (empty) dropdown
        clearActivityDisplay();
        return;
    }

    actSelectContainer.classList.remove('hidden');
    selectList.innerHTML = ''; // Clear previous options

    let defaultOption = document.createElement('option');
    defaultOption.textContent = 'Select an Activity...';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectList.appendChild(defaultOption);

    gpsActivities.forEach((activity) => {
        let option = document.createElement('option');
        option.textContent = activity.name;
        option.value = activity.id;
        selectList.appendChild(option);
    });

    // Add event listener (replace previous if any)
    selectList.onchange = handleActivitySelectionChange;

    // Add a visual cue
    if (selectList && gpsActivities.length > 0) {
        selectList.focus();
        const selectLabel = document.querySelector('label[for="select_lst"]');
        if (selectLabel) {
            const originalText = selectLabel.textContent;
            selectLabel.textContent = "Select an Activity to View!";
            selectLabel.classList.add('text-indigo-600', 'font-semibold');
            setTimeout(() => {
                selectLabel.textContent = originalText;
                selectLabel.classList.remove('text-indigo-600', 'font-semibold');
            }, 3000);
        }
    }

    // Auto-select and trigger the first activity
    if (selectList.options.length > 1) {
        selectList.selectedIndex = 1;
        handleActivitySelectionChange({ target: selectList }); // Simulate event
        console.log(`Auto-selected first activity: ${selectList.options[1].textContent}`);
    } else {
        // If only the placeholder exists, clear any previous display
        clearActivityDisplay();
    }
}

function handleActivitySelectionChange(event) {
    const selectedOption = event.target.options[event.target.selectedIndex];
    const activityId = selectedOption.value;

    if (activityId && activityId !== 'Select an Activity...') {
         clearActivityDisplay(); // Clear map and stats before fetching new
         fetchAndDisplayDetailedActivity(activityId);
    }
}

// --- Detailed Activity Display ---
function clearActivityDisplay() {
    console.log("Clearing previous activity display (map elements, stats)...");
    // Clear map elements using GMP module functions and direct followCamera import
    stopFollowCamera(); // Stop any active animation (Use direct import)
    clearTourRoute(); // Clear the loaded tour coordinates
    gmp.removePreviousPolyline();
    gmp.clearPhotoMarkers();
    gmp.updateTrackingMarker(null); // Clear tracking marker
    currentRouteCoords = null; // Clear stored coordinates
    setCameraControlsEnabled(false);
    updateCameraStatus('Load an activity to sync the 3D camera, route, markers, and elevation.');

    // Clear UI stats
    if (statsContainer) statsContainer.classList.add('hidden');
    if (activityNameEl) activityNameEl.textContent = '';
    if (activityDistEl) activityDistEl.textContent = '';
    if (activityTimeEl) activityTimeEl.textContent = '';
    if (activityElevEl) activityElevEl.textContent = '';
    if (activityAvgSpeedEl) activityAvgSpeedEl.textContent = '';
    if (activityMaxSpeedEl) activityMaxSpeedEl.textContent = '';
    if (activityTotalLossEl) activityTotalLossEl.textContent = ''; // Added

    // Clear elevation widget
    currentActivityElevations = [];
    showElevationPlaceholder("No activity loaded");
    if (tourDistanceElapsed) tourDistanceElapsed.textContent = '0.0 mi';
    if (tourDistanceTotal) tourDistanceTotal.textContent = '0.0 mi';
    if (tourScrubber) {
        tourScrubber.value = 0;
        tourScrubber.disabled = true;
    }
    currentActivityId = null;
}


async function fetchAndDisplayDetailedActivity(activityId) {
    const token = strava.getStravaToken();
    if (!token) {
        showError("Cannot fetch details, not authenticated.");
        return;
    }
    if (!activityId) {
        showError("Cannot fetch details, no Activity ID provided.");
        return;
    }
    currentActivityId = activityId; // Store the ID of the activity being displayed

    try {
        const detailedActivityData = await strava.fetchDetailedActivityData(activityId, token);
        // Fetch streams: altitude, distance, and latlng for precise route alignment
        let altitudeStream = null;
        let distanceStream = null;
        let latlngStream = null;
        try {
            const streams = await strava.fetchActivityStreams(activityId, token, ['altitude', 'distance', 'latlng']);
            if (streams) {
                altitudeStream = streams.altitude;
                distanceStream = streams.distance;
                latlngStream = streams.latlng;
            }
        } catch (streamError) {
            console.error(`Failed to fetch streams for activity ${activityId}:`, streamError);
        }
        await displayDetailedActivity(detailedActivityData, { altitudeStream, distanceStream, latlngStream });
    } catch (error) {
        console.error(`Failed to fetch or display detailed activity ${activityId}:`, error);
    }
}

async function displayDetailedActivity(activityData, streams) {
    const { altitudeStream, distanceStream, latlngStream } = streams || {};
    console.log(`[displayDetailedActivity] Called with data for activity ID: ${activityData?.id}`);
    if (!activityData?.map?.polyline) {
        showError("Detailed activity data is missing map polyline.");
        console.error("Missing polyline:", activityData);
        return;
    }
    // Use loose inequality (!=) to handle type difference (number vs string)
    if (activityData.id != currentActivityId) {
        console.warn(`[displayDetailedActivity] Stale data received for ${activityData.id}, expected ${currentActivityId}. Ignoring.`);
        return; // Avoid race condition where an old request finishes after a new one started
    }

    showLoading(true, "Processing activity route...");

    // --- Polyline and Camera ---
    const decodedPathLatLng = gmp.decodePolyline(activityData.map.polyline);
    if (decodedPathLatLng.length > 0) {
        // Assign altitude from streams if available to avoid redundant elevation service calls
        if (altitudeStream?.data && latlngStream?.data) {
            const altData = altitudeStream.data;
            const llData = latlngStream.data;
            const streamLen = Math.min(altData.length, llData.length);
            
            if (streamLen > 0) {
                let streamIdx = 0;
                for (let i = 0; i < decodedPathLatLng.length; i++) {
                    const pt = decodedPathLatLng[i];
                    const lat = pt.lat();
                    const lng = pt.lng();
                    
                    let bestIdx = streamIdx;
                    let minDiff = Math.abs(llData[streamIdx][0] - lat) + Math.abs(llData[streamIdx][1] - lng);
                    
                    const lookAhead = Math.min(streamLen, streamIdx + 50);
                    for (let j = streamIdx + 1; j < lookAhead; j++) {
                        const diff = Math.abs(llData[j][0] - lat) + Math.abs(llData[j][1] - lng);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestIdx = j;
                        }
                    }
                    streamIdx = bestIdx;
                    pt.altitude = altData[streamIdx];
                }
            }
        }

        gmp.displayPolyline(decodedPathLatLng); // Display on map

        await gmp.frameRoute(decodedPathLatLng, {
            rangeMultiplier: 1.45,
            tilt: 62,
            duration: getReducedMotionPreference() ? 0 : 1400,
        });
    } else {
        showError("Failed to decode or process activity route.");
        showLoading(false);
        return; // Stop if polyline is bad
    }

    // Store coordinates for toggle use
    currentRouteCoords = decodedPathLatLng;
    setCameraControlsEnabled(true);
    updateCameraStatus('Route loaded. Camera shortcuts, 3D endpoints, photo markers, and follow tour are ready.');

    showLoading(false); // Hide loading after polyline processing and camera flight start

    // --- Update UI Stats (Imperial Units) ---
    updateStatsUI(activityData, altitudeStream); // Pass altitudeStream

    // Update player total distance label
    const kmToMiles = 0.621371;
    const distanceMiles = (activityData.distance / 1000 * kmToMiles).toFixed(2);
    if (tourDistanceTotal) tourDistanceTotal.textContent = `${distanceMiles} mi`;

    // --- Configure Elevation Profile Widget ---
    await configureElevationWidget(decodedPathLatLng, streams); // Pass the LatLng array and streams

    // --- Load Tour Route for Follow Camera ---
    await loadTourRoute(decodedPathLatLng);

    // --- Fetch and Display Photos ---
    const token = strava.getStravaToken();
    if (token) {
        try {
            const photosData = await strava.fetchPhotoData(activityData.id, token);
            // Use loose equality (==) to handle type difference (number vs string)
            if (activityData.id == currentActivityId) { // Check again before displaying photos
                 await gmp.displayPhotoMarkers(photosData);
            } else {
                 console.warn(`[displayDetailedActivity] Stale photo data received for ${activityData.id}, expected ${currentActivityId}. Ignoring.`);
            }
        } catch (photoError) {
            console.error("Failed to fetch or display photos:", photoError);
            // Don't necessarily stop the whole process, just log the error
        }
    }
}

// Helper function to calculate total elevation loss from altitude stream data
function calculateElevationLossFromStream(altitudeData) {
    if (!altitudeData || altitudeData.length < 2) {
        return 0;
    }
    let totalLoss = 0;
    for (let i = 1; i < altitudeData.length; i++) {
        const diff = altitudeData[i] - altitudeData[i-1];
        if (diff < 0) {
            totalLoss -= diff; // Add the absolute difference for loss
        }
    }
    return totalLoss;
}

function updateStatsUI(activityData, altitudeStream) { // Added altitudeStream parameter
    const metersToFeet = 3.28084;
    const kmToMiles = 0.621371;
    const mpsToMph = 2.23694;

    const distanceMiles = (activityData.distance / 1000 * kmToMiles).toFixed(2);
    const movingTimeSeconds = activityData.moving_time;
    const elevationGainFeet = (activityData.total_elevation_gain * metersToFeet).toFixed(0) || 'N/A';
    const avgSpeedMps = activityData.average_speed || 0;
    const maxSpeedMps = activityData.max_speed || 0;
    const avgSpeedMph = (avgSpeedMps * mpsToMph).toFixed(1);
    const maxSpeedMph = (maxSpeedMps * mpsToMph).toFixed(1);

    const hours = Math.floor(movingTimeSeconds / 3600);
    const minutes = Math.floor((movingTimeSeconds % 3600) / 60);
    const seconds = movingTimeSeconds % 60;
    const movingTimeFormatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let totalLossFeet = 'N/A';
    if (altitudeStream && altitudeStream.data) {
        const calculatedLossMeters = calculateElevationLossFromStream(altitudeStream.data);
        totalLossFeet = (calculatedLossMeters * metersToFeet).toFixed(0);
    }

    if (activityNameEl) activityNameEl.textContent = activityData.name || 'Unnamed Activity';
    if (activityDistEl) activityDistEl.textContent = `${distanceMiles} mi`;
    if (activityTimeEl) activityTimeEl.textContent = movingTimeFormatted;
    if (activityElevEl) activityElevEl.textContent = `${elevationGainFeet} ft`;
    if (activityAvgSpeedEl) activityAvgSpeedEl.textContent = `${avgSpeedMph} mph`;
    if (activityMaxSpeedEl) activityMaxSpeedEl.textContent = `${maxSpeedMph} mph`;
    if (activityTotalLossEl) activityTotalLossEl.textContent = `${totalLossFeet} ft`; // Added
    if (statsContainer) statsContainer.classList.remove('hidden');
    console.log("[updateStatsUI] UI stats updated.");
}

async function configureElevationWidget(decodedPathLatLng, streams) {
    if (!elevationProfileContainer) return;
    
    // Clear previous
    showElevationPlaceholder("Loading elevation profile...");
    
    let chartPoints = []; // Array of { distanceKm, elevationM, lat, lng }
    const { altitudeStream, distanceStream, latlngStream } = streams || {};
    
    if (altitudeStream?.data && distanceStream?.data && latlngStream?.data) {
        const altData = altitudeStream.data;
        const distData = distanceStream.data;
        const llData = latlngStream.data;
        const length = Math.min(altData.length, distData.length, llData.length);
        
        // Downsample streams for rendering performance
        const targetCount = 300;
        const step = Math.max(1, Math.ceil(length / targetCount));
        
        for (let i = 0; i < length; i += step) {
            chartPoints.push({
                distanceKm: distData[i] / 1000,
                elevationM: altData[i],
                lat: llData[i][0],
                lng: llData[i][1]
            });
        }
        if (length > 0 && (length - 1) % step !== 0) {
            chartPoints.push({
                distanceKm: distData[length - 1] / 1000,
                elevationM: altData[length - 1],
                lat: llData[length - 1][0],
                lng: llData[length - 1][1]
            });
        }
    } else {
        // Fallback: Query Google Maps Elevation Service
        console.log("Strava streams missing. Querying Google Maps Elevation API...");
        const maxPoints = 200;
        const downsampledPath = gmp.downsamplePath(decodedPathLatLng, maxPoints);
        
        if (downsampledPath && downsampledPath.length > 0) {
            try {
                const elevations = await gmp.getElevationsForPoints(downsampledPath);
                
                let accumDistKm = 0;
                chartPoints.push({
                    distanceKm: 0,
                    elevationM: elevations[0],
                    lat: downsampledPath[0].lat(),
                    lng: downsampledPath[0].lng()
                });
                
                for (let i = 1; i < downsampledPath.length; i++) {
                    const d = calculateHaversineDistance(
                        downsampledPath[i-1].lat(), downsampledPath[i-1].lng(),
                        downsampledPath[i].lat(), downsampledPath[i].lng()
                    );
                    accumDistKm += d;
                    chartPoints.push({
                        distanceKm: accumDistKm,
                        elevationM: elevations[i],
                        lat: downsampledPath[i].lat(),
                        lng: downsampledPath[i].lng()
                    });
                }
            } catch (err) {
                console.error("Fallback elevation query failed:", err);
            }
        }
    }
    
    if (chartPoints.length < 2) {
        showElevationPlaceholder("Could not load elevation profile");
        return;
    }
    
    currentActivityElevations = chartPoints;
    drawElevationSVG(chartPoints);
}

function drawElevationSVG(points) {
    if (!elevationSvg || !elevationLinePath || !elevationAreaPath) return;

    const metersToFeet = 3.28084;
    const kmToMiles = 0.621371;

    const elevationsFeet = points.map(p => p.elevationM * metersToFeet);
    const distancesMiles = points.map(p => p.distanceKm * kmToMiles);

    const minElev = Math.min(...elevationsFeet);
    const maxElev = Math.max(...elevationsFeet);
    const totalDist = distancesMiles[distancesMiles.length - 1];

    const elevRange = maxElev - minElev;
    const elevPadding = elevRange * 0.1 || 10;
    const yMin = Math.max(0, minElev - elevPadding);
    const yMax = maxElev + elevPadding;

    const svgWidth = 1000;
    const svgHeight = 100;

    let linePathData = '';
    let areaPathData = '';

    points.forEach((p, idx) => {
        const xPercent = totalDist > 0 ? (p.distanceKm * kmToMiles) / totalDist : 0;
        const yPercent = (p.elevationM * metersToFeet - yMin) / (yMax - yMin);

        const x = xPercent * svgWidth;
        const y = svgHeight - (yPercent * svgHeight);

        if (idx === 0) {
            linePathData = `M ${x} ${y}`;
            areaPathData = `M ${x} ${svgHeight} L ${x} ${y}`;
        } else {
            linePathData += ` L ${x} ${y}`;
            areaPathData += ` L ${x} ${y}`;
        }
    });

    areaPathData += ` L ${svgWidth} ${svgHeight} Z`;

    elevationLinePath.setAttribute('d', linePathData);
    elevationAreaPath.setAttribute('d', areaPathData);

    elevationSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    elevationSvg.classList.remove('hidden');
    if (elevationPlaceholder) elevationPlaceholder.classList.add('hidden');
}

function showElevationPlaceholder(text) {
    if (elevationPlaceholder) {
        elevationPlaceholder.textContent = text;
        elevationPlaceholder.classList.remove('hidden');
    }
    if (elevationSvg) elevationSvg.classList.add('hidden');
    if (elevationHoverLine) elevationHoverLine.style.opacity = '0';
    if (elevationHoverDot) elevationHoverDot.style.opacity = '0';
    if (elevationTooltip) elevationTooltip.style.opacity = '0';
    if (elevationProgressLine) elevationProgressLine.style.opacity = '0';
}

function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function initElevationHover() {
    if (!elevationProfileContainer) return;

    elevationProfileContainer.addEventListener('mousemove', (e) => {
        if (!currentActivityElevations || currentActivityElevations.length < 2) return;

        const rect = elevationProfileContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mousePercent = Math.max(0, Math.min(1, mouseX / rect.width));

        const metersToFeet = 3.28084;
        const kmToMiles = 0.621371;

        const totalDistKm = currentActivityElevations[currentActivityElevations.length - 1].distanceKm;
        const targetDistKm = mousePercent * totalDistKm;

        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < currentActivityElevations.length; i++) {
            const diff = Math.abs(currentActivityElevations[i].distanceKm - targetDistKm);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        const point = currentActivityElevations[closestIdx];
        const pointDistMiles = point.distanceKm * kmToMiles;
        const pointElevFeet = point.elevationM * metersToFeet;

        const xPos = mousePercent * rect.width;
        if (elevationHoverLine) {
            elevationHoverLine.style.left = `${xPos}px`;
            elevationHoverLine.style.opacity = '1';
        }

        const elevationsFeet = currentActivityElevations.map(p => p.elevationM * metersToFeet);
        const minElev = Math.min(...elevationsFeet);
        const maxElev = Math.max(...elevationsFeet);
        const elevRange = maxElev - minElev;
        const elevPadding = elevRange * 0.1 || 10;
        const yMin = Math.max(0, minElev - elevPadding);
        const yMax = maxElev + elevPadding;

        const yPercent = (pointElevFeet - yMin) / (yMax - yMin);
        const yPos = rect.height - (yPercent * rect.height);

        if (elevationHoverDot) {
            elevationHoverDot.style.left = `${xPos}px`;
            elevationHoverDot.style.top = `${yPos}px`;
            elevationHoverDot.style.opacity = '1';
        }

        if (elevationTooltip) {
            elevationTooltip.innerHTML = `<strong>Dist:</strong> ${pointDistMiles.toFixed(2)} mi<br><strong>Elev:</strong> ${pointElevFeet.toFixed(0)} ft`;
            elevationTooltip.style.opacity = '1';
            
            const tooltipRect = elevationTooltip.getBoundingClientRect();
            let tooltipX = xPos + 10;
            if (tooltipX + tooltipRect.width > rect.width) {
                tooltipX = xPos - tooltipRect.width - 10;
            }
            let tooltipY = yPos - tooltipRect.height - 10;
            if (tooltipY < 0) {
                tooltipY = yPos + 10;
            }
            elevationTooltip.style.left = `${tooltipX}px`;
            elevationTooltip.style.top = `${tooltipY}px`;
        }

        gmp.updateTrackingMarker({ lat: point.lat, lng: point.lng, altitude: point.elevationM });
    });

    elevationProfileContainer.addEventListener('mouseleave', () => {
        if (elevationHoverLine) elevationHoverLine.style.opacity = '0';
        if (elevationHoverDot) elevationHoverDot.style.opacity = '0';
        if (elevationTooltip) elevationTooltip.style.opacity = '0';
        gmp.updateTrackingMarker(null);
    });
    
    elevationProfileContainer.addEventListener('click', (e) => {
        if (!currentActivityElevations || currentActivityElevations.length < 2) return;
        
        const rect = elevationProfileContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, mouseX / rect.width));
        
        setFollowCameraProgress(progress);
        if (tourScrubber) {
            tourScrubber.value = Math.round(progress * 1000);
        }
    });
}

function initTourPlayer() {
    registerTourCallbacks(
        (progress, distanceElapsedKm) => {
            const kmToMiles = 0.621371;
            const distanceElapsedMiles = distanceElapsedKm * kmToMiles;
            
            if (tourScrubber) {
                tourScrubber.value = Math.round(progress * 1000);
            }
            if (tourDistanceElapsed) {
                tourDistanceElapsed.textContent = `${distanceElapsedMiles.toFixed(2)} mi`;
            }
            if (elevationProgressLine && elevationProfileContainer) {
                const rect = elevationProfileContainer.getBoundingClientRect();
                const xPos = progress * rect.width;
                elevationProgressLine.style.left = `${xPos}px`;
                elevationProgressLine.style.opacity = '1';
            }
        },
        (state) => {
            console.log(`Tour state changed: ${state}`);
            if (state === 'playing') {
                if (playIcon) playIcon.classList.add('hidden');
                if (pauseIcon) pauseIcon.classList.remove('hidden');
                if (tourStopBtn) tourStopBtn.disabled = false;
            } else if (state === 'paused') {
                if (playIcon) playIcon.classList.remove('hidden');
                if (pauseIcon) pauseIcon.classList.add('hidden');
                if (tourStopBtn) tourStopBtn.disabled = false;
            } else if (state === 'stopped') {
                if (playIcon) playIcon.classList.remove('hidden');
                if (pauseIcon) pauseIcon.classList.add('hidden');
                if (tourStopBtn) tourStopBtn.disabled = true;
                if (elevationProgressLine) elevationProgressLine.style.opacity = '0';
            }
        }
    );

    if (tourScrubber) {
        tourScrubber.addEventListener('input', (e) => {
            const progress = parseInt(e.target.value) / 1000;
            setFollowCameraProgress(progress);
        });
    }

    if (tourPlayBtn) {
        tourPlayBtn.addEventListener('click', () => {
            const state = getTourState();
            if (state.active) {
                pauseFollowCamera();
            } else {
                playFollowCamera(currentRouteCoords);
            }
        });
    }

    if (tourStopBtn) {
        tourStopBtn.addEventListener('click', () => {
            stopFollowCamera();
        });
    }

    if (followCameraSpeedSlider) {
        followCameraSpeedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (followCameraSpeedValue) followCameraSpeedValue.textContent = `${val.toFixed(1)}x`;
            setFollowCameraSpeed(val);
        });
    }

    if (tourHeightSlider) {
        tourHeightSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (tourHeightValue) tourHeightValue.textContent = `${val}m`;
            setTourSettings({ height: val });
        });
    }

    if (tourRangeSlider) {
        tourRangeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (tourRangeValue) tourRangeValue.textContent = `${val}m`;
            setTourSettings({ range: val });
        });
    }

    if (tourSmoothnessSlider) {
        tourSmoothnessSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (tourSmoothnessValue) tourSmoothnessValue.textContent = val.toFixed(2);
            setTourSettings({ smoothness: val });
        });
    }
}

function setInitialDateInputs() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set to tomorrow

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (startDateInput) startDateInput.value = formatDate(ninetyDaysAgo);
    if (endDateInput) endDateInput.value = formatDate(tomorrow); // Changed from today to tomorrow
}

// --- Start Application ---
initApp();
