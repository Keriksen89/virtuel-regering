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

router.get('/sundhed', (req, res) => {
  const cacheKey = 'livedata:sundhed';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const result = {
    lifeExpectancy: {
      men: 79.3, women: 83.2, total: 81.3,
      euAvgMen: 78.5, euAvgWomen: 83.8,
      trend: [{ year: 2015, val: 80.2 }, { year: 2018, val: 80.8 }, { year: 2021, val: 80.9 }, { year: 2023, val: 81.3 }],
      source: 'DST HISB8 / Eurostat 2023'
    },
    sickDays: {
      avgPerEmployee: 9.8,
      public: 13.2,
      private: 8.1,
      trend: [{ year: 2018, val: 9.2 }, { year: 2019, val: 9.4 }, { year: 2020, val: 8.8 }, { year: 2021, val: 9.1 }, { year: 2022, val: 10.1 }, { year: 2023, val: 9.8 }],
      source: 'DST SYGDAG / DA arbejdsmarked'
    },
    mentalHealth: {
      stressPct: 28.4,
      depressionPct: 8.2,
      anxietyPct: 10.1,
      burnoutPct: 12.3,
      source: 'Sundhedsstyrelsen Danskernes Sundhed 2023'
    },
    healthSpending: {
      pctGDP: 10.7,
      perCapitaEUR: 5820,
      euAvgPctGDP: 9.2,
      source: 'OECD Health Data 2023'
    },
    obesity: {
      pct: 17.8,
      euAvg: 17.0,
      trend: [{ year: 2010, val: 13.2 }, { year: 2015, val: 15.4 }, { year: 2019, val: 16.8 }, { year: 2023, val: 17.8 }],
      source: 'Statens Institut for Folkesundhed 2023'
    },
    smoking: {
      dailyPct: 12.5,
      trend: [{ year: 2000, val: 30.0 }, { year: 2010, val: 21.0 }, { year: 2017, val: 17.0 }, { year: 2023, val: 12.5 }],
      source: 'Sundhedsstyrelsen 2023'
    },
    fetched: new Date().toISOString()
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

router.get('/forbrug', async (req, res) => {
  const cacheKey = 'livedata:forbrug';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  // Static consumption indicators (DST BIL7 car registrations + Detailhandlen)
  const result = {
    carRegistrations: {
      latestMonth: '2025M03',
      newCars: 18420,
      electricShare: 42.3,
      trend: [
        { month: '2024M04', total: 15800, ev: 35.2 },
        { month: '2024M07', total: 16200, ev: 37.1 },
        { month: '2024M10', total: 17100, ev: 39.4 },
        { month: '2025M01', total: 16900, ev: 40.1 },
        { month: '2025M03', total: 18420, ev: 42.3 }
      ],
      source: 'DST BIL7'
    },
    retail: {
      indexLatest: 108.3,
      yoy: 2.1,
      trend: [
        { year: 2020, idx: 100 },
        { year: 2021, idx: 106.2 },
        { year: 2022, idx: 104.8 },
        { year: 2023, idx: 105.9 },
        { year: 2024, idx: 107.4 },
        { year: 2025, idx: 108.3 }
      ],
      source: 'DST IBYRHP'
    },
    savings: {
      householdSavingsRate: 8.2,
      debtToIncomePct: 242,
      source: 'DST NATK3 / Nationalbanken'
    },
    consumerConfidence: {
      index: 3.2,
      prev: -1.8,
      trend: [
        { month: '2024M10', val: -4.2 },
        { month: '2024M12', val: -2.1 },
        { month: '2025M02', val: 1.4 },
        { month: '2025M04', val: 3.2 }
      ],
      source: 'DST FORV (forbrugertillid)'
    },
    fetched: new Date().toISOString()
  };

  cache.set(cacheKey, result, 6 * 3600);
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

// ── ventetider (hospital waiting times) ────────────────────────────────────

router.get('/ventetider', (req, res) => {
  const cacheKey = 'livedata:ventetider';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const result = {
    updated: '2026-Q1',
    nationalAvgDays: 38,
    note: 'Gennemsnitlig ventetid på planlagte behandlinger. Kilde: Sundhedsdatastyrelsen 2025/2026.',
    specialties: [
      { name: 'Ortopædi', avgDays: 56, maxDays: 120, region: 'Nationalt' },
      { name: 'Psykiatri (voksne)', avgDays: 130, maxDays: 300, region: 'Nationalt' },
      { name: 'Kræftbehandling', avgDays: 14, maxDays: 28, region: 'Nationalt' },
      { name: 'Almen kirurgi', avgDays: 42, maxDays: 90, region: 'Nationalt' },
      { name: 'Hjertesygdomme', avgDays: 21, maxDays: 60, region: 'Nationalt' },
      { name: 'Øjenafdelingen', avgDays: 48, maxDays: 110, region: 'Nationalt' },
      { name: 'Neurologi', avgDays: 38, maxDays: 85, region: 'Nationalt' },
      { name: 'Børnepsykiatri', avgDays: 180, maxDays: 365, region: 'Nationalt' },
      { name: 'Reumatologi', avgDays: 65, maxDays: 140, region: 'Nationalt' },
      { name: 'Gynækologi', avgDays: 30, maxDays: 70, region: 'Nationalt' },
    ],
    byRegion: [
      { region: 'Region Hovedstaden', avgDays: 42, trend: 'stigende' },
      { region: 'Region Sjælland', avgDays: 45, trend: 'stabil' },
      { region: 'Region Syddanmark', avgDays: 35, trend: 'faldende' },
      { region: 'Region Midtjylland', avgDays: 33, trend: 'faldende' },
      { region: 'Region Nordjylland', avgDays: 38, trend: 'stabil' },
    ],
    target: {
      maxWaitDays: 30,
      pctWithinTarget: 61,
      note: '30-dages behandlingsgaranti. 61% af patienter behandles inden for fristen.'
    },
    trend: [
      { year: 2020, avgDays: 28 },
      { year: 2021, avgDays: 35 },
      { year: 2022, avgDays: 42 },
      { year: 2023, avgDays: 40 },
      { year: 2024, avgDays: 38 },
      { year: 2025, avgDays: 38 },
    ],
    fetched: new Date().toISOString()
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

// ── DSB (train punctuality + investment gap) ────────────────────────────────

router.get('/dsb', (req, res) => {
  const cacheKey = 'livedata:dsb';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const result = {
    updated: '2025-Q4',
    punctuality: {
      pct2025: 85.2,
      pct2024: 83.8,
      pct2023: 82.1,
      target: 90.0,
      note: 'Andel tog der ankommer til tiden (under 3 min. forsinkede). Mål: 90%. Kilde: DSB Årsrapport 2025.',
      trend: [
        { year: 2019, pct: 88.4 },
        { year: 2020, pct: 91.2 },
        { year: 2021, pct: 87.6 },
        { year: 2022, pct: 81.3 },
        { year: 2023, pct: 82.1 },
        { year: 2024, pct: 83.8 },
        { year: 2025, pct: 85.2 },
      ]
    },
    infrastructure: {
      signalAgeAvgYears: 38,
      pctOver30Years: 62,
      investmentAllocatedBn: 1.2,
      investmentNeededBn: 5.0,
      investmentGapBn: 3.8,
      note: 'Infrastrukturefterslæb: 1,2 mia. kr. bevilget vs. 5 mia. kr. behovet (2025-2030). Kilde: Transportministeriet.',
    },
    disruptions: {
      majorEvents2024: 14,
      majorEvents2025: 11,
      topCauses: [
        { cause: 'Signalsvigt', pct: 34 },
        { cause: 'Infrastruktur', pct: 28 },
        { cause: 'Vejrforhold', pct: 18 },
        { cause: 'Materielfejl', pct: 12 },
        { cause: 'Øvrige', pct: 8 },
      ]
    },
    satisfaction: {
      trustpilotScore: 1.8,
      customerSatisfactionIndex: 63,
      note: 'DSB Trustpilot (maj 2026). Kundetilfredshedsindeks: 63/100 (EPSI 2025).'
    },
    electrificationPct: 31,
    electrificationTarget2030Pct: 55,
    fetched: new Date().toISOString()
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

// ── Ældrepleje (eldercare metrics) ─────────────────────────────────────────

router.get('/aeldrepleje', (req, res) => {
  const cacheKey = 'livedata:aeldrepleje';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const result = {
    updated: '2025',
    workforce: {
      currentFTEs: 60000,
      shortfall2035: 15000,
      shortfallPctOfWorkforce: 25,
      turnoverRatePct: 31,
      vacancyRatePct: 9.2,
      note: 'Mangel på 15.000 SOSU-medarbejdere forventet i 2035 (25% af arbejdsstyrken). Kilde: KL/VIVE 2024.',
    },
    quality: {
      nationalScore: 72,
      note: 'Nationalt kvalitetsscore (0–100) for plejecentre, baseret på tilsynsrapporter. Kilde: Socialtilsyn 2025.',
      byRegion: [
        { region: 'Region Midtjylland',   score: 76, staffRatio: 0.41 },
        { region: 'Region Nordjylland',   score: 74, staffRatio: 0.40 },
        { region: 'Region Syddanmark',    score: 73, staffRatio: 0.38 },
        { region: 'Region Sjælland',      score: 70, staffRatio: 0.36 },
        { region: 'Region Hovedstaden',   score: 68, staffRatio: 0.34 },
      ]
    },
    costs: {
      avgCostPerCitizenDKK: 385000,
      totalBudgetBn: 40.2,
      note: 'Gennemsnitlig kommunal udgift pr. ældre med pleje (plejecenter). Kilde: ECO Analyse / KL 2025.',
      trend: [
        { year: 2020, costDKK: 340000 },
        { year: 2022, costDKK: 358000 },
        { year: 2024, costDKK: 375000 },
        { year: 2025, costDKK: 385000 },
      ]
    },
    staffToResidentRatio: {
      national: 0.37,
      euAvg: 0.45,
      note: 'Medarbejdere pr. beboer på plejecenter (fuldtidsækvivalenter). Dansk gennemsnit under EU-niveau.',
    },
    demographics: {
      over65pct2025: 20.4,
      over65pct2035: 23.8,
      over80pct2025: 5.1,
      over80pct2035: 7.2,
      note: 'Aldersudvikling øger presset markant frem mod 2035. Kilde: DST Befolkningsprognose 2025.',
    },
    fetched: new Date().toISOString()
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

export default router;
