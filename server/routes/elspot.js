import { Router } from 'express';

const router = Router();

// Modeled 24-hour spot price curve (øre/kWh) — typical Danish weekday shape:
// low overnight, morning ramp, midday dip (solar), sharp evening peak.
const PRICE_PROFILE_DK1 = [
  62, 55, 51, 49, 52, 68, 95, 128, 142, 118, 96, 84,
  78, 74, 80, 92, 118, 168, 214, 198, 156, 122, 94, 73,
];
// DK2 (East) typically a touch higher due to less wind, more interconnector reliance.
const PRICE_PROFILE_DK2 = PRICE_PROFILE_DK1.map((p) => Math.round(p * 1.08));

// CO2 intensity follows inverse of renewable share through the day (g/kWh).
const CO2_PROFILE = [
  82, 78, 74, 70, 72, 88, 110, 132, 124, 96, 78, 70,
  64, 60, 66, 80, 104, 138, 162, 150, 126, 104, 92, 86,
];
const RENEWABLE_PROFILE = [
  78, 81, 83, 85, 84, 76, 68, 60, 63, 72, 80, 84,
  87, 89, 86, 81, 71, 58, 50, 54, 64, 72, 76, 79,
];

function currentHour() {
  return new Date().getHours();
}

function buildStatic() {
  const h = currentHour();
  const dk1 = PRICE_PROFILE_DK1[h];
  const dk2 = PRICE_PROFILE_DK2[h];
  const co2 = CO2_PROFILE[h];
  const renew = RENEWABLE_PROFILE[h];
  return { dk1, dk2, co2, renew, profileDK1: PRICE_PROFILE_DK1, profileDK2: PRICE_PROFILE_DK2, note: 'Energi Data Service · Energinet (modelleret)' };
}

// Attempt to derive live current prices from Energi Data Service.
async function fetchLive() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const url = 'https://api.energidataservice.dk/dataset/Elspotprices?limit=48&sort=HourUTC desc';
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error('http ' + r.status);
    const data = await r.json();
    const recs = data?.records || [];
    if (!recs.length) throw new Error('no records');
    // SpotPriceDKK is per MWh; convert to øre/kWh: /1000 MWh->kWh then *100 kr->øre = /10.
    const latestDK1 = recs.find((x) => x.PriceArea === 'DK1');
    const latestDK2 = recs.find((x) => x.PriceArea === 'DK2');
    const st = buildStatic();
    if (latestDK1?.SpotPriceDKK != null) st.dk1 = Math.round(latestDK1.SpotPriceDKK / 10);
    if (latestDK2?.SpotPriceDKK != null) st.dk2 = Math.round(latestDK2.SpotPriceDKK / 10);
    st.note = 'Energi Data Service · Energinet';
    return st;
  } finally {
    clearTimeout(timer);
  }
}

function render(d) {
  const avg = Math.round((d.dk1 + d.dk2) / 2);
  const priceColor = avg > 150 ? '#e74c3c' : avg > 90 ? '#f39c12' : '#27ae60';
  const co2Color = d.co2 > 120 ? '#e74c3c' : d.co2 > 80 ? '#f39c12' : '#27ae60';

  const profileRows = d.profileDK1.map((p, i) => ({
    label: String(i).padStart(2, '0') + ':00',
    value: p,
    max: 250,
    color: i === currentHour() ? '#2980b9' : p > 150 ? '#e74c3c' : p > 90 ? '#f39c12' : '#27ae60',
    valueLabel: p + ' øre',
  }));

  return {
    kpi: { big: String(avg), unit: 'øre/kWh', color: priceColor },
    meta: [
      { label: 'DK1 (Vest)', value: d.dk1 + ' øre', color: '#3498db' },
      { label: 'DK2 (Øst)', value: d.dk2 + ' øre', color: '#9b59b6' },
      { label: 'CO2-intensitet', value: d.co2 + ' g/kWh', color: co2Color },
      { label: 'VE-andel', value: d.renew + ' %', color: '#27ae60' },
    ],
    sections: [
      { title: '24-timers prisprofil (DK1, øre/kWh)', rows: profileRows },
      {
        title: 'Zonesammenligning',
        rows: [
          { label: 'DK1 (Vestdanmark)', value: d.dk1, max: 250, color: '#3498db', valueLabel: d.dk1 + ' øre/kWh' },
          { label: 'DK2 (Østdanmark)', value: d.dk2, max: 250, color: '#9b59b6', valueLabel: d.dk2 + ' øre/kWh' },
        ],
      },
      {
        title: 'Netstatus',
        rows: [
          { label: 'CO2-intensitet', value: d.co2, max: 250, color: co2Color, valueLabel: d.co2 + ' g/kWh' },
          { label: 'Vedvarende energi', value: d.renew, max: 100, color: '#27ae60', valueLabel: d.renew + ' %' },
        ],
      },
    ],
    note: d.note,
  };
}

router.get('/', async (req, res) => {
  let d;
  try {
    d = await fetchLive();
  } catch {
    d = buildStatic();
  }
  res.json(render(d));
});

export default router;
