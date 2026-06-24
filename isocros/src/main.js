import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import './styles.css';

const API_KEY = import.meta.env.VITE_GMP_API_KEY;
const RING_COLORS = ['#00c2ff', '#7c3aed', '#f97316', '#ef4444'];
const DEFAULT_ORIGIN = { lat: 37.7749, lng: -122.4194 };
const SCENARIOS = {
  delivery: { mode: 'DRIVE', direction: 'FROM', maxMinutes: 30, label: 'Delivery promise' },
  commute: { mode: 'DRIVE', direction: 'TO', maxMinutes: 45, label: 'Commute catchment' },
  response: { mode: 'DRIVE', direction: 'FROM', maxMinutes: 20, label: 'Response coverage' },
};

const state = {
  map: null,
  origin: { ...DEFAULT_ORIGIN },
  marker: null,
  polygons: [],
  selectedMinutes: null,
  activeScenario: 'delivery',
};

const elements = {
  map: document.querySelector('#map'),
  status: document.querySelector('#status'),
  stats: document.querySelector('#stats'),
  latInput: document.querySelector('#lat-input'),
  lngInput: document.querySelector('#lng-input'),
  modeSelect: document.querySelector('#mode-select'),
  directionSelect: document.querySelector('#direction-select'),
  routingSelect: document.querySelector('#routing-select'),
  durationInput: document.querySelector('#duration-input'),
  durationLabel: document.querySelector('#duration-label'),
  smoothInput: document.querySelector('#smooth-input'),
  generateButton: document.querySelector('#generate'),
};

function setStatus(message, tone = 'neutral') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function validateCoordinates(lat, lng) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function syncOriginInputs() {
  elements.latInput.value = state.origin.lat.toFixed(5);
  elements.lngInput.value = state.origin.lng.toFixed(5);
}

function minutesToDurations(maxMinutes) {
  const steps = maxMinutes <= 20 ? [5, 10, maxMinutes] : [10, 20, 30, maxMinutes];
  return [...new Set(steps.filter((minutes) => minutes > 0 && minutes <= maxMinutes))];
}

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

  const response = await fetch('/api/isochrone', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || payload.error || 'Isochrone request failed.');
  return payload.isochrone.geoJson;
}


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
  state.map.fitBounds(bounds, { top: 80, right: 80, bottom: 260, left: 420 });
}

function clearPolygons() {
  state.polygons.forEach(({ polygons }) => polygons.forEach((polygon) => polygon.setMap(null)));
  state.polygons = [];
  state.selectedMinutes = null;
}

function selectRing(minutes) {
  state.selectedMinutes = minutes;
  state.polygons.forEach(({ polygons, minutes: ringMinutes }) => {
    polygons.forEach((polygon) => {
      polygon.setOptions({ strokeWeight: ringMinutes === minutes ? 4 : 2, fillOpacity: ringMinutes === minutes ? 0.34 : 0.2 });
    });
  });
  renderStats();
}

function renderStats() {
  if (!state.polygons.length) {
    elements.stats.innerHTML = '<p class="empty">Generate an isochrone set to compare reachable area bands.</p>';
    return;
  }

  const rows = state.polygons.map(({ minutes, squareKm }, index) => {
    const selected = state.selectedMinutes === minutes ? ' is-selected' : '';
    return `<button class="stat${selected}" type="button" data-minutes="${minutes}">
      <span class="swatch" style="background:${RING_COLORS[index % RING_COLORS.length]}"></span>
      <strong>${minutes} min</strong>
      <span>${squareKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²</span>
    </button>`;
  });

  elements.stats.innerHTML = rows.join('');
  elements.stats.querySelectorAll('.stat').forEach((button) => {
    button.addEventListener('click', () => selectRing(Number(button.dataset.minutes)));
  });
}

async function generateIsochrones() {
  clearPolygons();
  const maxMinutes = Number(elements.durationInput.value);
  const durations = minutesToDurations(maxMinutes);
  elements.generateButton.disabled = true;
  setStatus(`Generating ${durations.length} ${SCENARIOS[state.activeScenario].label.toLowerCase()} rings…`);

  try {
    for (const [index, minutes] of durations.entries()) {
      const geoJson = await requestIsochrone(minutes);
      const polygons = geoJsonToPaths(geoJson).map((paths) => {
        const polygon = new google.maps.Polygon({
          paths,
          map: state.map,
          strokeColor: RING_COLORS[index % RING_COLORS.length],
          strokeOpacity: 0.95,
          strokeWeight: 2,
          fillColor: RING_COLORS[index % RING_COLORS.length],
          fillOpacity: 0.2,
          zIndex: durations.length - index,
        });
        polygon.addListener('click', () => selectRing(minutes));
        return polygon;
      });
      state.polygons.push({ polygons, minutes, squareKm: approximateGeoJsonAreaSquareKm(geoJson), geoJson });
      fitGeoJson(geoJson);
      renderStats();
    }
    selectRing(durations.at(-1));
    setStatus('Isochrones ready. Select a ring for drill-down.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
    renderStats();
  } finally {
    elements.generateButton.disabled = false;
  }
}

async function initMap() {
  if (!API_KEY) {
    setStatus('Set VITE_GMP_API_KEY to load Google Maps and the Isochrones proxy.', 'error');
    return;
  }

  setOptions({ key: API_KEY, v: 'weekly', authReferrerPolicy: 'origin' });
  const { Map } = await importLibrary('maps');
  const { AdvancedMarkerElement, PinElement } = await importLibrary('marker');

  state.map = new Map(elements.map, {
    center: state.origin,
    zoom: 11,
    mapId: 'DEMO_MAP_ID',
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const pin = new PinElement({ background: '#111827', borderColor: '#ffffff', glyphText: 'ISO', glyphColor: '#ffffff' });
  state.marker = new AdvancedMarkerElement({ map: state.map, position: state.origin, gmpDraggable: true, title: 'Isochrone origin' });
  state.marker.append(pin);
  state.marker.addListener('dragend', ({ latLng }) => {
    state.origin = { lat: latLng.lat(), lng: latLng.lng() };
    syncOriginInputs();
  });
  state.map.addListener('click', ({ latLng }) => {
    state.origin = { lat: latLng.lat(), lng: latLng.lng() };
    state.marker.position = state.origin;
    syncOriginInputs();
  });
}

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
  renderStats();
}

function bindUi() {
  syncOriginInputs();
  renderStats();
  document.querySelectorAll('.scenario').forEach((button) => {
    button.addEventListener('click', () => applyScenario(button.dataset.scenario));
  });
  elements.durationInput.addEventListener('input', () => {
    elements.durationLabel.textContent = elements.durationInput.value;
  });
  document.querySelector('#set-origin').addEventListener('click', () => {
    const lat = Number(elements.latInput.value);
    const lng = Number(elements.lngInput.value);
    if (!validateCoordinates(lat, lng)) {
      setStatus('Enter latitude -90 to 90 and longitude -180 to 180.', 'error');
      return;
    }
    state.origin = { lat, lng };
    state.marker.position = state.origin;
    state.map.panTo(state.origin);
    setStatus('Origin updated. Generate rings when ready.', 'success');
  });
  elements.generateButton.addEventListener('click', generateIsochrones);
}

bindUi();
initMap();
