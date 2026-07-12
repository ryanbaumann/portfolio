import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import './styles.css';

// Everything here runs on one referrer-restricted browser key, the same
// pattern as the other Google Maps Platform demos in this repo: the key
// needs Maps JavaScript API, Places API, and Air Quality API enabled.
const API_KEY = import.meta.env.VITE_GMP_API_KEY;
const AIR_QUALITY_HOST = 'https://airquality.googleapis.com/v1';
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

// Heatmap tile layers served by the Air Quality API. Legend gradients
// mirror each palette's meaning: Universal AQI counts up to good (100 =
// excellent), US AQI counts up to bad (301+ = hazardous).
const LAYERS = {
  UAQI_RED_GREEN: {
    indexCode: 'uaqi',
    gradient: 'linear-gradient(90deg, #d7191c, #f07c26, #f7d038, #a6d96a, #1a9641)',
    min: '0 · Poor',
    max: '100 · Excellent',
  },
  US_AQI: {
    indexCode: 'usa_epa',
    gradient: 'linear-gradient(90deg, #00e400, #ffff00, #ff7e00, #ff0000, #8f3f97, #7e0023)',
    min: '0 · Good',
    max: '301+ · Hazardous',
  },
  PM25_INDEX: {
    indexCode: 'uaqi',
    gradient: 'linear-gradient(90deg, #0e7a0d, #ffde33, #ff9933, #cc0033, #660099, #7e0023)',
    min: 'Low PM2.5',
    max: 'High PM2.5',
  },
};

const state = {
  map: null,
  heatmapLayer: null,
  marker: null,
  activeLayer: 'UAQI_RED_GREEN',
  opacity: 0.7,
  lookupController: null,
};

const elements = {
  map: document.querySelector('#map'),
  status: document.querySelector('#status'),
  layerSelect: document.querySelector('#layer-select'),
  opacityInput: document.querySelector('#opacity-input'),
  opacityLabel: document.querySelector('#opacity-label'),
  legendBar: document.querySelector('#legend-bar'),
  legendMin: document.querySelector('#legend-min'),
  legendMax: document.querySelector('#legend-max'),
  searchSlot: document.querySelector('#search-slot'),
  conditions: document.querySelector('#conditions'),
  aqiValue: document.querySelector('#aqi-value'),
  aqiCategory: document.querySelector('#aqi-category'),
  aqiIndexName: document.querySelector('#aqi-index-name'),
  aqiPollutant: document.querySelector('#aqi-pollutant'),
  pollutantList: document.querySelector('#pollutant-list'),
  aqiTime: document.querySelector('#aqi-time'),
};

function setStatus(message, tone = 'neutral') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function applyLegend() {
  const layer = LAYERS[state.activeLayer];
  elements.legendBar.style.background = layer.gradient;
  elements.legendMin.textContent = layer.min;
  elements.legendMax.textContent = layer.max;
}

function applyHeatmap() {
  if (!state.map) return;
  state.map.overlayMapTypes.clear();
  state.heatmapLayer = new google.maps.ImageMapType({
    getTileUrl: (coordinate, zoom) => {
      if (zoom < 0 || zoom > 16) return null;
      return `${AIR_QUALITY_HOST}/mapTypes/${state.activeLayer}/heatmapTiles/${zoom}/${coordinate.x}/${coordinate.y}?key=${API_KEY}`;
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 16,
    opacity: state.opacity,
    name: 'Air quality',
  });
  state.map.overlayMapTypes.push(state.heatmapLayer);
}

function rgbFromApiColor(color = {}) {
  const channel = (value) => Math.round((value || 0) * 255);
  return `rgb(${channel(color.red)}, ${channel(color.green)}, ${channel(color.blue)})`;
}

function pickIndex(indexes = []) {
  const preferred = LAYERS[state.activeLayer].indexCode;
  return indexes.find((index) => index.code === preferred) || indexes[0] || null;
}

function renderConditions(payload, latLng) {
  const index = pickIndex(payload.indexes);
  if (!index) {
    setStatus('No air quality data for that location (often oceans or unmonitored regions).', 'error');
    return;
  }

  elements.conditions.hidden = false;
  elements.aqiValue.textContent = index.aqiDisplay || String(index.aqi ?? '–');
  elements.aqiValue.style.background = rgbFromApiColor(index.color);
  elements.aqiCategory.textContent = index.category || '';
  elements.aqiIndexName.textContent = index.displayName || index.code;
  elements.aqiPollutant.textContent = index.dominantPollutant
    ? `Dominant pollutant: ${index.dominantPollutant.toUpperCase()}`
    : '';

  const pollutants = (payload.pollutants || []).slice(0, 6);
  elements.pollutantList.innerHTML = pollutants
    .map((pollutant) => {
      const value = pollutant.concentration
        ? `${pollutant.concentration.value} ${(pollutant.concentration.units || '').replaceAll('_', ' ').toLowerCase()}`
        : '';
      return `<li><strong>${pollutant.displayName || pollutant.code}</strong><span>${value}</span></li>`;
    })
    .join('');

  const time = payload.dateTime ? new Date(payload.dateTime) : null;
  elements.aqiTime.textContent = [
    payload.regionCode ? `Region: ${payload.regionCode.toUpperCase()}` : null,
    time ? `As of ${time.toLocaleString()}` : null,
  ].filter(Boolean).join(' · ');

  setStatus(`Conditions loaded for ${latLng.lat.toFixed(3)}, ${latLng.lng.toFixed(3)}.`, 'success');
}

async function lookupConditions(latLng) {
  state.lookupController?.abort();
  state.lookupController = new AbortController();
  setStatus('Looking up local conditions…');
  placeMarker(latLng);

  try {
    const response = await fetch(`${AIR_QUALITY_HOST}/currentConditions:lookup?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: state.lookupController.signal,
      body: JSON.stringify({
        location: { latitude: latLng.lat, longitude: latLng.lng },
        universalAqi: true,
        extraComputations: ['LOCAL_AQI', 'DOMINANT_POLLUTANT_CONCENTRATION', 'POLLUTANT_CONCENTRATION'],
        languageCode: 'en',
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || 'Air Quality API request failed.');
    }
    renderConditions(payload, latLng);
  } catch (error) {
    if (error.name === 'AbortError') return;
    elements.conditions.hidden = true;
    setStatus(error.message, 'error');
  }
}

function placeMarker(latLng) {
  if (state.marker) {
    state.marker.position = latLng;
    return;
  }
  state.marker = new google.maps.marker.AdvancedMarkerElement({
    map: state.map,
    position: latLng,
    title: 'Air quality lookup point',
  });
}

async function attachPlaceSearch() {
  try {
    const { PlaceAutocompleteElement } = await importLibrary('places');
    const autocomplete = new PlaceAutocompleteElement();
    autocomplete.id = 'place-search';
    elements.searchSlot.append(autocomplete);
    autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['location', 'viewport'] });
      const location = place.location;
      if (!location) return;
      const latLng = { lat: location.lat(), lng: location.lng() };
      if (place.viewport) {
        state.map.fitBounds(place.viewport);
      } else {
        state.map.setCenter(latLng);
        state.map.setZoom(10);
      }
      lookupConditions(latLng);
    });
  } catch (error) {
    // Places is a nice-to-have here; the map click flow still works without it.
    console.warn('Place search unavailable:', error);
    elements.searchSlot.textContent = 'Place search unavailable for this key.';
  }
}

function bindUi() {
  elements.layerSelect.addEventListener('change', () => {
    state.activeLayer = elements.layerSelect.value;
    applyLegend();
    applyHeatmap();
  });
  elements.opacityInput.addEventListener('input', () => {
    state.opacity = Number(elements.opacityInput.value) / 100;
    elements.opacityLabel.textContent = `${elements.opacityInput.value}%`;
    if (state.heatmapLayer) state.heatmapLayer.setOpacity(state.opacity);
  });
  applyLegend();
}

async function init() {
  bindUi();

  if (!API_KEY) {
    setStatus('Set VITE_GMP_API_KEY (with Maps JavaScript + Air Quality APIs enabled) to load the map.', 'error');
    return;
  }

  setOptions({ key: API_KEY, v: 'weekly', authReferrerPolicy: 'origin' });
  const { Map } = await importLibrary('maps');
  await importLibrary('marker');

  state.map = new Map(elements.map, {
    center: DEFAULT_CENTER,
    zoom: 9,
    mapId: '556022f677234497',
    colorScheme: 'DARK',
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  applyHeatmap();
  attachPlaceSearch();
  state.map.addListener('click', ({ latLng }) => {
    lookupConditions({ lat: latLng.lat(), lng: latLng.lng() });
  });
  setStatus('Click the map for local conditions.');
}

init();
