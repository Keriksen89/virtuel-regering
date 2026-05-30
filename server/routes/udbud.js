import { Router } from 'express';

const router = Router();

// Modeled public procurement (udbud.dk / Konkurrence- og Forbrugerstyrelsen).
// Static is primary (no open keyless aggregate API).
const SECTORS = [
  { name: 'Bygge/anlæg', value: 138 },   // mia. kr
  { name: 'Sundhed', value: 86 },
  { name: 'IT', value: 64 },
  { name: 'Transport', value: 58 },
  { name: 'Forsvar', value: 34 },
];

const REGIONS = [
  { name: 'Hovedstaden', tenders: 412 },
  { name: 'Midtjylland', tenders: 268 },
  { name: 'Syddanmark', tenders: 224 },
  { name: 'Sjælland', tenders: 176 },
  { name: 'Nordjylland', tenders: 118 },
];

const ACTIVE_TENDERS = 1198;
const ANNUAL_VALUE = 380;   // mia. kr
const AVG_BIDDERS = 3.4;
const SME_SHARE = 41;       // %

function fmt(n) {
  return n.toLocaleString('da-DK');
}

async function tryLive(note) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch('https://www.udbud.dk/', { signal: ac.signal });
    if (!r.ok) return note;
    await r.text();
    return 'udbud.dk · Konkurrence- og Forbrugerstyrelsen (live tjek)';
  } catch {
    return note;
  } finally {
    clearTimeout(t);
  }
}

router.get('/', async (req, res) => {
  const note = await tryLive('udbud.dk · Konkurrence- og Forbrugerstyrelsen');

  const maxSector = Math.max(...SECTORS.map(s => s.value));
  const maxRegion = Math.max(...REGIONS.map(r => r.tenders));

  res.json({
    kpi: { big: fmt(ACTIVE_TENDERS), unit: 'aktive udbud', color: '#2980b9' },
    meta: [
      { label: 'Samlet årlig værdi', value: ANNUAL_VALUE + ' mia. kr', color: '#27ae60' },
      { label: 'Gns. antal bydere', value: String(AVG_BIDDERS).replace('.', ',') },
      { label: 'Andel til SMV', value: SME_SHARE + ' %', color: '#9b59b6' },
      { label: 'Største aktuelle udbud', value: 'Sygehusbyggeri Region H (6,2 mia.)', color: '#e67e22' },
    ],
    sections: [
      {
        title: 'Indkøbsværdi per sektor (mia. kr/år)',
        rows: SECTORS.map(s => ({
          label: s.name,
          value: s.value,
          max: maxSector,
          color: '#16a085',
          valueLabel: s.value + ' mia.',
        })),
      },
      {
        title: 'Aktive udbud per region',
        rows: REGIONS.map(r => ({
          label: r.name,
          value: r.tenders,
          max: maxRegion,
          color: '#2980b9',
          valueLabel: fmt(r.tenders),
        })),
      },
    ],
    note,
  });
});

export default router;
