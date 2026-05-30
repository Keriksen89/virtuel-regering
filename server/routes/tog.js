import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();

const STATIONS = [
  { id: '8600626', name: 'København H' },
  { id: '8600053', name: 'Aarhus H' },
  { id: '8600396', name: 'Odense' },
  { id: '8600020', name: 'Aalborg' }
];

const REJSEPLANEN_BASE = 'https://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard';

function parseTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function computeDelay(scheduledTime, rtTime) {
  if (!rtTime || rtTime === scheduledTime) return 0;
  const sched = parseTime(scheduledTime);
  const rt = parseTime(rtTime);
  if (sched === null || rt === null) return 0;
  let diff = rt - sched;
  if (diff < -120) diff += 24 * 60;
  if (diff > 120) diff -= 24 * 60;
  return diff;
}

router.get('/departures', async (req, res) => {
  const cacheKey = 'tog:departures';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const FALLBACK = {
    stations: [
      {
        stationId: '8600626',
        name: 'København H',
        departures: [
          { name: 'IC 23', type: 'IC', time: '13:05', direction: 'Aarhus H', delayMin: 0 },
          { name: 'RE 2473', type: 'RE', time: '13:12', direction: 'Helsingør', delayMin: 3 }
        ]
      },
      {
        stationId: '8600053',
        name: 'Aarhus H',
        departures: [
          { name: 'IC 24', type: 'IC', time: '13:30', direction: 'København H', delayMin: 0 }
        ]
      }
    ],
    isFallback: true,
    source: 'Estimat (Rejseplanen utilgængelig)'
  };

  const results = await Promise.allSettled(
    STATIONS.map(async (station) => {
      const url = `${REJSEPLANEN_BASE}?id=${station.id}&format=json&useTrain=1&useBus=0&useMetro=0`;
      const data = await fetchJSON(url, { timeout: 8000 });

      const raw = data?.DepartureBoard?.Departure;
      if (!raw) return { stationId: station.id, name: station.name, departures: [] };

      const list = Array.isArray(raw) ? raw : [raw];

      const departures = list.slice(0, 5).map((dep) => ({
        name: dep.name || null,
        type: dep.type || null,
        stop: dep.stop || null,
        time: dep.time || null,
        date: dep.date || null,
        direction: dep.direction || null,
        rtTime: dep.rtTime || null,
        cancelled: dep.cancelled || null,
        delayMin: computeDelay(dep.time, dep.rtTime)
      }));

      return { stationId: station.id, name: station.name, departures };
    })
  );

  const stations = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (!stations.length) {
    cache.set(cacheKey, FALLBACK, 60);
    return res.json(FALLBACK);
  }

  const result = {
    stations,
    fetched: new Date().toISOString(),
    source: 'Rejseplanen'
  };

  cache.set(cacheKey, result, 60);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

// Route segments: [fromStationId, toStationId, travelMinutes, path[[lon,lat]…]]
// Used to dead-reckon train positions between stations.
const ROUTE_SEGMENTS = [
  // Main IC corridor: Kbh H → Aarhus H
  { from: '8600626', to: '8600453', minutes: 22,  path: [[12.565,55.673],[12.083,55.641]] },
  { from: '8600453', to: '8600396', minutes: 46,  path: [[12.083,55.641],[10.383,55.400]] },
  { from: '8600396', to: '8600250', minutes: 28,  path: [[10.383,55.400],[9.750,55.566]] },
  { from: '8600250', to: '8600615', minutes: 14,  path: [[9.750,55.566],[9.537,55.710]] },
  { from: '8600615', to: '8600278', minutes: 12,  path: [[9.537,55.710],[9.850,55.862]] },
  { from: '8600278', to: '8600053', minutes: 24,  path: [[9.850,55.862],[10.204,56.150]] },
  // IC corridor continued: Aarhus → Aalborg
  { from: '8600053', to: '8600441', minutes: 28,  path: [[10.204,56.150],[10.038,56.462]] },
  { from: '8600441', to: '8600020', minutes: 35,  path: [[10.038,56.462],[9.921,57.049]] },
  // IC Odense → Esbjerg
  { from: '8600396', to: '8600341', minutes: 52,  path: [[10.383,55.400],[9.474,55.490]] },
  { from: '8600341', to: '8600244', minutes: 55,  path: [[9.474,55.490],[8.460,55.476]] },
  // Regional Aalborg → Frederikshavn
  { from: '8600020', to: '8600255', minutes: 45,  path: [[9.921,57.049],[10.536,57.432]] },
];

// Lerp a position along a polyline path at fraction t (0..1)
function posAlongPath(path, t) {
  if (!path || path.length < 2) return null;
  const total = path.length - 1;
  const seg = Math.min(Math.floor(t * total), total - 1);
  const segT = (t * total) - seg;
  const a = path[seg], b = path[seg + 1];
  return [a[0] + (b[0] - a[0]) * segT, a[1] + (b[1] - a[1]) * segT];
}

// GET /positions — estimated live train positions from dead-reckoning
router.get('/positions', async (req, res) => {
  const cacheKey = 'tog:positions';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const FALLBACK = { trains: [], isFallback: true, source: 'Ingen live data' };

  try {
    // Reuse departures to find in-transit trains
    const depCacheKey = 'tog:departures';
    const depData = cache.get(depCacheKey);
    if (!depData) { cache.set(cacheKey, FALLBACK, 30); return res.json(FALLBACK); }

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const trains = [];

    for (const station of (depData.stations || [])) {
      for (const dep of (station.departures || [])) {
        if (!dep.time) continue;
        const [h, m] = dep.time.split(':').map(Number);
        const schedMin = h * 60 + m;
        const rtMin = dep.rtTime ? (([rh, rm]) => rh * 60 + rm)(dep.rtTime.split(':').map(Number)) : schedMin;
        const elapsedMin = nowMin - rtMin;
        if (elapsedMin < 0 || elapsedMin > 90) continue; // only trains departed in last 90 min

        // Find segment from this station
        const seg = ROUTE_SEGMENTS.find(s => s.from === station.stationId);
        if (!seg) continue;

        const t = Math.min(Math.max(elapsedMin / seg.minutes, 0), 1);
        const pos = posAlongPath(seg.path, t);
        if (!pos) continue;

        trains.push({
          id: `${station.stationId}-${dep.name}-${dep.time}`,
          name: dep.name || 'Tog',
          type: dep.type || 'IC',
          from: station.name,
          to: dep.direction || '—',
          delayMin: dep.delayMin || 0,
          pos,
          t,
          cancelled: dep.cancelled || false,
        });
      }
    }

    const result = { trains, fetched: new Date().toISOString(), source: 'Rejseplanen (dead-reckoning)' };
    cache.set(cacheKey, result, 30);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[tog] positions failed:', err.message);
    cache.set(cacheKey, FALLBACK, 30);
    res.json(FALLBACK);
  }
});

export default router;
