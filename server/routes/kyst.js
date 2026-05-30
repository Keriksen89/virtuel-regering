import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();

const KYST_URL =
  'https://kystatlas.kyst.dk/data/vandstand/response.aspx?StationId=all&format=json';

const FALLBACK = {
  stations: [
    { id: 'esbjerg',       name: 'Esbjerg',       lat: 55.476, lon:  8.459, level: 42, unit: 'cm', observed: null },
    { id: 'thyboron',      name: 'Thyborøn',      lat: 56.703, lon:  8.216, level: 18, unit: 'cm', observed: null },
    { id: 'frederikshavn', name: 'Frederikshavn', lat: 57.432, lon: 10.536, level:  8, unit: 'cm', observed: null },
    { id: 'korsor',        name: 'Korsør',        lat: 55.326, lon: 11.138, level: 12, unit: 'cm', observed: null },
    { id: 'kobenhavn',     name: 'København',     lat: 55.676, lon: 12.568, level: 15, unit: 'cm', observed: null },
    { id: 'gedser',        name: 'Gedser',        lat: 54.573, lon: 11.930, level:  6, unit: 'cm', observed: null },
    { id: 'rodbyhavn',     name: 'Rødbyhavn',     lat: 54.658, lon: 11.355, level:  9, unit: 'cm', observed: null },
    { id: 'bornholm',      name: 'Bornholm',      lat: 55.107, lon: 14.921, level:  3, unit: 'cm', observed: null }
  ],
  isFallback: true,
  source: 'Estimat (Kystdirektoratet utilgængelig)',
  fetched: null
};

router.get('/vandstand', async (req, res) => {
  const cacheKey = 'kyst:vandstand';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const fallbackWithTime = { ...FALLBACK, fetched: new Date().toISOString() };

  try {
    const data = await fetchJSON(KYST_URL, { timeout: 8000 });

    // The API may return an array of station objects or a wrapper object
    const rawStations = Array.isArray(data)
      ? data
      : (data.stations || data.data || data.features || data.results || []);

    if (!rawStations.length) {
      cache.set(cacheKey, fallbackWithTime, 600);
      return res.json(fallbackWithTime);
    }

    const stations = rawStations.map(s => ({
      id:       s.id       || s.StationId   || s.stationId   || s.station_id   || null,
      name:     s.name     || s.StationName || s.stationName || s.station_name || null,
      lat:      s.lat      || s.Lat         || s.latitude     || null,
      lon:      s.lon      || s.Lon         || s.longitude    || null,
      level:    s.level    || s.Level       || s.WaterLevel   || s.value        || null,
      unit:     s.unit     || s.Unit        || 'cm',
      observed: s.observed || s.Observed    || s.timestamp    || s.DateTime     || null
    }));

    const result = {
      stations,
      isFallback: false,
      source: 'Kystdirektoratet',
      fetched: new Date().toISOString()
    };

    cache.set(cacheKey, result, 600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[kyst] vandstand failed:', err.message);
    cache.set(cacheKey, fallbackWithTime, 600);
    res.json(fallbackWithTime);
  }
});

export default router;
