import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import './styles.css';

const API_KEY = import.meta.env.VITE_GMP_API_KEY;
const RING_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
const DEFAULT_ORIGIN = { lat: 37.7749, lng: -122.4194 };
const REGENERATE_DEBOUNCE_MS = 350;

const SCENARIOS = {
  delivery: { mode: 'DRIVE', direction: 'FROM', maxMinutes: 30, label: 'delivery radius' },
  commute: { mode: 'DRIVE', direction: 'TO', maxMinutes: 45, label: 'commute catchment' },
  response: { mode: 'DRIVE', direction: 'FROM', maxMinutes: 20, label: 'response coverage' },
};

const state = {
  map: null,
  origin: { ...DEFAULT_ORIGIN },
  originName: '',
  marker: null,
  rings: [], // { minutes, color, polygons, squareKm }
  selectedMinutes: null,
  activeScenario: 'delivery',
  generation: 0, // increments to invalidate in-flight generations
  debounceTimer: null,
};

const elements = {
  map: document.querySelector('#map'),
  status: document.querySelector('#status'),
  stats: document.querySelector('#stats'),
  originLabel: document.querySelector('#origin-label'),
  searchSlot: document.querySelector('#search-slot'),
  modeSelect: document.querySelector('#mode-select'),
  directionSelect: document.querySelector('#direction-select'),
  routingSelect: document.querySelector('#routing-select'),
  durationInput: document.querySelector('#duration-input'),
  durationLabel: document.querySelector('#duration-label'),
  smoothInput: document.querySelector('#smooth-input'),
};

function setStatus(message, tone = 'neutral') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function minutesToDurations(maxMinutes) {
  // Four evenly spaced bands ending at maxMinutes, e.g. 30 -> [7.5→8, 15, 23, 30].
  const bands = 4;
  const durations = [];
  for (let step = 1; step <= bands; step += 1) {
    const minutes = Math.round((maxMinutes * step) / bands);
    if (!durations.includes(minutes) && minutes > 0) durations.push(minutes);
  }
  return durations;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function getPolygons(geoJson) {
  const geometry = geoJson.type === 'Feature' ? geoJson.geometry : geoJson;
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function getGeoJsonBounds(geoJson) {
  const coordinates = getPolygons(geoJson).flat(2);
  return coordinates.reduce(
    ([west, south, east, north], [lng, lat]) => [
      Math.min(west, lng),
      Math.min(south, lat),
      Math.max(east, lng),
      Math.max(north, lat),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

function ringAreaSquareMeters(ring) {
  if (ring.length < 3) return 0;
  const earthRadiusMeters = 6_378_137;
  const radians = Math.PI / 180;
  let total = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[(index + 1) % ring.length];
    total += (lng2 - lng1) * radians * (2 + Math.sin(lat1 * radians) + Math.sin(lat2 * radians));
  }
  return Math.abs((total * earthRadiusMeters * earthRadiusMeters) / 2);
}

function approximateGeoJsonAreaSquareKm(geoJson) {
  const polygons = getPolygons(geoJson);
  const squareMeters = polygons.reduce((total, rings) => {
    const [outerRing, ...holes] = rings;
    const holesArea = holes.reduce((holeTotal, ring) => holeTotal + ringAreaSquareMeters(ring), 0);
    return total + Math.max(0, ringAreaSquareMeters(outerRing) - holesArea);
  }, 0);
  return squareMeters / 1_000_000;
}

function geoJsonToPaths(geoJson) {
  return getPolygons(geoJson).map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))));
}

function fitGeoJson(geoJson) {
  const [west, south, east, north] = getGeoJsonBounds(geoJson);
  const bounds = new google.maps.LatLngBounds({ lat: south, lng: west }, { lat: north, lng: east });
  const desktop = window.matchMedia('(min-width: 861px)').matches;
  state.map.fitBounds(bounds, desktop
    ? { top: 60, right: 60, bottom: 60, left: 60 }
    : { top: 40, right: 40, bottom: 40, left: 40 });
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function requestIsochrone(minutes) {
  const body = {
    travelDuration: `${minutes * 60}s`,
    travelMode: elements.modeSelect.value,
    travelDirection: elements.directionSelect.value,
    routingPreference: elements.routingSelect.value,
    enableSmoothing: elements.smoothInput.checked,
    polygonFidelity: 'MEDIUM',
    location: {
      latitude: state.origin.lat,
      longitude: state.origin.lng,
    },
  };

  // Absolute path: this app is mounted at /isochrones/ inside the gateway
  // container, so a relative 'api/isochrones' would resolve under that
  // prefix instead of the gateway's top-level /api/isochrones route.
  const response = await fetch('/api/isochrones', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || payload.error || 'Isochrone request failed.');
  return payload.isochrone.geoJson;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function clearRings() {
  state.rings.forEach(({ polygons }) => polygons.forEach((polygon) => polygon.setMap(null)));
  state.rings = [];
  state.selectedMinutes = null;
}

function highlightRing(minutes) {
  state.selectedMinutes = minutes;
  state.rings.forEach((ring) => {
    const selected = ring.minutes === minutes;
    ring.polygons.forEach((polygon) => {
      polygon.setOptions({
        strokeWeight: selected ? 3.5 : 1.75,
        fillOpacity: selected ? 0.3 : 0.16,
      });
    });
  });
  elements.stats.querySelectorAll('.stat').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.minutes) === minutes);
  });
}

function renderStats() {
  if (!state.rings.length) {
    elements.stats.innerHTML = '<p class="empty">Rings appear here as they generate.</p>';
    return;
  }

  const sorted = [...state.rings].sort((a, b) => a.minutes - b.minutes);
  const rows = sorted.map((ring, index) => {
    const previous = index > 0 ? sorted[index - 1].squareKm : 0;
    const delta = ring.squareKm - previous;
    const selected = state.selectedMinutes === ring.minutes ? ' is-selected' : '';
    return `<button class="stat${selected}" type="button" data-minutes="${ring.minutes}">
      <span class="swatch" style="background:${ring.color}"></span>
      <span class="stat-minutes">${ring.minutes} min</span>
      <span class="stat-area">${ring.squareKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²</span>
      <span class="stat-delta">${index > 0 ? `+${delta.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '&nbsp;'}</span>
    </button>`;
  });

  elements.stats.innerHTML = rows.join('');
  elements.stats.querySelectorAll('.stat').forEach((button) => {
    const minutes = Number(button.dataset.minutes);
    button.addEventListener('click', () => highlightRing(minutes));
    button.addEventListener('mouseenter', () => highlightRing(minutes));
  });
}

function drawRing(geoJson, minutes, color, zIndex) {
  const polygons = geoJsonToPaths(geoJson).map((paths) => {
    const polygon = new google.maps.Polygon({
      paths,
      map: state.map,
      strokeColor: color,
      strokeOpacity: 0.95,
      strokeWeight: 1.75,
      fillColor: color,
      fillOpacity: 0.16,
      zIndex,
    });
    polygon.addListener('click', () => highlightRing(minutes));
    return polygon;
  });
  return { minutes, color, polygons, squareKm: approximateGeoJsonAreaSquareKm(geoJson) };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

async function generateIsochrones() {
  if (!state.map) return;
  const generation = ++state.generation;
  clearRings();
  renderStats();

  const durations = minutesToDurations(Number(elements.durationInput.value));
  const scenarioLabel = SCENARIOS[state.activeScenario].label;
  setStatus(`Mapping ${scenarioLabel}… 0/${durations.length}`);

  let completed = 0;
  try {
    // All bands fire in parallel; each draws the moment it lands.
    const results = await Promise.all(durations.map(async (minutes, index) => {
      const geoJson = await requestIsochrone(minutes);
      if (generation !== state.generation) return null;
      completed += 1;
      setStatus(`Mapping ${scenarioLabel}… ${completed}/${durations.length}`);
      const ring = drawRing(geoJson, minutes, RING_COLORS[index % RING_COLORS.length], durations.length - index);
      state.rings.push(ring);
      renderStats();
      return geoJson;
    }));

    if (generation !== state.generation) return;
    const largest = results.filter(Boolean).at(-1);
    if (largest) fitGeoJson(largest);
    highlightRing(durations.at(-1));
    setStatus('Hover a band to compare. Drag the pin or click the map to move the origin.', 'success');
  } catch (error) {
    if (generation !== state.generation) return;
    setStatus(error.message, 'error');
    renderStats();
  }
}

function scheduleGenerate() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(generateIsochrones, REGENERATE_DEBOUNCE_MS);
}

function setOrigin(latLng, name = '') {
  state.origin = latLng;
  state.originName = name;
  elements.originLabel.textContent = name || `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
  if (state.marker) state.marker.position = latLng;
  scheduleGenerate();
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function applyScenario(scenarioKey) {
  const scenario = SCENARIOS[scenarioKey];
  state.activeScenario = scenarioKey;
  elements.modeSelect.value = scenario.mode;
  elements.directionSelect.value = scenario.direction;
  elements.durationInput.value = String(scenario.maxMinutes);
  elements.durationLabel.textContent = String(scenario.maxMinutes);
  document.querySelectorAll('.scenario').forEach((button) => {
    const active = button.dataset.scenario === scenarioKey;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  scheduleGenerate();
}

async function attachPlaceSearch() {
  try {
    const { PlaceAutocompleteElement } = await importLibrary('places');
    const autocomplete = new PlaceAutocompleteElement();
    autocomplete.id = 'place-search';
    elements.searchSlot.append(autocomplete);
    autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['location', 'displayName'] });
      if (!place.location) return;
      const latLng = { lat: place.location.lat(), lng: place.location.lng() };
      state.map.panTo(latLng);
      setOrigin(latLng, place.displayName || '');
    });
  } catch (error) {
    // Search is additive; click/drag still work without the Places API.
    console.warn('Place search unavailable:', error);
    elements.searchSlot.textContent = 'Place search unavailable for this key — click the map instead.';
  }
}

function bindUi() {
  document.querySelectorAll('.scenario').forEach((button) => {
    button.addEventListener('click', () => applyScenario(button.dataset.scenario));
  });
  elements.durationInput.addEventListener('input', () => {
    elements.durationLabel.textContent = elements.durationInput.value;
  });
  elements.durationInput.addEventListener('change', scheduleGenerate);
  elements.modeSelect.addEventListener('change', scheduleGenerate);
  elements.directionSelect.addEventListener('change', scheduleGenerate);
  elements.routingSelect.addEventListener('change', scheduleGenerate);
  elements.smoothInput.addEventListener('change', scheduleGenerate);
  renderStats();
}

async function initMap() {
  if (!API_KEY) {
    setStatus('Set VITE_GMP_API_KEY to load Google Maps and the Isochrones proxy.', 'error');
    return;
  }

  setOptions({ key: API_KEY, v: 'weekly', authReferrerPolicy: 'origin' });
  let Map, AdvancedMarkerElement, PinElement;
  try {
    ({ Map } = await importLibrary('maps'));
    ({ AdvancedMarkerElement, PinElement } = await importLibrary('marker'));
  } catch (error) {
    // Never fail silently: a rejected loader (bad key, blocked referrer,
    // network) should tell the visitor what happened.
    console.error('Google Maps failed to load:', error);
    setStatus('Google Maps failed to load — the API key may be invalid or restricted for this origin.', 'error');
    return;
  }

  state.map = new Map(elements.map, {
    center: state.origin,
    zoom: 11,
    mapId: '556022f677234497',
    colorScheme: 'DARK',
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  // On the 2D weekly channel PinElement is not a DOM node — pass its
  // .element as marker content. (`marker.append(pin)` is the 3D
  // Marker3DInteractiveElement pattern and throws here; it killed init
  // before any interaction handlers were bound.)
  const pin = new PinElement({ background: '#38bdf8', borderColor: '#0c4a6e', glyphColor: '#0c4a6e' });
  state.marker = new AdvancedMarkerElement({
    map: state.map,
    position: state.origin,
    gmpDraggable: true,
    title: 'Isochrone origin (drag me)',
    content: pin.element,
  });
  state.marker.addListener('dragend', ({ latLng }) => {
    setOrigin({ lat: latLng.lat(), lng: latLng.lng() });
  });
  state.map.addListener('click', ({ latLng }) => {
    setOrigin({ lat: latLng.lat(), lng: latLng.lng() });
  });

  attachPlaceSearch();
  elements.originLabel.textContent = 'San Francisco, CA';
  // Draw the default scenario immediately so the first paint shows the
  // product, not an empty map.
  scheduleGenerate();
}

bindUi();
initMap().catch((error) => {
  console.error('Initialization failed:', error);
  setStatus(`Initialization failed: ${error.message}`, 'error');
});
