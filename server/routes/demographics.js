import { Router } from 'express';

const router = Router();

// DST FOLK1A + FRDK117 calibrated Jan 2026. Sources listed per section.
const DEMO = {
  meta: { year: 2026, calibrated: '2026-05-21' },

  // ── Population totals ────────────────────────────────────────────────────────
  // Source: DST FOLK1A (quarterly), projected Q1 2026
  population: {
    total:  6040000,
    male:   3002000,
    female: 3038000,
    medianAge: 42.3,
    households: 2794000,
    avgHouseholdSize: 2.16
  },

  // ── Population by 5-year age group, male + female (thousands) ───────────────
  // Source: DST FOLK1A, Q1 2026 estimate
  byAge: [
    { group: '0–4',   male: 153, female: 145 },
    { group: '5–9',   male: 168, female: 159 },
    { group: '10–14', male: 178, female: 169 },
    { group: '15–19', male: 172, female: 163 },
    { group: '20–24', male: 190, female: 182 },
    { group: '25–29', male: 202, female: 198 },
    { group: '30–34', male: 215, female: 211 },
    { group: '35–39', male: 215, female: 212 },
    { group: '40–44', male: 200, female: 197 },
    { group: '45–49', male: 193, female: 190 },
    { group: '50–54', male: 205, female: 203 },
    { group: '55–59', male: 208, female: 207 },
    { group: '60–64', male: 191, female: 193 },
    { group: '65–69', male: 173, female: 180 },
    { group: '70–74', male: 148, female: 158 },
    { group: '75–79', male: 112, female: 125 },
    { group: '80–84', male:  70, female:  88 },
    { group: '85–89', male:  38, female:  57 },
    { group: '90+',   male:  14, female:  29 }
  ],

  // ── Age structure summary ─────────────────────────────────────────────────────
  ageStructure: {
    children:   { label: '0–14 år',  count: 972000,  pct: 16.1 },
    working:    { label: '15–64 år', count: 3869000,  pct: 64.1 },
    elderly:    { label: '65+ år',   count: 1199000,  pct: 19.8 },
    veryElderly:{ label: '80+ år',   count: 296000,   pct: 4.9  }
  },

  // ── Dependency ratios ─────────────────────────────────────────────────────────
  dependency: {
    youth:    { ratio: 25.1, label: 'Ungdoms-afhængighedskvotient (0–14 / 15–64)' },
    oldAge:   { ratio: 31.0, label: 'Ældrequotient (65+ / 15–64)' },
    total:    { ratio: 56.1, label: 'Samlet afhængighedskvotient' }
  },

  // ── Vital statistics ──────────────────────────────────────────────────────────
  // Source: DST FODSL, DODE, DST Vital Statistics 2025
  vitals: {
    births:              61500,
    deaths:              57200,
    naturalGrowth:        4300,
    netMigration:        25800,
    totalGrowth:         30100,
    birthRate:           10.2,   // per 1,000
    deathRate:            9.5,   // per 1,000
    fertilityRate:        1.63,  // TFR 2026 estimate
    lifeExpMale:         80.5,
    lifeExpFemale:       83.8,
    healthyLifeExpMale:  70.2,
    healthyLifeExpFemale:70.8,
    infantMortality:      3.1   // per 1,000 live births
  },

  // ── Historical trends ─────────────────────────────────────────────────────────
  // Source: DST FOLK1A (population), DST FODSL (births/TFR), DST DODE (deaths)
  historical: {
    years:       [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2023, 2024, 2025, 2026],
    population:  [5534, 5581, 5627, 5707, 5781, 5822, 5928, 5961, 6006, 6022, 6040],
    tfr:         [1.87, 1.72, 1.69, 1.79, 1.73, 1.67, 1.55, 1.73, 1.68, 1.65, 1.63],
    lifeExpMale: [77.1, 78.0, 78.7, 79.3, 79.9, 79.5, 79.8, 80.1, 80.3, 80.4, 80.5],
    elderly65pct:[17.0, 17.7, 18.3, 18.9, 19.6, 19.8, 20.1, 20.3, 20.5, 20.1, 19.8]
  },

  // ── Population projections 2026–2070 (thousands, DST medium variant) ─────────
  // Source: DST FRDK117 — Befolkningsfremskrivning, medium variant
  projections: {
    years:      [2026, 2030, 2035, 2040, 2045, 2050, 2060, 2070],
    total:      [6040, 6152, 6278, 6372, 6438, 6470, 6495, 6452],
    working:    [3869, 3870, 3855, 3798, 3820, 3855, 3885, 3852],
    elderly65:  [1199, 1310, 1430, 1550, 1571, 1556, 1511, 1481],
    elderly80:  [ 296,  327,  390,  480,  558,  596,  566,  527]
  },

  // ── Regional distribution ─────────────────────────────────────────────────────
  // Source: DST FOLK1A — Region + municipality breakdown
  regions: [
    { name: 'Region Hovedstaden', pop: 1933000, pct: 32.0, growth2yr: 1.7, density: 771 },
    { name: 'Region Midtjylland', pop: 1400000, pct: 23.2, growth2yr: 1.5, density: 75  },
    { name: 'Region Syddanmark',  pop: 1270000, pct: 21.0, growth2yr: 0.8, density: 90  },
    { name: 'Region Sjælland',    pop: 847000,  pct: 14.0, growth2yr: 0.9, density: 76  },
    { name: 'Region Nordjylland', pop: 590000,  pct: 9.8,  growth2yr: 0.2, density: 48  }
  ],

  // ── Urban vs rural ────────────────────────────────────────────────────────────
  urbanRural: [
    { label: 'Større byer (>100.000)',    pop: 1850000, pct: 30.6 },
    { label: 'Mellemstore byer (10-100k)',pop: 1870000, pct: 31.0 },
    { label: 'Mindre byer (200-10k)',     pop: 1250000, pct: 20.7 },
    { label: 'Landdistrikter (<200)',     pop: 1070000, pct: 17.7 }
  ],

  // ── Origin (oprindelse) ────────────────────────────────────────────────────────
  // Source: DST FOLK1A — Herkomst (oprindelse, indvandrere, efterkommere)
  origin: [
    { label: 'Dansk oprindelse',          count: 4375000, pct: 72.4 },
    { label: 'Vestlige indvandrere',      count: 197000,  pct: 3.3  },
    { label: 'Ikke-vestlige indvandrere', count: 503000,  pct: 8.3  },
    { label: 'Vestlige efterkommere',     count: 56000,   pct: 0.9  },
    { label: 'Ikke-vestlige efterkommere',count: 148000,  pct: 2.5  },
    { label: 'Øvrige / uklassificeret',   count: 761000,  pct: 12.6 }
  ],

  // Top 10 origin countries for immigrants (DST FOLK2, 2025)
  topOriginCountries: [
    { country: 'Polen',       count: 97000 },
    { country: 'Rumænien',    count: 50000 },
    { country: 'Syrien',      count: 40000 },
    { country: 'Tyrkiet',     count: 37000 },
    { country: 'Germany',     count: 34000 },
    { country: 'Irak',        count: 31000 },
    { country: 'Ukraine',     count: 28000 },
    { country: 'Somalia',     count: 26000 },
    { country: 'Pakistan',    count: 24000 },
    { country: 'Indien',      count: 23000 }
  ],

  // ── Employment ────────────────────────────────────────────────────────────────
  // Source: DST RAS, AULAAR, LBESK — 2025/2026 estimates
  employment: {
    total:           2963000,
    laborForce:      3078000,
    unemployed:       115000,
    employmentRate:   76.6,  // % of 15-64
    unemploymentRate:  3.7,  // AKU (Labour Force Survey)
    publicSector:     850000,
    privateSector:   2113000,
    selfEmployed:     188000,
    partTime:         520000
  },

  // Employment by industry (DST RAS / ERHV, approx 2026)
  byIndustry: [
    { sector: 'Sundhed & socialt arbejde', count: 545000, pct: 18.4 },
    { sector: 'Handel, transport & hotel', count: 510000, pct: 17.2 },
    { sector: 'Industri & fremstilling',   count: 385000, pct: 13.0 },
    { sector: 'Undervisning',              count: 275000, pct: 9.3  },
    { sector: 'Bygge & anlæg',             count: 235000, pct: 7.9  },
    { sector: 'Offentlig administration',  count: 175000, pct: 5.9  },
    { sector: 'Liberale erhverv & teknik', count: 195000, pct: 6.6  },
    { sector: 'Information & kommunik.',   count: 150000, pct: 5.1  },
    { sector: 'Finans & forsikring',       count: 95000,  pct: 3.2  },
    { sector: 'Landbrug, skov & fiskeri',  count: 76000,  pct: 2.6  },
    { sector: 'Øvrige',                    count: 322000, pct: 10.9 }
  ],

  // ── Education (25-64 year olds) ───────────────────────────────────────────────
  // Source: DST HFUDD (Uddannelsesniveau), 2025
  education: [
    { level: 'Grundskole (< 9. kl.)',      pct: 14 },
    { level: 'Gymnasial / HF / HHX / HTX', pct: 18 },
    { level: 'Erhvervsuddannelse (EUD)',    pct: 36 },
    { level: 'Kort videregående (KVU)',     pct:  7 },
    { level: 'Mellemlang videregående (MVU/bachelor)', pct: 15 },
    { level: 'Lang videregående (LVU/kandidat/PhD)',   pct: 10 }
  ],

  // ── Household types ───────────────────────────────────────────────────────────
  // Source: DST FAMILIE (Familiestatistik) 2025
  households: [
    { type: 'Enepersoner',               count: 1201000, pct: 43.0 },
    { type: 'Par uden hjemmeboende børn',count: 671000,  pct: 24.0 },
    { type: 'Par med hjemmeboende børn', count: 643000,  pct: 23.0 },
    { type: 'Eneforsørgere med børn',    count: 168000,  pct: 6.0  },
    { type: 'Øvrige husholdninger',      count: 111000,  pct: 4.0  }
  ],

  // ── Adults by household type — DST FAM122N 2024 ─────────────────────────────
  // Unit: PERSONS (16+), not households. Source: DST Statistikbank tabel FAM122N.
  adultsByHousehold: [
    {
      type: 'Enlig uden børn',
      desc: 'Voksne der bor alene (ingen børn i husstand)',
      persons: 1163000, pct: 26.2,
      men: 648000, women: 515000,
      ageGroups: { '16–29': 18, '30–44': 20, '45–64': 33, '65+': 29 },
    },
    {
      type: 'Eneforsørger',
      desc: 'Enlig voksen med hjemmeboende børn',
      persons: 271000, pct: 6.1,
      men: 52000, women: 219000,
      ageGroups: { '16–29': 8, '30–44': 38, '45–64': 47, '65+': 7 },
    },
    {
      type: 'Par uden hjemmeboende børn',
      desc: 'To voksne i husstand, ingen hjemmeboende børn',
      persons: 1418000, pct: 31.9,
      men: 709000, women: 709000,
      ageGroups: { '16–29': 8, '30–44': 12, '45–64': 38, '65+': 42 },
    },
    {
      type: 'Par med hjemmeboende børn',
      desc: 'To voksne i husstand med hjemmeboende børn',
      persons: 1295000, pct: 29.1,
      men: 648000, women: 647000,
      ageGroups: { '16–29': 5, '30–44': 45, '45–64': 48, '65+': 2 },
    },
    {
      type: 'Øvrige husholdninger',
      desc: 'Flerfamiliehusholdninger, kollektiver m.m.',
      persons: 300000, pct: 6.7,
      men: 155000, women: 145000,
      ageGroups: { '16–29': 45, '30–44': 25, '45–64': 20, '65+': 10 },
    },
  ],
  adultsByHouseholdMeta: {
    total: 4447000,
    year: 2024,
    source: 'DST Statistikbank, tabel FAM122N',
    note: 'Voksne borgere 16+ fordelt på husholdningstype. Enlige inkluderer alderspensionister og unge under uddannelse.',
  },

  // ── Fiscal implications of demographics ──────────────────────────────────────
  fiscalPressure: {
    pensionCostPerElderlyBn: 0.240,   // ~240 mia / 1.0M elderly = 0.24 mia per person (rough avg)
    elderlyCareCostBn: 65,
    childcareCostBn: 55,
    workingAgeTaxRevBn: 1350,         // approx total tax from working-age population
    dependency2040projection: 59.2,   // total dependency ratio projected 2040
    fiscalSustainabilityGap: 0.3      // % of GDP, Finansministeriet 2025 estimate
  }
};

router.get('/summary', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(DEMO);
});

export default router;
