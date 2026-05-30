import { Router } from 'express';

const router = Router();

// MCC 238 = Denmark; operator name by MNC
const OPERATOR = {
  '01': 'TDC / Nuuday',
  '02': 'Telenor DK',
  '06': '3 (Hi3G)',
  '20': 'Telia DK',
};

// Radio type labels
const RADIO_LABEL = { GSM: '2G GSM', UMTS: '3G UMTS', LTE: '4G LTE', NR: '5G NR' };

// Danish city cluster centers: [lat, lon, displayName, towerWeight]
const CLUSTERS = [
  [55.6761, 12.5683, 'København',        260],
  [55.6796, 12.5298, 'Frederiksberg',    40],
  [55.7277, 12.3641, 'Ballerup',         22],
  [55.7714, 12.5055, 'Lyngby',           20],
  [55.6376, 12.4774, 'Hvidovre',         18],
  [55.6548, 12.4268, 'Brøndby',          16],
  [55.5882, 12.2986, 'Greve',            14],
  [55.4583, 12.1832, 'Køge',             14],
  [55.6415, 12.0803, 'Roskilde',         22],
  [56.0364, 12.6136, 'Helsingør',        18],
  [55.9286, 12.3025, 'Hillerød',         16],
  [56.1629, 10.2039, 'Aarhus',           140],
  [56.1715,  9.5504, 'Silkeborg',        20],
  [56.4607, 10.0367, 'Randers',          22],
  [55.8601,  9.8451, 'Horsens',          18],
  [56.1393,  8.9736, 'Herning',          20],
  [55.3959, 10.3883, 'Odense',           90],
  [55.4904,  9.4718, 'Kolding',          20],
  [55.7090,  9.5350, 'Vejle',            20],
  [55.5661,  9.7478, 'Fredericia',       16],
  [57.0488,  9.9217, 'Aalborg',          80],
  [57.4376, 10.5450, 'Frederikshavn',    14],
  [57.4627,  9.9821, 'Hjørring',         12],
  [56.9566,  8.6950, 'Thisted',          10],
  [56.5655,  9.0291, 'Skive',            12],
  [56.4527,  9.4013, 'Viborg',           16],
  [56.3590,  8.6222, 'Holstebro',        14],
  [56.0888,  8.2428, 'Ringkøbing',       8],
  [55.4667,  8.4524, 'Esbjerg',          40],
  [55.2490,  9.4896, 'Haderslev',        12],
  [55.0440,  9.4196, 'Aabenraa',         12],
  [54.9092,  9.7927, 'Sønderborg',       14],
  [55.2295, 11.7577, 'Næstved',          16],
  [55.4013, 11.3541, 'Slagelse',         14],
  [55.1000, 14.7000, 'Rønne (Bornholm)', 14],
  [55.7145, 11.7095, 'Holbæk',           12],
  [55.6772, 11.0968, 'Kalundborg',       10],
  [54.7673, 11.8722, 'Nykøbing F',       10],
  [55.3284, 11.1425, 'Korsør',           8],
  [56.1372,  9.1571, 'Ikast',            10],
];

// Seeded LCG pseudo-random generator (deterministic — same data every restart)
function makeLCG(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickRadio(r) {
  if (r < 0.07) return 'NR';
  if (r < 0.62) return 'LTE';
  if (r < 0.87) return 'UMTS';
  return 'GSM';
}

function pickMnc(r) {
  if (r < 0.35) return '01';
  if (r < 0.65) return '02';
  if (r < 0.83) return '20';
  return '06';
}

// Generate once and cache
let _cache = null;

function getTowers() {
  if (_cache) return _cache;
  const rng = makeLCG(0xC0FFEE42);
  const towers = [];

  for (const [lat, lon, area, weight] of CLUSTERS) {
    const count = weight;
    const spread = 0.003 + weight / 2000; // bigger cities spread wider

    for (let i = 0; i < count; i++) {
      // Box-Muller-ish scatter using two uniform samples
      const r  = spread * Math.sqrt(-2 * Math.log(Math.max(1e-9, rng())));
      const θ  = 2 * Math.PI * rng();
      const dlat = r * Math.cos(θ);
      const dlon = r * Math.sin(θ) * 1.6; // lon degrees wider at DK latitude

      const radio = pickRadio(rng());
      const mnc   = pickMnc(rng());

      towers.push({
        lat: +(lat + dlat).toFixed(5),
        lon: +(lon + dlon).toFixed(5),
        radio,
        mnc,
        operator: OPERATOR[mnc],
        area,
      });
    }
  }

  _cache = towers;
  return towers;
}

// GET /api/telecom/masts
router.get('/masts', (req, res) => {
  const towers = getTowers();
  // Optionally filter by bbox: ?minLat=&maxLat=&minLon=&maxLon=
  const { minLat, maxLat, minLon, maxLon } = req.query;
  if (minLat && maxLat && minLon && maxLon) {
    const filtered = towers.filter(t =>
      t.lat >= +minLat && t.lat <= +maxLat &&
      t.lon >= +minLon && t.lon <= +maxLon
    );
    return res.json({ towers: filtered, total: filtered.length, source: 'static-model' });
  }
  res.json({ towers, total: towers.length, source: 'static-model' });
});

// GET /api/telecom/stats — aggregated summary
router.get('/stats', (req, res) => {
  const towers = getTowers();
  const byRadio    = {};
  const byOperator = {};
  for (const t of towers) {
    byRadio[t.radio]       = (byRadio[t.radio] || 0) + 1;
    byOperator[t.operator] = (byOperator[t.operator] || 0) + 1;
  }
  res.json({ total: towers.length, byRadio, byOperator, source: 'static-model' });
});

export default router;
