import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();

const DMI_URL =
  'https://opendataapi.dmi.dk/v2/metObs/collections/observation/items' +
  '?parameterId=temp_dry&limit=100&sortorder=observed,DESC';

const FALLBACK = [
  { stationId: '06180', name: 'København',  lat: 55.676, lon: 12.568, temp: 14.2, wind: 4.1, windDir: 210, precip: 0 },
  { stationId: '06074', name: 'Aarhus',     lat: 56.156, lon: 10.203, temp: 13.1, wind: 3.8, windDir: 195, precip: 0 },
  { stationId: '06080', name: 'Odense',     lat: 55.396, lon: 10.388, temp: 13.8, wind: 3.2, windDir: 220, precip: 0 },
  { stationId: '06052', name: 'Aalborg',    lat: 57.047, lon:  9.921, temp: 12.4, wind: 4.5, windDir: 180, precip: 0 },
  { stationId: '06096', name: 'Esbjerg',    lat: 55.476, lon:  8.459, temp: 12.8, wind: 6.2, windDir: 270, precip: 0 }
];

router.get('/observations', async (req, res) => {
  const cacheKey = 'dmi:observations';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const data = await fetchJSON(DMI_URL, { timeout: 8000 });

    const features = data.features || [];
    if (!features.length) {
      cache.set(cacheKey, FALLBACK, 600);
      return res.json(FALLBACK);
    }

    // Group observations by stationId
    const byStation = {};
    for (const feature of features) {
      const props = feature.properties || {};
      const stationId = props.stationId;
      if (!stationId) continue;

      const coords = feature.geometry?.coordinates;
      if (!byStation[stationId]) {
        byStation[stationId] = {
          stationId,
          lat: coords ? coords[1] : null,
          lon: coords ? coords[0] : null,
          temp: null,
          wind: null,
          windDir: null,
          precip: null,
          observed: props.observed || null
        };
      }

      const entry = byStation[stationId];
      const param = props.parameterId;
      const value = props.value != null ? Number(props.value) : null;

      if (param === 'temp_dry')       entry.temp     = value;
      else if (param === 'wind_speed') entry.wind     = value;
      else if (param === 'wind_dir')   entry.windDir  = value;
      else if (param === 'precip_past1h') entry.precip = value;

      // Keep the most recent observed timestamp
      if (props.observed && (!entry.observed || props.observed > entry.observed)) {
        entry.observed = props.observed;
      }
    }

    const result = Object.values(byStation);
    cache.set(cacheKey, result, 600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[dmi] observations failed:', err.message);
    cache.set(cacheKey, FALLBACK, 600);
    res.json(FALLBACK);
  }
});

export default router;
