import { Router } from 'express';

const router = Router();

// Danish tide-gauge stations (Kystdirektoratet / DMI). level = current cm vs DVR90,
// warning = storm-surge warning threshold (cm), trend in cm/h.
const STATIONS = [
  { name: 'Esbjerg',       lat: 55.4647, lon: 8.4399,  level: 112, trend: 8,  warning: 200 },
  { name: 'Hvide Sande',   lat: 56.0006, lon: 8.1281,  level: 74,  trend: 5,  warning: 150 },
  { name: 'Thorsminde',    lat: 56.3736, lon: 8.1175,  level: 61,  trend: 3,  warning: 150 },
  { name: 'Hirtshals',     lat: 57.5942, lon: 9.9606,  level: 38,  trend: -2, warning: 120 },
  { name: 'Frederikshavn', lat: 57.4373, lon: 10.5460, level: 27,  trend: -1, warning: 120 },
  { name: 'Aarhus',        lat: 56.1496, lon: 10.2270, level: 33,  trend: 2,  warning: 130 },
  { name: 'Korsør',        lat: 55.3300, lon: 11.1380, level: 58,  trend: 6,  warning: 140 },
  { name: 'Gedser',        lat: 54.5736, lon: 11.9290, level: 71,  trend: 7,  warning: 140 },
  { name: 'København',     lat: 55.6919, lon: 12.5993, level: 44,  trend: 4,  warning: 130 },
  { name: 'Rønne',         lat: 55.0986, lon: 14.6889, level: 22,  trend: 1,  warning: 120 },
  { name: 'Aabenraa',      lat: 55.0444, lon: 9.4180,  level: 49,  trend: 3,  warning: 140 },
  { name: 'Kolding',       lat: 55.4904, lon: 9.4722,  level: 53,  trend: 4,  warning: 140 },
  { name: 'Vejle',         lat: 55.7090, lon: 9.5360,  level: 47,  trend: 3,  warning: 140 },
  { name: 'Roskilde',      lat: 55.6415, lon: 12.0803, level: 36,  trend: 2,  warning: 130 }
];

// Bar mapping: levels can be negative; map -100..+200 cm to 0..300.
const BAR_MIN = -100;
const BAR_MAX = 200;
const BAR_RANGE = BAR_MAX - BAR_MIN; // 300

function surgeColorHex(s) {
  const ratio = s.level / s.warning;
  if (s.level >= s.warning) return '#e74c3c';
  if (ratio >= 0.7) return '#f1c40f';
  return '#2ecc71';
}
function surgeColorRGB(s) {
  const ratio = s.level / s.warning;
  if (s.level >= s.warning) return [231, 76, 60];
  if (ratio >= 0.7) return [241, 196, 15];
  return [46, 204, 113];
}
function trendLabel(t) {
  if (t > 0) return `↑ +${t} cm/t`;
  if (t < 0) return `↓ ${t} cm/t`;
  return '→ stabil';
}

async function tryLive() {
  // DMI oceanObs requires a key; no key-free free public surge API is reliably reachable.
  // Attempt Open-Meteo marine (sea_level_height_msl) for Esbjerg as a best-effort live anchor.
  const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=55.46&longitude=8.44&current=sea_level_height_msl';
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const v = j.current?.sea_level_height_msl;
    if (!Number.isFinite(v)) return null;
    return { esbjergLevelCm: Math.round(v * 100) }; // m -> cm
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getStations() {
  const stations = STATIONS.map(s => ({ ...s }));
  const live = await tryLive();
  if (live && Number.isFinite(live.esbjergLevelCm)) {
    stations[0].level = live.esbjergLevelCm;
  }
  return stations;
}

router.get('/', async (req, res) => {
  const stations = await getStations();
  const highest = stations.reduce((m, s) => (s.level > m.level ? s : m), stations[0]);
  const aboveWarning = stations.filter(s => s.level >= s.warning).length;
  const meanLevel = Math.round(stations.reduce((a, s) => a + s.level, 0) / stations.length);
  const minLevel = Math.min(...stations.map(s => s.level));
  const maxLevel = Math.max(...stations.map(s => s.level));

  res.json({
    kpi: { big: `+${highest.level}`, unit: `cm vs normal (${highest.name})`, color: surgeColorHex(highest) },
    meta: [
      { label: 'Stationer over varslingsniveau', value: String(aboveWarning), color: aboveWarning ? '#e74c3c' : '#2ecc71' },
      { label: 'Middelvandstand', value: `${meanLevel} cm` },
      { label: 'Spændvidde (lav–høj)', value: `${minLevel} til ${maxLevel} cm` },
      { label: 'Højeste station', value: `${highest.name} (+${highest.level} cm)`, color: surgeColorHex(highest) },
      { label: 'Aktive målere', value: String(stations.length) }
    ],
    sections: [
      {
        title: 'Vandstand per station (cm vs DVR90)',
        rows: stations
          .slice()
          .sort((a, b) => b.level - a.level)
          .map(s => {
            const bar = Math.max(0, Math.min(BAR_RANGE, s.level - BAR_MIN));
            return {
              label: s.name,
              value: bar,
              max: BAR_RANGE,
              color: surgeColorHex(s),
              valueLabel: `${s.level > 0 ? '+' : ''}${s.level} cm · ${trendLabel(s.trend)}`
            };
          })
      },
      {
        title: 'Stigende vs. faldende',
        rows: [
          { label: 'Stigende', value: stations.filter(s => s.trend > 0).length, max: stations.length, color: '#e74c3c', valueLabel: `${stations.filter(s => s.trend > 0).length} stationer` },
          { label: 'Stabile', value: stations.filter(s => s.trend === 0).length, max: stations.length, color: '#95a5a6', valueLabel: `${stations.filter(s => s.trend === 0).length} stationer` },
          { label: 'Faldende', value: stations.filter(s => s.trend < 0).length, max: stations.length, color: '#2ecc71', valueLabel: `${stations.filter(s => s.trend < 0).length} stationer` }
        ]
      }
    ],
    note: 'Kystdirektoratet · DMI vandstandsmålere'
  });
});

router.get('/points', async (req, res) => {
  const stations = await getStations();
  res.json({
    points: stations.map(s => ({
      lat: s.lat,
      lon: s.lon,
      color: surgeColorRGB(s),
      size: 9 + Math.round(Math.max(0, s.level) / 25),
      kind: 'vandstandsmaaler',
      tip: {
        title: s.name,
        rows: [
          ['Vandstand', `${s.level > 0 ? '+' : ''}${s.level} cm vs DVR90`],
          ['Tendens', trendLabel(s.trend)],
          ['Varslingsniveau', `${s.warning} cm`]
        ]
      }
    }))
  });
});

export default router;
