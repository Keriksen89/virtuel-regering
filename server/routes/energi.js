import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const ENERGI_BASE = 'https://api.energidataservice.dk/v1/dataset';

router.get('/current', async (req, res) => {
  const cacheKey = 'energi:current';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const FALLBACK = {
    wind_onshore: 1450,
    wind_offshore: 2100,
    solar: 320,
    central: 680,
    decentral: 210,
    exchange: -350,
    total: 4760,
    renewablePct: 82,
    fetched: new Date().toISOString(),
    source: 'Estimat (Energidata.dk utilgængelig)',
    isFallback: true
  };

  try {
    const url = `${ENERGI_BASE}/ElectricityProdex5MinRealtime?limit=1&sort=Minutes5DK%20DESC`;
    const data = await fetchJSON(url, { timeout: 8000 });

    const record = (data.records || data.result?.records || [])[0];
    if (!record) {
      cache.set(cacheKey, FALLBACK, 5 * 60);
      return res.json(FALLBACK);
    }

    const windOn  = record.Wind_Onshore_MWh  || 0;
    const windOff = record.Wind_Offshore_MWh || 0;
    const solar   = record.Solar_Power_MWh   || 0;
    const central = record.Central_Power_MWh || 0;
    const decent  = record.Decentral_Power_MWh || 0;
    const exchange = record.Exchange_Sum_MWh  || 0;

    const production = windOn + windOff + solar + central + decent;
    const renewables  = windOn + windOff + solar;
    const renewablePct = production > 0 ? Math.round(renewables / production * 100) : 0;

    const result = {
      wind_onshore:  Math.round(windOn),
      wind_offshore: Math.round(windOff),
      solar:         Math.round(solar),
      central:       Math.round(central),
      decentral:     Math.round(decent),
      exchange:      Math.round(exchange),
      total:         Math.round(production),
      renewablePct,
      period:        record.Minutes5DK || record.HourDK,
      fetched:       new Date().toISOString(),
      source:        'Energidata.dk ElectricityProdex5MinRealtime'
    };

    cache.set(cacheKey, result, 5 * 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[energi] current failed:', err.message);
    cache.set(cacheKey, FALLBACK, 5 * 60);
    res.json(FALLBACK);
  }
});

router.get('/daily', async (req, res) => {
  const cacheKey = 'energi:daily';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const FALLBACK_DAILY = {
    hours: Array.from({ length: 24 }, (_, i) => i),
    wind:  [1800,1750,1700,1680,1650,1700,1750,1900,2100,2200,2300,2250,2100,2050,2000,1950,2100,2200,2300,2400,2350,2200,2000,1900],
    solar: [0,0,0,0,0,20,120,280,450,600,700,750,720,680,600,450,280,120,30,0,0,0,0,0],
    source: 'Estimat',
    isFallback: true
  };

  try {
    const url = `${ENERGI_BASE}/Elspotprices?limit=24&sort=HourDK%20DESC&columns=HourDK,SpotPriceDKK`;
    const data = await fetchJSON(url, { timeout: 8000 });
    const records = (data.records || data.result?.records || []).reverse();

    if (!records.length) {
      cache.set(cacheKey, FALLBACK_DAILY, 30 * 60);
      return res.json(FALLBACK_DAILY);
    }

    const result = {
      spotPrices: records.map(r => ({
        hour: new Date(r.HourDK).getHours(),
        price: r.SpotPriceDKK != null ? Math.round(r.SpotPriceDKK * 100) / 100 : null
      })),
      fetched: new Date().toISOString(),
      source: 'Energidata.dk Elspotprices'
    };

    cache.set(cacheKey, result, 30 * 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[energi] daily failed:', err.message);
    cache.set(cacheKey, FALLBACK_DAILY, 30 * 60);
    res.json(FALLBACK_DAILY);
  }
});

export default router;
