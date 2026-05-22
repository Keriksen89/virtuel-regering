import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const DST_BASE = 'https://api.statbank.dk/v1';

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * POST to DST /data endpoint and return parsed dataset.
 */
async function dstPost(body) {
  return fetchJSON(`${DST_BASE}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/**
 * Extract sorted time periods from JSON-STAT dimension object.
 * Returns array of {key, idx} sorted ascending by idx (i.e. oldest → newest).
 */
function getSortedPeriods(timeDim) {
  const idx = timeDim.category.index; // { period: order }
  return Object.entries(idx).sort((a, b) => a[1] - b[1]);
}

// ── inflation (PRIS111) ────────────────────────────────────────────────────

async function fetchInflation() {
  const body = {
    table: 'PRIS111',
    format: 'JSONSTAT',
    variables: [
      { code: 'art', values: ['*'] },
      { code: 'Tid', values: ['>=2024M01'] }
    ]
  };
  const data = await dstPost(body);
  const dataset = data.dataset || data;
  const values = dataset.value || [];

  const timeDim = dataset.dimension && (dataset.dimension.Tid || dataset.dimension.tid);
  const artDim  = dataset.dimension && (dataset.dimension.art  || dataset.dimension.Art);
  if (!timeDim || !artDim || !values.length) return null;

  const periods  = getSortedPeriods(timeDim);   // sorted oldest→newest
  const artIndex = artDim.category.index;        // { code: order }
  const artLabel = artDim.category.label;        // { code: label }

  // Find "I alt" art index (or fallback to 0)
  let artCode = Object.keys(artLabel).find(k => artLabel[k] === 'I alt') || Object.keys(artIndex)[0];
  const artOrd = artIndex[artCode];

  const nArt     = Object.keys(artIndex).length;
  const nPeriods = periods.length;

  // value array is flat: [art0_t0, art0_t1, ..., art1_t0, ...]  OR  [t0_art0, t0_art1, t1_art0, ...]
  // JSON-STAT dimension order from dataset.id / dataset.dimension keys
  const dimOrder = dataset.id || Object.keys(dataset.dimension);

  let latestVal = null, prevYearVal = null;
  const latestKey   = periods[periods.length - 1][0];
  const latestOrd   = timeDim.category.index[latestKey];

  // Try to find same-month previous year
  const prevKey = latestKey.replace(/(\d{4})M(\d{2})/, (_, y, m) => `${parseInt(y)-1}M${m}`);
  const prevOrd = timeDim.category.index[prevKey];

  // Determine dimension order
  const firstDim = dimOrder[0];
  const isArtFirst = firstDim === 'art' || firstDim === 'Art';

  if (isArtFirst) {
    latestVal   = values[artOrd * nPeriods + latestOrd];
    prevYearVal = prevOrd !== undefined ? values[artOrd * nPeriods + prevOrd] : null;
  } else {
    latestVal   = values[latestOrd * nArt + artOrd];
    prevYearVal = prevOrd !== undefined ? values[prevOrd * nArt + artOrd] : null;
  }

  if (latestVal == null) return null;

  const yoy = prevYearVal != null ? parseFloat(((latestVal - prevYearVal) / prevYearVal * 100).toFixed(2)) : null;

  return {
    value: parseFloat(latestVal.toFixed(2)),
    period: latestKey,
    yoy: yoy !== null ? yoy : parseFloat(latestVal.toFixed(2)),
    source: 'DST PRIS111'
  };
}

// ── housing prices (EJENDOM3 / HISB3) ─────────────────────────────────────

async function fetchHousing() {
  let data;
  let tableUsed = 'EJENDOM3';

  try {
    data = await dstPost({
      table: 'EJENDOM3',
      format: 'JSONSTAT',
      variables: [
        { code: 'EJENDOM', values: ['*'] },
        { code: 'Tid', values: ['>=2023K1'] }
      ]
    });
  } catch (e) {
    // Fallback table
    tableUsed = 'HISB3';
    data = await dstPost({
      table: 'HISB3',
      format: 'JSONSTAT',
      variables: [
        { code: 'Tid', values: ['>=2023K1'] }
      ]
    });
  }

  const dataset = data.dataset || data;
  const values  = dataset.value || [];
  const timeDim = dataset.dimension && (dataset.dimension.Tid || dataset.dimension.tid);
  if (!timeDim || !values.length) return null;

  const periods = getSortedPeriods(timeDim);
  if (periods.length < 2) return null;

  const dimOrder = dataset.id || Object.keys(dataset.dimension);
  const nPeriods = periods.length;

  // If multiple dimensions, pick first category of non-time dim
  let latestVal = null, prevVal = null;

  const timeIsFirst = (dimOrder[0] === 'Tid' || dimOrder[0] === 'tid');

  if (dimOrder.length === 1) {
    // Only time dimension
    latestVal = values[nPeriods - 1];
    prevVal   = values[nPeriods - 2];
  } else {
    // Take first category of non-time dim
    const otherDim  = dataset.dimension[dimOrder.find(d => d !== 'Tid' && d !== 'tid')];
    const nOther    = Object.keys(otherDim.category.index).length;
    const latestOrd = periods[periods.length - 1][1];
    const prevOrd   = periods[periods.length - 2][1];

    if (timeIsFirst) {
      latestVal = values[latestOrd * nOther + 0];
      prevVal   = values[prevOrd   * nOther + 0];
    } else {
      latestVal = values[0 * nPeriods + latestOrd];
      prevVal   = values[0 * nPeriods + prevOrd];
    }
  }

  if (latestVal == null || prevVal == null) return null;

  const qoq = parseFloat(((latestVal - prevVal) / prevVal * 100).toFixed(2));
  return {
    value: parseFloat(latestVal.toFixed(1)),
    period: periods[periods.length - 1][0],
    qoq,
    source: `DST ${tableUsed}`
  };
}

// ── wage growth (LONS20) ───────────────────────────────────────────────────

async function fetchWageGrowth() {
  const data = await dstPost({
    table: 'LONS20',
    format: 'JSONSTAT',
    variables: [
      { code: 'sektor', values: ['*'] },
      { code: 'Tid', values: ['>=2022'] }
    ]
  });

  const dataset = data.dataset || data;
  const values  = dataset.value || [];
  const timeDim = dataset.dimension && (dataset.dimension.Tid || dataset.dimension.tid);
  if (!timeDim || !values.length) return null;

  const periods = getSortedPeriods(timeDim);
  if (periods.length < 2) return null;

  const dimOrder = dataset.id || Object.keys(dataset.dimension);
  const nPeriods = periods.length;
  const timeIsFirst = (dimOrder[0] === 'Tid' || dimOrder[0] === 'tid');

  let latestVal = null, prevVal = null;
  if (dimOrder.length === 1) {
    latestVal = values[nPeriods - 1];
    prevVal   = values[nPeriods - 2];
  } else {
    const otherKey = dimOrder.find(d => d !== 'Tid' && d !== 'tid');
    const otherDim = dataset.dimension[otherKey];
    // Try to find "I alt" or "Alle sektorer" or index 0
    const otherIdx   = otherDim.category.index;
    const otherLabel = otherDim.category.label;
    const iAltCode   = Object.keys(otherLabel).find(k =>
      /i alt|alle/i.test(otherLabel[k])
    ) || Object.keys(otherIdx)[0];
    const iAltOrd  = otherIdx[iAltCode];
    const nOther   = Object.keys(otherIdx).length;
    const latestOrd = periods[periods.length - 1][1];
    const prevOrd   = periods[periods.length - 2][1];

    if (timeIsFirst) {
      latestVal = values[latestOrd * nOther + iAltOrd];
      prevVal   = values[prevOrd   * nOther + iAltOrd];
    } else {
      latestVal = values[iAltOrd * nPeriods + latestOrd];
      prevVal   = values[iAltOrd * nPeriods + prevOrd];
    }
  }

  if (latestVal == null || prevVal == null) return null;

  const yoy = parseFloat(((latestVal - prevVal) / prevVal * 100).toFixed(2));
  return {
    value: parseFloat(latestVal.toFixed(1)),
    period: periods[periods.length - 1][0],
    yoy,
    source: 'DST LONS20'
  };
}

// ── routes ─────────────────────────────────────────────────────────────────

router.get('/economic', async (req, res) => {
  const cacheKey = 'livedata:economic';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const FALLBACK = {
    inflation:  { value: 2.1,  period: '2025M03', yoy: 2.1,  source: 'Estimat (DST PRIS111 utilgængelig)' },
    housing:    { value: 142.3, period: '2024K4', qoq: 1.8,  source: 'Estimat (DST EJENDOM3 utilgængelig)' },
    nbRate:     { value: 3.35, note: 'Nationalbankens udlånsrente (maj 2026)' },
    wageGrowth: { value: 3.2,  period: '2025',   yoy: 3.2,  source: 'Estimat (DST LONS20 utilgængelig)', note: 'Estimat' }
  };

  const [inflRes, houRes, wagRes] = await Promise.allSettled([
    fetchInflation().catch(() => null),
    fetchHousing().catch(() => null),
    fetchWageGrowth().catch(() => null)
  ]);

  const result = {
    inflation:  (inflRes.status === 'fulfilled' && inflRes.value) ? inflRes.value : FALLBACK.inflation,
    housing:    (houRes.status  === 'fulfilled' && houRes.value)  ? houRes.value  : FALLBACK.housing,
    nbRate:     FALLBACK.nbRate,
    wageGrowth: (wagRes.status  === 'fulfilled' && wagRes.value)  ? wagRes.value  : FALLBACK.wageGrowth,
    fetched:    new Date().toISOString()
  };

  cache.set(cacheKey, result, 6 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

router.get('/climate', (req, res) => {
  const cacheKey = 'livedata:climate';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const result = {
    baseline_1990: 69.6,
    target_2030_pct: 70,
    target_2030_mt: 20.9,
    current_year: 2023,
    current_mt: 42.1,
    current_pct_reduction: 39.5,
    on_track: false,
    gap_mt: 21.2,
    required_annual_reduction_pct: 8.5,
    sources: ['Klimarådet 2024', 'DST ENV1', "Denmark's National Inventory Report 2024"],
    note: 'CO2-ækvivalenter ekskl. LULUCF. Kilde: Klimarådet statusrapport 2024.'
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

router.get('/inequality', (req, res) => {
  const cacheKey = 'livedata:inequality';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const result = {
    gini_2023: 28.9,
    gini_2015: 28.2,
    gini_eu_avg: 30.3,
    gini_trend: 'rising',
    p90_p10_ratio: 5.8,
    bottom_10pct_income_share: 3.1,
    top_10pct_income_share: 23.2,
    child_poverty_pct: 5.4,
    source: 'DST INDKP101 + Eurostat (2023)',
    note: 'Gini-koefficient for disponibel indkomst. Danmark er blandt EUs mest ligelige lande.'
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

export default router;
