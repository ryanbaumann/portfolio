export const AIR_QUALITY_HOST = 'https://airquality.googleapis.com/v1';

export const LAYERS = {
  US_AQI: {
    indexCode: 'usa_epa',
    gradient: 'linear-gradient(90deg, #00e400, #ffff00, #ff7e00, #ff0000, #8f3f97, #7e0023)',
    min: '0 · Good',
    max: '301+ · Hazardous',
  },
  PM25_INDIGO_PERSIAN: {
    indexCode: 'usa_epa',
    gradient: 'linear-gradient(90deg, #0e7a0d, #ffde33, #ff9933, #cc0033, #660099, #7e0023)',
    min: 'Lower PM2.5',
    max: 'Higher PM2.5',
  },
  UAQI_RED_GREEN: {
    indexCode: 'uaqi',
    gradient: 'linear-gradient(90deg, #d7191c, #f07c26, #f7d038, #a6d96a, #1a9641)',
    min: '0 · Poor',
    max: '100 · Excellent',
  },
};

export function heatmapTileUrl(mapType, coordinate, zoom, apiKey, solutionId) {
  const limit = 2 ** zoom;
  if (!LAYERS[mapType] || zoom < 0 || zoom > 16 || coordinate.y < 0 || coordinate.y >= limit) return null;
  const x = ((coordinate.x % limit) + limit) % limit;
  return `${AIR_QUALITY_HOST}/mapTypes/${mapType}/heatmapTiles/${zoom}/${x}/${coordinate.y}?key=${apiKey}&solution_id=${solutionId}`;
}
