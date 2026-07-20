import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LAYERS, heatmapTileUrl } from '../src/layers.js';

test('every selectable layer uses a supported Air Quality heatmap type', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const select = html.match(/<select id="layer-select">([\s\S]*?)<\/select>/)?.[1] || '';
  const selectableLayers = [...select.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(selectableLayers, [
    'US_AQI',
    'PM25_INDIGO_PERSIAN',
    'UAQI_RED_GREEN',
  ]);
  assert.deepEqual(selectableLayers, Object.keys(LAYERS));
});

test('PM2.5 tile URLs use the supported pollutant map type', () => {
  assert.equal(
    heatmapTileUrl('PM25_INDIGO_PERSIAN', { x: 1, y: 2 }, 3, 'test-key'),
    'https://airquality.googleapis.com/v1/mapTypes/PM25_INDIGO_PERSIAN/heatmapTiles/3/1/2?key=test-key',
  );
  assert.equal(heatmapTileUrl('PM25_INDEX', { x: 1, y: 2 }, 3, 'test-key'), null);
});
