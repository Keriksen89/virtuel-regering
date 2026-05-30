import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const GRIDFREQ_URL = 'https://api.energidataservice.dk/dataset/PowerSystemRightNow?limit=1&sort=Minutes5UTC%20DESC';

router.get('/frequency', async (req, res) => {
  const cacheKey = 'gridfreq:frequency';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const FALLBACK = {
    frequency: 50.01,
    imbalance: -42,
    regUp: 380,
    regDown: 290,
    period: null,
    source: 'Estimat',
    isFallback: true
  };

  try {
    const data = await fetchJSON(GRIDFREQ_URL, { timeout: 8000 });

    const record = (data.records || data.result?.records || [])[0];
    if (!record) {
      cache.set(cacheKey, FALLBACK, 30);
      return res.json(FALLBACK);
    }

    const result = {
      frequency: record.FrequencyAct ?? null,
      imbalance: record.ImbalanceMW ?? null,
      regUp: record.ConnectedRegulatoryPowerUpMW ?? null,
      regDown: record.ConnectedRegulatoryPowerDownMW ?? null,
      balancingUp: record.BalancingPowerUpMW ?? null,
      balancingDown: record.BalancingPowerDownMW ?? null,
      period: record.Minutes5UTC || null,
      fetched: new Date().toISOString(),
      source: 'Energidata.dk PowerSystemRightNow'
    };

    cache.set(cacheKey, result, 30);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[gridfreq] frequency failed:', err.message);
    cache.set(cacheKey, FALLBACK, 30);
    res.json(FALLBACK);
  }
});

export default router;
