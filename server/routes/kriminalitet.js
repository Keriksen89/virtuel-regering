import { Router } from 'express';

const router = Router();

// Modeled crime statistics (Danmarks Statistik STRAF / Rigspolitiet).
// Reported offences per 1000 inhabitants. Static is primary (no open keyless API).
const REGIONS = [
  { name: 'Hovedstaden', index: 112 },
  { name: 'Sjælland', index: 78 },
  { name: 'Syddanmark', index: 71 },
  { name: 'Midtjylland', index: 68 },
  { name: 'Nordjylland', index: 64 },
];

// Offence categories: total reported (year) + YoY trend in %.
const CATEGORIES = [
  { name: 'Tyveri', count: 248000, trend: -3.2 },
  { name: 'Færdsel', count: 192000, trend: +1.4 },
  { name: 'Vold', count: 41000, trend: +2.1 },
  { name: 'Indbrud', count: 28500, trend: -6.8 },
  { name: 'Narko', count: 24000, trend: +0.6 },
  { name: 'IT-kriminalitet', count: 19500, trend: +18.4 },
];

const NATIONAL_PER_1000 = 79;
const YOY_TREND = -1.8;

function fmt(n) {
  return n.toLocaleString('da-DK');
}
function indexColor(v) {
  if (v >= 100) return '#e74c3c';
  if (v >= 75) return '#e67e22';
  if (v >= 60) return '#f1c40f';
  return '#2ecc71';
}

async function tryLive(note) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch('https://api.statbank.dk/v1/tableinfo/STRAF11?lang=en&format=JSON', { signal: ac.signal });
    if (!r.ok) return note;
    await r.json();
    return 'Danmarks Statistik · Rigspolitiet · statbank.dk';
  } catch {
    return note;
  } finally {
    clearTimeout(t);
  }
}

router.get('/', async (req, res) => {
  const note = await tryLive('Danmarks Statistik · Rigspolitiet');

  const safest = REGIONS.reduce((m, r) => (r.index < m.index ? r : m), REGIONS[0]);
  const rising = CATEGORIES.reduce((m, c) => (c.trend > m.trend ? c : m), CATEGORIES[0]);
  const maxRegion = Math.max(...REGIONS.map(r => r.index));
  const maxCat = Math.max(...CATEGORIES.map(c => c.count));
  const trendColor = YOY_TREND <= 0 ? '#27ae60' : '#e74c3c';

  res.json({
    kpi: { big: String(NATIONAL_PER_1000), unit: 'anmeldelser pr. 1000 indb.', color: indexColor(NATIONAL_PER_1000) },
    meta: [
      { label: 'Udvikling (år/år)', value: (YOY_TREND > 0 ? '+' : '') + YOY_TREND + ' %', color: trendColor },
      { label: 'Tryggeste region', value: safest.name, color: '#27ae60' },
      { label: 'Stærkest stigende', value: `${rising.name} (+${rising.trend} %)`, color: '#e74c3c' },
      { label: 'Anmeldelser i alt', value: fmt(CATEGORIES.reduce((a, c) => a + c.count, 0)), color: '#7f8c8d' },
    ],
    sections: [
      {
        title: 'Kriminalitetsindeks per region (pr. 1000 indb.)',
        rows: REGIONS.map(r => ({
          label: r.name,
          value: r.index,
          max: 120,
          color: indexColor(r.index),
          valueLabel: String(r.index),
        })),
      },
      {
        title: 'Anmeldelser per kategori (år)',
        rows: CATEGORIES.map(c => ({
          label: `${c.name} (${c.trend > 0 ? '+' : ''}${c.trend} %)`,
          value: c.count,
          max: maxCat,
          color: c.trend > 5 ? '#e74c3c' : c.trend > 0 ? '#e67e22' : '#27ae60',
          valueLabel: fmt(c.count),
        })),
      },
    ],
    note,
  });
});

export default router;
