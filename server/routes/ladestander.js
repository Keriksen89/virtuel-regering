import { Router } from 'express';

const router = Router();

// ~18 modeled public charging hubs across Denmark.
// power tier: slow (<50kW), fast (50-149kW), ultra (>=150kW)
const HUBS = [
  { name: 'CPH Ørestad Hub',        lat: 55.629, lon: 12.578, region: 'Hovedstaden',  operator: 'Clever', connectors: 24, tier: 'ultra', power: 300 },
  { name: 'København Fields',       lat: 55.659, lon: 12.581, region: 'Hovedstaden',  operator: 'Spirii', connectors: 16, tier: 'fast',  power: 75 },
  { name: 'E20 Køge Bugt Rasteplads', lat: 55.530, lon: 12.123, region: 'Sjælland',  operator: 'Ionity', connectors: 12, tier: 'ultra', power: 350 },
  { name: 'Roskilde Park',          lat: 55.642, lon: 12.087, region: 'Sjælland',     operator: 'E.ON',   connectors: 10, tier: 'fast',  power: 120 },
  { name: 'Næstved Centrum',        lat: 55.230, lon: 11.760, region: 'Sjælland',     operator: 'Clever', connectors: 8,  tier: 'fast',  power: 50 },
  { name: 'E20 Lillebælt Vest',     lat: 55.534, lon: 9.749,  region: 'Syddanmark',   operator: 'Ionity', connectors: 14, tier: 'ultra', power: 350 },
  { name: 'Odense Rosengård',       lat: 55.397, lon: 10.458, region: 'Syddanmark',   operator: 'Clever', connectors: 18, tier: 'ultra', power: 200 },
  { name: 'Svendborg Havn',         lat: 55.060, lon: 10.610, region: 'Syddanmark',   operator: 'Spirii', connectors: 6,  tier: 'slow',  power: 22 },
  { name: 'Esbjerg Strandby',       lat: 55.471, lon: 8.452,  region: 'Syddanmark',   operator: 'E.ON',   connectors: 10, tier: 'fast',  power: 100 },
  { name: 'E45 Vejle Nord',         lat: 55.710, lon: 9.539,  region: 'Syddanmark',   operator: 'Ionity', connectors: 12, tier: 'ultra', power: 300 },
  { name: 'Kolding City',           lat: 55.491, lon: 9.472,  region: 'Syddanmark',   operator: 'Clever', connectors: 8,  tier: 'fast',  power: 60 },
  { name: 'E45 Skanderborg',        lat: 56.039, lon: 9.928,  region: 'Midtjylland',  operator: 'Ionity', connectors: 12, tier: 'ultra', power: 350 },
  { name: 'Aarhus Storcenter Nord', lat: 56.195, lon: 10.248, region: 'Midtjylland',  operator: 'Clever', connectors: 22, tier: 'ultra', power: 250 },
  { name: 'Aarhus Havn',            lat: 56.150, lon: 10.221, region: 'Midtjylland',  operator: 'Spirii', connectors: 10, tier: 'fast',  power: 75 },
  { name: 'Herning MCH',            lat: 56.130, lon: 8.965,  region: 'Midtjylland',  operator: 'E.ON',   connectors: 8,  tier: 'fast',  power: 100 },
  { name: 'Silkeborg Søtorvet',     lat: 56.169, lon: 9.546,  region: 'Midtjylland',  operator: 'Clever', connectors: 6,  tier: 'slow',  power: 22 },
  { name: 'E45 Aalborg Syd',        lat: 56.998, lon: 9.918,  region: 'Nordjylland',  operator: 'Ionity', connectors: 12, tier: 'ultra', power: 300 },
  { name: 'Aalborg City Syd',       lat: 57.018, lon: 9.953,  region: 'Nordjylland',  operator: 'Clever', connectors: 14, tier: 'fast',  power: 120 },
];

const TIER_COLOR = { slow: [52, 152, 219], fast: [243, 156, 18], ultra: [155, 89, 182] };
const TOTAL_PUBLIC = 25400; // national public chargers
const FAST_CHARGERS = 8900;
const EV_FLEET = 280000; // registered BEVs (modeled)

function regionTotals() {
  const m = {};
  for (const h of HUBS) m[h.region] = (m[h.region] || 0) + h.connectors;
  return m;
}

function operatorShare() {
  const m = {};
  for (const h of HUBS) m[h.operator] = (m[h.operator] || 0) + h.connectors;
  return m;
}

router.get('/', (req, res) => {
  const reg = regionTotals();
  const regMax = Math.max(...Object.values(reg));
  const ops = operatorShare();
  const opTotal = Object.values(ops).reduce((a, b) => a + b, 0);
  const evPerCharger = Math.round(EV_FLEET / TOTAL_PUBLIC);

  const regionColors = {
    Hovedstaden: '#e74c3c', Sjælland: '#3498db', Syddanmark: '#27ae60',
    Midtjylland: '#f39c12', Nordjylland: '#9b59b6',
  };
  const opColors = { Clever: '#27ae60', 'E.ON': '#e74c3c', Ionity: '#9b59b6', Spirii: '#3498db' };

  res.json({
    kpi: { big: TOTAL_PUBLIC.toLocaleString('da-DK'), unit: 'offentlige ladere', color: '#27ae60' },
    meta: [
      { label: 'Lynladere', value: FAST_CHARGERS.toLocaleString('da-DK'), color: '#f39c12' },
      { label: 'Elbiler pr. lader', value: String(evPerCharger), color: '#3498db' },
      { label: 'Årlig vækst', value: '+38 %', color: '#27ae60' },
      { label: 'Ladehubs (kort)', value: String(HUBS.length), color: '#9b59b6' },
    ],
    sections: [
      {
        title: 'Stik pr. region (udvalgte hubs)',
        rows: Object.entries(reg)
          .sort((a, b) => b[1] - a[1])
          .map(([name, v]) => ({
            label: name, value: v, max: regMax,
            color: regionColors[name] || '#7f8c8d', valueLabel: v + ' stik',
          })),
      },
      {
        title: 'Operatørandel (stik)',
        rows: Object.entries(ops)
          .sort((a, b) => b[1] - a[1])
          .map(([name, v]) => ({
            label: name, value: v, max: opTotal,
            color: opColors[name] || '#7f8c8d',
            valueLabel: Math.round((v / opTotal) * 100) + ' %',
          })),
      },
    ],
    note: 'Open Charge Map · Dansk Elbil Alliance',
  });
});

router.get('/points', (req, res) => {
  const points = HUBS.map((h) => ({
    lat: h.lat, lon: h.lon,
    color: TIER_COLOR[h.tier],
    size: 6 + h.connectors,
    kind: 'ladehub',
    tip: {
      title: h.name,
      rows: [
        ['Operatør', h.operator],
        ['Stik', String(h.connectors)],
        ['Effekt', h.power + ' kW'],
        ['Type', h.tier === 'ultra' ? 'Ultralader' : h.tier === 'fast' ? 'Lynlader' : 'Normallader'],
        ['Region', h.region],
      ],
    },
  }));
  res.json({ points });
});

export default router;
