import { Router } from 'express';

const router = Router();

// Air quality per Danish region (modeled, EEA-style european AQI 0..100 scale where lower is better)
const REGIONS = [
  { name: 'Hovedstaden',     aqi: 38, pm25: 9.1,  no2: 22.4, o3: 61 },
  { name: 'Sjælland',        aqi: 31, pm25: 7.3,  no2: 14.8, o3: 64 },
  { name: 'Syddanmark',      aqi: 34, pm25: 8.0,  no2: 16.2, o3: 66 },
  { name: 'Midtjylland',     aqi: 29, pm25: 6.8,  no2: 13.1, o3: 62 },
  { name: 'Nordjylland',     aqi: 26, pm25: 6.1,  no2: 11.0, o3: 59 }
];

// City measurement stations
const STATIONS = [
  { name: 'København H.C. Andersens Blvd', lat: 55.6736, lon: 12.5675, aqi: 47, pm25: 11.2, no2: 34.1 },
  { name: 'København Jagtvej',             lat: 55.6979, lon: 12.5519, aqi: 42, pm25: 10.1, no2: 28.7 },
  { name: 'Frederiksberg',                 lat: 55.6786, lon: 12.5318, aqi: 36, pm25: 8.9,  no2: 21.0 },
  { name: 'Roskilde',                      lat: 55.6415, lon: 12.0803, aqi: 30, pm25: 7.1,  no2: 13.4 },
  { name: 'Odense Rådhus',                 lat: 55.3959, lon: 10.3883, aqi: 35, pm25: 8.4,  no2: 18.9 },
  { name: 'Esbjerg',                       lat: 55.4765, lon: 8.4594,  aqi: 28, pm25: 6.7,  no2: 12.1 },
  { name: 'Kolding',                       lat: 55.4904, lon: 9.4722,  aqi: 33, pm25: 7.9,  no2: 15.6 },
  { name: 'Aarhus Banegårdsgade',          lat: 56.1496, lon: 10.2045, aqi: 40, pm25: 9.6,  no2: 24.8 },
  { name: 'Aarhus Botanisk Have',          lat: 56.1629, lon: 10.1928, aqi: 27, pm25: 6.3,  no2: 10.2 },
  { name: 'Aalborg',                       lat: 57.0488, lon: 9.9217,  aqi: 25, pm25: 5.9,  no2: 9.4 },
  { name: 'Risø (baggrund)',               lat: 55.6929, lon: 12.0858, aqi: 22, pm25: 5.1,  no2: 6.8 },
  { name: 'Rønne',                         lat: 55.1006, lon: 14.7065, aqi: 24, pm25: 5.6,  no2: 8.1 }
];

function aqiColorHex(aqi) {
  if (aqi <= 25) return '#2ecc71';   // green (good)
  if (aqi <= 50) return '#f1c40f';   // yellow (fair)
  if (aqi <= 75) return '#e67e22';   // orange (moderate)
  return '#e74c3c';                  // red (poor)
}
function aqiColorRGB(aqi) {
  if (aqi <= 25) return [46, 204, 113];
  if (aqi <= 50) return [241, 196, 15];
  if (aqi <= 75) return [230, 126, 34];
  return [231, 76, 60];
}
function aqiLabel(aqi) {
  if (aqi <= 25) return 'God';
  if (aqi <= 50) return 'Rimelig';
  if (aqi <= 75) return 'Moderat';
  return 'Dårlig';
}

async function tryLive() {
  const url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=55.67&longitude=12.57&current=pm2_5,nitrogen_dioxide,ozone,european_aqi';
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const c = j.current;
    if (!c) return null;
    return { pm25: c.pm2_5, no2: c.nitrogen_dioxide, o3: c.ozone, aqi: c.european_aqi };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

router.get('/', async (req, res) => {
  const stations = STATIONS.map(s => ({ ...s }));
  const regions = REGIONS.map(r => ({ ...r }));

  const live = await tryLive();
  if (live && Number.isFinite(live.aqi)) {
    // patch Copenhagen station + Hovedstaden region with live values
    stations[0].aqi = Math.round(live.aqi);
    stations[0].pm25 = Math.round(live.pm25 * 10) / 10;
    stations[0].no2 = Math.round(live.no2 * 10) / 10;
    regions[0].aqi = Math.round(live.aqi);
    regions[0].pm25 = Math.round(live.pm25 * 10) / 10;
    regions[0].no2 = Math.round(live.no2 * 10) / 10;
    regions[0].o3 = Math.round(live.o3);
  }

  const nationalAqi = Math.round(regions.reduce((a, r) => a + r.aqi, 0) / regions.length);
  const meanPm25 = Math.round((regions.reduce((a, r) => a + r.pm25, 0) / regions.length) * 10) / 10;
  const meanNo2 = Math.round((regions.reduce((a, r) => a + r.no2, 0) / regions.length) * 10) / 10;
  const worst = stations.reduce((m, s) => (s.aqi > m.aqi ? s : m), stations[0]);

  res.json({
    kpi: { big: String(nationalAqi), unit: 'AQI (EEA-indeks)', color: aqiColorHex(nationalAqi) },
    meta: [
      { label: 'Vurdering', value: aqiLabel(nationalAqi), color: aqiColorHex(nationalAqi) },
      { label: 'Højeste station', value: `${worst.name} (${worst.aqi})`, color: aqiColorHex(worst.aqi) },
      { label: 'Gns. PM2.5', value: `${meanPm25} µg/m³` },
      { label: 'Gns. NO₂', value: `${meanNo2} µg/m³` },
      { label: 'Aktive stationer', value: String(stations.length) }
    ],
    sections: [
      {
        title: 'Luftkvalitetsindeks per region',
        rows: regions.map(r => ({
          label: r.name,
          value: r.aqi,
          max: 100,
          color: aqiColorHex(r.aqi),
          valueLabel: `${r.aqi} (${aqiLabel(r.aqi)})`
        }))
      },
      {
        title: 'Forureningskomponenter (nationalt gns.)',
        rows: [
          { label: 'PM2.5', value: meanPm25, max: 25, color: '#9b59b6', valueLabel: `${meanPm25} µg/m³` },
          { label: 'NO₂', value: meanNo2, max: 40, color: '#3498db', valueLabel: `${meanNo2} µg/m³` },
          { label: 'O₃ (ozon)', value: Math.round(regions.reduce((a, r) => a + r.o3, 0) / regions.length), max: 120, color: '#1abc9c', valueLabel: `${Math.round(regions.reduce((a, r) => a + r.o3, 0) / regions.length)} µg/m³` }
        ]
      }
    ],
    note: 'Open-Meteo Air Quality · EEA model'
  });
});

router.get('/points', async (req, res) => {
  const stations = STATIONS.map(s => ({ ...s }));
  const live = await tryLive();
  if (live && Number.isFinite(live.aqi)) {
    stations[0].aqi = Math.round(live.aqi);
    stations[0].pm25 = Math.round(live.pm25 * 10) / 10;
    stations[0].no2 = Math.round(live.no2 * 10) / 10;
  }

  res.json({
    points: stations.map(s => ({
      lat: s.lat,
      lon: s.lon,
      color: aqiColorRGB(s.aqi),
      size: 9 + Math.round(s.aqi / 8),
      kind: 'luftmaaling',
      tip: {
        title: s.name,
        rows: [
          ['AQI', `${s.aqi} (${aqiLabel(s.aqi)})`],
          ['PM2.5', `${s.pm25} µg/m³`],
          ['NO₂', `${s.no2} µg/m³`]
        ]
      }
    }))
  });
});

export default router;
