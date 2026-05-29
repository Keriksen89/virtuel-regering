/* ── VG.danmarkskort — Interaktivt 3D Danmarkskort (deck.gl) ─────────────── */
VG.danmarkskort = {};

(function () {
  'use strict';

  const GEO_URL  = '/geo/municipalities.geojson';
  const DECK_URL = '/vendor/deck.gl.min.js';
  const OPENSKY_URL = '/api/opensky';
  const AIRCRAFT_REFRESH_MS = 15000;

  // ── Municipality data ──────────────────────────────────────────────────────
  // Keys match label_dk property in the GeoJSON
  const KD = {
    'Aabenraa':                { ledighed: 6.1,  indkomst: 310000, boligpris: 9500,  befolkning: 59200,  co2: 5.4 },
    'Aalborg':                 { ledighed: 5.5,  indkomst: 330000, boligpris: 16000, befolkning: 216000, co2: 6.5 },
    'Albertslund':             { ledighed: 7.2,  indkomst: 320000, boligpris: 22000, befolkning: 28200,  co2: 4.1 },
    'Allerød':                 { ledighed: 3.2,  indkomst: 540000, boligpris: 28000, befolkning: 26400,  co2: 3.4 },
    'Assens':                  { ledighed: 5.8,  indkomst: 295000, boligpris: 8500,  befolkning: 41400,  co2: 5.1 },
    'Ballerup':                { ledighed: 4.8,  indkomst: 420000, boligpris: 28000, befolkning: 49400,  co2: 3.5 },
    'Billund':                 { ledighed: 3.8,  indkomst: 370000, boligpris: 11000, befolkning: 27000,  co2: 4.8 },
    'Bornholm':                { ledighed: 7.4,  indkomst: 280000, boligpris: 8000,  befolkning: 39500,  co2: 3.9 },
    'Brøndby':                 { ledighed: 7.0,  indkomst: 315000, boligpris: 23000, befolkning: 35100,  co2: 4.2 },
    'Brønderslev-Dronninglund':{ ledighed: 6.0,  indkomst: 290000, boligpris: 8000,  befolkning: 36700,  co2: 5.8 },
    'Christiansø':             { ledighed: 1.0,  indkomst: 320000, boligpris: 8000,  befolkning: 100,    co2: 2.0 },
    'Dragør':                  { ledighed: 2.9,  indkomst: 550000, boligpris: 36000, befolkning: 14400,  co2: 3.2 },
    'Egedal':                  { ledighed: 3.5,  indkomst: 490000, boligpris: 26000, befolkning: 43500,  co2: 3.5 },
    'Esbjerg':                 { ledighed: 5.9,  indkomst: 330000, boligpris: 12000, befolkning: 117000, co2: 5.6 },
    'Faaborg-Midtfyn':         { ledighed: 6.3,  indkomst: 280000, boligpris: 8000,  befolkning: 51000,  co2: 5.0 },
    'Fanø':                    { ledighed: 4.5,  indkomst: 310000, boligpris: 18000, befolkning: 3400,   co2: 3.8 },
    'Favrskov':                { ledighed: 3.9,  indkomst: 410000, boligpris: 14000, befolkning: 48500,  co2: 4.2 },
    'Faxe':                    { ledighed: 6.5,  indkomst: 295000, boligpris: 9500,  befolkning: 35700,  co2: 5.0 },
    'Fredensborg':             { ledighed: 3.3,  indkomst: 510000, boligpris: 29000, befolkning: 40400,  co2: 3.3 },
    'Fredericia':              { ledighed: 5.8,  indkomst: 330000, boligpris: 14000, befolkning: 52800,  co2: 5.5 },
    'Frederiksberg':           { ledighed: 4.2,  indkomst: 500000, boligpris: 48000, befolkning: 103800, co2: 2.9 },
    'Frederikshavn':           { ledighed: 6.8,  indkomst: 285000, boligpris: 7500,  befolkning: 61700,  co2: 5.9 },
    'Frederikssund':           { ledighed: 4.8,  indkomst: 400000, boligpris: 20000, befolkning: 54100,  co2: 3.8 },
    'Furesø':                  { ledighed: 3.1,  indkomst: 560000, boligpris: 30000, befolkning: 42200,  co2: 3.3 },
    'Gentofte':                { ledighed: 2.5,  indkomst: 620000, boligpris: 42000, befolkning: 77500,  co2: 3.1 },
    'Gladsaxe':                { ledighed: 4.0,  indkomst: 440000, boligpris: 29000, befolkning: 68900,  co2: 3.2 },
    'Glostrup':                { ledighed: 5.2,  indkomst: 380000, boligpris: 24000, befolkning: 23500,  co2: 3.6 },
    'Greve':                   { ledighed: 4.6,  indkomst: 420000, boligpris: 22000, befolkning: 50000,  co2: 3.7 },
    'Gribskov':                { ledighed: 4.5,  indkomst: 400000, boligpris: 18000, befolkning: 43300,  co2: 3.8 },
    'Guldborgsund':            { ledighed: 8.2,  indkomst: 265000, boligpris: 7000,  befolkning: 60700,  co2: 5.8 },
    'Haderslev':               { ledighed: 5.7,  indkomst: 310000, boligpris: 10000, befolkning: 55900,  co2: 5.2 },
    'Halsnæs':                 { ledighed: 5.8,  indkomst: 330000, boligpris: 15000, befolkning: 31600,  co2: 4.0 },
    'Hedensted':               { ledighed: 4.0,  indkomst: 370000, boligpris: 12000, befolkning: 46200,  co2: 4.5 },
    'Helsingør':               { ledighed: 5.0,  indkomst: 390000, boligpris: 22000, befolkning: 63300,  co2: 3.5 },
    'Herlev':                  { ledighed: 5.1,  indkomst: 390000, boligpris: 26000, befolkning: 28600,  co2: 3.4 },
    'Herning':                 { ledighed: 4.2,  indkomst: 360000, boligpris: 13000, befolkning: 91000,  co2: 5.2 },
    'Hillerød':                { ledighed: 4.3,  indkomst: 430000, boligpris: 22000, befolkning: 51100,  co2: 3.5 },
    'Hjørring':                { ledighed: 6.9,  indkomst: 275000, boligpris: 7200,  befolkning: 64200,  co2: 5.9 },
    'Holbæk':                  { ledighed: 6.1,  indkomst: 330000, boligpris: 13000, befolkning: 72700,  co2: 4.3 },
    'Holstebro':               { ledighed: 4.5,  indkomst: 340000, boligpris: 10500, befolkning: 57700,  co2: 5.0 },
    'Horsens':                 { ledighed: 4.8,  indkomst: 360000, boligpris: 16000, befolkning: 94000,  co2: 4.8 },
    'Hvidovre':                { ledighed: 5.8,  indkomst: 370000, boligpris: 26000, befolkning: 53200,  co2: 3.6 },
    'Høje-Taastrup':           { ledighed: 6.8,  indkomst: 340000, boligpris: 21000, befolkning: 52400,  co2: 3.9 },
    'Hørsholm':                { ledighed: 2.8,  indkomst: 600000, boligpris: 38000, befolkning: 25300,  co2: 3.2 },
    'Ikast-Brande':            { ledighed: 4.0,  indkomst: 345000, boligpris: 10000, befolkning: 41600,  co2: 5.0 },
    'Ishøj':                   { ledighed: 8.5,  indkomst: 300000, boligpris: 18000, befolkning: 22700,  co2: 4.3 },
    'Jammerbugt':              { ledighed: 5.5,  indkomst: 285000, boligpris: 8500,  befolkning: 38200,  co2: 5.5 },
    'Kalundborg':              { ledighed: 6.0,  indkomst: 310000, boligpris: 9500,  befolkning: 50200,  co2: 5.3 },
    'Kerteminde':              { ledighed: 5.2,  indkomst: 300000, boligpris: 10000, befolkning: 23700,  co2: 4.8 },
    'Kolding':                 { ledighed: 4.5,  indkomst: 380000, boligpris: 16000, befolkning: 95000,  co2: 4.6 },
    'København':               { ledighed: 5.4,  indkomst: 410000, boligpris: 52000, befolkning: 794128, co2: 3.1 },
    'Køge':                    { ledighed: 5.0,  indkomst: 390000, boligpris: 18000, befolkning: 59900,  co2: 4.0 },
    'Langeland':               { ledighed: 8.0,  indkomst: 255000, boligpris: 7000,  befolkning: 12800,  co2: 5.2 },
    'Lejre':                   { ledighed: 3.8,  indkomst: 460000, boligpris: 21000, befolkning: 27500,  co2: 3.7 },
    'Lemvig':                  { ledighed: 5.1,  indkomst: 285000, boligpris: 8000,  befolkning: 20700,  co2: 4.8 },
    'Lolland':                 { ledighed: 10.2, indkomst: 245000, boligpris: 5500,  befolkning: 43500,  co2: 5.9 },
    'Lyngby-Taarbæk':          { ledighed: 2.9,  indkomst: 580000, boligpris: 40000, befolkning: 56500,  co2: 3.1 },
    'Læsø':                    { ledighed: 4.8,  indkomst: 275000, boligpris: 9000,  befolkning: 1900,   co2: 3.5 },
    'Mariagerfjord':           { ledighed: 5.4,  indkomst: 295000, boligpris: 8500,  befolkning: 42100,  co2: 5.6 },
    'Middelfart':              { ledighed: 4.8,  indkomst: 350000, boligpris: 13000, befolkning: 38400,  co2: 4.6 },
    'Morsø':                   { ledighed: 6.5,  indkomst: 275000, boligpris: 7500,  befolkning: 21200,  co2: 5.6 },
    'Norddjurs':               { ledighed: 6.2,  indkomst: 285000, boligpris: 8500,  befolkning: 37900,  co2: 5.5 },
    'Nordfyns':                { ledighed: 5.6,  indkomst: 290000, boligpris: 9000,  befolkning: 29400,  co2: 5.0 },
    'Nyborg':                  { ledighed: 5.4,  indkomst: 300000, boligpris: 10500, befolkning: 31600,  co2: 4.8 },
    'Næstved':                 { ledighed: 6.4,  indkomst: 305000, boligpris: 10000, befolkning: 82400,  co2: 4.8 },
    'Odder':                   { ledighed: 3.7,  indkomst: 400000, boligpris: 15000, befolkning: 22700,  co2: 4.0 },
    'Odense':                  { ledighed: 6.2,  indkomst: 340000, boligpris: 18000, befolkning: 207000, co2: 4.5 },
    'Odsherred':               { ledighed: 7.0,  indkomst: 280000, boligpris: 10000, befolkning: 32800,  co2: 4.5 },
    'Randers':                 { ledighed: 5.6,  indkomst: 325000, boligpris: 11000, befolkning: 96000,  co2: 5.3 },
    'Rebild':                  { ledighed: 4.2,  indkomst: 360000, boligpris: 10000, befolkning: 29800,  co2: 4.9 },
    'Ringkøbing-Skjern':       { ledighed: 4.4,  indkomst: 330000, boligpris: 9500,  befolkning: 57700,  co2: 5.1 },
    'Ringsted':                { ledighed: 5.5,  indkomst: 345000, boligpris: 13000, befolkning: 35100,  co2: 4.3 },
    'Roskilde':                { ledighed: 4.0,  indkomst: 450000, boligpris: 22000, befolkning: 90600,  co2: 3.7 },
    'Rudersdal':               { ledighed: 2.8,  indkomst: 650000, boligpris: 35000, befolkning: 57400,  co2: 3.2 },
    'Rødovre':                 { ledighed: 5.5,  indkomst: 370000, boligpris: 25000, befolkning: 38800,  co2: 3.5 },
    'Samsø':                   { ledighed: 4.0,  indkomst: 295000, boligpris: 12000, befolkning: 3700,   co2: 1.8 },
    'Silkeborg':               { ledighed: 4.0,  indkomst: 380000, boligpris: 16000, befolkning: 91300,  co2: 4.5 },
    'Skanderborg':             { ledighed: 3.2,  indkomst: 430000, boligpris: 17000, befolkning: 63400,  co2: 4.0 },
    'Skive':                   { ledighed: 5.5,  indkomst: 300000, boligpris: 9000,  befolkning: 47200,  co2: 5.4 },
    'Slagelse':                { ledighed: 6.8,  indkomst: 295000, boligpris: 10500, befolkning: 79800,  co2: 4.7 },
    'Solrød':                  { ledighed: 3.5,  indkomst: 470000, boligpris: 23000, befolkning: 22200,  co2: 3.5 },
    'Sorø':                    { ledighed: 5.0,  indkomst: 330000, boligpris: 11500, befolkning: 29800,  co2: 4.2 },
    'Stevns':                  { ledighed: 4.8,  indkomst: 370000, boligpris: 12500, befolkning: 22300,  co2: 4.0 },
    'Struer':                  { ledighed: 5.0,  indkomst: 305000, boligpris: 8500,  befolkning: 22200,  co2: 5.2 },
    'Svendborg':               { ledighed: 6.0,  indkomst: 305000, boligpris: 11000, befolkning: 58400,  co2: 4.8 },
    'Syddjurs':                { ledighed: 4.5,  indkomst: 340000, boligpris: 12000, befolkning: 43400,  co2: 4.5 },
    'Sønderborg':              { ledighed: 5.9,  indkomst: 315000, boligpris: 10500, befolkning: 75600,  co2: 5.0 },
    'Thisted':                 { ledighed: 6.3,  indkomst: 280000, boligpris: 7800,  befolkning: 43200,  co2: 5.5 },
    'Tårnby':                  { ledighed: 4.5,  indkomst: 385000, boligpris: 26000, befolkning: 44200,  co2: 3.6 },
    'Tønder':                  { ledighed: 6.5,  indkomst: 285000, boligpris: 7500,  befolkning: 38100,  co2: 5.4 },
    'Vallensbæk':              { ledighed: 4.2,  indkomst: 450000, boligpris: 26000, befolkning: 16200,  co2: 3.5 },
    'Varde':                   { ledighed: 4.8,  indkomst: 320000, boligpris: 9500,  befolkning: 50500,  co2: 5.0 },
    'Vejen':                   { ledighed: 4.5,  indkomst: 325000, boligpris: 9000,  befolkning: 43300,  co2: 5.1 },
    'Vejle':                   { ledighed: 4.3,  indkomst: 390000, boligpris: 18000, befolkning: 119000, co2: 4.8 },
    'Vesthimmerland':          { ledighed: 6.2,  indkomst: 280000, boligpris: 7500,  befolkning: 37200,  co2: 5.6 },
    'Viborg':                  { ledighed: 4.5,  indkomst: 340000, boligpris: 11500, befolkning: 97000,  co2: 5.0 },
    'Vordingborg':             { ledighed: 7.0,  indkomst: 285000, boligpris: 9000,  befolkning: 45400,  co2: 4.9 },
    'Ærø':                     { ledighed: 5.5,  indkomst: 280000, boligpris: 10000, befolkning: 6200,   co2: 3.8 },
    'Århus':                   { ledighed: 4.8,  indkomst: 380000, boligpris: 28000, befolkning: 360000, co2: 4.2 },
  };

  // ── Metric configuration ───────────────────────────────────────────────────
  const METRICS = {
    ledighed:   { label: 'Ledighed',     unit: '%',        goodHigh: false, format: v => v.toFixed(1) + '%' },
    indkomst:   { label: 'Indkomst',     unit: 'kr/år',    goodHigh: true,  format: v => (v / 1000).toFixed(0) + 'k kr' },
    boligpris:  { label: 'Boligpris',    unit: 'kr/m²',    goodHigh: false, format: v => v.toLocaleString('da-DK') + ' kr/m²' },
    befolkning: { label: 'Befolkning',   unit: 'pers',     goodHigh: true,  format: v => v.toLocaleString('da-DK') },
    co2:        { label: 'CO₂',          unit: 't/pers',   goodHigh: false, format: v => v.toFixed(1) + ' t/pers' },
  };

  const METRIC_RANGES = {
    ledighed:   { min: 1.0,    max: 10.2 },
    indkomst:   { min: 245000, max: 650000 },
    boligpris:  { min: 5500,   max: 52000 },
    befolkning: { min: 100,    max: 794128 },
    co2:        { min: 1.8,    max: 6.8 },
  };

  // ── City markers ───────────────────────────────────────────────────────────
  const CITIES = [
    { name: 'KØBENHAVN', pos: [12.5683, 55.6761], pop: 794128 },
    { name: 'AARHUS',    pos: [10.2039, 56.1629], pop: 360000 },
    { name: 'AALBORG',   pos: [ 9.9218, 57.0469], pop: 216000 },
    { name: 'ODENSE',    pos: [10.3835, 55.3957], pop: 207000 },
    { name: 'VEJLE',     pos: [ 9.5359, 55.7086], pop: 119000 },
    { name: 'ESBJERG',   pos: [ 8.4594, 55.4764], pop: 117000 },
    { name: 'RANDERS',   pos: [10.0384, 56.4607], pop:  96000 },
    { name: 'HORSENS',   pos: [ 9.8541, 55.8601], pop:  94000 },
    { name: 'KOLDING',   pos: [ 9.4753, 55.4904], pop:  95000 },
    { name: 'HERNING',   pos: [ 8.9737, 56.1326], pop:  91000 },
  ];

  // ── Shipping routes ────────────────────────────────────────────────────────
  // Each ship travels between two waypoints, bouncing back and forth
  const SHIP_ROUTES = [
    // Øresund — northbound/southbound
    { from: [12.61, 56.04], to: [12.88, 55.60] },
    { from: [12.65, 56.00], to: [12.90, 55.65] },
    // Storebælt
    { from: [11.11, 55.34], to: [10.91, 55.19] },
    { from: [11.08, 55.32], to: [10.93, 55.21] },
    // Kattegat N-S
    { from: [10.59, 57.73], to: [10.21, 56.16] },
    { from: [10.62, 57.70], to: [10.24, 56.20] },
    // Esbjerg approach from North Sea
    { from: [7.90, 55.40],  to: [8.46, 55.48] },
    // Baltic / Bornholm → Copenhagen
    { from: [14.92, 55.10], to: [12.60, 55.65] },
    // Femern Belt
    { from: [11.30, 54.85], to: [11.00, 54.62] },
    // Limfjorden west entry
    { from: [8.24, 56.96],  to: [9.52, 56.82] },
  ];

  const SHIP_TYPES = ['cargo', 'tanker', 'container'];
  const SHIP_NAMES = [
    'MAERSK BERING', 'DFDS CROWN', 'STENA DANICA', 'PEARL SEAWAYS',
    'NORDIC LUNA', 'ARC WIND', 'SELANDIA', 'KRONBORG', 'ODENSE',
    'ESBJERG STAR', 'BORNHOLM LINK', 'LIMFJORD EXPRESS',
  ];

  function makeShips() {
    return SHIP_ROUTES.map((route, i) => {
      const t = Math.random();
      const lng = route.from[0] + (route.to[0] - route.from[0]) * t;
      const lat = route.from[1] + (route.to[1] - route.from[1]) * t;
      const dlng = route.to[0] - route.from[0];
      const dlat = route.to[1] - route.from[1];
      const heading = Math.atan2(dlng, dlat) * (180 / Math.PI);
      return {
        id: i,
        pos: [lng, lat],
        t,
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 0.00008 + Math.random() * 0.00006,
        heading,
        type: SHIP_TYPES[i % SHIP_TYPES.length],
        name: SHIP_NAMES[i] || ('SHIP-' + i),
        route,
      };
    });
  }

  function advanceShips(ships) {
    ships.forEach(s => {
      s.t += s.dir * s.speed;
      if (s.t > 1) { s.t = 1; s.dir = -1; }
      if (s.t < 0) { s.t = 0; s.dir =  1; }
      s.pos = [
        s.route.from[0] + (s.route.to[0] - s.route.from[0]) * s.t,
        s.route.from[1] + (s.route.to[1] - s.route.from[1]) * s.t,
      ];
      const dlng = s.dir * (s.route.to[0] - s.route.from[0]);
      const dlat = s.dir * (s.route.to[1] - s.route.from[1]);
      s.heading = Math.atan2(dlng, dlat) * (180 / Math.PI);
    });
  }

  // ── Color helpers ──────────────────────────────────────────────────────────
  // t: normalised 0→1, goodHigh: true means high is gold/good
  function colorForValue(t, goodHigh) {
    const TEAL = [0, 180, 216];
    const GOLD = [212, 175, 55];
    const RED  = [235, 64, 52];

    const clamp = x => Math.max(0, Math.min(1, x));
    const lerp  = (a, b, x) => Math.round(a + (b - a) * clamp(x));

    if (goodHigh) {
      // low (bad) grey-teal → high (good) gold
      const lo = [80, 140, 160];
      return [lerp(lo[0], GOLD[0], t), lerp(lo[1], GOLD[1], t), lerp(lo[2], GOLD[2], t), 200];
    } else {
      // low (good) teal → high (bad) red
      return [lerp(TEAL[0], RED[0], t), lerp(TEAL[1], RED[1], t), lerp(TEAL[2], RED[2], t), 200];
    }
  }

  function normalise(value, metric) {
    const r = METRIC_RANGES[metric];
    if (!r) return 0;
    return Math.max(0, Math.min(1, (value - r.min) / (r.max - r.min)));
  }

  function elevationForValue(value, metric) {
    const r = METRIC_RANGES[metric];
    if (!r) return 5000;
    const t = Math.max(0, Math.min(1, (value - r.min) / (r.max - r.min)));
    return 5000 + t * 120000;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let _deck       = null;
  let _geo        = null;
  let _metric     = 'ledighed';
  let _view       = 'kommuner';
  let _pulse      = 0;
  let _rafId      = null;
  let _aircraft   = [];
  let _ships      = makeShips();
  let _container  = null;
  let _initialized = false;
  let _aircraftTimer = null;

  // ── Build deck.gl layers ───────────────────────────────────────────────────
  function buildLayers(geo, metric, view, pulse, aircraft, ships) {
    const d = window.deck;
    if (!d) return [];

    const layers = [];

    // ── Kommuner (GeoJson extruded) ──────────────────────────────────────────
    if (geo && (view === 'kommuner' || view === 'lufttrafik' || view === 'skibstrafik')) {
      const metricCfg = METRICS[metric] || METRICS.ledighed;
      layers.push(new d.GeoJsonLayer({
        id: 'kommuner',
        data: geo,
        pickable: view === 'kommuner',
        stroked: true,
        filled: true,
        extruded: view === 'kommuner',
        wireframe: view === 'kommuner',
        lineWidthMinPixels: 1,
        getElevation: f => {
          const name = f.properties && f.properties.label_dk;
          const kd   = name && KD[name];
          if (!kd) return 5000;
          return elevationForValue(kd[metric], metric);
        },
        getFillColor: f => {
          const name = f.properties && f.properties.label_dk;
          const kd   = name && KD[name];
          if (!kd) return [40, 40, 50, 160];
          const t = normalise(kd[metric], metric);
          const col = colorForValue(t, metricCfg.goodHigh);
          return view === 'kommuner' ? col : [col[0], col[1], col[2], 60];
        },
        getLineColor: [212, 175, 55, 40],
        lineWidthScale: 1,
        updateTriggers: {
          getFillColor: [metric, view],
          getElevation: [metric, view],
        },
      }));
    }

    // ── Aircraft layer ───────────────────────────────────────────────────────
    if (view === 'lufttrafik' && aircraft.length) {
      layers.push(new d.ScatterplotLayer({
        id: 'aircraft-glow',
        data: aircraft,
        pickable: false,
        opacity: 0.12,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 10,
        radiusMaxPixels: 28,
        getPosition: d => d.pos,
        getFillColor: [0, 255, 200, 60],
      }));
      layers.push(new d.ScatterplotLayer({
        id: 'aircraft',
        data: aircraft,
        pickable: true,
        opacity: 0.9,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 4,
        radiusMaxPixels: 10,
        getPosition: d => d.pos,
        getFillColor: [0, 255, 200, 230],
        onHover: info => showTooltipAircraft(info),
      }));
    }

    // ── Ship layer ───────────────────────────────────────────────────────────
    if (view === 'skibstrafik') {
      layers.push(new d.ScatterplotLayer({
        id: 'ships-glow',
        data: ships,
        pickable: false,
        opacity: 0.15,
        stroked: false,
        filled: true,
        radiusMinPixels: 12,
        radiusMaxPixels: 32,
        getPosition: d => d.pos,
        getFillColor: [255, 160, 40, 50],
      }));
      layers.push(new d.ScatterplotLayer({
        id: 'ships',
        data: ships,
        pickable: true,
        opacity: 1,
        stroked: true,
        filled: true,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
        getPosition: d => d.pos,
        getFillColor: [255, 160, 40, 240],
        getLineColor: [255, 200, 100, 200],
        getLineWidth: 1,
        onHover: info => showTooltipShip(info),
      }));
      // Ship route lines (faint)
      layers.push(new d.PathLayer({
        id: 'ship-routes',
        data: SHIP_ROUTES,
        pickable: false,
        widthMinPixels: 1,
        widthMaxPixels: 2,
        opacity: 0.18,
        getPath: r => [r.from, r.to],
        getColor: [255, 160, 40, 80],
        getWidth: 1,
      }));
    }

    // ── City pulsing rings (always visible) ──────────────────────────────────
    const p1 = (Math.sin(pulse) * 0.5 + 0.5);
    const p2 = (Math.sin(pulse + 1.5) * 0.5 + 0.5);

    layers.push(new d.ScatterplotLayer({
      id: 'city-rings-outer',
      data: CITIES,
      pickable: false,
      stroked: true,
      filled: false,
      radiusScale: 1,
      radiusMinPixels: 8 + p1 * 10,
      radiusMaxPixels: 30 + p1 * 20,
      getPosition: d => d.pos,
      getLineColor: [212, 175, 55, Math.round(80 + p1 * 120)],
      getLineWidth: 2,
      updateTriggers: { radiusMinPixels: pulse, radiusMaxPixels: pulse, getLineColor: pulse },
    }));

    layers.push(new d.ScatterplotLayer({
      id: 'city-rings-inner',
      data: CITIES,
      pickable: false,
      stroked: true,
      filled: false,
      radiusMinPixels: 4 + p2 * 6,
      radiusMaxPixels: 14 + p2 * 10,
      getPosition: d => d.pos,
      getLineColor: [212, 175, 55, Math.round(140 + p2 * 80)],
      getLineWidth: 1.5,
      updateTriggers: { radiusMinPixels: pulse, radiusMaxPixels: pulse, getLineColor: pulse },
    }));

    layers.push(new d.ScatterplotLayer({
      id: 'city-dots',
      data: CITIES,
      pickable: false,
      stroked: false,
      filled: true,
      radiusMinPixels: 3,
      radiusMaxPixels: 6,
      getPosition: d => d.pos,
      getFillColor: [212, 175, 55, 255],
    }));

    layers.push(new d.TextLayer({
      id: 'city-labels',
      data: CITIES,
      pickable: false,
      getPosition: d => d.pos,
      getText: d => d.name,
      getSize: 11,
      getColor: [212, 175, 55, 200],
      getPixelOffset: [0, -20],
      fontFamily: '"Courier New", Courier, monospace',
      fontWeight: 700,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      // Include Danish glyphs (Æ Ø Å) so labels like KØBENHAVN render fully
      characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅabcdefghijklmnopqrstuvwxyzæøå0123456789 .,-',
    }));

    return layers;
  }

  // ── Tooltip logic ──────────────────────────────────────────────────────────
  function showTooltipAircraft(info) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    if (!info || !info.object) { el.style.display = 'none'; return; }
    const ac = info.object;
    el.innerHTML = `
      <div class="dkt-title">${ac.callsign || ac.icao24 || 'Ukendt fly'}</div>
      <div class="dkt-row"><span class="dkt-k">ICAO24</span><span class="dkt-v">${ac.icao24 || '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Oprindelse</span><span class="dkt-v">${ac.origin || '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Altitude</span><span class="dkt-v">${ac.altitude ? Math.round(ac.altitude) + ' m' : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kurs</span><span class="dkt-v">${ac.heading ? Math.round(ac.heading) + '°' : '—'}</span></div>
    `;
    el.style.display = 'block';
    el.style.left = (info.x + 12) + 'px';
    el.style.top  = (info.y - 10) + 'px';
  }

  function showTooltipShip(info) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    if (!info || !info.object) { el.style.display = 'none'; return; }
    const s = info.object;
    el.innerHTML = `
      <div class="dkt-title">${s.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${s.type}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kurs</span><span class="dkt-v">${Math.round(s.heading)}°</span></div>
      <div class="dkt-row"><span class="dkt-k">Position</span><span class="dkt-v">${s.pos[1].toFixed(3)}°N ${s.pos[0].toFixed(3)}°E</span></div>
    `;
    el.style.display = 'block';
    el.style.left = (info.x + 12) + 'px';
    el.style.top  = (info.y - 10) + 'px';
  }

  function updateTooltip(info, currentMetric) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    if (!info || !info.object) { el.style.display = 'none'; return; }

    const name = info.object.properties && info.object.properties.label_dk;
    const kd   = name && KD[name];
    if (!name) { el.style.display = 'none'; return; }

    const metricCfg = METRICS[currentMetric];
    const val = kd ? kd[currentMetric] : null;
    const fmtVal = (val != null && metricCfg) ? metricCfg.format(val) : '—';

    let rows = '';
    if (kd) {
      Object.entries(METRICS).forEach(([k, m]) => {
        const v = kd[k];
        const active = k === currentMetric ? ' dkt-row-active' : '';
        rows += `<div class="dkt-row${active}"><span class="dkt-k">${m.label}</span><span class="dkt-v">${m.format(v)}</span></div>`;
      });
    }

    el.innerHTML = `
      <div class="dkt-title">${name}</div>
      <div class="dkt-highlight">${metricCfg ? metricCfg.label : currentMetric}: <strong>${fmtVal}</strong></div>
      ${rows}
    `;
    el.style.display = 'block';
    el.style.left = (info.x + 12) + 'px';
    el.style.top  = (info.y - 10) + 'px';
  }

  // ── Fetch aircraft ─────────────────────────────────────────────────────────
  async function fetchAircraft() {
    try {
      const resp = await fetch(OPENSKY_URL);
      if (!resp.ok) throw new Error('non-200');
      const data = await resp.json();
      const states = (data && Array.isArray(data.states)) ? data.states : [];
      _aircraft = states
        .filter(s => s && s[5] != null && s[6] != null)
        .map(s => ({
          icao24:   s[0] || '',
          callsign: (s[1] || '').trim(),
          origin:   s[2] || '—',
          pos:      [s[5], s[6]],
          altitude: s[7] || 0,
          heading:  s[11] || 0,
        }));
    } catch (e) {
      _aircraft = [];
    }
    updateStats();
  }

  // ── Stats bar ──────────────────────────────────────────────────────────────
  function updateStats() {
    const el = document.getElementById('dk-stats');
    if (!el) return;
    el.innerHTML = `
      <span class="dk-stat"><i class="ph ph-airplane-tilt"></i> ${_aircraft.length} fly i luften</span>
      <span class="dk-stat"><i class="ph ph-anchor-simple"></i> ${_ships.length} skibe</span>
    `;
  }

  // ── Animation loop ─────────────────────────────────────────────────────────
  function startLoop() {
    if (_rafId) return;
    function frame() {
      const panel = document.getElementById('panel-danmarkskort');
      if (!panel || !panel.classList.contains('active')) {
        _rafId = null;
        return;
      }
      _pulse += 0.025;
      advanceShips(_ships);

      if (_deck) {
        _deck.setProps({ layers: buildLayers(_geo, _metric, _view, _pulse, _aircraft, _ships) });
      }
      _rafId = requestAnimationFrame(frame);
    }
    _rafId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    if (_aircraftTimer) {
      clearInterval(_aircraftTimer);
      _aircraftTimer = null;
    }
  }

  // ── Legend builder ─────────────────────────────────────────────────────────
  function buildLegendHTML(metric) {
    const metricCfg = METRICS[metric];
    const r = METRIC_RANGES[metric];
    if (!metricCfg || !r) return '';

    const steps = 5;
    let swatches = '';
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const [r_, g_, b_] = colorForValue(t, metricCfg.goodHigh);
      const val = r.min + (r.max - r.min) * t;
      swatches += `<div class="dk-leg-step">
        <div class="dk-leg-swatch" style="background:rgb(${r_},${g_},${b_})"></div>
        <div class="dk-leg-lbl">${metricCfg.format(val)}</div>
      </div>`;
    }
    return `<div class="dk-legend-inner">${swatches}</div>`;
  }

  function refreshLegend() {
    const el = document.getElementById('dk-legend');
    if (el) el.innerHTML = buildLegendHTML(_metric);
  }

  // ── UI builder ─────────────────────────────────────────────────────────────
  function buildUI(container) {
    container.innerHTML = `
<div class="dk-wrap" id="dk-wrap">
  <canvas id="dk-canvas" class="dk-canvas"></canvas>

  <div class="dk-hud">
    <div class="dk-hud-title">DANMARKSMASKINEN</div>
    <div class="dk-view-btns" id="dk-view-btns">
      <button class="dk-btn active" data-view="kommuner">KOMMUNER</button>
      <button class="dk-btn" data-view="lufttrafik">LUFTTRAFIK</button>
      <button class="dk-btn" data-view="skibstrafik">SKIBSTRAFIK</button>
    </div>
    <div class="dk-metric-btns" id="dk-metric-btns">
      <button class="dk-btn active" data-metric="ledighed">LEDIGHED</button>
      <button class="dk-btn" data-metric="indkomst">INDKOMST</button>
      <button class="dk-btn" data-metric="boligpris">BOLIGPRIS</button>
      <button class="dk-btn" data-metric="befolkning">BEFOLKNING</button>
      <button class="dk-btn" data-metric="co2">CO₂</button>
    </div>
    <div class="dk-legend" id="dk-legend"></div>
    <div class="dk-stats" id="dk-stats"></div>
  </div>

  <div class="dk-tooltip" id="dk-tooltip"></div>

  <div class="dk-loading" id="dk-loading">
    <div class="dk-loading-text">INDLÆSER DANMARKSMASKINEN</div>
    <div class="dk-loading-sub">WebGL · deck.gl · GeoJSON</div>
  </div>
</div>
    `;

    // Bind view buttons
    container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        _view = btn.dataset.view;
        container.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
        const metricBtns = document.getElementById('dk-metric-btns');
        if (metricBtns) metricBtns.style.display = _view === 'kommuner' ? '' : 'none';
        // Hide tooltip
        const tt = document.getElementById('dk-tooltip');
        if (tt) tt.style.display = 'none';
      });
    });

    // Bind metric buttons
    container.querySelectorAll('[data-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        _metric = btn.dataset.metric;
        container.querySelectorAll('[data-metric]').forEach(b => b.classList.toggle('active', b === btn));
        refreshLegend();
        const tt = document.getElementById('dk-tooltip');
        if (tt) tt.style.display = 'none';
      });
    });

    refreshLegend();
    updateStats();
  }

  // ── deck.gl init ───────────────────────────────────────────────────────────
  function initDeck(canvas) {
    const d = window.deck;
    if (!d || !canvas) return;

    _deck = new d.Deck({
      canvas,
      width: '100%',
      height: '100%',
      initialViewState: {
        longitude: 10.5,
        latitude:  56.0,
        zoom:       5.8,
        pitch:      45,
        bearing:    -10,
      },
      controller: true,
      views: new d.MapView({ repeat: false }),
      parameters: {
        clearColor: [0, 0, 0, 255],
      },
      layers: buildLayers(_geo, _metric, _view, _pulse, _aircraft, _ships),
      getCursor: ({ isHovering }) => isHovering ? 'pointer' : 'grab',
      onHover: (info) => {
        if (_view === 'kommuner') {
          updateTooltip(info, _metric);
        } else {
          // aircraft/ship tooltips handled in per-layer onHover
          if (_view !== 'lufttrafik' && _view !== 'skibstrafik') {
            const tt = document.getElementById('dk-tooltip');
            if (tt) tt.style.display = 'none';
          }
        }
      },
    });

    // Hide loading screen
    const loading = document.getElementById('dk-loading');
    if (loading) loading.style.display = 'none';
  }

  // ── Load deck.gl script ────────────────────────────────────────────────────
  function loadDeckScript() {
    return new Promise((resolve, reject) => {
      if (window.deck) { resolve(); return; }
      const existing = document.getElementById('deck-gl-script');
      if (existing) {
        // Script already loading — wait for it
        const wait = setInterval(() => {
          if (window.deck) { clearInterval(wait); resolve(); }
        }, 100);
        return;
      }
      const s = document.createElement('script');
      s.id  = 'deck-gl-script';
      s.src = DECK_URL;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init(panel) {
    _container = panel;
    buildUI(panel);

    try {
      await loadDeckScript();
    } catch (e) {
      const loading = document.getElementById('dk-loading');
      if (loading) {
        loading.innerHTML = '<div class="dk-loading-text" style="color:#eb4034">DECK.GL INDLÆSNING FEJLEDE</div>';
      }
      return;
    }

    // Fetch GeoJSON
    try {
      const resp = await fetch(GEO_URL);
      _geo = await resp.json();
    } catch (e) {
      _geo = null;
    }

    const canvas = document.getElementById('dk-canvas');
    if (canvas) initDeck(canvas);

    _initialized = true;

    // Fetch aircraft now and on interval
    await fetchAircraft();
    _aircraftTimer = setInterval(async () => {
      await fetchAircraft();
    }, AIRCRAFT_REFRESH_MS);

    startLoop();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  VG.danmarkskort.render = function (panel) {
    if (!panel) return;
    if (!_initialized) {
      init(panel);
    } else {
      // Re-attach if panel was re-rendered
      if (!document.getElementById('dk-canvas')) {
        _initialized = false;
        _deck = null;
        init(panel);
      } else {
        startLoop();
      }
    }
  };

  VG.danmarkskort.destroy = function () {
    stopLoop();
    if (_deck) {
      try { _deck.finalize(); } catch (e) {}
      _deck = null;
    }
    _initialized = false;
  };

})();
