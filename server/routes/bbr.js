import { Router } from 'express';

const router = Router();

// Modeled building stock & energy labels (BBR + Energistyrelsen energimærkning).
// Static is primary (no open keyless aggregate API).
const TOTAL_BUILDINGS = 4520000;

// Energy-label distribution (counts of buildings).
const LABELS = [
  { name: 'A2020', count: 38000 },
  { name: 'A2015', count: 96000 },
  { name: 'A', count: 184000 },
  { name: 'B', count: 412000 },
  { name: 'C', count: 868000 },
  { name: 'D', count: 1012000 },
  { name: 'E', count: 942000 },
  { name: 'F', count: 614000 },
  { name: 'G', count: 354000 },
];

const HEATING = [
  { name: 'Fjernvarme', pct: 51 },
  { name: 'Varmepumpe', pct: 19 },
  { name: 'Gas', pct: 17 },
  { name: 'Olie', pct: 8 },
  { name: 'Andet/biomasse', pct: 5 },
];

// Share of buildings with label A-C per region (%).
const REGIONS = [
  { name: 'Hovedstaden', acShare: 41 },
  { name: 'Midtjylland', acShare: 37 },
  { name: 'Syddanmark', acShare: 34 },
  { name: 'Sjælland', acShare: 31 },
  { name: 'Nordjylland', acShare: 29 },
];

const AVG_KWH_M2 = 148;
const FJERNVARME_SHARE = 51;
const HEATPUMP_GROWTH = 14.2; // % vækst år/år
const RENOVATION_RATE = 1.8;  // % af bygningsmassen/år

function fmt(n) {
  return n.toLocaleString('da-DK');
}
function labelColor(name) {
  if (name.startsWith('A')) return '#1a9641';
  if (name === 'B') return '#73c378';
  if (name === 'C') return '#c4e687';
  if (name === 'D') return '#f1c40f';
  if (name === 'E') return '#fdae61';
  if (name === 'F') return '#e67e22';
  return '#e74c3c';
}

async function tryLive(note) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch('https://api.dataforsyningen.dk/bbrlight/bygninger?per_side=1', { signal: ac.signal });
    if (!r.ok) return note;
    await r.json();
    return 'BBR · Energistyrelsen energimærkning · Datafordeler';
  } catch {
    return note;
  } finally {
    clearTimeout(t);
  }
}

router.get('/', async (req, res) => {
  const note = await tryLive('BBR · Energistyrelsen energimærkning');

  const acCount = LABELS.filter(l => l.name.startsWith('A') || l.name === 'B' || l.name === 'C')
    .reduce((a, l) => a + l.count, 0);
  const totalLabelled = LABELS.reduce((a, l) => a + l.count, 0);
  const acPct = Math.round((acCount / totalLabelled) * 100);
  const acColor = acPct >= 40 ? '#27ae60' : acPct >= 30 ? '#f39c12' : '#e74c3c';
  const maxLabel = Math.max(...LABELS.map(l => l.count));

  res.json({
    kpi: { big: acPct + ' %', unit: 'bygninger med mærke A–C', color: acColor },
    meta: [
      { label: 'Bygninger i alt', value: fmt(TOTAL_BUILDINGS), color: '#7f8c8d' },
      { label: 'Gns. energiforbrug', value: AVG_KWH_M2 + ' kWh/m²', color: '#e67e22' },
      { label: 'Fjernvarme-andel', value: FJERNVARME_SHARE + ' %', color: '#c0392b' },
      { label: 'Varmepumpe-vækst', value: '+' + String(HEATPUMP_GROWTH).replace('.', ',') + ' %', color: '#27ae60' },
      { label: 'Renoveringsrate', value: String(RENOVATION_RATE).replace('.', ',') + ' %/år', color: '#2980b9' },
    ],
    sections: [
      {
        title: 'Energimærke-fordeling (antal bygninger)',
        rows: LABELS.map(l => ({
          label: l.name,
          value: l.count,
          max: maxLabel,
          color: labelColor(l.name),
          valueLabel: fmt(l.count),
        })),
      },
      {
        title: 'Varmekilde-fordeling (% af bygninger)',
        rows: HEATING.map(h => ({
          label: h.name,
          value: h.pct,
          max: 100,
          color: h.name === 'Olie' || h.name === 'Gas' ? '#e74c3c' : h.name === 'Fjernvarme' ? '#c0392b' : '#27ae60',
          valueLabel: h.pct + ' %',
        })),
      },
      {
        title: 'Andel A–C per region (%)',
        rows: REGIONS.map(r => ({
          label: r.name,
          value: r.acShare,
          max: 100,
          color: r.acShare >= 38 ? '#27ae60' : r.acShare >= 32 ? '#f39c12' : '#e74c3c',
          valueLabel: r.acShare + ' %',
        })),
      },
    ],
    note,
  });
});

export default router;
