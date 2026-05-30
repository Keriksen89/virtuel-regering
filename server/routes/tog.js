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

export default router;
