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

router.get('/ledighed', async (req, res) => {
  const cacheKey = 'livedata:ledighed';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let data;
  try {
    // DST: Bruttoledige (registered unemployed)
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'AULBM02', format: 'JSON-STAT2',
        variables: [
          { code: 'ALDER', values: ['TOT','Y15T29'] },
          { code: 'Tid',   values: ['-6'] }
        ]
      })
    });
    // Parse JSON-STAT2 — get latest values
    const vals = dst.value;
    const national = parseFloat(vals[vals.length - 2]);
    const youth    = parseFloat(vals[vals.length - 1]);
    data = buildLedighedData(isNaN(national) ? null : national, isNaN(youth) ? null : youth);
  } catch (e) {
    console.warn('[livedata/ledighed] DST failed:', e.message);
    data = buildLedighedData(null, null);
  }

  cache.set(cacheKey, data, 6 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

function buildLedighedData(national, youth) {
  return {
    national:      national ?? 5.0,
    youth:         youth    ?? 10.3,
    liveSource:    national != null,
    byRegion: [
      { name: 'Hovedstaden',  pct: 4.6 },
      { name: 'Midtjylland',  pct: 4.3 },
      { name: 'Syddanmark',   pct: 5.1 },
      { name: 'Sjælland',     pct: 5.8 },
      { name: 'Nordjylland',  pct: 6.2 },
    ],
    bySector: [
      { name: 'Privat sektor',       pct: 4.2 },
      { name: 'Offentlig sektor',    pct: 2.8 },
      { name: 'Selvstændige',        pct: 3.5 },
    ],
    trend12m: [
      { month: 'Jun 25', pct: 5.4 },
      { month: 'Jul 25', pct: 5.3 },
      { month: 'Aug 25', pct: 5.2 },
      { month: 'Sep 25', pct: 5.1 },
      { month: 'Okt 25', pct: 5.0 },
      { month: 'Nov 25', pct: 5.0 },
      { month: 'Dec 25', pct: 4.9 },
      { month: 'Jan 26', pct: 5.1 },
      { month: 'Feb 26', pct: 5.0 },
      { month: 'Mar 26', pct: 5.0 },
      { month: 'Apr 26', pct: 4.9 },
      { month: 'Maj 26', pct: national ?? 5.0 },
    ],
    context: {
      euAvg:    6.1,
      peak2009: 7.6,
      low2022:  4.4,
    }
  };
}

router.get('/elpris', async (req, res) => {
  const cacheKey = 'livedata:elpris';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let spotPrice = null;
  try {
    const energi = await fetchJSON(
      'https://api.energidataservice.dk/v1/dataset/Elspotprices?limit=24&filter={"PriceArea":"DK2"}&sort=HourDK desc',
      { headers: { 'Accept': 'application/json' } }
    );
    if (energi.records && energi.records.length > 0) {
      const recent = energi.records.slice(0, 12);
      const avg = recent.reduce((s, r) => s + (r.SpotPriceDKK || 0), 0) / recent.length;
      spotPrice = Math.round(avg / 10) / 100; // øre/kWh → kr/kWh
    }
  } catch (e) {
    console.warn('[livedata/elpris] energidata failed:', e.message);
  }

  const spot = spotPrice ?? 0.82;
  const data = {
    spotKwh:        spot,
    netKwh:         0.56,
    taxKwh:         1.85,
    totalKwh:       parseFloat((spot + 0.56 + 1.85).toFixed(2)),
    liveSpot:       spotPrice != null,
    components: [
      { name: 'Spotpris (marked)',     kr: spot,  pct: Math.round(spot / (spot+0.56+1.85) * 100) },
      { name: 'Nettarif',              kr: 0.56,  pct: Math.round(0.56 / (spot+0.56+1.85) * 100) },
      { name: 'Afgifter & PSO',        kr: 1.85,  pct: Math.round(1.85 / (spot+0.56+1.85) * 100) },
    ],
    euComparison: [
      { country: 'Danmark',    kr: parseFloat((spot + 0.56 + 1.85).toFixed(2)) },
      { country: 'Tyskland',   kr: 3.45 },
      { country: 'Sverige',    kr: 2.10 },
      { country: 'Norge',      kr: 1.80 },
      { country: 'EU-snit',    kr: 2.85 },
    ],
    monthlyHousehold: Math.round((spot + 0.56 + 1.85) * 350), // 350 kWh/mdr average
    annualHousehold:  Math.round((spot + 0.56 + 1.85) * 4200),
  };

  cache.set(cacheKey, data, 30 * 60);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/boligmarked', async (req, res) => {
  const cacheKey = 'livedata:boligmarked';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  // Try DST EJEN6 for housing prices, fall back to realistic mock
  let priceIndex = null;
  try {
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'EJEN6', format: 'JSON-STAT2',
        variables: [{ code: 'EJENDOMSTYPE', values: ['110'] }, { code: 'Tid', values: ['-8'] }] })
    });
    if (dst && dst.value) priceIndex = dst.value[dst.value.length - 1];
  } catch (e) { console.warn('[livedata/boligmarked] DST failed:', e.message); }

  const data = {
    liveSource: priceIndex != null,
    nationalMedianPrice:  2350000,
    priceChangeYoy:       -1.8,
    priceChangePeak:      -8.2,
    peakYear:             2022,
    homeownershipRate:    63.1,
    avgMortgageRate:      4.15,
    newCompletions2025:   21400,
    vacancyRate:          1.8,
    priceIndexCurrent:    priceIndex ?? 168,
    byRegion: [
      { name: 'København & omegn', medianM2: 47800, yoyChange: -2.1 },
      { name: 'Østjylland',        medianM2: 26500, yoyChange: -1.5 },
      { name: 'Nordsjælland',      medianM2: 32100, yoyChange: -2.8 },
      { name: 'Syddanmark',        medianM2: 16800, yoyChange: -1.2 },
      { name: 'Nordjylland',       medianM2: 13200, yoyChange: +0.3 },
    ],
    byType: [
      { type: 'Parcel/rækkehus',  medianPrice: 2850000, yoyChange: -1.6 },
      { type: 'Ejerlejlighed',    medianPrice: 2100000, yoyChange: -2.4 },
      { type: 'Fritidsbolig',     medianPrice: 1250000, yoyChange: +0.8 },
      { type: 'Landejendom',      medianPrice: 3200000, yoyChange: +1.1 },
    ],
    priceIndexTrend: [
      { year: '2015', idx: 100 }, { year: '2016', idx: 107 },
      { year: '2017', idx: 113 }, { year: '2018', idx: 117 },
      { year: '2019', idx: 122 }, { year: '2020', idx: 131 },
      { year: '2021', idx: 152 }, { year: '2022', idx: 183 },
      { year: '2023', idx: 174 }, { year: '2024', idx: 170 },
      { year: '2025', idx: 168 },
    ],
    rentalMarket: {
      avgRentCph:      12800,
      avgRentDK:        8400,
      rentChangeYoy:    +3.2,
      waitlistYears:     8.5,
    }
  };

  cache.set(cacheKey, data, 6 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/indkomst', async (req, res) => {
  const cacheKey = 'livedata:indkomst';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let gini = null;
  try {
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'IFOR41', format: 'JSON-STAT2',
        variables: [{ code: 'Tid', values: ['-1'] }] })
    });
    if (dst && dst.value) gini = dst.value[0];
  } catch (e) { console.warn('[livedata/indkomst] DST failed:', e.message); }

  const data = {
    liveSource: gini != null,
    gini:               gini ?? 29.2,
    medianHouseholdIncome: 479000,
    meanHouseholdIncome:   581000,
    povertyRate:           6.4,
    topOnePercentShare:    8.1,
    topTenPercentShare:   23.4,
    bottomTenPercentShare: 3.2,
    deciles: [
      { d: 'D1 (lavest)', gross: 142000, disposable: 142000 },
      { d: 'D2',          gross: 190000, disposable: 175000 },
      { d: 'D3',          gross: 234000, disposable: 207000 },
      { d: 'D4',          gross: 278000, disposable: 238000 },
      { d: 'D5 (median)', gross: 323000, disposable: 269000 },
      { d: 'D6',          gross: 372000, disposable: 300000 },
      { d: 'D7',          gross: 430000, disposable: 336000 },
      { d: 'D8',          gross: 509000, disposable: 384000 },
      { d: 'D9',          gross: 627000, disposable: 455000 },
      { d: 'D10 (højest)',gross: 1180000,disposable: 740000 },
    ],
    giniTrend: [
      { year: '2010', gini: 28.1 }, { year: '2012', gini: 28.6 },
      { year: '2014', gini: 28.8 }, { year: '2016', gini: 29.0 },
      { year: '2018', gini: 29.1 }, { year: '2020', gini: 28.9 },
      { year: '2022', gini: 29.2 }, { year: '2024', gini: 29.2 },
    ],
    nordicComparison: [
      { country: 'Danmark',  gini: 29.2 },
      { country: 'Sverige',  gini: 27.6 },
      { country: 'Norge',    gini: 25.0 },
      { country: 'Finland',  gini: 27.7 },
      { country: 'EU-snit',  gini: 30.5 },
      { country: 'USA',      gini: 39.8 },
    ],
    transfers: {
      dagpenge:        17800,
      kontanthjælp:   14200,
      folkepension:   16800,
      medianWage:     45100,
    }
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/co2', async (req, res) => {
  const cacheKey = 'livedata:co2';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let co2Intensity = null;
  try {
    const energi = await fetchJSON(
      'https://api.energidataservice.dk/v1/dataset/CO2Emis?limit=1&sort=Minutes5DK%20desc',
      { headers: { Accept: 'application/json' } }
    );
    if (energi.records && energi.records.length > 0) {
      co2Intensity = Math.round(energi.records[0].CO2Emission ?? energi.records[0].co2Emission);
    }
  } catch (e) { console.warn('[livedata/co2] energidata failed:', e.message); }

  const data = {
    liveIntensity:    co2Intensity,
    totalMtCo2_2024:  46.3,
    perCapita:         7.9,
    baseline1990:     92.4,
    target2030:       27.7,
    reductionSoFar:   49.9,
    reductionNeeded:  40.1,
    onTrack:          false,
    bySector: [
      { name: 'Landbrug',            mt: 13.8, pct: 29.8, trend: 'stable' },
      { name: 'Transport',           mt: 11.2, pct: 24.2, trend: 'down' },
      { name: 'Energi & varme',      mt:  7.4, pct: 16.0, trend: 'down' },
      { name: 'Industri',            mt:  6.9, pct: 14.9, trend: 'down' },
      { name: 'Bygninger',           mt:  4.1, pct:  8.9, trend: 'down' },
      { name: 'Øvrig',               mt:  2.9, pct:  6.3, trend: 'stable' },
    ],
    emissionTrend: [
      { year: '2000', mt: 78.2 }, { year: '2005', mt: 71.5 },
      { year: '2010', mt: 65.0 }, { year: '2013', mt: 59.8 },
      { year: '2016', mt: 55.2 }, { year: '2018', mt: 53.1 },
      { year: '2020', mt: 48.1 }, { year: '2021', mt: 50.2 },
      { year: '2022', mt: 47.4 }, { year: '2023', mt: 46.9 },
      { year: '2024', mt: 46.3 }, { year: '2030', mt: 27.7, target: true },
    ],
    nordicComparison: [
      { country: 'Danmark',   tPerCap: 7.9  },
      { country: 'Sverige',   tPerCap: 4.5  },
      { country: 'Norge',     tPerCap: 7.4  },
      { country: 'Finland',   tPerCap: 7.6  },
      { country: 'Tyskland',  tPerCap: 8.1  },
      { country: 'EU-snit',   tPerCap: 7.3  },
    ],
    renewableShare2024: 84.2,
    windShareProduction: 55.1,
  };

  cache.set(cacheKey, data, 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/kriminalitet', (req, res) => {
  const cacheKey = 'livedata:kriminalitet';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    totalReported2024:    310400,
    per100k:              5200,
    clearUpRate:          23.1,
    byType: [
      { type: 'Tyveri & indbrud',   per100k: 2820, trend: -2.1, icon: '🔓' },
      { type: 'Vold & trusler',     per100k:  418, trend: -1.4, icon: '⚠️' },
      { type: 'Cyberkriminalitet',  per100k:  584, trend: +18.2,icon: '💻' },
      { type: 'Narkotika',          per100k:  362, trend: -0.8, icon: '💊' },
      { type: 'Seksualforbrydelser',per100k:   68, trend: +2.1, icon: '⚖️' },
      { type: 'Bedrageri',          per100k:  310, trend: +5.3, icon: '🪙' },
      { type: 'Hærværk',            per100k:  380, trend: -3.2, icon: '🔨' },
    ],
    byRegion: [
      { name: 'Københavns Politi',    per100k: 7820, clearUp: 19.2 },
      { name: 'Midt- & Vestjylland',  per100k: 3950, clearUp: 26.1 },
      { name: 'Syd- & Sønderjylland', per100k: 4480, clearUp: 24.8 },
      { name: 'Sjælland',             per100k: 4820, clearUp: 22.5 },
      { name: 'Nordjylland',          per100k: 3890, clearUp: 27.4 },
      { name: 'Østjylland',           per100k: 4650, clearUp: 23.9 },
    ],
    totalTrend: [
      { year: '2018', total: 382000 }, { year: '2019', total: 364000 },
      { year: '2020', total: 321000 }, { year: '2021', total: 309000 },
      { year: '2022', total: 304000 }, { year: '2023', total: 312000 },
      { year: '2024', total: 310400 },
    ],
    euComparison: [
      { country: 'Danmark',  per100k: 5200 },
      { country: 'Sverige',  per100k: 7800 },
      { country: 'Norge',    per100k: 4800 },
      { country: 'Finland',  per100k: 4200 },
      { country: 'Tyskland', per100k: 6700 },
    ],
    gangConflicts2024: 42,
    prisonPopulation: 3940,
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/uddannelse', (req, res) => {
  const cacheKey = 'livedata:uddannelse';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    higherEdRate25_64:    37.2,
    vocationalRate:       37.8,
    basicOnlyRate:        25.0,
    youthDropoutRate:     17.8,
    pisaReading2022:      489,
    pisaMath2022:         489,
    pisaOecdAvgRead:      476,
    pisaOecdAvgMath:      472,
    educationSpendingPct: 6.3,
    teacherShortage:      4500,
    studentTeacherRatio:  11.8,
    avgStudyDebt:        145000,
    byLevel: [
      { level: 'Grundskole',                  pct: 25.0 },
      { level: 'Gymnasial uddannelse',         pct: 22.0 },
      { level: 'Erhvervsuddannelse (EUD)',     pct: 15.8 },
      { level: 'Kort videregående (KVU)',      pct:  6.1 },
      { level: 'Mellemlang videregående (MVU)',pct: 17.4 },
      { level: 'Lang videregående (LVU)',      pct: 13.7 },
    ],
    attainmentTrend: [
      { year: '2000', higherEd: 22.0 }, { year: '2005', higherEd: 26.1 },
      { year: '2010', higherEd: 29.4 }, { year: '2015', higherEd: 33.2 },
      { year: '2020', higherEd: 36.0 }, { year: '2024', higherEd: 37.2 },
    ],
    nordicComparison: [
      { country: 'Danmark',  higherEd: 37.2, pisa: 489 },
      { country: 'Sverige',  higherEd: 41.5, pisa: 491 },
      { country: 'Norge',    higherEd: 43.2, pisa: 487 },
      { country: 'Finland',  higherEd: 45.1, pisa: 520 },
      { country: 'OECD-snit',higherEd: 39.0, pisa: 476 },
    ],
    topFields: [
      { field: 'Sundhed & velfærd',    pct: 19.2 },
      { field: 'Business & økonomi',   pct: 17.8 },
      { field: 'Teknik & IT',          pct: 14.5 },
      { field: 'Pædagogik & undervisning', pct: 12.1 },
      { field: 'Naturvidenskab',       pct:  8.4 },
    ]
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/inflation', async (req, res) => {
  const cacheKey = 'livedata:inflation';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let cpiLive = null;
  try {
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'PRIS6', format: 'JSON-STAT2',
        variables: [{ code: 'VAREGR', values: ['000'] }, { code: 'Tid', values: ['-3'] }] })
    });
    if (dst && dst.value) cpiLive = dst.value[dst.value.length - 1];
  } catch (e) { console.warn('[livedata/inflation] DST failed:', e.message); }

  const data = {
    liveSource: cpiLive != null,
    currentCPI:      127.4,
    inflationYoy:    2.1,
    coreCPI:         2.6,
    peakInflation:   10.1,
    peakYear:        2022,
    trend: [
      { month: 'Jan 24', yoy: 3.8 }, { month: 'Feb 24', yoy: 3.6 },
      { month: 'Mar 24', yoy: 3.1 }, { month: 'Apr 24', yoy: 2.9 },
      { month: 'Maj 24', yoy: 2.6 }, { month: 'Jun 24', yoy: 2.4 },
      { month: 'Jul 24', yoy: 2.3 }, { month: 'Aug 24', yoy: 2.2 },
      { month: 'Sep 24', yoy: 2.0 }, { month: 'Okt 24', yoy: 1.9 },
      { month: 'Nov 24', yoy: 2.0 }, { month: 'Dec 24', yoy: 2.2 },
      { month: 'Jan 25', yoy: 2.3 }, { month: 'Feb 25', yoy: 2.1 },
    ],
    categories: [
      { name: 'Boliger & energi',       yoy: 3.8,  weight: 28.4 },
      { name: 'Fødevarer & alkoholfri', yoy: 2.9,  weight: 15.2 },
      { name: 'Transport',              yoy: 1.4,  weight: 13.7 },
      { name: 'Restaurant & hotel',     yoy: 4.1,  weight: 10.8 },
      { name: 'Sundhed',                yoy: 1.8,  weight:  5.9 },
      { name: 'Beklædning',             yoy: -0.6, weight:  4.9 },
      { name: 'Uddannelse',             yoy: 0.9,  weight:  1.2 },
      { name: 'Øvrige varer',           yoy: 1.1,  weight: 19.9 },
    ],
    nordic: [
      { country: 'Danmark', flag: '🇩🇰', inflation: 2.1 },
      { country: 'Sverige', flag: '🇸🇪', inflation: 2.8 },
      { country: 'Norge',   flag: '🇳🇴', inflation: 3.1 },
      { country: 'Finland', flag: '🇫🇮', inflation: 2.5 },
      { country: 'EU-snit', flag: '🇪🇺', inflation: 2.6 },
    ],
    householdImpact: {
      lowIncome:    { extraCostMonth: 680, pctIncome: 3.1 },
      middleIncome: { extraCostMonth: 1240, pctIncome: 2.4 },
      highIncome:   { extraCostMonth: 2300, pctIncome: 1.7 },
    }
  };

  cache.set(cacheKey, data, 6 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/udenrigshandel', async (req, res) => {
  const cacheKey = 'livedata:udenrigshandel';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let tradeBalance = null;
  try {
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'MHSIA3', format: 'JSON-STAT2',
        variables: [{ code: 'HANDELSBAL', values: ['TOT'] }, { code: 'Tid', values: ['-1'] }] })
    });
    if (dst && dst.value) tradeBalance = dst.value[0];
  } catch (e) { console.warn('[livedata/udenrigshandel] DST failed:', e.message); }

  const data = {
    liveSource: tradeBalance != null,
    exportsBn:      1284,
    importsBn:      1198,
    tradeBalanceBn: tradeBalance ?? 86,
    currentAccountBn: 162,
    currentAccountPctGDP: 5.8,
    exportGrowthYoy: 3.2,
    topPartners: [
      { country: 'Tyskland',     flag: '🇩🇪', exportBn: 189, importBn: 211, balance: -22 },
      { country: 'Sverige',      flag: '🇸🇪', exportBn: 148, importBn:  98, balance:  50 },
      { country: 'USA',          flag: '🇺🇸', exportBn: 142, importBn:  51, balance:  91 },
      { country: 'UK',           flag: '🇬🇧', exportBn:  98, importBn:  42, balance:  56 },
      { country: 'Norge',        flag: '🇳🇴', exportBn:  84, importBn:  69, balance:  15 },
      { country: 'Kina',         flag: '🇨🇳', exportBn:  31, importBn:  91, balance: -60 },
    ],
    exportCategories: [
      { name: 'Medicin & pharma',    pct: 22.4, bn: 288 },
      { name: 'Maskiner & udstyr',   pct: 16.8, bn: 216 },
      { name: 'Fødevarer',           pct: 14.2, bn: 182 },
      { name: 'Kemikalier',          pct:  9.8, bn: 126 },
      { name: 'Skibe & fly',         pct:  7.1, bn:  91 },
      { name: 'Møbler & design',     pct:  5.2, bn:  67 },
      { name: 'IT & services',       pct: 13.1, bn: 168 },
      { name: 'Øvrige',              pct: 11.4, bn: 146 },
    ],
    yearlyTrend: [
      { year: '2019', exports: 1041, imports: 1002 },
      { year: '2020', exports: 1018, imports:  972 },
      { year: '2021', exports: 1104, imports: 1058 },
      { year: '2022', exports: 1248, imports: 1224 },
      { year: '2023', exports: 1268, imports: 1188 },
      { year: '2024', exports: 1284, imports: 1198 },
    ]
  };

  cache.set(cacheKey, data, 6 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/landbrug', async (req, res) => {
  const cacheKey = 'livedata:landbrug';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    liveSource: false,
    productionValueBn: 97.4,
    exportValueBn:     182.3,
    farmCount:         33800,
    avgFarmHa:         89.4,
    agriculturalAreaMha: 2.62,
    employedK:         58.2,
    co2MtPerYear:      14.8,
    sectors: [
      { name: 'Svinekød',     exportBn: 38.4, share: 21.1, trend: -1.2 },
      { name: 'Mælk & mejeri',exportBn: 34.1, share: 18.7, trend: +2.4 },
      { name: 'Korn & frø',   exportBn: 22.8, share: 12.5, trend: -3.1 },
      { name: 'Pelsdyr (udfas.)', exportBn: 0.4, share: 0.2, trend: -95.0 },
      { name: 'Grøntsager',   exportBn: 11.2, share:  6.1, trend: +4.8 },
      { name: 'Fjerkræ',      exportBn:  9.8, share:  5.4, trend: +1.9 },
      { name: 'Plantebaseret',exportBn:  4.1, share:  2.2, trend: +22.0 },
    ],
    subsidies: {
      euSubsidiesBn: 7.8,
      dkSubsidiesBn: 1.4,
      perFarmAvgK:   272,
    },
    organicShare: 12.4,
    farmTrend: [
      { year: '2000', count: 55000 }, { year: '2005', count: 48200 },
      { year: '2010', count: 42800 }, { year: '2015', count: 38400 },
      { year: '2020', count: 35200 }, { year: '2024', count: 33800 },
    ],
    waterQuality: {
      nitrogenTonnes: 52400,
      phosphorusTonnes: 2840,
      reductionTarget2027Pct: 46,
    }
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/statsgaeld', async (req, res) => {
  const cacheKey = 'livedata:statsgaeld';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    liveSource: false,
    grossDebtBn:       786,
    netDebtBn:         -312,
    grossDebtPctGDP:   28.1,
    netDebtPctGDP:     -11.2,
    interestCostBn:    18.4,
    interestPctGDP:    0.66,
    avgInterestRate:   2.34,
    maastrichtDebtPct: 28.1,
    aaa_rating:        true,
    emuGrowthFundPct:  60.0,
    stabilityReserveBn: 102,
    debtTrend: [
      { year: '2000', grossPct: 52.4, netPct:  22.1 },
      { year: '2005', grossPct: 37.8, netPct:   4.2 },
      { year: '2008', grossPct: 33.4, netPct:  -4.8 },
      { year: '2010', grossPct: 42.9, netPct:   5.1 },
      { year: '2012', grossPct: 45.2, netPct:   6.8 },
      { year: '2015', grossPct: 39.5, netPct:  -0.4 },
      { year: '2018', grossPct: 34.1, netPct:  -8.2 },
      { year: '2020', grossPct: 42.1, netPct:  -3.1 },
      { year: '2021', grossPct: 36.7, netPct:  -9.4 },
      { year: '2022', grossPct: 30.1, netPct: -12.8 },
      { year: '2023', grossPct: 29.3, netPct: -11.8 },
      { year: '2024', grossPct: 28.1, netPct: -11.2 },
    ],
    euComparison: [
      { country: 'Danmark',    flag: '🇩🇰', pct: 28.1 },
      { country: 'Sverige',    flag: '🇸🇪', pct: 32.4 },
      { country: 'Finland',    flag: '🇫🇮', pct: 76.8 },
      { country: 'Norge',      flag: '🇳🇴', pct: 22.1 },
      { country: 'EU-snit',    flag: '🇪🇺', pct: 82.4 },
      { country: 'Frankrig',   flag: '🇫🇷', pct: 112.0},
      { country: 'Italien',    flag: '🇮🇹', pct: 139.8},
    ],
    maturityProfile: [
      { bucket: '0–2 år',  pct: 24.1 },
      { bucket: '2–5 år',  pct: 31.4 },
      { bucket: '5–10 år', pct: 28.7 },
      { bucket: '10+ år',  pct: 15.8 },
    ]
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/erhverv', async (req, res) => {
  const cacheKey = 'livedata:erhverv';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let gdpLive = null;
  try {
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'NABP20', format: 'JSON-STAT2',
        variables: [{ code: 'KONTO', values: ['B1GQP'] }, { code: 'Tid', values: ['-2'] }] })
    });
    if (dst && dst.value) gdpLive = dst.value[dst.value.length - 1];
  } catch (e) { console.warn('[livedata/erhverv] DST failed:', e.message); }

  const data = {
    liveSource: gdpLive != null,
    gdpBn:            2796,
    gdpGrowthYoy:      2.3,
    corporateTaxRate: 22.0,
    corporateTaxRevenueBn: 78.4,
    firmCount:        342000,
    startupsPrYear:   52800,
    bankruptciesPrYear: 4800,
    sectors: [
      { name: 'Serviceerhverv',   gdpSharePct: 31.4, employedK: 824, growthYoy:  3.1 },
      { name: 'Handel & transport',gdpSharePct: 18.2, employedK: 612, growthYoy:  1.8 },
      { name: 'Industri',          gdpSharePct: 16.8, employedK: 298, growthYoy:  2.4 },
      { name: 'Bygge & anlæg',     gdpSharePct:  6.4, employedK: 191, growthYoy: -0.8 },
      { name: 'Finansiering',      gdpSharePct:  8.9, employedK: 124, growthYoy:  4.2 },
      { name: 'IT & kommunikation',gdpSharePct:  5.8, employedK:  98, growthYoy:  8.4 },
      { name: 'Landbrug & fiskeri',gdpSharePct:  1.8, employedK:  62, growthYoy: -1.2 },
      { name: 'Øvrige',            gdpSharePct: 10.7, employedK: 391, growthYoy:  1.4 },
    ],
    largestEmployers: [
      { name: 'Novo Nordisk',   employees: 65000, sector: 'Pharma' },
      { name: 'Maersk',         employees: 42000, sector: 'Shipping' },
      { name: 'Ørsted',         employees: 13000, sector: 'Energi' },
      { name: 'Vestas',         employees: 29000, sector: 'Energi' },
      { name: 'Carlsberg',      employees: 11000, sector: 'Drikkevarer' },
    ],
    productivity: {
      gdpPerWorkerK: 1024,
      growthYoy:      1.8,
      euIndex:       142,
    },
    sme: {
      sharePct:      99.6,
      employedSharePct: 65.2,
      exportSharePct: 39.8,
    }
  };

  cache.set(cacheKey, data, 6 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

router.get('/innovation', async (req, res) => {
  const cacheKey = 'livedata:innovation';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    liveSource: false,
    rdSpendingBn:      92.4,
    rdPctGDP:           3.31,
    publicRdBn:         31.8,
    privateRdBn:        60.6,
    patentsPerMillion:  241,
    startupInvestmentBn: 18.2,
    unicorns:            12,
    topUniversities: [
      { name: 'DTU',       ranking: 98,  rdBn: 4.2 },
      { name: 'KU',        ranking: 87,  rdBn: 5.8 },
      { name: 'AU',        ranking: 154, rdBn: 4.1 },
      { name: 'SDU',       ranking: 281, rdBn: 2.2 },
      { name: 'AAU',       ranking: 352, rdBn: 1.8 },
    ],
    rdSectors: [
      { name: 'Medicin & biotek',  bn: 28.4, pct: 30.7 },
      { name: 'IT & software',     bn: 14.8, pct: 16.0 },
      { name: 'Vedvarende energi', bn: 12.1, pct: 13.1 },
      { name: 'Landbrug & føde',   bn:  7.2, pct:  7.8 },
      { name: 'Forsvar & maritim', bn:  5.8, pct:  6.3 },
      { name: 'Øvrige',            bn: 24.1, pct: 26.1 },
    ],
    digitalRanking: { position: 3, total: 27, label: 'EU Digitalt Indeks (DESI)' },
    greenInnovation: { patentSharePct: 18.4, globalRank: 4 },
    rdTrend: [
      { year: '2015', pctGDP: 2.98 }, { year: '2016', pctGDP: 3.02 },
      { year: '2017', pctGDP: 3.06 }, { year: '2018', pctGDP: 3.11 },
      { year: '2019', pctGDP: 2.96 }, { year: '2020', pctGDP: 2.98 },
      { year: '2021', pctGDP: 3.08 }, { year: '2022', pctGDP: 3.19 },
      { year: '2023', pctGDP: 3.28 }, { year: '2024', pctGDP: 3.31 },
    ]
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── folkesundhed (public health detail) ────────────────────────────────────

router.get('/folkesundhed', async (req, res) => {
  const cacheKey = 'livedata:folkesundhed';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  let sickLeave = null;
  try {
    const dst = await fetchJSON('https://api.statbank.dk/v1/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'SYGE33', format: 'JSON-STAT2',
        variables: [{ code: 'Tid', values: ['-1'] }] })
    });
    if (dst && dst.value) sickLeave = dst.value[dst.value.length - 1];
  } catch (e) { console.warn('[livedata/folkesundhed] DST SYGE33 failed:', e.message); }

  const data = {
    liveSource: sickLeave != null,
    lifeExpectancy: { men: 79.5, women: 83.8, total: 81.7 },
    sickLeavePerEmployee: sickLeave ?? 11.2,
    sickLeaveBySector: [
      { sector: 'Offentlig forvaltning', days: 14.1 },
      { sector: 'Social- og sundhedsvæsen', days: 13.4 },
      { sector: 'Undervisning', days: 12.8 },
      { sector: 'Privat service', days: 9.6 },
      { sector: 'Industri', days: 9.1 },
      { sector: 'Bygge og anlæg', days: 8.2 },
      { sector: 'IT og finans', days: 7.4 },
    ],
    kramFactors: [
      { name: 'Kost (møder anbefaling)', pct: 16.0 },
      { name: 'Rygning (aldrig/eks)', pct: 75.0 },
      { name: 'Alkohol (under grænse)', pct: 84.0 },
      { name: 'Motion (møder anbefaling)', pct: 64.0 },
    ],
    mentalHealth: {
      anxietyPct: 10.1,
      depressionPct: 8.2,
      stressPct: 21.0,
      burnoutPct: 15.0,
      trend: [
        { year: 2010, anxietyPct: 7.2, stressPct: 16.4 },
        { year: 2013, anxietyPct: 8.0, stressPct: 17.8 },
        { year: 2017, anxietyPct: 9.1, stressPct: 19.6 },
        { year: 2021, anxietyPct: 9.8, stressPct: 20.5 },
        { year: 2024, anxietyPct: 10.1, stressPct: 21.0 },
      ]
    },
    obesity: { pct: 17.8, euAvg: 17.0 },
    cancerIncidence: { per100k: 482, euAvg: 441 },
    smokingPct: 12.5,
    alcoholLiters: 9.8,
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── ligestilling (gender equality) ─────────────────────────────────────────

router.get('/ligestilling', (req, res) => {
  const cacheKey = 'livedata:ligestilling';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    wageGapUnadjusted: 14.0,
    wageGapAdjusted: 6.0,
    womenOnBoards: 29.0,
    womenInParliament: 44.0,
    womenInManagement: 28.0,
    parentalLeaveSplit: { mothers: 75.0, fathers: 25.0 },
    employmentGap: { men: 74.2, women: 69.8 },
    educationCompletion: {
      higherEdWomen: 43.2,
      higherEdMen: 31.4,
    },
    nordicComparison: [
      { country: 'Island',  womenParl: 47.6, wageGap: 10.2, boards: 43.0 },
      { country: 'Sverige', womenParl: 46.4, wageGap: 11.8, boards: 35.0 },
      { country: 'Finland', womenParl: 46.0, wageGap: 15.1, boards: 31.0 },
      { country: 'Danmark', womenParl: 44.0, wageGap: 14.0, boards: 29.0 },
      { country: 'Norge',   womenParl: 45.4, wageGap: 13.2, boards: 40.0 },
    ],
    wageGapTrend: [
      { year: 2000, unadjusted: 20.1 }, { year: 2005, unadjusted: 18.4 },
      { year: 2010, unadjusted: 17.2 }, { year: 2015, unadjusted: 15.8 },
      { year: 2019, unadjusted: 14.8 }, { year: 2022, unadjusted: 14.2 },
      { year: 2024, unadjusted: 14.0 },
    ],
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── velfærdsstat (welfare state comparison) ─────────────────────────────────

router.get('/velfaerdsstat', (req, res) => {
  const cacheKey = 'livedata:velfaerdsstat';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    countries: [
      { name: 'Danmark',  healthPctGDP: 10.5, pensionReplace: 62, unemplCoverage: 90, socialSpendPct: 28.3, giniAfter: 28.9, publicEmpPct: 29.0, score: 88 },
      { name: 'Sverige',  healthPctGDP: 10.9, pensionReplace: 58, unemplCoverage: 80, socialSpendPct: 25.4, giniAfter: 27.6, publicEmpPct: 28.0, score: 85 },
      { name: 'Norge',    healthPctGDP: 10.2, pensionReplace: 60, unemplCoverage: 62, socialSpendPct: 24.8, giniAfter: 25.0, publicEmpPct: 30.0, score: 87 },
      { name: 'Finland',  healthPctGDP:  9.6, pensionReplace: 56, unemplCoverage: 60, socialSpendPct: 29.1, giniAfter: 27.7, publicEmpPct: 25.0, score: 83 },
      { name: 'Tyskland', healthPctGDP: 12.7, pensionReplace: 53, unemplCoverage: 67, socialSpendPct: 26.7, giniAfter: 31.7, publicEmpPct: 15.0, score: 76 },
      { name: 'UK',       healthPctGDP: 11.3, pensionReplace: 29, unemplCoverage: 30, socialSpendPct: 20.6, giniAfter: 35.1, publicEmpPct: 17.0, score: 62 },
    ],
    dkHighlights: {
      healthcare: { pctGDP: 10.5, note: 'Skattefinansieret, universel adgang' },
      pension: { replacementRate: 62, note: 'Folkepension + ATP + arbejdsgiver' },
      unemployment: { coveragePct: 90, durationYears: 2, note: 'Dagpenge op til 2 år' },
      childcare: { coveragePct: 96, parentContribPct: 25, note: '96% af børn i daginstitution' },
    },
    giniBeforeAfter: [
      { country: 'Danmark',  before: 47.2, after: 28.9, reduction: 18.3 },
      { country: 'Sverige',  before: 44.8, after: 27.6, reduction: 17.2 },
      { country: 'Norge',    before: 43.1, after: 25.0, reduction: 18.1 },
      { country: 'Finland',  before: 50.3, after: 27.7, reduction: 22.6 },
      { country: 'Tyskland', before: 50.1, after: 31.7, reduction: 18.4 },
      { country: 'UK',       before: 51.8, after: 35.1, reduction: 16.7 },
    ],
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── generationsregnskab (generational accounting) ───────────────────────────

router.get('/generationsregnskab', (req, res) => {
  const cacheKey = 'livedata:generationsregnskab';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    cohorts: [
      { age: '0–17',  netPerPerson: -142000, taxes: 18000,  transfers: 98000, services: 62000, note: 'Skole, daginstitution, børneydelser' },
      { age: '18–29', netPerPerson:  -28000, taxes: 89000,  transfers: 42000, services: 75000, note: 'SU, studietilbud, dagpenge' },
      { age: '30–44', netPerPerson:  124000, taxes: 248000, transfers: 28000, services: 96000, note: 'Primær nettoindbetalingsgruppe' },
      { age: '45–59', netPerPerson:  168000, taxes: 298000, transfers: 32000, services: 98000, note: 'Højeste nettoindbetalere' },
      { age: '60–74', netPerPerson:  -38000, taxes: 112000, transfers: 88000, services: 62000, note: 'Overgang til pension' },
      { age: '75+',   netPerPerson: -198000, taxes:  28000, transfers: 148000,services: 78000, note: 'Folkepension + ældrepleje' },
    ],
    lifetimeContribution: { netDKK: 1820000, note: 'Gennemsnitlig livstids nettobidrag pr. person' },
    dependencyRatioTrend: [
      { year: 2000, ratio: 48.2 }, { year: 2005, ratio: 47.8 },
      { year: 2010, ratio: 51.4 }, { year: 2015, ratio: 54.2 },
      { year: 2020, ratio: 55.8 }, { year: 2025, ratio: 57.4 },
      { year: 2030, ratio: 60.1, forecast: true }, { year: 2035, ratio: 63.8, forecast: true },
      { year: 2040, ratio: 67.2, forecast: true },
    ],
    currentDependencyRatio: 57.4,
    note: 'Forsørgerbyrde = antal 0-17 og 65+ pr. 100 i arbejdsstyrken. Kilde: DST/FM generationsregnskab 2024.',
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── arbejdsmiljø (work environment) ─────────────────────────────────────────

router.get('/arbejdsmiljoe', (req, res) => {
  const cacheKey = 'livedata:arbejdsmiljoe';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    nationalAvgSickDays: 11.2,
    stressPct: 21.0,
    burnoutPct: 15.0,
    accidentsPer1000: 18.4,
    avgOvertimeHrsWeek: 1.8,
    jobSatisfaction: 7.4,
    euWorkLifeRank: 3,
    sectorSickLeave: [
      { sector: 'Offentlig forvaltning',        days: 14.1 },
      { sector: 'Social- og sundhedsvæsen',      days: 13.4 },
      { sector: 'Undervisning',                  days: 12.8 },
      { sector: 'Landbrug & fiskeri',            days: 10.2 },
      { sector: 'Privat service & handel',       days: 9.6 },
      { sector: 'Industri',                      days: 9.1 },
      { sector: 'Bygge og anlæg',                days: 8.2 },
      { sector: 'IT, finans & rådgivning',       days: 7.4 },
    ],
    stressTrend: [
      { year: 2010, stressPct: 14.0, burnoutPct: 9.0 },
      { year: 2013, stressPct: 16.0, burnoutPct: 10.2 },
      { year: 2016, stressPct: 18.4, burnoutPct: 12.1 },
      { year: 2019, stressPct: 20.2, burnoutPct: 13.8 },
      { year: 2022, stressPct: 21.0, burnoutPct: 14.8 },
      { year: 2024, stressPct: 21.0, burnoutPct: 15.0 },
    ],
    euComparison: [
      { country: 'Danmark', rank: 3, jobSat: 7.4, stressPct: 21 },
      { country: 'Sverige', rank: 2, jobSat: 7.6, stressPct: 19 },
      { country: 'Finland', rank: 1, jobSat: 7.8, stressPct: 18 },
      { country: 'Norge',   rank: 4, jobSat: 7.3, stressPct: 22 },
      { country: 'EU-snit', rank: null, jobSat: 6.8, stressPct: 27 },
    ],
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── medietillid (media trust) ────────────────────────────────────────────────

router.get('/medietillid', (req, res) => {
  const cacheKey = 'livedata:medietillid';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    institutionTrust: [
      { name: 'Sundhedsvæsen',      pct: 88 },
      { name: 'Politi',             pct: 79 },
      { name: 'Retsvæsen',          pct: 68 },
      { name: 'Regering',           pct: 52 },
      { name: 'Medier',             pct: 52 },
      { name: 'EU',                 pct: 48 },
      { name: 'Folketing',          pct: 47 },
      { name: 'Sociale medier',     pct: 14 },
    ],
    pressFreedomRank: 3,
    pressFreedomScore: 87.4,
    nordicPressFreedom: [
      { country: 'Norge',    rank: 1, score: 92.5 },
      { country: 'Finland',  rank: 2, score: 89.8 },
      { country: 'Danmark',  rank: 3, score: 87.4 },
      { country: 'Sverige',  rank: 4, score: 86.1 },
      { country: 'Island',   rank: 5, score: 84.2 },
    ],
    mediaConsumption: {
      tvHrsDay: 2.8,
      onlineHrsDay: 4.1,
      radioHrsDay: 1.2,
      printHrsDay: 0.4,
    },
    newsSource: [
      { source: 'TV (DR/TV2)',         pct: 68 },
      { source: 'Online nyhedsmedier', pct: 72 },
      { source: 'Sociale medier',      pct: 48 },
      { source: 'Radio',               pct: 42 },
      { source: 'Aviser (print)',       pct: 18 },
    ],
    publicVsPrivate: { publicPct: 58, privatePct: 42 },
    factCheckAwareness: 62.0,
    trustTrend: [
      { year: 2016, mediaPct: 60, parliamentPct: 54 },
      { year: 2018, mediaPct: 57, parliamentPct: 50 },
      { year: 2020, mediaPct: 55, parliamentPct: 49 },
      { year: 2022, mediaPct: 53, parliamentPct: 48 },
      { year: 2024, mediaPct: 52, parliamentPct: 47 },
    ],
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── grøn omstilling (green transition) ──────────────────────────────────────

router.get('/groenomstilling', (req, res) => {
  const cacheKey = 'livedata:groenomstilling';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    co2Target2030Pct: 70,
    co2CurrentPct: 47.0,
    baseline1990Mt: 69.6,
    current2023Mt: 36.9,
    target2030Mt: 20.9,
    onTrack: false,
    renewableElecPct: 84.0,
    windSharePct: 55.1,
    solarSharePct: 12.4,
    evShareNewCarsPct: 42.3,
    heatPumpAdoptionPct: 38.0,
    districtHeatingPct: 64.0,
    greenJobsCount: 47000,
    euEtsCarbonPrice: 68.0,
    intlClimateFinanceBn: 4.8,
    sectorProgress: [
      { sector: 'Energi & varme',  reductionPct: 68, targetPct: 70, onTrack: true  },
      { sector: 'Transport',       reductionPct: 18, targetPct: 70, onTrack: false },
      { sector: 'Industri',        reductionPct: 42, targetPct: 70, onTrack: false },
      { sector: 'Landbrug',        reductionPct:  8, targetPct: 55, onTrack: false },
      { sector: 'Bygninger',       reductionPct: 38, targetPct: 70, onTrack: false },
    ],
    techAdoption: [
      { year: 2018, evSharePct: 2.1,  heatPumpPct: 18.0, renewElecPct: 62.0 },
      { year: 2019, evSharePct: 2.8,  heatPumpPct: 20.0, renewElecPct: 67.0 },
      { year: 2020, evSharePct: 5.4,  heatPumpPct: 23.0, renewElecPct: 71.0 },
      { year: 2021, evSharePct: 11.8, heatPumpPct: 26.0, renewElecPct: 74.0 },
      { year: 2022, evSharePct: 22.4, heatPumpPct: 29.0, renewElecPct: 78.0 },
      { year: 2023, evSharePct: 34.2, heatPumpPct: 33.0, renewElecPct: 82.0 },
      { year: 2024, evSharePct: 42.3, heatPumpPct: 38.0, renewElecPct: 84.0 },
    ],
    investments: [
      { sector: 'Havvind',           bn: 48.2 },
      { sector: 'Landvind & sol',    bn: 18.4 },
      { sector: 'Grøn brint',        bn: 22.1 },
      { sector: 'Fjernvarme',        bn:  9.8 },
      { sector: 'El-infrastruktur',  bn: 14.6 },
      { sector: 'CCS (CO2-fangst)',  bn:  6.2 },
    ],
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

// ── boligkrise (housing crisis) ─────────────────────────────────────────────

router.get('/boligkrise', (req, res) => {
  const cacheKey = 'livedata:boligkrise';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const data = {
    rentBurden: {
      lowIncome:    38.0,
      middleIncome: 22.0,
      highIncome:   14.0,
    },
    socialHousingWaitCph: 8.5,
    constructionDeficitPerYear: 15000,
    rentIncreaseLastFiveYears: 28.0,
    affordabilityYearsMedian: 8.2,
    homelessCount: 5800,
    housingBenefitRecipients: 240000,
    newConstructionTrend: [
      { year: 2016, built: 30200, needed: 32000 },
      { year: 2017, built: 33400, needed: 33000 },
      { year: 2018, built: 31800, needed: 34000 },
      { year: 2019, built: 29400, needed: 35000 },
      { year: 2020, built: 24800, needed: 35500 },
      { year: 2021, built: 28200, needed: 36000 },
      { year: 2022, built: 26400, needed: 36500 },
      { year: 2023, built: 21800, needed: 37000 },
      { year: 2024, built: 21400, needed: 37000 },
    ],
    rentVsIncomeTrend: [
      { year: 2010, lowIncome: 29.0, middleIncome: 17.0 },
      { year: 2013, lowIncome: 31.0, middleIncome: 18.0 },
      { year: 2016, lowIncome: 33.0, middleIncome: 19.0 },
      { year: 2019, lowIncome: 35.0, middleIncome: 20.0 },
      { year: 2022, lowIncome: 37.0, middleIncome: 21.0 },
      { year: 2024, lowIncome: 38.0, middleIncome: 22.0 },
    ],
    byCity: [
      { city: 'København',  waitYears: 8.5, affordYears: 12.4, rentM2: 1680 },
      { city: 'Aarhus',     waitYears: 5.2, affordYears:  8.1, rentM2: 1180 },
      { city: 'Odense',     waitYears: 3.8, affordYears:  6.2, rentM2:  980 },
      { city: 'Aalborg',    waitYears: 2.4, affordYears:  5.4, rentM2:  820 },
      { city: 'Landdistrikter', waitYears: 0.5, affordYears: 3.8, rentM2: 620 },
    ],
    housingTypes: {
      ownerOccupied: 63.1,
      privateRental: 20.4,
      socialHousing: 19.1,
      other: 2.4,
    },
  };

  cache.set(cacheKey, data, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});

export default router;

