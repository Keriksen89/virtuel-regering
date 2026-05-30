import { Router } from 'express';

const router = Router();

// Modeled seismic events in/around Denmark. Denmark is low-seismicity; events are
// tectonic (Kattegat, Skåne border, Bornholm/Baltic) and induced (North Sea gas/geothermal).
// Dates anchored relative to 2026-05-30.
const EVENTS = [
  { date: '2026-05-22', region: 'Nordsøen',        lat: 56.10, lon: 3.25,  mag: 2.8, depth: 8,  kind: 'induceret' },
  { date: '2026-05-18', region: 'Kattegat',        lat: 56.85, lon: 11.40, mag: 2.1, depth: 14, kind: 'tektonisk' },
  { date: '2026-05-09', region: 'Skåne-grænsen',   lat: 55.62, lon: 13.10, mag: 2.4, depth: 11, kind: 'tektonisk' },
  { date: '2026-04-30', region: 'Nordsøen',        lat: 55.95, lon: 4.10,  mag: 3.1, depth: 6,  kind: 'induceret' },
  { date: '2026-04-21', region: 'Bornholm',        lat: 55.10, lon: 15.05, mag: 1.9, depth: 17, kind: 'tektonisk' },
  { date: '2026-04-12', region: 'Kattegat',        lat: 57.20, lon: 11.10, mag: 2.6, depth: 12, kind: 'tektonisk' },
  { date: '2026-03-28', region: 'Nordsøen',        lat: 56.30, lon: 3.60,  mag: 2.2, depth: 9,  kind: 'induceret' },
  { date: '2026-03-15', region: 'Sydlige Østersø', lat: 54.80, lon: 13.40, mag: 2.0, depth: 20, kind: 'tektonisk' },
  { date: '2026-03-02', region: 'Skåne-grænsen',   lat: 55.70, lon: 13.30, mag: 3.4, depth: 15, kind: 'tektonisk' },
  { date: '2026-02-19', region: 'Kattegat',        lat: 56.60, lon: 11.80, mag: 1.7, depth: 13, kind: 'tektonisk' },
  { date: '2026-01-27', region: 'Nordsøen',        lat: 55.70, lon: 4.40,  mag: 2.9, depth: 7,  kind: 'induceret' },
  { date: '2025-12-14', region: 'Bornholm',        lat: 55.25, lon: 14.90, mag: 2.3, depth: 18, kind: 'tektonisk' },
  { date: '2025-11-30', region: 'Kattegat',        lat: 57.05, lon: 10.95, mag: 2.5, depth: 10, kind: 'tektonisk' },
  { date: '2025-10-18', region: 'Skåne-grænsen',   lat: 55.55, lon: 12.95, mag: 4.1, depth: 16, kind: 'tektonisk' },
  { date: '2025-09-22', region: 'Nordsøen',        lat: 56.50, lon: 3.10,  mag: 2.7, depth: 8,  kind: 'induceret' }
];

const TODAY = new Date('2026-05-30');
function daysAgo(dateStr) {
  return Math.round((TODAY - new Date(dateStr)) / 86400000);
}
function magColorHex(mag) {
  if (mag < 2.0) return '#2ecc71';
  if (mag < 2.5) return '#f1c40f';
  if (mag < 3.5) return '#e67e22';
  return '#e74c3c';
}
function recencyColorRGB(days) {
  if (days <= 30) return [231, 76, 60];    // red = recent
  if (days <= 90) return [230, 126, 34];   // orange
  if (days <= 180) return [241, 196, 15];  // yellow
  return [149, 165, 166];                  // grey = old
}

async function tryLive() {
  // USGS FDSN supports unauthenticated GeoJSON; bounded box around Denmark.
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=54&maxlatitude=58&minlongitude=3&maxlongitude=16&limit=30';
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j.features) || !j.features.length) return null;
    return j.features.map(f => {
      const c = f.geometry?.coordinates || [];
      return {
        date: new Date(f.properties?.time || Date.now()).toISOString().slice(0, 10),
        region: f.properties?.place || 'Nordsø-regionen',
        lat: c[1], lon: c[0],
        mag: f.properties?.mag ?? 0,
        depth: c[2] ?? 0,
        kind: 'tektonisk'
      };
    }).filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lon));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getEvents() {
  const live = await tryLive();
  return (live && live.length) ? live : EVENTS;
}

router.get('/', async (req, res) => {
  const events = await getEvents();
  const last90 = events.filter(e => daysAgo(e.date) <= 90);
  const largest = events.reduce((m, e) => (e.mag > m.mag ? e : m), events[0]);
  const deepest = events.reduce((m, e) => (e.depth > m.depth ? e : m), events[0]);

  // region grouping
  const regions = {};
  for (const e of events) regions[e.region] = (regions[e.region] || 0) + 1;
  const maxRegionCount = Math.max(...Object.values(regions), 1);

  // magnitude distribution buckets
  const buckets = [
    { label: 'M < 2.0', test: m => m < 2.0, color: '#2ecc71' },
    { label: 'M 2.0–2.4', test: m => m >= 2.0 && m < 2.5, color: '#f1c40f' },
    { label: 'M 2.5–3.4', test: m => m >= 2.5 && m < 3.5, color: '#e67e22' },
    { label: 'M ≥ 3.5', test: m => m >= 3.5, color: '#e74c3c' }
  ];
  const distRows = buckets.map(b => {
    const n = events.filter(e => b.test(e.mag)).length;
    return { label: b.label, value: n, max: events.length, color: b.color, valueLabel: `${n} hændelser` };
  });

  res.json({
    kpi: { big: String(last90.length), unit: 'hændelser (90 dage)', color: '#e67e22' },
    meta: [
      { label: 'Største nylige magnitude', value: `M ${largest.mag.toFixed(1)} · ${largest.region}`, color: magColorHex(largest.mag) },
      { label: 'Dybeste hændelse', value: `${deepest.depth} km · ${deepest.region}` },
      { label: 'Registreret i alt', value: String(events.length) },
      { label: 'Seneste hændelse', value: `${events[0].date} (M ${events[0].mag.toFixed(1)})` }
    ],
    sections: [
      {
        title: 'Hændelser per region',
        rows: Object.entries(regions)
          .sort((a, b) => b[1] - a[1])
          .map(([name, n]) => ({ label: name, value: n, max: maxRegionCount, color: '#3498db', valueLabel: `${n}` }))
      },
      {
        title: 'Magnitudefordeling',
        rows: distRows
      }
    ],
    note: 'GEUS jordskælvsovervågning · USGS'
  });
});

router.get('/points', async (req, res) => {
  const events = await getEvents();
  res.json({
    points: events.map(e => {
      const d = daysAgo(e.date);
      return {
        lat: e.lat,
        lon: e.lon,
        color: recencyColorRGB(d),
        size: Math.max(6, Math.round(e.mag * 5)),
        kind: 'jordskælv',
        tip: {
          title: `${e.region} · M ${e.mag.toFixed(1)}`,
          rows: [
            ['Magnitude', `M ${e.mag.toFixed(1)}`],
            ['Dybde', `${e.depth} km`],
            ['Dato', e.date],
            ['Type', e.kind]
          ]
        }
      };
    })
  });
});

export default router;
