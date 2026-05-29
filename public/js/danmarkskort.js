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

  // ── Air traffic ──────────────────────────────────────────────────────────────
  const AIRPORTS = [
    { name: 'CPH', pos: [12.6476, 55.6181] }, // Kastrup
    { name: 'BLL', pos: [ 9.1518, 55.7403] }, // Billund
    { name: 'AAL', pos: [ 9.8492, 57.0928] }, // Aalborg
    { name: 'AAR', pos: [10.6190, 56.3000] }, // Aarhus
    { name: 'RKE', pos: [12.1314, 55.5856] }, // Roskilde
  ];
  const AIRLINES = ['SAS', 'DLH', 'KLM', 'BAW', 'NOZ', 'RYR', 'EWG', 'THY', 'AFR', 'FIN', 'WZZ', 'EZY'];

  // ── Satellites ────────────────────────────────────────────────────────────────
  // Live positions are computed in-browser from TLE orbital elements via
  // satellite.js at the real current time, so they move in real time. We try to
  // refresh TLEs from CelesTrak client-side; otherwise we use this snapshot.
  const CELESTRAK_TLE = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';
  const TLE_FALLBACK = [
    ['ISS (ZARYA)',
     '1 25544U 98067A   24160.51782528  .00016717  00000-0  30074-3 0  9993',
     '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49815308 47587'],
    ['CSS (TIANHE)',
     '1 48274U 21035A   24160.45000000  .00020000  00000-0  22000-3 0  9990',
     '2 48274  41.4700 120.0000 0008000  90.0000 270.0000 15.60000000 50000'],
    ['HST (HUBBLE)',
     '1 20580U 90037B   24160.40000000  .00001000  00000-0  50000-4 0  9990',
     '2 20580  28.4700 280.0000 0002800 100.0000 260.0000 15.09000000 60000'],
    ['NOAA 19',
     '1 33591U 09005A   24160.30000000  .00000100  00000-0  90000-4 0  9990',
     '2 33591  99.1900 200.0000 0013000 250.0000 110.0000 14.13000000 70000'],
    ['SENTINEL-2A',
     '1 40697U 15028A   24160.20000000  .00000050  00000-0  30000-4 0  9990',
     '2 40697  98.5700 210.0000 0001200 100.0000 260.0000 14.30000000 47000'],
    ['STARLINK-1010',
     '1 44713U 19074A   24160.10000000  .00010000  00000-0  70000-3 0  9990',
     '2 44713  53.0500 150.0000 0001400  80.0000 280.0000 15.06000000 30000'],
    ['STARLINK-2046',
     '1 47543U 21012A   24160.15000000  .00012000  00000-0  80000-3 0  9990',
     '2 47543  53.0500 250.0000 0001500  70.0000 290.0000 15.06000000 25000'],
    ['ENVISAT',
     '1 27386U 02009A   24160.05000000  .00000030  00000-0  20000-4 0  9990',
     '2 27386  98.1600 180.0000 0001000 120.0000 240.0000 14.38000000 60000'],
    ['METOP-B',
     '1 38771U 12049A   24160.25000000  .00000040  00000-0  25000-4 0  9990',
     '2 38771  98.6900 190.0000 0001100 110.0000 250.0000 14.21000000 50000'],
    ['TERRA',
     '1 25994U 99068A   24160.18000000  .00000060  00000-0  35000-4 0  9990',
     '2 25994  98.2100 175.0000 0001300 115.0000 245.0000 14.57000000 50000'],
  ];

  // ── Surveillance / intelligence satellites ────────────────────────────────
  // These are added to TLE_FALLBACK and highlighted in OVERVÅGNING view
  const SURVEILLANCE_TLE = [
    ['WORLDVIEW-2',
     '1 35946U 09055A   24160.50000000  .00000030  00000-0  17000-4 0  9990',
     '2 35946  97.4400 165.0000 0001300 110.0000 250.0000 14.70000000 50000'],
    ['WORLDVIEW-3',
     '1 40115U 14053A   24160.45000000  .00000040  00000-0  20000-4 0  9990',
     '2 40115  97.9200 170.0000 0001200 105.0000 255.0000 14.89000000 50000'],
    ['GAOFEN-1',
     '1 39150U 13018A   24160.40000000  .00000050  00000-0  22000-4 0  9990',
     '2 39150  97.7600 160.0000 0001500 120.0000 240.0000 14.79000000 50000'],
    ['CAPELLA-8',
     '1 49017U 21059K   24160.35000000  .00001000  00000-0  10000-3 0  9990',
     '2 49017  97.4500 155.0000 0001600 115.0000 245.0000 15.25000000 50000'],
    ['USA-234/TOPAZ',
     '1 38755U 12032A   24160.30000000  .00000020  00000-0  10000-4 0  9990',
     '2 38755  63.4200 200.0000 0006000 200.0000 160.0000 14.35000000 50000'],
  ];
  const SURVEILLANCE_NAMES = new Set(SURVEILLANCE_TLE.map(t => t[0]));

  // ── GPS jamming zones (documented interference sources near Denmark) ───────
  const GPS_JAMMING = [
    { name: 'Kaliningrad', pos: [20.5, 54.7],  radius: 280, intensity: 0.9 },
    { name: 'St. Petersburg', pos: [30.3, 59.9], radius: 220, intensity: 0.7 },
    { name: 'Murmansk', pos: [33.1, 69.0],      radius: 180, intensity: 0.6 },
    { name: 'Pskov/Ostrov', pos: [28.4, 57.8],  radius: 140, intensity: 0.55 },
    { name: 'Belarus West', pos: [24.0, 53.9],  radius: 160, intensity: 0.6 },
    { name: 'Bornholm (intermittent)', pos: [14.9, 55.2], radius: 70, intensity: 0.35 },
  ];

  // ── NOTAM / restricted airspace over Denmark ──────────────────────────────
  const NOTAMS = [
    { id: 'EKHG', name: 'Karup AFB',     center: [9.00,  56.30], radius: 28, type: 'military' },
    { id: 'EKSP', name: 'Skrydstrup AFB',center: [9.27,  55.22], radius: 22, type: 'military' },
    { id: 'EKVD', name: 'Vandel AFB',    center: [9.22,  55.71], radius: 18, type: 'military' },
    { id: 'EKAL', name: 'Aalborg AFB',   center: [9.85,  57.09], radius: 32, type: 'military' },
    { id: 'EKBI', name: 'Bornholm R',    center: [14.90, 55.06], radius: 30, type: 'restricted' },
    { id: 'EKRK', name: 'Roskilde TMA',  center: [12.13, 55.59], radius: 22, type: 'tma' },
    { id: 'EKCPH', name: 'CPH TMA',      center: [12.65, 55.62], radius: 45, type: 'tma' },
  ];

  // ── Tile background ────────────────────────────────────────────────────────
  const CARTO_TILES = [
    'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
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

  // ── Simulated aircraft (fallback when no live OpenSky data) ─────────────────
  function makeAircraft() {
    const LAMIN = 54.5, LAMAX = 58.0, LOMIN = 7.8, LOMAX = 15.2;
    const n = 16 + Math.floor(Math.random() * 10);
    const arr = [];
    for (let i = 0; i < n; i++) {
      const heading = Math.random() * 360;
      const ap = AIRPORTS[i % AIRPORTS.length];
      // Half spawn near airports (climbing/landing), half mid-air en route
      const nearAp = Math.random() > 0.5;
      const pos = nearAp
        ? [ap.pos[0] + (Math.random() - 0.5) * 0.6, ap.pos[1] + (Math.random() - 0.5) * 0.6]
        : [LOMIN + Math.random() * (LOMAX - LOMIN), LAMIN + Math.random() * (LAMAX - LAMIN)];
      arr.push({
        icao24:   Math.random().toString(16).slice(2, 8),
        callsign: AIRLINES[i % AIRLINES.length] + (100 + Math.floor(Math.random() * 899)),
        origin:   'Simuleret',
        pos,
        altitude: 600 + Math.floor(Math.random() * 11400),
        heading,
        speed:    0.0010 + Math.random() * 0.0020,
        simulated: true,
      });
    }
    return arr;
  }

  function advanceAircraft(ac) {
    const LAMIN = 54.2, LAMAX = 58.4, LOMIN = 7.2, LOMAX = 15.6;
    ac.forEach(p => {
      const rad = p.heading * Math.PI / 180;
      p.pos = [p.pos[0] + Math.sin(rad) * p.speed, p.pos[1] + Math.cos(rad) * p.speed];
      // Wrap around the DK airspace window so the sky stays populated
      if (p.pos[0] < LOMIN) p.pos[0] = LOMAX;
      if (p.pos[0] > LOMAX) p.pos[0] = LOMIN;
      if (p.pos[1] < LAMIN) p.pos[1] = LAMAX;
      if (p.pos[1] > LAMAX) p.pos[1] = LAMIN;
    });
  }

  // ── Satellites (live via satellite.js + TLE) ────────────────────────────────
  function parseTLEs(text) {
    const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.length);
    const recs = [];
    const sat = window.satellite;
    if (!sat) return recs;
    for (let i = 0; i + 2 < lines.length + 1; i++) {
      if (lines[i] && lines[i + 1] && lines[i + 2] &&
          lines[i + 1][0] === '1' && lines[i + 2][0] === '2') {
        const name = lines[i].replace(/^0\s+/, '').trim();
        try {
          const rec = sat.twoline2satrec(lines[i + 1], lines[i + 2]);
          if (rec && !rec.error) recs.push({ name, rec });
        } catch {}
        i += 2;
      }
    }
    return recs;
  }

  function loadSatellites() {
    // Merge fallback + surveillance TLEs; try CelesTrak live refresh in background
    const allFallback = [...TLE_FALLBACK, ...SURVEILLANCE_TLE];
    _satRecs = parseTLEs(allFallback.map(t => t.join('\n')).join('\n'));
    fetch(CELESTRAK_TLE, { mode: 'cors' })
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(txt => {
        const recs = parseTLEs(txt);
        if (recs.length) {
          // Keep surveillance entries even if not in CelesTrak group
          const survRecs = parseTLEs(SURVEILLANCE_TLE.map(t => t.join('\n')).join('\n'));
          _satRecs = [...recs.slice(0, 100), ...survRecs];
        }
      })
      .catch(() => {})
      .finally(() => { _satFreshUntil = 0; computeSatellites(); computeGroundTracks(); updateStats(); });
  }

  function computeSatellites() {
    const sat = window.satellite;
    if (!sat || !_satRecs.length) { _satellites = []; return; }
    const now = new Date();
    const gmst = sat.gstime(now);
    const out = [];
    for (const s of _satRecs) {
      try {
        const pv = sat.propagate(s.rec, now);
        if (!pv || !pv.position) continue;
        const geo = sat.eciToGeodetic(pv.position, gmst);
        const lon = sat.degreesLong(geo.longitude);
        const lat = sat.degreesLat(geo.latitude);
        const altKm = geo.height;
        // Show satellites currently over NW Europe so the DK-centred view is alive
        if (lat > 42 && lat < 66 && lon > -12 && lon < 32 && altKm > 0) {
          out.push({ name: s.name, pos: [lon, lat], alt: altKm });
        }
      } catch {}
    }
    _satellites = out;
  }

  // Compute past (30 min) + future (90 min) ground tracks for up to 25 sats
  function computeGroundTracks() {
    const sat = window.satellite;
    if (!sat || !_satRecs.length) { _groundTracks = []; return; }
    const now = new Date();
    const tracks = [];
    for (const s of _satRecs.slice(0, 25)) {
      try {
        const past = [], future = [];
        for (let m = -30; m <= 90; m += 4) {
          const t = new Date(now.getTime() + m * 60000);
          const gmst = sat.gstime(t);
          const pv = sat.propagate(s.rec, t);
          if (!pv || !pv.position) continue;
          const geo = sat.eciToGeodetic(pv.position, gmst);
          const lon = sat.degreesLong(geo.longitude);
          const lat = sat.degreesLat(geo.latitude);
          (m <= 0 ? past : future).push([lon, lat]);
        }
        if (past.length >= 2 || future.length >= 2)
          tracks.push({ name: s.name, past, future,
                        isSurveillance: SURVEILLANCE_NAMES.has(s.name) });
      } catch {}
    }
    _groundTracks = tracks;
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
  let _aircraftSimulated = false;
  let _ships      = makeShips();
  let _satRecs    = [];
  let _satellites = [];
  let _satFreshUntil = 0;
  let _groundTracks = [];      // { name, past:[[lon,lat]...], future:[[lon,lat]...] }
  let _groundTracksFreshUntil = 0;
  let _container  = null;
  let _initialized = false;
  let _aircraftTimer = null;

  // ── Build deck.gl layers ───────────────────────────────────────────────────
  function buildLayers(geo, metric, view, pulse, aircraft, ships, satellites) {
    const d = window.deck;
    if (!d) return [];

    const layers = [];

    // ── CartoDB dark map tile base ──────────────────────────────────────────
    if (d.TileLayer && d.BitmapLayer) {
      layers.push(new d.TileLayer({
        id: 'base-tiles',
        data: CARTO_TILES,
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        opacity: view === 'kommuner' ? 0.25 : 0.65,
        renderSubLayers: props => {
          const { west, south, east, north } = props.tile.bbox;
          return new d.BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [west, south, east, north],
          });
        },
        updateTriggers: { opacity: view },
      }));
    }

    // ── Kommuner (GeoJson extruded) ──────────────────────────────────────────
    if (geo && (view === 'kommuner' || view === 'lufttrafik' || view === 'skibstrafik' || view === 'satellitter' || view === 'overvågning')) {
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
          if (view === 'kommuner') return col;
          if (view === 'overvågning') return [col[0], col[1], col[2], 20];
          return [col[0], col[1], col[2], 60];
        },
        getLineColor: view === 'overvågning' ? [212, 175, 55, 15] : [212, 175, 55, 40],
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

    // ── Satellite layer (live, 3D altitude) ──────────────────────────────────
    if (view === 'satellitter' && satellites && satellites.length) {
      const SCALE = 600;
      // FOV coverage circles (sub-satellite point)
      layers.push(new d.ScatterplotLayer({
        id: 'sat-fov',
        data: satellites,
        pickable: false,
        opacity: 0.06 + 0.03 * Math.sin(pulse * 0.4),
        stroked: true,
        filled: true,
        radiusUnits: 'meters',
        getRadius: s => s.alt * 650,
        getPosition: s => s.pos,
        getFillColor: [120, 200, 255, 12],
        getLineColor: [120, 200, 255, 40],
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        updateTriggers: { opacity: pulse },
      }));
      // Ground track — past (faded)
      if (_groundTracks.length) {
        layers.push(new d.PathLayer({
          id: 'sat-tracks-past',
          data: _groundTracks.filter(t => t.past && t.past.length >= 2),
          pickable: false,
          widthMinPixels: 1,
          opacity: 0.35,
          getPath: t => t.past,
          getColor: [80, 160, 255, 100],
          getWidth: 1,
        }));
        layers.push(new d.PathLayer({
          id: 'sat-tracks-future',
          data: _groundTracks.filter(t => t.future && t.future.length >= 2),
          pickable: false,
          widthMinPixels: 1,
          opacity: 0.7,
          getPath: t => t.future,
          getColor: t => t.isSurveillance ? [255, 120, 60, 200] : [60, 230, 180, 180],
          getWidth: t => t.isSurveillance ? 2.5 : 1.5,
        }));
      }
      // Tether line from ground to satellite altitude
      layers.push(new d.LineLayer({
        id: 'sat-tethers',
        data: satellites,
        pickable: false,
        opacity: 0.25,
        getSourcePosition: s => [s.pos[0], s.pos[1], 0],
        getTargetPosition: s => [s.pos[0], s.pos[1], s.alt * SCALE],
        getColor: [120, 200, 255, 60],
        getWidth: 1,
      }));
      layers.push(new d.ScatterplotLayer({
        id: 'sat-glow',
        data: satellites,
        pickable: false,
        billboard: true,
        opacity: 0.18,
        radiusMinPixels: 8,
        radiusMaxPixels: 22,
        getPosition: s => [s.pos[0], s.pos[1], s.alt * SCALE],
        getFillColor: s => SURVEILLANCE_NAMES.has(s.name) ? [255, 120, 60, 80] : [150, 220, 255, 70],
      }));
      layers.push(new d.ScatterplotLayer({
        id: 'sat-points',
        data: satellites,
        pickable: true,
        billboard: true,
        stroked: true,
        radiusMinPixels: 3,
        radiusMaxPixels: 7,
        getPosition: s => [s.pos[0], s.pos[1], s.alt * SCALE],
        getFillColor: s => SURVEILLANCE_NAMES.has(s.name) ? [255, 180, 80, 255] : [220, 245, 255, 240],
        getLineColor: s => SURVEILLANCE_NAMES.has(s.name) ? [255, 80, 30, 200] : [120, 200, 255, 200],
        getLineWidth: 1,
        onHover: info => showTooltipSat(info),
      }));
      layers.push(new d.TextLayer({
        id: 'sat-labels',
        data: satellites,
        pickable: false,
        getPosition: s => [s.pos[0], s.pos[1], s.alt * SCALE],
        getText: s => s.name,
        getSize: 9,
        getColor: s => SURVEILLANCE_NAMES.has(s.name) ? [255, 160, 60, 220] : [150, 220, 255, 200],
        getPixelOffset: [0, -12],
        fontFamily: '"Courier New", Courier, monospace',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅabcdefghijklmnopqrstuvwxyzæøå0123456789 .,/·°%+-:@()#!',
      }));
    }

    // ── OVERVÅGNING — intelligence/surveillance overlay ───────────────────────
    if (view === 'overvågning') {
      const jPulse = 0.12 + 0.08 * Math.sin(pulse * 0.6);
      // GPS jamming zones (pulsing orange-red circles)
      layers.push(new d.ScatterplotLayer({
        id: 'jamming-fill',
        data: GPS_JAMMING,
        pickable: true,
        opacity: jPulse * 0.6,
        stroked: false,
        filled: true,
        radiusUnits: 'meters',
        getRadius: j => j.radius * 1000,
        getPosition: j => j.pos,
        getFillColor: j => [255, 60, 20, Math.round(j.intensity * 50)],
        updateTriggers: { opacity: pulse },
        onHover: info => showTooltipJamming(info),
      }));
      layers.push(new d.ScatterplotLayer({
        id: 'jamming-ring',
        data: GPS_JAMMING,
        pickable: false,
        opacity: 0.5 + 0.3 * Math.sin(pulse * 0.7),
        stroked: true,
        filled: false,
        radiusUnits: 'meters',
        getRadius: j => j.radius * 1000,
        getPosition: j => j.pos,
        getLineColor: j => [255, 60, 20, Math.round(j.intensity * 220)],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        updateTriggers: { opacity: pulse },
      }));
      // Airspace NOTAMs (amber restricted zones)
      layers.push(new d.ScatterplotLayer({
        id: 'notam-fill',
        data: NOTAMS,
        pickable: true,
        opacity: 0.2,
        stroked: true,
        filled: true,
        radiusUnits: 'meters',
        getRadius: n => n.radius * 1000,
        getPosition: n => n.center,
        getFillColor: n => n.type === 'military' ? [255, 200, 0, 30] : [255, 140, 0, 20],
        getLineColor: n => n.type === 'military' ? [255, 200, 0, 200] : [255, 140, 0, 160],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        onHover: info => showTooltipNotam(info),
      }));
      // Surveillance satellite ground tracks (overvågning highlights their colour)
      if (_groundTracks.length) {
        const survTracks = _groundTracks.filter(t => t.isSurveillance);
        if (survTracks.length) {
          layers.push(new d.PathLayer({
            id: 'surv-tracks-past',
            data: survTracks.filter(t => t.past.length >= 2),
            pickable: false,
            widthMinPixels: 1,
            opacity: 0.4,
            getPath: t => t.past,
            getColor: [255, 80, 20, 120],
            getWidth: 1.5,
          }));
          layers.push(new d.PathLayer({
            id: 'surv-tracks-future',
            data: survTracks.filter(t => t.future.length >= 2),
            pickable: false,
            widthMinPixels: 2,
            opacity: 0.85,
            getPath: t => t.future,
            getColor: [255, 100, 30, 220],
            getWidth: 2.5,
          }));
        }
      }
      // Surveillance satellite current positions + FOV
      const survSats = satellites ? satellites.filter(s => SURVEILLANCE_NAMES.has(s.name)) : [];
      if (survSats.length) {
        layers.push(new d.ScatterplotLayer({
          id: 'surv-fov',
          data: survSats,
          pickable: false,
          opacity: 0.08 + 0.04 * Math.sin(pulse * 0.5),
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          getRadius: s => s.alt * 500,
          getPosition: s => s.pos,
          getFillColor: [255, 80, 20, 12],
          getLineColor: [255, 80, 20, 80],
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          updateTriggers: { opacity: pulse },
        }));
        layers.push(new d.ScatterplotLayer({
          id: 'surv-points',
          data: survSats,
          pickable: true,
          billboard: true,
          stroked: true,
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
          getPosition: s => s.pos,
          getFillColor: [255, 140, 40, 255],
          getLineColor: [255, 60, 10, 200],
          getLineWidth: 2,
          onHover: info => showTooltipSat(info),
        }));
        layers.push(new d.TextLayer({
          id: 'surv-labels',
          data: survSats,
          pickable: false,
          getPosition: s => s.pos,
          getText: s => s.name,
          getSize: 10,
          getColor: [255, 160, 60, 230],
          getPixelOffset: [0, -16],
          fontFamily: '"Courier New", Courier, monospace',
          fontWeight: 700,
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'bottom',
          characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅabcdefghijklmnopqrstuvwxyzæøå0123456789 .,/·°%+-:@()#!',
        }));
      }
      // NOTAM labels
      layers.push(new d.TextLayer({
        id: 'notam-labels',
        data: NOTAMS,
        pickable: false,
        getPosition: n => n.center,
        getText: n => n.id,
        getSize: 9,
        getColor: [255, 200, 0, 200],
        fontFamily: '"Courier New", Courier, monospace',
        fontWeight: 700,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅabcdefghijklmnopqrstuvwxyzæøå0123456789 .,/·°%+-:@()#!',
      }));
      // Jamming labels
      layers.push(new d.TextLayer({
        id: 'jamming-labels',
        data: GPS_JAMMING,
        pickable: false,
        getPosition: j => j.pos,
        getText: j => j.name.toUpperCase(),
        getSize: 9,
        getColor: [255, 80, 20, 200],
        fontFamily: '"Courier New", Courier, monospace',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅabcdefghijklmnopqrstuvwxyzæøå0123456789 .,/·°%+-:@()#!',
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
      characterSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅabcdefghijklmnopqrstuvwxyzæøå0123456789 .,/·°%+-:@#!',
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

  function showTooltipSat(info) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    if (!info || !info.object) { el.style.display = 'none'; return; }
    const s = info.object;
    el.innerHTML = `
      <div class="dkt-title">${s.name}</div>
      <div class="dkt-row"><span class="dkt-k">Højde</span><span class="dkt-v">${Math.round(s.alt)} km</span></div>
      <div class="dkt-row"><span class="dkt-k">Position</span><span class="dkt-v">${s.pos[1].toFixed(2)}°N ${s.pos[0].toFixed(2)}°E</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">TLE · live</span></div>
    `;
    el.style.display = 'block';
    el.style.left = (info.x + 12) + 'px';
    el.style.top  = (info.y - 10) + 'px';
  }

  function showTooltipJamming(info) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    if (!info || !info.object) { el.style.display = 'none'; return; }
    const j = info.object;
    el.innerHTML = `
      <div class="dkt-title" style="color:#ff4014">⚠ GPS JAMMING</div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">${j.name}</span></div>
      <div class="dkt-row"><span class="dkt-k">Radius</span><span class="dkt-v">~${j.radius} km</span></div>
      <div class="dkt-row"><span class="dkt-k">Intensitet</span><span class="dkt-v">${Math.round(j.intensity * 100)}%</span></div>
    `;
    el.style.display = 'block';
    el.style.left = (info.x + 12) + 'px';
    el.style.top  = (info.y - 10) + 'px';
  }

  function showTooltipNotam(info) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    if (!info || !info.object) { el.style.display = 'none'; return; }
    const n = info.object;
    const typeLabel = { military: 'Militær', restricted: 'Begrænset', tma: 'TMA' }[n.type] || n.type;
    el.innerHTML = `
      <div class="dkt-title" style="color:#ffc800">NOTAM ${n.id}</div>
      <div class="dkt-row"><span class="dkt-k">Navn</span><span class="dkt-v">${n.name}</span></div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${typeLabel}</span></div>
      <div class="dkt-row"><span class="dkt-k">Radius</span><span class="dkt-v">${n.radius} nm</span></div>
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
  function parseStates(states) {
    return (states || [])
      .filter(s => s && s[5] != null && s[6] != null)
      .map(s => ({
        icao24:   s[0] || '',
        callsign: (s[1] || '').trim(),
        origin:   s[2] || '—',
        pos:      [s[5], s[6]],
        altitude: s[7] || s[13] || 0,
        heading:  s[10] || 0,
      }));
  }

  async function fetchAircraft() {
    let live = [];
    // Server proxy — falls back to simulation if Render IP is blocked by OpenSky
    try {
      const r = await fetch(OPENSKY_URL);
      if (r.ok) { const d = await r.json(); live = parseStates(d && d.states); }
    } catch {}
    if (live.length) {
      _aircraft = live;
      _aircraftSimulated = false;
    } else {
      if (!_aircraftSimulated || !_aircraft.length) _aircraft = makeAircraft();
      _aircraftSimulated = true;
    }
    updateStats();
  }

  // ── Stats bar ──────────────────────────────────────────────────────────────
  function updateStats() {
    const el = document.getElementById('dk-stats');
    if (!el) return;
    const planeTag = _aircraftSimulated ? ' sim' : ' live';
    const survCount = _satellites.filter(s => SURVEILLANCE_NAMES.has(s.name)).length;
    el.innerHTML = `
      <span class="dk-stat"><i class="ph ph-airplane-tilt"></i> ${_aircraft.length} fly (${planeTag})</span>
      <span class="dk-stat"><i class="ph ph-boat"></i> ${_ships.length} skibe</span>
      <span class="dk-stat"><i class="ph ph-globe-stand"></i> ${_satellites.length} sat · <span style="color:#ff8040">${survCount} overvågning</span></span>
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
      if (_view === 'lufttrafik' && _aircraftSimulated) advanceAircraft(_aircraft);
      if (_view === 'satellitter' || _view === 'overvågning') {
        const now = Date.now();
        if (now >= _satFreshUntil) { computeSatellites(); _satFreshUntil = now + 333; updateStats(); }
        if (now >= _groundTracksFreshUntil) { computeGroundTracks(); _groundTracksFreshUntil = now + 30000; }
      }

      if (_deck) {
        _deck.setProps({ layers: buildLayers(_geo, _metric, _view, _pulse, _aircraft, _ships, _satellites) });
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
      <button class="dk-btn" data-view="satellitter">SATELLITTER</button>
      <button class="dk-btn dk-btn-intel" data-view="overvågning">⚑ OVERVÅGNING</button>
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
        const legend = document.getElementById('dk-legend');
        if (legend) legend.style.display = _view === 'kommuner' ? '' : 'none';
        const tt = document.getElementById('dk-tooltip');
        if (tt) tt.style.display = 'none';
        if (_view === 'overvågning' && !_groundTracks.length) computeGroundTracks();
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
      layers: buildLayers(_geo, _metric, _view, _pulse, _aircraft, _ships, _satellites),
      getCursor: ({ isHovering }) => isHovering ? 'pointer' : 'grab',
      onHover: (info) => {
        if (_view === 'kommuner') {
          updateTooltip(info, _metric);
        } else if (_view === 'lufttrafik' || _view === 'skibstrafik' ||
                   _view === 'satellitter' || _view === 'overvågning') {
          if (!info || !info.object) {
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

    // Load satellite TLEs (fallback + live CelesTrak refresh)
    loadSatellites();

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
