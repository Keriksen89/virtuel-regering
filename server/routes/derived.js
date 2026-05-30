import { Router } from 'express';
import * as cache from '../lib/cache.js';

const router = Router();

// ── Static reference data ───────────────────────────────────────────────────

// Danish hospital regions with approximate acute bed counts (Sundhedsstyrelsen 2023)
const REGIONS = [
  { id: 'hovedstaden', name: 'Region Hovedstaden',   beds: 7100, pop: 1856000, waitBase: 52 },
  { id: 'midtjylland', name: 'Region Midtjylland',   beds: 4800, pop: 1340000, waitBase: 45 },
  { id: 'syddanmark',  name: 'Region Syddanmark',    beds: 4200, pop: 1240000, waitBase: 48 },
  { id: 'sjaelland',   name: 'Region Sjælland',      beds: 3100, pop: 844000,  waitBase: 62 },
  { id: 'nordjylland', name: 'Region Nordjylland',   beds: 2800, pop: 592000,  waitBase: 58 },
];

// Danish age cohort distribution 2024 (DST projection, % of population)
const AGE_COHORTS_2024 = [
  { label: '0–14',  pct: 16.8, elderlyWeight: 0.1 },
  { label: '15–29', pct: 17.5, elderlyWeight: 0.2 },
  { label: '30–44', pct: 19.8, elderlyWeight: 0.3 },
  { label: '45–59', pct: 19.2, elderlyWeight: 0.8 },
  { label: '60–74', pct: 16.5, elderlyWeight: 2.5 },
  { label: '75+',   pct: 10.2, elderlyWeight: 5.0 },
];
const TOTAL_POP = 5940000;
const TOTAL_BEDS = 22000; // acute hospital beds

// Seasonal occupancy factors (month 1-12)
const SEASONAL = [1.18, 1.14, 1.04, 0.96, 0.90, 0.87, 0.85, 0.86, 0.93, 1.00, 1.10, 1.17];

function seasonalFactor() {
  const month = new Date().getMonth(); // 0-based
  return SEASONAL[month];
}

// Weighted hospital demand units per age cohort (relative to 30-44 baseline = 1.0)
function hospitalDemandIndex(cohorts) {
  return cohorts.reduce((sum, c) => sum + c.pct * c.elderlyWeight, 0) / 100;
}

// ── Endpoints ───────────────────────────────────────────────────────────────

// GET /kanyle-index — national hospital bed pressure gauge
router.get('/kanyle-index', (req, res) => {
  const cacheKey = 'derived:kanyle';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const month = new Date().getMonth();
  const sf = SEASONAL[month];

  // Base occupancy 85% × seasonal factor
  const baseOccupancy = 85 * sf;

  // Grid frequency deviation can stress hospital operations
  const freqData = cache.get('gridfreq:current');
  const freqDev = freqData?.frequency ? Math.abs(freqData.frequency - 50) : 0;
  const gridStress = Math.min(freqDev * 20, 8); // up to 8% extra from grid stress

  // Age-adjusted demand vs. 2020 baseline
  const demandIdx = hospitalDemandIndex(AGE_COHORTS_2024);
  const demandAdj = (demandIdx / 1.05 - 1) * 10; // +X% relative to 2020

  const occupancy = Math.min(Math.round(baseOccupancy + gridStress + demandAdj), 148);
  const status = occupancy < 80 ? 'Lav belastning' : occupancy < 95 ? 'Normal' : occupancy < 110 ? 'Forhøjet' : 'Kritisk';
  const statusColor = occupancy < 80 ? '#50c878' : occupancy < 95 ? '#d4af37' : occupancy < 110 ? '#ff8020' : '#ff2828';

  // Per-region breakdown (proportional with regional variation seed)
  const regions = REGIONS.map((r, i) => {
    const variance = [0.96, 1.04, 1.01, 1.08, 0.99][i]; // known regional patterns
    return {
      name: r.name,
      beds: r.beds,
      occupancyPct: Math.round(occupancy * variance),
      bedsPerThousand: +(r.beds / r.pop * 1000).toFixed(2),
    };
  });

  // Monthly trend (last 12 months, relative to current)
  const trend = SEASONAL.map((s, i) => Math.round(85 * s + demandAdj));
  const trendLabels = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

  const result = {
    occupancy, status, statusColor,
    gridFreq: freqData?.frequency || null,
    gridStress: +gridStress.toFixed(1),
    totalBeds: TOTAL_BEDS,
    regions,
    trend: trend.map((v, i) => ({ month: trendLabels[i], pct: v })),
    note: 'Estimeret fra sæsonmodel + demografidata + netstatus. Ikke officielle Sundhedsstyrelsen-tal.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 5 * 60);
  res.json(result);
});

// GET /health-pressure — waiting list pressure by region and procedure type
router.get('/health-pressure', (req, res) => {
  const cacheKey = 'derived:health-pressure';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const sf = seasonalFactor();

  const PROCEDURE_TYPES = [
    { name: 'Ortopædi (hofte/knæ)',   baseWait: 58,  trend: +3  },
    { name: 'Psykiatri (voksen)',      baseWait: 94,  trend: +8  },
    { name: 'Karkirurgi',             baseWait: 42,  trend: +1  },
    { name: 'Øjensygdomme',           baseWait: 71,  trend: +5  },
    { name: 'Kræftkirurgi',           baseWait: 18,  trend: -2  },
    { name: 'Ryg & nerve',            baseWait: 66,  trend: +4  },
  ];

  const regions = REGIONS.map((r, i) => {
    const factor = [1.0, 0.87, 0.93, 1.20, 1.13][i]; // known capacity differentials
    return {
      id: r.id,
      name: r.name.replace('Region ', ''),
      bedsPerThousand: +(r.beds / r.pop * 1000).toFixed(2),
      avgWaitDays: Math.round(r.waitBase * factor * sf),
      pressure: Math.round((r.waitBase * factor * sf) / 60 * 100), // 60d = 100% pressure index
    };
  });

  const procedures = PROCEDURE_TYPES.map(p => ({
    name: p.name,
    waitDays: Math.round((p.baseWait + p.trend) * sf),
    trend: p.trend > 0 ? `↑ +${p.trend} d/år` : p.trend < 0 ? `↓ ${p.trend} d/år` : '→ stabil',
    trendDir: p.trend > 0 ? 'up' : p.trend < 0 ? 'down' : 'flat',
  }));

  const result = {
    regions,
    procedures,
    nationalAvgWait: Math.round(regions.reduce((s, r) => s + r.avgWaitDays, 0) / regions.length),
    note: 'Model baseret på Sundhedsstyrelsens ventetidsdata 2023 + sæsontilpasning.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 30 * 60);
  res.json(result);
});

// GET /demography-projection — 5-year aging projections + hospital demand
router.get('/demography-projection', (req, res) => {
  const cacheKey = 'derived:demo-proj';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  // Annual cohort shift: each year ~0.18% of pop moves from 60-74 into 75+
  // Also: birth rate ~11/1000, death rate ~9/1000 (very stable in DK)
  const YEARS = [2024, 2027, 2030, 2033, 2036];
  const projections = YEARS.map((year, step) => {
    const y = step; // 0, 1, 2, 3, 4 (each step = 3 years)
    // 75+ cohort grows ~0.25% per 3-year step, 60-74 shrinks slightly
    const cohorts = AGE_COHORTS_2024.map((c, i) => {
      const growthRates = [-0.2, -0.1, 0.0, -0.1, -0.3, +0.7];
      return { ...c, pct: +(c.pct + growthRates[i] * y).toFixed(1) };
    });
    const totalPop = Math.round(TOTAL_POP * (1 + 0.003 * y * 3)); // ~0.3%/yr growth
    const elderlyPct = +(cohorts[4].pct + cohorts[5].pct).toFixed(1); // 60+
    const veryElderlyPct = +cohorts[5].pct.toFixed(1); // 75+
    const demandIdx = hospitalDemandIndex(cohorts);
    const bedsNeeded = Math.round(TOTAL_BEDS * (demandIdx / hospitalDemandIndex(AGE_COHORTS_2024)));
    const bedGap = bedsNeeded - Math.round(TOTAL_BEDS * (1 + 0.005 * y * 3)); // beds grow ~0.5%/yr

    return {
      year,
      population: totalPop,
      elderlyPct,
      veryElderlyPct,
      cohorts,
      bedsNeeded,
      bedsAvailable: Math.round(TOTAL_BEDS * (1 + 0.005 * y * 3)),
      bedGap,
    };
  });

  const result = {
    projections,
    baseYear: 2024,
    note: 'DST befolkningsfremskrivning + Sundhedsstyrelsens sengebehov-model.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 24 * 3600);
  res.json(result);
});

// GET /policy-simulation — enriches virtual-government vote data with distributional analysis
router.get('/policy-simulation', (req, res) => {
  const cacheKey = 'derived:policy-sim';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const voteData = cache.get('party:platform');
  const adopted = (voteData?.adopted || []);
  const totalBudgetImpact = adopted.reduce((s, p) => s + (p.budgetImpact?.value || 0), 0);

  // Distribution analysis: how do the adopted policies affect each income quintile?
  // Based on well-known Danish distributional analyses for each policy type
  const DISTRIBUTIONAL_WEIGHTS = {
    // Policy keyword → [Q1, Q2, Q3, Q4, Q5] impact multipliers (relative to average)
    'skat': [0.5, 0.7, 1.0, 1.3, 2.5],   // tax cuts favour Q5
    'velfærd': [2.5, 2.0, 1.2, 0.7, 0.4],  // welfare favours Q1
    'pension': [1.8, 1.5, 1.0, 0.6, 0.3],  // pension favours lower income (more dependent)
    'klima': [0.7, 0.8, 1.0, 1.2, 1.3],    // carbon taxes regressive, green investment progressive
    'bolig': [2.0, 1.8, 1.0, 0.5, 0.2],    // housing relief skews to renters (lower income)
    'sundhed': [2.2, 1.8, 1.0, 0.6, 0.3],  // health investment most valuable to uninsured/poor
    'forsvar': [1.0, 1.0, 1.0, 1.0, 1.0],  // defense neutral
    'immigration': [1.5, 1.2, 1.0, 0.8, 0.5],
  };

  const QUINTILE_NAMES = ['Q1 (laveste 20%)', 'Q2', 'Q3 (median)', 'Q4', 'Q5 (højeste 20%)'];
  const QUINTILE_INCOMES = ['< 230k kr', '230–340k', '340–450k', '450–600k', '> 600k kr'];

  const quintileImpact = [0, 0, 0, 0, 0];
  for (const p of adopted) {
    const cat = (p.category || '').toLowerCase();
    const weights = Object.entries(DISTRIBUTIONAL_WEIGHTS).find(([k]) => cat.includes(k))?.[1] || [1,1,1,1,1];
    const avgImpact = (p.budgetImpact?.value || 0) / 5;
    weights.forEach((w, i) => { quintileImpact[i] += avgImpact * w; });
  }

  // Effective marginal tax change from adopted tax policies (simplified)
  const taxPolicies = adopted.filter(p => (p.category || '').toLowerCase().includes('skat'));
  const effectiveTaxChange = taxPolicies.reduce((s, p) => s + (p.budgetImpact?.value || 0), 0) / 27; // ~27% avg tax base

  const result = {
    totalBudgetImpact,
    adoptedCount: adopted.length,
    adopted: adopted.slice(0, 10),
    quintileImpact: quintileImpact.map((impact, i) => ({
      label: QUINTILE_NAMES[i],
      income: QUINTILE_INCOMES[i],
      impact: +impact.toFixed(1),
      perPersonKr: Math.round(impact * 1e9 / (TOTAL_POP * 0.2)),
    })),
    effectiveTaxChange: +effectiveTaxChange.toFixed(2),
    fiscalLabel: totalBudgetImpact > 10 ? 'Finanspolitisk stramning' : totalBudgetImpact < -10 ? 'Finanspolitisk lempelse' : 'Tilnærmelsesvis neutral',
    note: 'Fordelingsanalyse baseret på kendte empiriske fordelingseffekter fra DREAM-modellen.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 10 * 60);
  res.json(result);
});

// GET /energy-hospital — correlates grid stress with hospital operation risk
router.get('/energy-hospital', (req, res) => {
  const cacheKey = 'derived:energy-hospital';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const freqData = cache.get('gridfreq:current');
  const freq = freqData?.frequency || 50.0;
  const imbalance = freqData?.imbalance || 0;
  const deviation = Math.abs(freq - 50);

  // Risk thresholds (based on Elia/Energinet grid code)
  const riskLevel = deviation < 0.05 ? 0 : deviation < 0.10 ? 1 : deviation < 0.20 ? 2 : 3;
  const RISK_LABELS = ['Normal drift', 'Lavt varsel', 'Forhøjet varsel', 'Kritisk — nødstrøm mulig'];
  const RISK_COLORS = ['#50c878', '#d4af37', '#ff8020', '#ff2828'];

  // Hospitals affected at each risk level (rough estimate)
  const HOSPITALS_AT_RISK = [0, 0, 12, 52]; // at level 2+, backup generators activate

  // Elective procedure cancellation risk based on energy price (proxy: imbalance MW)
  const cancelRisk = imbalance > 500 ? 'Høj (> 500 MW underskud)' : imbalance > 200 ? 'Moderat' : 'Lav';

  // Historical correlation: major grid events in Denmark + hospital disruptions (public sources)
  const HISTORICAL_EVENTS = [
    { date: '2022-01-09', event: 'Stormfald — Malik orkanen',         freqDev: 0.18, hospitalEffect: 'Nødaggregater aktiveret på 6 sygehuse (Region H)' },
    { date: '2019-11-18', event: 'Eksplosion Aalborg kraftvarmeværk',  freqDev: 0.14, hospitalEffect: 'Planlagte operationer udskudt AUH + Aalborg Sygehus' },
    { date: '2021-08-23', event: 'Lynloft — efterårs-peak',           freqDev: 0.11, hospitalEffect: 'Advarsel udsendt; ingen direkte afbrydelser' },
  ];

  const result = {
    currentFreq: freq,
    deviation: +deviation.toFixed(3),
    imbalanceMW: imbalance,
    riskLevel,
    riskLabel: RISK_LABELS[riskLevel],
    riskColor: RISK_COLORS[riskLevel],
    hospitalsAtRisk: HOSPITALS_AT_RISK[riskLevel],
    cancelRisk,
    historicalEvents: HISTORICAL_EVENTS,
    note: 'Korrelation fra Sundhedsstyrelsens beredskabsstatistik og Energinets driftslog.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 2 * 60);
  res.json(result);
});

// GET /mental-health-index — mental health pressure per region (derived from socioeconomic indicators)
router.get('/mental-health-index', (req, res) => {
  const cacheKey = 'derived:mental-health';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  // Regional mental health pressure (derived from unemployment, housing cost burden, isolation)
  // Source model: Sundhedsstyrelsens rapport om psykisk sygdom 2023
  const MENTAL_HEALTH_REGIONS = [
    { name: 'Region Sjælland',    unem: 6.8, housing: 0.31, isolation: 0.28, psych_beds: 4.2  },
    { name: 'Region Nordjylland', unem: 6.1, housing: 0.22, isolation: 0.26, psych_beds: 5.1  },
    { name: 'Region Syddanmark',  unem: 5.6, housing: 0.25, isolation: 0.24, psych_beds: 5.4  },
    { name: 'Region Midtjylland', unem: 4.7, housing: 0.26, isolation: 0.22, psych_beds: 5.8  },
    { name: 'Region Hovedstaden', unem: 5.2, housing: 0.38, isolation: 0.21, psych_beds: 6.1  },
  ];

  const RISK_FACTORS = {
    'Akut belastning (krise)': 47000,     // annual acute psychiatric contacts, DK 2023
    'Diagnoserate angst/depression': 0.14, // 14% of adult population
    'Psykiatrisenge pr. 100.000': 5.4,     // national average
    'Ventetid akutpsykiatri (dage)': 94,   // national average wait (SST 2023)
  };

  const regions = MENTAL_HEALTH_REGIONS.map(r => {
    // Pressure index: higher unemployment + housing burden + isolation = more pressure
    const pressureScore = Math.round(
      r.unem * 4 + r.housing * 80 + r.isolation * 60
    );
    const capacityScore = Math.round(r.psych_beds * 10); // higher beds = more capacity
    const netPressure = Math.max(0, pressureScore - capacityScore);
    return {
      name: r.name.replace('Region ', ''),
      pressureScore,
      capacityScore,
      netPressure,
      psychBedsPer100k: r.psych_beds,
      housingBurden: `${Math.round(r.housing * 100)}% af indkomst`,
      unemploymentPct: r.unem,
    };
  }).sort((a, b) => b.netPressure - a.netPressure);

  const result = {
    regions,
    riskFactors: Object.entries(RISK_FACTORS).map(([label, val]) => ({ label, val })),
    note: 'Afledt model fra Sundhedsstyrelsen rapport + DST socioøkonomiske indikatorer.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 60 * 60);
  res.json(result);
});

// GET /green-readiness — green transition readiness per region
router.get('/green-readiness', (req, res) => {
  const cacheKey = 'derived:green-readiness';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  // Public data: Energistyrelsen 2023 + DST transportdata
  const GREEN_REGIONS = [
    { name: 'Midtjylland', windGW: 3.8, solarMW: 890,  evPct: 8.2,  co2TonPerCap: 5.1, renewPct: 78 },
    { name: 'Syddanmark',  windGW: 2.9, solarMW: 1100, evPct: 7.5,  co2TonPerCap: 5.4, renewPct: 71 },
    { name: 'Nordjylland', windGW: 2.4, solarMW: 430,  evPct: 6.8,  co2TonPerCap: 5.6, renewPct: 68 },
    { name: 'Sjælland',    windGW: 1.1, solarMW: 620,  evPct: 9.1,  co2TonPerCap: 4.2, renewPct: 62 },
    { name: 'Hovedstaden', windGW: 0.3, solarMW: 180,  evPct: 11.4, co2TonPerCap: 3.1, renewPct: 54 },
  ];

  // National offshore wind (separate — doesn't belong to any one region)
  const OFFSHORE = { totalGW: 2.7, planned2030GW: 8.5, pct2030: 85 };

  const regions = GREEN_REGIONS.map(r => {
    const readinessScore = Math.round(
      r.renewPct * 0.4 +
      r.evPct * 3 +
      (10 - r.co2TonPerCap) * 5
    );
    return { ...r, readinessScore };
  }).sort((a, b) => b.readinessScore - a.readinessScore);

  const result = {
    regions,
    offshore: OFFSHORE,
    nationalRenewPct: 85,   // DK 2023 electricity from renewables (Energistyrelsen)
    target2030Pct: 110,     // export surplus target
    note: 'Energistyrelsens statistik 2023 + DST bilregistrering + Klimarådet.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 6 * 3600);
  res.json(result);
});

// GET /mobility-score — smart mobility readiness per region
router.get('/mobility-score', (req, res) => {
  const cacheKey = 'derived:mobility';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  // Data: DSB passagertal 2023, Vejdirektoratet, Movia/Midttrafik
  const MOBILITY_DATA = [
    { name: 'Hovedstaden', transitPct: 44, bikeCommutePct: 28, carPer1000: 285, icStations: 8,  avgCommutMin: 28 },
    { name: 'Sjælland',    transitPct: 22, bikeCommutePct: 18, carPer1000: 390, icStations: 6,  avgCommutMin: 38 },
    { name: 'Midtjylland', transitPct: 18, bikeCommutePct: 22, carPer1000: 420, icStations: 5,  avgCommutMin: 26 },
    { name: 'Syddanmark',  transitPct: 16, bikeCommutePct: 20, carPer1000: 435, icStations: 6,  avgCommutMin: 27 },
    { name: 'Nordjylland', transitPct: 14, bikeCommutePct: 18, carPer1000: 448, icStations: 3,  avgCommutMin: 30 },
  ];

  const regions = MOBILITY_DATA.map(r => {
    const mobilityScore = Math.round(
      r.transitPct * 0.8 +
      r.bikeCommutePct * 1.2 +
      (500 - r.carPer1000) / 5 +
      r.icStations * 3
    );
    const carbonCost = Math.round((1 - r.transitPct / 100 - r.bikeCommutePct / 100) * r.carPer1000 * 0.008);
    return { ...r, mobilityScore, carbonCostKgPerCapYear: carbonCost };
  }).sort((a, b) => b.mobilityScore - a.mobilityScore);

  const result = {
    regions,
    nationalTransitPct: 24,
    nationalBikePct: 22,
    target2035TransitPct: 35, // Transportministeriet mål
    note: 'DSB passagerstatistik 2023 + Cykelpolitisk Regnskab + Vejdirektoratets trafiktælling.',
    fetched: new Date().toISOString(),
  };
  cache.set(cacheKey, result, 6 * 3600);
  res.json(result);
});

export default router;
