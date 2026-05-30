import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const NATIONALBANK_URL =
  'https://nationalbanken.statistikbank.dk/api/v1/data/DNVALM/ISO.json?ISO=EUR%2CUSD%2CGBP%2CSEK%2CNOK&Periode=*&lang=da';

router.get('/rates', async (req, res) => {
  const cacheKey = 'nationalbank:rates';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const FALLBACK = {
    rates: { EUR: 7.462, USD: 6.843, GBP: 8.724, SEK: 0.618, NOK: 0.602 },
    period: null,
    source: 'Estimat (Danmarks Nationalbank utilgængelig)',
    fetched: new Date().toISOString(),
    isFallback: true
  };

  try {
    const data = await fetchJSON(NATIONALBANK_URL, { timeout: 10000 });

    const dataset = data?.dataset;
    if (!dataset) {
      cache.set(cacheKey, FALLBACK, 3600);
      return res.json(FALLBACK);
    }

    const isoLabels = dataset.dimension?.ISO?.category?.label || {};
    const periodeLabels = dataset.dimension?.Periode?.category?.label || {};
    const isoIndex = dataset.dimension?.ISO?.category?.index || {};
    const periodeIndex = dataset.dimension?.Periode?.category?.index || {};
    const values = dataset.value || [];

    const isoIds = Object.keys(isoLabels);
    const periodeIds = Object.keys(periodeLabels);
    const numPeriods = periodeIds.length;

    const latestPeriodeId = periodeIds.reduce((latest, id) => {
      const a = periodeIndex[latest] ?? -Infinity;
      const b = periodeIndex[id] ?? -Infinity;
      return b > a ? id : latest;
    }, periodeIds[0]);

    const latestPeriodeIdx = periodeIndex[latestPeriodeId] ?? (numPeriods - 1);

    const rates = {};
    for (const isoId of isoIds) {
      const isoIdx = isoIndex[isoId] ?? 0;
      const valueIdx = isoIdx * numPeriods + latestPeriodeIdx;
      const raw = values[valueIdx];
      if (raw != null) {
        rates[isoId] = Math.round(raw * 1000) / 1000;
      }
    }

    if (!Object.keys(rates).length) {
      cache.set(cacheKey, FALLBACK, 3600);
      return res.json(FALLBACK);
    }

    const result = {
      rates,
      period: latestPeriodeId || null,
      source: 'Danmarks Nationalbank',
      fetched: new Date().toISOString()
    };

    cache.set(cacheKey, result, 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[nationalbank] rates failed:', err.message);
    cache.set(cacheKey, FALLBACK, 3600);
    res.json(FALLBACK);
  }
});

export default router;
