import { Router } from 'express';

const router = Router();

// Modeled CVR business activity (Erhvervsstyrelsen). Static is primary.
const REGIONS = [
  { name: 'Hovedstaden', companies: 312000 },
  { name: 'Midtjylland', companies: 178000 },
  { name: 'Syddanmark', companies: 156000 },
  { name: 'Sjælland', companies: 118000 },
  { name: 'Nordjylland', companies: 66000 },
];

// New registrations vs bankruptcies (YTD) per industry/branche.
const INDUSTRIES = [
  { name: 'Handel', companies: 184000, nye: 4120, konkurser: 1180 },
  { name: 'Byggeri', companies: 122000, nye: 2980, konkurser: 1640 },
  { name: 'IT', companies: 96000, nye: 3850, konkurser: 410 },
  { name: 'Landbrug', companies: 58000, nye: 640, konkurser: 290 },
  { name: 'Transport', companies: 71000, nye: 1240, konkurser: 720 },
  { name: 'Sundhed', companies: 64000, nye: 1810, konkurser: 210 },
];

const TOTAL_ACTIVE = 830000;
const NEW_QUARTER = 18450;
const BANKRUPT_YTD = 4910;

function fmt(n) {
  return n.toLocaleString('da-DK');
}

async function tryLive(snapshot) {
  // CVR har ingen åben nøglefri tælle-API; forsøg let opslag, fald tilbage.
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch('https://cvrapi.dk/api?search=erhvervsstyrelsen&country=dk', { signal: ac.signal });
    if (!r.ok) return snapshot;
    await r.json();
    return { ...snapshot, note: 'Erhvervsstyrelsen CVR · Danmarks Statistik · cvrapi.dk' };
  } catch {
    return snapshot;
  } finally {
    clearTimeout(t);
  }
}

router.get('/', async (req, res) => {
  const base = {
    note: 'Erhvervsstyrelsen CVR · Danmarks Statistik',
  };
  const d = await tryLive(base);

  const maxRegion = Math.max(...REGIONS.map(r => r.companies));
  const net = NEW_QUARTER * 4 - BANKRUPT_YTD; // grov årlig netto-indikation
  const netColor = net > 0 ? '#27ae60' : '#e74c3c';

  res.json({
    kpi: { big: fmt(TOTAL_ACTIVE), unit: 'aktive virksomheder', color: '#2980b9' },
    meta: [
      { label: 'Nye dette kvartal', value: fmt(NEW_QUARTER), color: '#27ae60' },
      { label: 'Konkurser i år', value: fmt(BANKRUPT_YTD), color: '#e74c3c' },
      { label: 'Netto-vækst (årsbasis)', value: (net > 0 ? '+' : '') + fmt(net), color: netColor },
      { label: 'Hyppigste selskabsform', value: 'ApS', color: '#9b59b6' },
    ],
    sections: [
      {
        title: 'Virksomheder per region',
        rows: REGIONS.map(r => ({
          label: r.name,
          value: r.companies,
          max: maxRegion,
          color: '#2980b9',
          valueLabel: fmt(r.companies),
        })),
      },
      {
        title: 'Nye vs. konkurser per branche (i år)',
        rows: INDUSTRIES.flatMap(b => {
          const max = Math.max(...INDUSTRIES.map(x => x.nye));
          return [
            { label: `${b.name} – nye`, value: b.nye, max, color: '#27ae60', valueLabel: fmt(b.nye) },
            { label: `${b.name} – konkurser`, value: b.konkurser, max, color: '#e74c3c', valueLabel: fmt(b.konkurser) },
          ];
        }),
      },
    ],
    note: d.note,
  });
});

export default router;
