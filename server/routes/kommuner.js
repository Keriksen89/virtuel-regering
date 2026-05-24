import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const DST_BASE = 'https://api.statbank.dk/v1';

// 2025 municipal tax rates (kommuneskat + kirkeskat typical) — static reference data
// Source: SKAT.dk / Indenrigsministeriet 2025
const KOMMUNER_STATIC = [
  { kode: '101', navn: 'København',    region: 'Hovedstaden', skat: 23.8 },
  { kode: '147', navn: 'Frederiksberg', region: 'Hovedstaden', skat: 22.8 },
  { kode: '151', navn: 'Ballerup',     region: 'Hovedstaden', skat: 25.6 },
  { kode: '153', navn: 'Brøndby',      region: 'Hovedstaden', skat: 26.3 },
  { kode: '155', navn: 'Dragør',       region: 'Hovedstaden', skat: 25.3 },
  { kode: '157', navn: 'Gentofte',     region: 'Hovedstaden', skat: 22.3 },
  { kode: '159', navn: 'Gladsaxe',     region: 'Hovedstaden', skat: 24.7 },
  { kode: '161', navn: 'Glostrup',     region: 'Hovedstaden', skat: 24.0 },
  { kode: '163', navn: 'Herlev',       region: 'Hovedstaden', skat: 25.0 },
  { kode: '165', navn: 'Albertslund',  region: 'Hovedstaden', skat: 26.7 },
  { kode: '167', navn: 'Hvidovre',     region: 'Hovedstaden', skat: 25.0 },
  { kode: '169', navn: 'Høje-Taastrup', region: 'Hovedstaden', skat: 25.8 },
  { kode: '173', navn: 'Lyngby-Taarbæk', region: 'Hovedstaden', skat: 22.9 },
  { kode: '175', navn: 'Rødovre',      region: 'Hovedstaden', skat: 25.5 },
  { kode: '183', navn: 'Ishøj',        region: 'Hovedstaden', skat: 26.3 },
  { kode: '185', navn: 'Tårnby',       region: 'Hovedstaden', skat: 24.3 },
  { kode: '187', navn: 'Vallensbæk',   region: 'Hovedstaden', skat: 24.3 },
  { kode: '190', navn: 'Furesø',       region: 'Hovedstaden', skat: 24.2 },
  { kode: '201', navn: 'Allerød',      region: 'Hovedstaden', skat: 24.5 },
  { kode: '210', navn: 'Fredensborg',  region: 'Hovedstaden', skat: 25.3 },
  { kode: '217', navn: 'Helsingør',    region: 'Hovedstaden', skat: 24.7 },
  { kode: '219', navn: 'Hillerød',     region: 'Hovedstaden', skat: 25.2 },
  { kode: '223', navn: 'Hørsholm',     region: 'Hovedstaden', skat: 23.6 },
  { kode: '230', navn: 'Rudersdal',    region: 'Hovedstaden', skat: 22.9 },
  { kode: '240', navn: 'Egedal',       region: 'Hovedstaden', skat: 25.5 },
  { kode: '250', navn: 'Frederiksund', region: 'Hovedstaden', skat: 25.9 },
  { kode: '253', navn: 'Greve',        region: 'Sjælland', skat: 24.9 },
  { kode: '259', navn: 'Køge',         region: 'Sjælland', skat: 25.4 },
  { kode: '260', navn: 'Halsnæs',      region: 'Hovedstaden', skat: 26.4 },
  { kode: '265', navn: 'Roskilde',     region: 'Sjælland', skat: 24.4 },
  { kode: '269', navn: 'Solrød',       region: 'Sjælland', skat: 24.9 },
  { kode: '270', navn: 'Gribskov',     region: 'Hovedstaden', skat: 25.7 },
  { kode: '306', navn: 'Odsherred',    region: 'Sjælland', skat: 27.2 },
  { kode: '316', navn: 'Holbæk',       region: 'Sjælland', skat: 26.5 },
  { kode: '320', navn: 'Faxe',         region: 'Sjælland', skat: 26.3 },
  { kode: '326', navn: 'Kalundborg',   region: 'Sjælland', skat: 26.9 },
  { kode: '329', navn: 'Ringsted',     region: 'Sjælland', skat: 26.3 },
  { kode: '330', navn: 'Slagelse',     region: 'Sjælland', skat: 26.3 },
  { kode: '336', navn: 'Stevns',       region: 'Sjælland', skat: 26.5 },
  { kode: '340', navn: 'Sorø',         region: 'Sjælland', skat: 26.2 },
  { kode: '350', navn: 'Lejre',        region: 'Sjælland', skat: 26.3 },
  { kode: '360', navn: 'Lolland',      region: 'Sjælland', skat: 27.4 },
  { kode: '370', navn: 'Næstved',      region: 'Sjælland', skat: 26.3 },
  { kode: '376', navn: 'Guldborgsund', region: 'Sjælland', skat: 27.2 },
  { kode: '390', navn: 'Vordingborg',  region: 'Sjælland', skat: 26.8 },
  { kode: '400', navn: 'Bornholm',     region: 'Hovedstaden', skat: 27.0 },
  { kode: '410', navn: 'Middelfart',   region: 'Syddanmark', skat: 25.4 },
  { kode: '420', navn: 'Assens',       region: 'Syddanmark', skat: 26.8 },
  { kode: '430', navn: 'Faaborg-Midtfyn', region: 'Syddanmark', skat: 26.4 },
  { kode: '440', navn: 'Kerteminde',   region: 'Syddanmark', skat: 26.3 },
  { kode: '450', navn: 'Nyborg',       region: 'Syddanmark', skat: 26.3 },
  { kode: '461', navn: 'Odense',       region: 'Syddanmark', skat: 25.4 },
  { kode: '479', navn: 'Svendborg',    region: 'Syddanmark', skat: 25.9 },
  { kode: '480', navn: 'Nordfyns',     region: 'Syddanmark', skat: 26.5 },
  { kode: '482', navn: 'Langeland',    region: 'Syddanmark', skat: 27.4 },
  { kode: '492', navn: 'Ærø',          region: 'Syddanmark', skat: 27.3 },
  { kode: '510', navn: 'Haderslev',    region: 'Syddanmark', skat: 26.4 },
  { kode: '530', navn: 'Billund',      region: 'Syddanmark', skat: 25.4 },
  { kode: '540', navn: 'Sønderborg',   region: 'Syddanmark', skat: 26.2 },
  { kode: '550', navn: 'Tønder',       region: 'Syddanmark', skat: 26.8 },
  { kode: '561', navn: 'Esbjerg',      region: 'Syddanmark', skat: 25.8 },
  { kode: '563', navn: 'Fanø',         region: 'Syddanmark', skat: 26.1 },
  { kode: '573', navn: 'Varde',        region: 'Syddanmark', skat: 26.5 },
  { kode: '575', navn: 'Vejen',        region: 'Syddanmark', skat: 25.9 },
  { kode: '580', navn: 'Aabenraa',     region: 'Syddanmark', skat: 26.3 },
  { kode: '607', navn: 'Fredericia',   region: 'Syddanmark', skat: 26.0 },
  { kode: '615', navn: 'Horsens',      region: 'Midtjylland', skat: 25.6 },
  { kode: '621', navn: 'Kolding',      region: 'Syddanmark', skat: 25.5 },
  { kode: '630', navn: 'Vejle',        region: 'Syddanmark', skat: 25.3 },
  { kode: '657', navn: 'Herning',      region: 'Midtjylland', skat: 25.8 },
  { kode: '661', navn: 'Holstebro',    region: 'Midtjylland', skat: 25.8 },
  { kode: '665', navn: 'Lemvig',       region: 'Midtjylland', skat: 26.6 },
  { kode: '671', navn: 'Struer',       region: 'Midtjylland', skat: 26.3 },
  { kode: '706', navn: 'Syddjurs',     region: 'Midtjylland', skat: 26.5 },
  { kode: '707', navn: 'Norddjurs',    region: 'Midtjylland', skat: 27.0 },
  { kode: '710', navn: 'Favrskov',     region: 'Midtjylland', skat: 25.7 },
  { kode: '727', navn: 'Odder',        region: 'Midtjylland', skat: 25.5 },
  { kode: '730', navn: 'Randers',      region: 'Midtjylland', skat: 26.4 },
  { kode: '740', navn: 'Silkeborg',    region: 'Midtjylland', skat: 25.6 },
  { kode: '741', navn: 'Samsø',        region: 'Midtjylland', skat: 26.5 },
  { kode: '746', navn: 'Skanderborg',  region: 'Midtjylland', skat: 25.4 },
  { kode: '751', navn: 'Aarhus',       region: 'Midtjylland', skat: 24.8 },
  { kode: '756', navn: 'Ikast-Brande', region: 'Midtjylland', skat: 25.8 },
  { kode: '760', navn: 'Ringkøbing-Skjern', region: 'Midtjylland', skat: 26.0 },
  { kode: '766', navn: 'Hedensted',    region: 'Midtjylland', skat: 25.7 },
  { kode: '773', navn: 'Morsø',        region: 'Nordjylland', skat: 27.0 },
  { kode: '779', navn: 'Skive',        region: 'Midtjylland', skat: 26.2 },
  { kode: '787', navn: 'Viborg',       region: 'Midtjylland', skat: 25.9 },
  { kode: '791', navn: 'Brønderslev',  region: 'Nordjylland', skat: 26.9 },
  { kode: '810', navn: 'Frederikshavn', region: 'Nordjylland', skat: 27.0 },
  { kode: '813', navn: 'Vesthimmerlands', region: 'Nordjylland', skat: 27.3 },
  { kode: '820', navn: 'Læsø',         region: 'Nordjylland', skat: 25.8 },
  { kode: '825', navn: 'Rebild',       region: 'Nordjylland', skat: 26.6 },
  { kode: '840', navn: 'Mariagerfjord', region: 'Nordjylland', skat: 26.8 },
  { kode: '846', navn: 'Jammerbugt',   region: 'Nordjylland', skat: 27.0 },
  { kode: '849', navn: 'Aalborg',      region: 'Nordjylland', skat: 25.6 },
  { kode: '851', navn: 'Hjørring',     region: 'Nordjylland', skat: 27.0 },
  { kode: '860', navn: 'Thisted',      region: 'Nordjylland', skat: 26.8 }
];

router.get('/list', async (req, res) => {
  const cacheKey = 'kommuner:list';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  // Fetch population from DST FOLK1A (population by municipality)
  let popMap = {};
  try {
    const body = {
      table: 'FOLK1A',
      format: 'JSONSTAT',
      variables: [
        { code: 'OMRÅDE', values: KOMMUNER_STATIC.map(k => k.kode) },
        { code: 'Tid', values: ['2025K1'] }
      ]
    };
    const data = await fetchJSON(`${DST_BASE}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const dataset = data.dataset || data;
    const values  = dataset.value || [];
    const areaIdx = dataset.dimension?.OMRÅDE?.category?.index || {};
    const areaLbl = dataset.dimension?.OMRÅDE?.category?.label || {};

    for (const [kode, ord] of Object.entries(areaIdx)) {
      popMap[kode] = values[ord] || null;
    }
  } catch (e) {
    console.warn('[kommuner] population fetch failed:', e.message);
  }

  const kommuner = KOMMUNER_STATIC.map(k => ({
    ...k,
    befolkning: popMap[k.kode] || null
  }));

  const avgSkat = (kommuner.reduce((s, k) => s + k.skat, 0) / kommuner.length).toFixed(1);

  const result = {
    kommuner,
    avgSkat: parseFloat(avgSkat),
    fetched: new Date().toISOString(),
    source: 'SKAT.dk kommuneskat 2025 + DST FOLK1A'
  };

  cache.set(cacheKey, result, 24 * 3600);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

export default router;
