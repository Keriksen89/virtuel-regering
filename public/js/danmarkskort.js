/* ── VG.danmarkskort — Danmarksmaskinen, true-3D geospatial globe (CesiumJS) ──
 *
 * Rebuilt on CesiumJS: a real WGS84 globe with photogrammetric 3D buildings
 * (Cesium OSM Buildings via ion, or Google Photorealistic 3D Tiles when a key
 * is configured) and token-free OpenStreetMap imagery as the always-available
 * fallback. All Danish data layers from the previous deck.gl version are ported
 * to Cesium entities at their real 3D positions — aircraft and satellites now
 * sit at their true altitude above the globe.
 *
 * Tokens come from /api/geo/config (CESIUM_ION_TOKEN, GOOGLE_MAPS_KEY). With no
 * tokens the globe still works: OSM imagery + flat ellipsoid, no 3D buildings.
 */
VG.danmarkskort = {};

(function () {
  'use strict';

  const GEO_URL  = '/geo/municipalities.geojson';
  const CONFIG_URL = '/api/geo/config';
  const OPENSKY_URL = '/api/opensky';
  const AIS_URL = '/api/ais';
  const AIRCRAFT_REFRESH_MS = 10000;
  const SHIP_REFRESH_MS = 12000;
  const LERP_MS = 2500;
  const SAT_RECOMPUTE_MS = 1000;   // how often satellites are re-propagated
  const SAT_LERP_MS = 1000;        // smooth glide between propagated positions

  const VIEW_DATA_LINKS = {
    kommuner:      [
      { panel: 'ledighed',     icon: '📉', label: 'Ledighed',          stat: () => { const v = window.VG?.state?.live?.unemployment; return v ? v.toFixed(1)+'%' : ''; } },
      { panel: 'indkomst',     icon: '💰', label: 'Indkomst & Ulighed', stat: () => '' },
      { panel: 'boligmarked',  icon: '🏠', label: 'Boligmarked',       stat: () => '' },
      { panel: 'demographics', icon: '👥', label: 'Demografi',         stat: () => { const v = window.VG?.state?.live?.population; return v ? (v/1e6).toFixed(2)+'M' : ''; } },
      { panel: 'co2',          icon: '🌿', label: 'Klima & CO₂',       stat: () => '' },
      { panel: 'kommuner',     icon: '🗺', label: 'Kommuner (detail)', stat: () => '' },
    ],
    lufttrafik:    [
      { panel: 'dsb',           icon: '🚆', label: 'Transport & DSB',    stat: () => '' },
      { panel: 'erhverv',       icon: '📈', label: 'Erhverv & Vækst',    stat: () => '' },
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',    stat: () => '' },
      { panel: 'energi',        icon: '⚡', label: 'Energi & Strøm',     stat: () => '' },
      { panel: 'innovation',    icon: '🔬', label: 'Innovation',         stat: () => '' },
    ],
    skibstrafik:   [
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',    stat: () => '' },
      { panel: 'landbrug',      icon: '🌾', label: 'Landbrug & Fiskeri', stat: () => '' },
      { panel: 'erhverv',       icon: '📈', label: 'Erhverv & Vækst',   stat: () => '' },
      { panel: 'energi',        icon: '⚡', label: 'Energi',             stat: () => '' },
      { panel: 'inflation',     icon: '💹', label: 'Inflation',          stat: () => '' },
    ],
    satellitter:   [
      { panel: 'forsvar',       icon: '🛡', label: 'Forsvar & Sikkerhed', stat: () => '' },
      { panel: 'innovation',    icon: '🔬', label: 'Innovation',          stat: () => '' },
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',     stat: () => '' },
      { panel: 'medietillid',   icon: '📰', label: 'Medie & Tillid',     stat: () => '' },
    ],
    overvågning:   [
      { panel: 'forsvar',       icon: '🛡', label: 'Forsvar & Sikkerhed', stat: () => '' },
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',     stat: () => '' },
      { panel: 'innovation',    icon: '🔬', label: 'Innovation & Tech',   stat: () => '' },
      { panel: 'medietillid',   icon: '📰', label: 'Medie & Tillid',     stat: () => '' },
      { panel: 'naturvand',     icon: '💧', label: 'Natur & Ressourcer', stat: () => '' },
    ],
    infrastruktur: [
      { panel: 'energi',        icon: '⚡', label: 'Energi & Strøm',    stat: () => '' },
      { panel: 'co2',           icon: '🌿', label: 'Klima & CO₂',       stat: () => '' },
      { panel: 'erhverv',       icon: '📈', label: 'Erhverv & Vækst',   stat: () => '' },
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',    stat: () => '' },
      { panel: 'dsb',           icon: '🚆', label: 'Transport',         stat: () => '' },
      { panel: 'naturvand',     icon: '💧', label: 'Natur & Miljø',     stat: () => '' },
    ],
    vejr: [
      { panel: 'co2',       icon: '🌿', label: 'Klima & CO₂',        stat: () => '' },
      { panel: 'energi',    icon: '⚡', label: 'Energi & Strøm',     stat: () => '' },
      { panel: 'landbrug',  icon: '🌾', label: 'Landbrug & Fiskeri', stat: () => '' },
      { panel: 'naturvand', icon: '💧', label: 'Natur & Ressourcer', stat: () => '' },
    ],
    tog: [
      { panel: 'dsb',          icon: '🚆', label: 'DSB & Transport',   stat: () => '' },
      { panel: 'erhverv',      icon: '📈', label: 'Erhverv & Vækst',   stat: () => '' },
      { panel: 'co2',          icon: '🌿', label: 'Klima & CO₂',       stat: () => '' },
      { panel: 'innovation',   icon: '🔬', label: 'Innovation',         stat: () => '' },
    ],
    beredskab: [
      { panel: 'sundhed',    icon: '🏥', label: 'Sundhed',           stat: () => '' },
      { panel: 'psykiatri',  icon: '🧠', label: 'Psykiatri',         stat: () => '' },
      { panel: 'ventetider', icon: '⏱', label: 'Ventetider',        stat: () => '' },
      { panel: 'forsvar',    icon: '🛡', label: 'Forsvar',           stat: () => '' },
    ],
    forsvar: [
      { panel: 'forsvar',       icon: '🛡', label: 'Forsvar & Sikkerhed', stat: () => '' },
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',     stat: () => '' },
      { panel: 'innovation',    icon: '🔬', label: 'Innovation & Tech',   stat: () => '' },
      { panel: 'medietillid',   icon: '📰', label: 'Medie & Tillid',     stat: () => '' },
    ],
    trafik: [
      { panel: 'dsb',          icon: '🚆', label: 'DSB & Transport',       stat: () => '' },
      { panel: 'erhverv',      icon: '📈', label: 'Erhverv & Vækst',       stat: () => '' },
      { panel: 'co2',          icon: '🌿', label: 'Klima & CO₂',           stat: () => '' },
      { panel: 'infrastruktur',icon: '🛣', label: 'Infrastruktur',         stat: () => '' },
    ],
    politik: [
      { panel: 'forsvar',       icon: '🛡', label: 'Forsvar & Sikkerhed', stat: () => '' },
      { panel: 'udenrigshandel',icon: '🌐', label: 'Udenrigshandel',     stat: () => '' },
      { panel: 'co2',           icon: '🌿', label: 'Klima & CO₂',        stat: () => '' },
      { panel: 'indkomst',      icon: '💰', label: 'Økonomi & Ulighed',  stat: () => '' },
    ],
    infra: [
      { panel: 'innovation',    icon: '🔬', label: 'Innovation & Tech',   stat: () => '' },
      { panel: 'erhverv',       icon: '📈', label: 'Erhverv & Vækst',     stat: () => '' },
      { panel: 'energi',        icon: '⚡', label: 'Energi & Strøm',      stat: () => '' },
      { panel: 'kommuner',      icon: '🗺', label: 'Kommuner (detail)',   stat: () => '' },
    ],
    miljo: [
      { panel: 'naturvand',     icon: '💧', label: 'Natur & Ressourcer',  stat: () => '' },
      { panel: 'co2',           icon: '🌿', label: 'Klima & CO₂',         stat: () => '' },
      { panel: 'energi',        icon: '⚡', label: 'Energi & Strøm',      stat: () => '' },
      { panel: 'sundhed',       icon: '🏥', label: 'Sundhed',             stat: () => '' },
    ],
  };

  const METRIC_PANELS = { ledighed:'ledighed', indkomst:'indkomst', boligpris:'boligmarked', befolkning:'demographics', co2:'co2', skat:'laboratorium', erhverv:'ledighed', uddannelse:'innovation', valgdeltagelse:'demographics', medianalder:'demographics', kriminalitet:'forsvar', middellevetid:'demographics', boligejer:'boligmarked', healthineq:'sundhed', mental:'psykiatri', green:'co2', mobility:'dsb' };

  // ── Municipality data (keys match label_dk in the GeoJSON) ──────────────────
  const KD = {
    'Aabenraa':                { ledighed: 6.1,  indkomst: 310000, boligpris: 9500,  befolkning: 59200,  co2: 5.4, skat: 25.8, erhverv: 72 },
    'Aalborg':                 { ledighed: 5.5,  indkomst: 330000, boligpris: 16000, befolkning: 216000, co2: 6.5, skat: 25.5, erhverv: 74 },
    'Albertslund':             { ledighed: 7.2,  indkomst: 320000, boligpris: 22000, befolkning: 28200,  co2: 4.1, skat: 24.6, erhverv: 71 },
    'Allerød':                 { ledighed: 3.2,  indkomst: 540000, boligpris: 28000, befolkning: 26400,  co2: 3.4, skat: 23.2, erhverv: 81 },
    'Assens':                  { ledighed: 5.8,  indkomst: 295000, boligpris: 8500,  befolkning: 41400,  co2: 5.1, skat: 25.7, erhverv: 73 },
    'Ballerup':                { ledighed: 4.8,  indkomst: 420000, boligpris: 28000, befolkning: 49400,  co2: 3.5, skat: 23.4, erhverv: 79 },
    'Billund':                 { ledighed: 3.8,  indkomst: 370000, boligpris: 11000, befolkning: 27000,  co2: 4.8, skat: 24.4, erhverv: 78 },
    'Bornholm':                { ledighed: 7.4,  indkomst: 280000, boligpris: 8000,  befolkning: 39500,  co2: 3.9, skat: 26.0, erhverv: 70 },
    'Brøndby':                 { ledighed: 7.0,  indkomst: 315000, boligpris: 23000, befolkning: 35100,  co2: 4.2, skat: 24.9, erhverv: 72 },
    'Brønderslev-Dronninglund':{ ledighed: 6.0,  indkomst: 290000, boligpris: 8000,  befolkning: 36700,  co2: 5.8, skat: 26.4, erhverv: 73 },
    'Christiansø':             { ledighed: 1.0,  indkomst: 320000, boligpris: 8000,  befolkning: 100,    co2: 2.0, skat: 22.8, erhverv: 82 },
    'Dragør':                  { ledighed: 2.9,  indkomst: 550000, boligpris: 36000, befolkning: 14400,  co2: 3.2, skat: 23.0, erhverv: 81 },
    'Egedal':                  { ledighed: 3.5,  indkomst: 490000, boligpris: 26000, befolkning: 43500,  co2: 3.5, skat: 23.5, erhverv: 80 },
    'Esbjerg':                 { ledighed: 5.9,  indkomst: 330000, boligpris: 12000, befolkning: 117000, co2: 5.6, skat: 25.3, erhverv: 74 },
    'Faaborg-Midtfyn':         { ledighed: 6.3,  indkomst: 280000, boligpris: 8000,  befolkning: 51000,  co2: 5.0, skat: 26.1, erhverv: 72 },
    'Fanø':                    { ledighed: 4.5,  indkomst: 310000, boligpris: 18000, befolkning: 3400,   co2: 3.8, skat: 25.5, erhverv: 74 },
    'Favrskov':                { ledighed: 3.9,  indkomst: 410000, boligpris: 14000, befolkning: 48500,  co2: 4.2, skat: 23.6, erhverv: 79 },
    'Faxe':                    { ledighed: 6.5,  indkomst: 295000, boligpris: 9500,  befolkning: 35700,  co2: 5.0, skat: 25.9, erhverv: 72 },
    'Fredensborg':             { ledighed: 3.3,  indkomst: 510000, boligpris: 29000, befolkning: 40400,  co2: 3.3, skat: 23.4, erhverv: 80 },
    'Fredericia':              { ledighed: 5.8,  indkomst: 330000, boligpris: 14000, befolkning: 52800,  co2: 5.5, skat: 25.2, erhverv: 74 },
    'Frederiksberg':           { ledighed: 4.2,  indkomst: 500000, boligpris: 48000, befolkning: 103800, co2: 2.9, skat: 22.8, erhverv: 79 },
    'Frederikshavn':           { ledighed: 6.8,  indkomst: 285000, boligpris: 7500,  befolkning: 61700,  co2: 5.9, skat: 26.5, erhverv: 71 },
    'Frederikssund':           { ledighed: 4.8,  indkomst: 400000, boligpris: 20000, befolkning: 54100,  co2: 3.8, skat: 24.0, erhverv: 77 },
    'Furesø':                  { ledighed: 3.1,  indkomst: 560000, boligpris: 30000, befolkning: 42200,  co2: 3.3, skat: 23.2, erhverv: 81 },
    'Gentofte':                { ledighed: 2.5,  indkomst: 620000, boligpris: 42000, befolkning: 77500,  co2: 3.1, skat: 22.8, erhverv: 82 },
    'Gladsaxe':                { ledighed: 4.0,  indkomst: 440000, boligpris: 29000, befolkning: 68900,  co2: 3.2, skat: 23.1, erhverv: 79 },
    'Glostrup':                { ledighed: 5.2,  indkomst: 380000, boligpris: 24000, befolkning: 23500,  co2: 3.6, skat: 23.8, erhverv: 77 },
    'Greve':                   { ledighed: 4.6,  indkomst: 420000, boligpris: 22000, befolkning: 50000,  co2: 3.7, skat: 23.6, erhverv: 78 },
    'Gribskov':                { ledighed: 4.5,  indkomst: 400000, boligpris: 18000, befolkning: 43300,  co2: 3.8, skat: 24.5, erhverv: 77 },
    'Guldborgsund':            { ledighed: 8.2,  indkomst: 265000, boligpris: 7000,  befolkning: 60700,  co2: 5.8, skat: 27.0, erhverv: 68 },
    'Haderslev':               { ledighed: 5.7,  indkomst: 310000, boligpris: 10000, befolkning: 55900,  co2: 5.2, skat: 25.5, erhverv: 74 },
    'Halsnæs':                 { ledighed: 5.8,  indkomst: 330000, boligpris: 15000, befolkning: 31600,  co2: 4.0, skat: 25.0, erhverv: 74 },
    'Hedensted':               { ledighed: 4.0,  indkomst: 370000, boligpris: 12000, befolkning: 46200,  co2: 4.5, skat: 24.3, erhverv: 78 },
    'Helsingør':               { ledighed: 5.0,  indkomst: 390000, boligpris: 22000, befolkning: 63300,  co2: 3.5, skat: 24.2, erhverv: 77 },
    'Herlev':                  { ledighed: 5.1,  indkomst: 390000, boligpris: 26000, befolkning: 28600,  co2: 3.4, skat: 23.5, erhverv: 77 },
    'Herning':                 { ledighed: 4.2,  indkomst: 360000, boligpris: 13000, befolkning: 91000,  co2: 5.2, skat: 24.8, erhverv: 78 },
    'Hillerød':                { ledighed: 4.3,  indkomst: 430000, boligpris: 22000, befolkning: 51100,  co2: 3.5, skat: 23.8, erhverv: 78 },
    'Hjørring':                { ledighed: 6.9,  indkomst: 275000, boligpris: 7200,  befolkning: 64200,  co2: 5.9, skat: 26.6, erhverv: 70 },
    'Holbæk':                  { ledighed: 6.1,  indkomst: 330000, boligpris: 13000, befolkning: 72700,  co2: 4.3, skat: 25.4, erhverv: 73 },
    'Holstebro':               { ledighed: 4.5,  indkomst: 340000, boligpris: 10500, befolkning: 57700,  co2: 5.0, skat: 25.1, erhverv: 76 },
    'Horsens':                 { ledighed: 4.8,  indkomst: 360000, boligpris: 16000, befolkning: 94000,  co2: 4.8, skat: 24.5, erhverv: 77 },
    'Hvidovre':                { ledighed: 5.8,  indkomst: 370000, boligpris: 26000, befolkning: 53200,  co2: 3.6, skat: 24.2, erhverv: 76 },
    'Høje-Taastrup':           { ledighed: 6.8,  indkomst: 340000, boligpris: 21000, befolkning: 52400,  co2: 3.9, skat: 24.4, erhverv: 74 },
    'Hørsholm':                { ledighed: 2.8,  indkomst: 600000, boligpris: 38000, befolkning: 25300,  co2: 3.2, skat: 22.9, erhverv: 82 },
    'Ikast-Brande':            { ledighed: 4.0,  indkomst: 345000, boligpris: 10000, befolkning: 41600,  co2: 5.0, skat: 24.7, erhverv: 78 },
    'Ishøj':                   { ledighed: 8.5,  indkomst: 300000, boligpris: 18000, befolkning: 22700,  co2: 4.3, skat: 25.5, erhverv: 69 },
    'Jammerbugt':              { ledighed: 5.5,  indkomst: 285000, boligpris: 8500,  befolkning: 38200,  co2: 5.5, skat: 26.2, erhverv: 73 },
    'Kalundborg':              { ledighed: 6.0,  indkomst: 310000, boligpris: 9500,  befolkning: 50200,  co2: 5.3, skat: 25.9, erhverv: 73 },
    'Kerteminde':              { ledighed: 5.2,  indkomst: 300000, boligpris: 10000, befolkning: 23700,  co2: 4.8, skat: 25.6, erhverv: 74 },
    'Kolding':                 { ledighed: 4.5,  indkomst: 380000, boligpris: 16000, befolkning: 95000,  co2: 4.6, skat: 24.2, erhverv: 77 },
    'København':               { ledighed: 5.4,  indkomst: 410000, boligpris: 52000, befolkning: 794128, co2: 3.1, skat: 23.5, erhverv: 76 },
    'Køge':                    { ledighed: 5.0,  indkomst: 390000, boligpris: 18000, befolkning: 59900,  co2: 4.0, skat: 24.0, erhverv: 77 },
    'Langeland':               { ledighed: 8.0,  indkomst: 255000, boligpris: 7000,  befolkning: 12800,  co2: 5.2, skat: 27.4, erhverv: 68 },
    'Lejre':                   { ledighed: 3.8,  indkomst: 460000, boligpris: 21000, befolkning: 27500,  co2: 3.7, skat: 24.2, erhverv: 79 },
    'Lemvig':                  { ledighed: 5.1,  indkomst: 285000, boligpris: 8000,  befolkning: 20700,  co2: 4.8, skat: 26.0, erhverv: 74 },
    'Lolland':                 { ledighed: 10.2, indkomst: 245000, boligpris: 5500,  befolkning: 43500,  co2: 5.9, skat: 27.8, erhverv: 65 },
    'Lyngby-Taarbæk':          { ledighed: 2.9,  indkomst: 580000, boligpris: 40000, befolkning: 56500,  co2: 3.1, skat: 22.9, erhverv: 81 },
    'Læsø':                    { ledighed: 4.8,  indkomst: 275000, boligpris: 9000,  befolkning: 1900,   co2: 3.5, skat: 26.3, erhverv: 73 },
    'Mariagerfjord':           { ledighed: 5.4,  indkomst: 295000, boligpris: 8500,  befolkning: 42100,  co2: 5.6, skat: 26.0, erhverv: 73 },
    'Middelfart':              { ledighed: 4.8,  indkomst: 350000, boligpris: 13000, befolkning: 38400,  co2: 4.6, skat: 24.6, erhverv: 77 },
    'Morsø':                   { ledighed: 6.5,  indkomst: 275000, boligpris: 7500,  befolkning: 21200,  co2: 5.6, skat: 27.2, erhverv: 70 },
    'Norddjurs':               { ledighed: 6.2,  indkomst: 285000, boligpris: 8500,  befolkning: 37900,  co2: 5.5, skat: 26.3, erhverv: 71 },
    'Nordfyns':                { ledighed: 5.6,  indkomst: 290000, boligpris: 9000,  befolkning: 29400,  co2: 5.0, skat: 25.9, erhverv: 73 },
    'Nyborg':                  { ledighed: 5.4,  indkomst: 300000, boligpris: 10500, befolkning: 31600,  co2: 4.8, skat: 25.7, erhverv: 74 },
    'Næstved':                 { ledighed: 6.4,  indkomst: 305000, boligpris: 10000, befolkning: 82400,  co2: 4.8, skat: 25.8, erhverv: 72 },
    'Odder':                   { ledighed: 3.7,  indkomst: 400000, boligpris: 15000, befolkning: 22700,  co2: 4.0, skat: 24.0, erhverv: 79 },
    'Odense':                  { ledighed: 6.2,  indkomst: 340000, boligpris: 18000, befolkning: 207000, co2: 4.5, skat: 25.0, erhverv: 74 },
    'Odsherred':               { ledighed: 7.0,  indkomst: 280000, boligpris: 10000, befolkning: 32800,  co2: 4.5, skat: 26.5, erhverv: 70 },
    'Randers':                 { ledighed: 5.6,  indkomst: 325000, boligpris: 11000, befolkning: 96000,  co2: 5.3, skat: 25.6, erhverv: 74 },
    'Rebild':                  { ledighed: 4.2,  indkomst: 360000, boligpris: 10000, befolkning: 29800,  co2: 4.9, skat: 25.0, erhverv: 77 },
    'Ringkøbing-Skjern':       { ledighed: 4.4,  indkomst: 330000, boligpris: 9500,  befolkning: 57700,  co2: 5.1, skat: 25.0, erhverv: 77 },
    'Ringsted':                { ledighed: 5.5,  indkomst: 345000, boligpris: 13000, befolkning: 35100,  co2: 4.3, skat: 25.3, erhverv: 75 },
    'Roskilde':                { ledighed: 4.0,  indkomst: 450000, boligpris: 22000, befolkning: 90600,  co2: 3.7, skat: 23.6, erhverv: 78 },
    'Rudersdal':               { ledighed: 2.8,  indkomst: 650000, boligpris: 35000, befolkning: 57400,  co2: 3.2, skat: 22.8, erhverv: 82 },
    'Rødovre':                 { ledighed: 5.5,  indkomst: 370000, boligpris: 25000, befolkning: 38800,  co2: 3.5, skat: 23.9, erhverv: 76 },
    'Samsø':                   { ledighed: 4.0,  indkomst: 295000, boligpris: 12000, befolkning: 3700,   co2: 1.8, skat: 24.8, erhverv: 76 },
    'Silkeborg':               { ledighed: 4.0,  indkomst: 380000, boligpris: 16000, befolkning: 91300,  co2: 4.5, skat: 24.2, erhverv: 78 },
    'Skanderborg':             { ledighed: 3.2,  indkomst: 430000, boligpris: 17000, befolkning: 63400,  co2: 4.0, skat: 23.4, erhverv: 80 },
    'Skive':                   { ledighed: 5.5,  indkomst: 300000, boligpris: 9000,  befolkning: 47200,  co2: 5.4, skat: 26.0, erhverv: 73 },
    'Slagelse':                { ledighed: 6.8,  indkomst: 295000, boligpris: 10500, befolkning: 79800,  co2: 4.7, skat: 26.1, erhverv: 71 },
    'Solrød':                  { ledighed: 3.5,  indkomst: 470000, boligpris: 23000, befolkning: 22200,  co2: 3.5, skat: 23.3, erhverv: 80 },
    'Sorø':                    { ledighed: 5.0,  indkomst: 330000, boligpris: 11500, befolkning: 29800,  co2: 4.2, skat: 25.3, erhverv: 75 },
    'Stevns':                  { ledighed: 4.8,  indkomst: 370000, boligpris: 12500, befolkning: 22300,  co2: 4.0, skat: 24.8, erhverv: 76 },
    'Struer':                  { ledighed: 5.0,  indkomst: 305000, boligpris: 8500,  befolkning: 22200,  co2: 5.2, skat: 25.8, erhverv: 74 },
    'Svendborg':               { ledighed: 6.0,  indkomst: 305000, boligpris: 11000, befolkning: 58400,  co2: 4.8, skat: 25.6, erhverv: 72 },
    'Syddjurs':                { ledighed: 4.5,  indkomst: 340000, boligpris: 12000, befolkning: 43400,  co2: 4.5, skat: 24.5, erhverv: 77 },
    'Sønderborg':              { ledighed: 5.9,  indkomst: 315000, boligpris: 10500, befolkning: 75600,  co2: 5.0, skat: 25.7, erhverv: 74 },
    'Thisted':                 { ledighed: 6.3,  indkomst: 280000, boligpris: 7800,  befolkning: 43200,  co2: 5.5, skat: 26.4, erhverv: 71 },
    'Tårnby':                  { ledighed: 4.5,  indkomst: 385000, boligpris: 26000, befolkning: 44200,  co2: 3.6, skat: 23.6, erhverv: 78 },
    'Tønder':                  { ledighed: 6.5,  indkomst: 285000, boligpris: 7500,  befolkning: 38100,  co2: 5.4, skat: 26.3, erhverv: 71 },
    'Vallensbæk':              { ledighed: 4.2,  indkomst: 450000, boligpris: 26000, befolkning: 16200,  co2: 3.5, skat: 23.0, erhverv: 79 },
    'Varde':                   { ledighed: 4.8,  indkomst: 320000, boligpris: 9500,  befolkning: 50500,  co2: 5.0, skat: 25.2, erhverv: 76 },
    'Vejen':                   { ledighed: 4.5,  indkomst: 325000, boligpris: 9000,  befolkning: 43300,  co2: 5.1, skat: 25.4, erhverv: 76 },
    'Vejle':                   { ledighed: 4.3,  indkomst: 390000, boligpris: 18000, befolkning: 119000, co2: 4.8, skat: 24.0, erhverv: 78 },
    'Vesthimmerland':          { ledighed: 6.2,  indkomst: 280000, boligpris: 7500,  befolkning: 37200,  co2: 5.6, skat: 26.5, erhverv: 71 },
    'Viborg':                  { ledighed: 4.5,  indkomst: 340000, boligpris: 11500, befolkning: 97000,  co2: 5.0, skat: 25.0, erhverv: 76 },
    'Vordingborg':             { ledighed: 7.0,  indkomst: 285000, boligpris: 9000,  befolkning: 45400,  co2: 4.9, skat: 26.8, erhverv: 70 },
    'Ærø':                     { ledighed: 5.5,  indkomst: 280000, boligpris: 10000, befolkning: 6200,   co2: 3.8, skat: 26.0, erhverv: 72 },
    'Århus':                   { ledighed: 4.8,  indkomst: 380000, boligpris: 28000, befolkning: 360000, co2: 4.2, skat: 24.5, erhverv: 77 },
  };

  // ── Derived metrics ─────────────────────────────────────────────────────────
  // The base table above carries 7 measured fields per kommune. Six further
  // layers are derived from them using the real-world correlations that hold
  // across Danish municipalities (income ↔ education & longevity, unemployment
  // & urban density ↔ crime, etc.) plus a small, *stable* per-kommune hash so
  // the values vary believably and never shift between page loads. They are
  // illustrative model figures — clearly in the right ballpark, not official
  // Danmarks Statistik rows.
  function _hash01(str, salt) {
    // Deterministic [0,1) from a name+salt — a tiny xorshift over char codes.
    let h = 2166136261 ^ salt;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return ((h >>> 0) % 100000) / 100000;
  }
  (function enrichKD() {
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const LN_LO = Math.log(100), LN_HI = Math.log(794128);
    for (const [name, k] of Object.entries(KD)) {
      const incN = clamp((k.indkomst - 245000) / (650000 - 245000), 0, 1);   // 0 poor → 1 rich
      const unN  = clamp((k.ledighed - 1) / (10.2 - 1), 0, 1);               // 0 low → 1 high unemployment
      const popN = clamp((Math.log(Math.max(k.befolkning, 100)) - LN_LO) / (LN_HI - LN_LO), 0, 1); // 0 tiny → 1 big city
      const co2N = clamp((k.co2 - 1.8) / (6.8 - 1.8), 0, 1);               // 0 clean → 1 high CO2
      const erhN = clamp((k.erhverv - 65) / (82 - 65), 0, 1);               // 0 low employment → 1 high
      const j = (s) => (_hash01(name, s) - 0.5) * 2;                         // deterministic jitter [-1,1]

      // Videregående uddannelse (% of adults) — tracks income & urbanity.
      k.uddannelse    = +clamp(20 + incN * 32 + popN * 6 + j(11) * 3, 14, 60).toFixed(0);
      // Valgdeltagelse (turnout %) — higher with income, lower with joblessness.
      k.valgdeltagelse= +clamp(64 + incN * 10 - unN * 4 + j(23) * 1.5, 60, 80).toFixed(1);
      // Medianalder (years) — cities & affluent commuter belts skew younger.
      k.medianalder   = +clamp(47 - incN * 5 - popN * 6 + unN * 1 + j(37) * 2, 34, 50).toFixed(1);
      // Anmeldelser pr. 1.000 indb. — rises with joblessness & urban density.
      k.kriminalitet  = +clamp(45 + unN * 55 + popN * 32 + j(53) * 8, 38, 135).toFixed(0);
      // Middellevetid (years) — strong income gradient, small spread.
      k.middellevetid = +clamp(79.4 + incN * 3.2 - unN * 0.8 + j(67) * 0.4, 78.5, 83.5).toFixed(1);
      // Boligejere (% owner-occupied) — falls sharply in the big rental cities.
      k.boligejer     = +clamp(80 - popN * 46 - incN * -4 + j(83) * 4, 30, 84).toFixed(0);

      // ── Derived composite indices ───────────────────────────────────────────
      // Health inequality score (0 = equal/healthy, 100 = deprived):
      //   low income + high unemployment + low employment = more deprived
      k.healthineq    = +clamp((1 - incN) * 45 + unN * 35 + (1 - erhN) * 20 + j(91) * 4, 0, 100).toFixed(0);

      // Mental health pressure index (0 = low, 100 = high):
      //   unemployment stress + income anxiety + social exclusion (1-employment)
      k.mental        = +clamp(unN * 42 + (1 - incN) * 33 + (1 - erhN) * 25 + j(97) * 5, 0, 100).toFixed(0);

      // Green transition readiness (0 = not ready, 100 = very ready):
      //   low CO2 + income (EV/solar adoption proxy) + high employment capacity
      k.green         = +clamp((1 - co2N) * 50 + incN * 30 + erhN * 20 + j(103) * 4, 0, 100).toFixed(0);

      // Smart mobility score (0 = car-dependent, 100 = transit-rich):
      //   urban density + income (can invest in transit) + employment rate
      k.mobility      = +clamp(popN * 48 + incN * 28 + erhN * 24 + j(109) * 4, 0, 100).toFixed(0);
    }
  })();

  // Expose the municipality metric table so other modules (e.g. "Din Kommune"
  // personalisation) can reuse it without duplicating all 98 rows.
  VG.danmarkskort.kommuneData = KD;

  const METRICS = {
    ledighed:   { label: 'Ledighed',       unit: '%',     goodHigh: false, format: v => v.toFixed(1) + '%' },
    indkomst:   { label: 'Indkomst',       unit: 'kr/år', goodHigh: true,  format: v => (v / 1000).toFixed(0) + 'k kr' },
    boligpris:  { label: 'Boligpris',      unit: 'kr/m²', goodHigh: false, format: v => v.toLocaleString('da-DK') + ' kr/m²' },
    befolkning: { label: 'Befolkning',     unit: 'pers',  goodHigh: true,  format: v => v.toLocaleString('da-DK') },
    co2:        { label: 'CO₂',            unit: 't/pers',goodHigh: false, format: v => v.toFixed(1) + ' t/pers' },
    skat:       { label: 'Kommuneskat',    unit: '%',     goodHigh: false, format: v => v.toFixed(1) + '%' },
    erhverv:    { label: 'Erhvervsfrekvens',unit: '%',    goodHigh: true,  format: v => v.toFixed(0) + '%' },
    uddannelse:    { label: 'Videregående udd.', unit: '%',         goodHigh: true,  format: v => v.toFixed(0) + '%' },
    valgdeltagelse:{ label: 'Valgdeltagelse',    unit: '%',         goodHigh: true,  format: v => v.toFixed(1) + '%' },
    medianalder:   { label: 'Medianalder',       unit: 'år',        goodHigh: false, format: v => v.toFixed(1) + ' år' },
    kriminalitet:  { label: 'Kriminalitet',      unit: 'pr. 1.000', goodHigh: false, format: v => v.toFixed(0) + ' / 1.000' },
    middellevetid: { label: 'Middellevetid',     unit: 'år',        goodHigh: true,  format: v => v.toFixed(1) + ' år' },
    boligejer:     { label: 'Boligejere',        unit: '%',         goodHigh: true,  format: v => v.toFixed(0) + '%' },
    healthineq:    { label: 'Sundhedsulighed',   unit: 'indeks',    goodHigh: false, format: v => v.toFixed(0) + ' / 100' },
    mental:        { label: 'Psykisk pres',      unit: 'indeks',    goodHigh: false, format: v => v.toFixed(0) + ' / 100' },
    green:         { label: 'Grøn omstilling',   unit: 'indeks',    goodHigh: true,  format: v => v.toFixed(0) + ' / 100' },
    mobility:      { label: 'Mobilitet',         unit: 'indeks',    goodHigh: true,  format: v => v.toFixed(0) + ' / 100' },
  };

  const METRIC_RANGES = {
    ledighed:   { min: 1.0,    max: 10.2 },
    indkomst:   { min: 245000, max: 650000 },
    boligpris:  { min: 5500,   max: 52000 },
    befolkning: { min: 100,    max: 794128 },
    co2:        { min: 1.8,    max: 6.8 },
    skat:       { min: 22.8,   max: 27.8 },
    erhverv:    { min: 65,     max: 82 },
    uddannelse:    { min: 14,   max: 60 },
    valgdeltagelse:{ min: 60,   max: 80 },
    medianalder:   { min: 34,   max: 50 },
    kriminalitet:  { min: 38,   max: 135 },
    middellevetid: { min: 78.5, max: 83.5 },
    boligejer:     { min: 30,   max: 84 },
    healthineq:    { min: 0,    max: 100 },
    mental:        { min: 0,    max: 100 },
    green:         { min: 0,    max: 100 },
    mobility:      { min: 0,    max: 100 },
  };

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

  const AIRPORTS = [
    { name: 'CPH', pos: [12.6476, 55.6181] },
    { name: 'BLL', pos: [ 9.1518, 55.7403] },
    { name: 'AAL', pos: [ 9.8492, 57.0928] },
    { name: 'AAR', pos: [10.6190, 56.3000] },
    { name: 'RKE', pos: [12.1314, 55.5856] },
  ];

  // ── Satellites (live via satellite.js + TLE) ────────────────────────────────
  const CELESTRAK_TLE = '/api/tle';
  const CELESTRAK_DIRECT = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';
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

  // ── Satellite type classification ───────────────────────────────────────────
  function satTypeOf(name) {
    const n = (name || '').toUpperCase();
    if (/^ISS|ZARYA|TIANHE|TIANGONG|CSS |^MIR /.test(n)) return 'station';
    if (/^STARLINK/.test(n)) return 'starlink';
    if (/^ONEWEB/.test(n)) return 'oneweb';
    if (/^GPS|NAVSTAR|^BLOCK IIF|^BLOCK IIR|^BLOCK III/.test(n)) return 'gps';
    if (/^NOAA|^METOP|METEOSAT|^MSG-|^FENGYUN|^FY-|^GOES/.test(n)) return 'weather';
    if (/^SENTINEL|^LANDSAT|^TERRA |^AQUA |^ENVISAT|^SPOT-|^ICESAT|^CRYOSAT|^PLEIADES/.test(n)) return 'earthobs';
    if (/HST|HUBBLE|JAMES WEBB|JWST|CHANDRA|FERMI/.test(n)) return 'telescope';
    if (/WORLDVIEW|GAOFEN|CAPELLA|USA-\d|LACROSSE|NRO |KH-\d/.test(n)) return 'recon';
    return 'other';
  }
  const SAT_TYPES = {
    station:   { size: 14, c: [255,255,120,255], oc: [255,200,0,220],   ol: 4, label: true,  name: 'Rumstation'     },
    starlink:  { size: 5,  c: [100,220,255,230], oc: [50,180,255,150],  ol: 2, label: false, name: 'Starlink'        },
    oneweb:    { size: 5,  c: [180,255,180,230], oc: [100,220,120,150], ol: 2, label: false, name: 'OneWeb'          },
    gps:       { size: 9,  c: [255,200,60,255],  oc: [200,140,0,200],   ol: 3, label: false, name: 'GPS'             },
    weather:   { size: 9,  c: [200,130,255,255], oc: [140,70,255,200],  ol: 3, label: true,  name: 'Vejrsatellit'    },
    earthobs:  { size: 8,  c: [80,255,200,240],  oc: [40,200,160,200],  ol: 3, label: true,  name: 'Jordobservation' },
    telescope: { size: 11, c: [255,180,60,255],  oc: [180,100,0,200],   ol: 3, label: true,  name: 'Rumteleskop'     },
    recon:     { size: 12, c: [255,100,30,255],  oc: [200,40,0,200],    ol: 4, label: true,  name: 'Rekognoscering'  },
    other:     { size: 6,  c: [180,220,255,200], oc: [80,180,255,140],  ol: 2, label: false, name: 'Øvrige'          },
  };

  const GPS_JAMMING = [
    { name: 'Kaliningrad', pos: [20.5, 54.7],  radius: 280, intensity: 0.9 },
    { name: 'St. Petersburg', pos: [30.3, 59.9], radius: 220, intensity: 0.7 },
    { name: 'Murmansk', pos: [33.1, 69.0],      radius: 180, intensity: 0.6 },
    { name: 'Pskov/Ostrov', pos: [28.4, 57.8],  radius: 140, intensity: 0.55 },
    { name: 'Belarus West', pos: [24.0, 53.9],  radius: 160, intensity: 0.6 },
    { name: 'Bornholm (intermittent)', pos: [14.9, 55.2], radius: 70, intensity: 0.35 },
  ];

  const NOTAMS = [
    { id: 'EKHG', name: 'Karup AFB',     center: [9.00,  56.30], radius: 28, type: 'military' },
    { id: 'EKSP', name: 'Skrydstrup AFB',center: [9.27,  55.22], radius: 22, type: 'military' },
    { id: 'EKVD', name: 'Vandel AFB',    center: [9.22,  55.71], radius: 18, type: 'military' },
    { id: 'EKAL', name: 'Aalborg AFB',   center: [9.85,  57.09], radius: 32, type: 'military' },
    { id: 'EKBI', name: 'Bornholm R',    center: [14.90, 55.06], radius: 30, type: 'restricted' },
    { id: 'EKRK', name: 'Roskilde TMA',  center: [12.13, 55.59], radius: 22, type: 'tma' },
    { id: 'EKCPH', name: 'CPH TMA',      center: [12.65, 55.62], radius: 45, type: 'tma' },
  ];

  const WIND_FARMS = [
    { name: 'Horns Rev 1',    pos: [7.90, 55.50], mw: 160 },
    { name: 'Horns Rev 2',    pos: [7.65, 55.60], mw: 209 },
    { name: 'Horns Rev 3',    pos: [7.73, 55.80], mw: 407 },
    { name: 'Nysted',         pos: [11.75, 54.55], mw: 165 },
    { name: 'Rødsand 2',      pos: [11.55, 54.58], mw: 207 },
    { name: 'Anholt',         pos: [11.17, 56.60], mw: 400 },
    { name: 'Middelgrunden',  pos: [12.68, 55.69], mw: 40 },
    { name: 'Samsø Hav',      pos: [10.60, 55.90], mw: 23 },
    { name: 'Krigers Flak',   pos: [12.50, 55.10], mw: 605 },
    { name: 'Vesterhav Nord', pos: [8.05, 56.60],  mw: 180 },
    { name: 'Vesterhav Syd',  pos: [7.85, 56.25],  mw: 170 },
    { name: 'Thor (2027)',     pos: [7.55, 56.45],  mw: 1000 },
  ];

  const PORTS = [
    { name: 'Aarhus Havn',      pos: [10.22, 56.15], type: 'container' },
    { name: 'Esbjerg Havn',     pos: [8.45,  55.47], type: 'offshore'  },
    { name: 'Fredericia Havn',  pos: [9.75,  55.56], type: 'oil'       },
    { name: 'Aalborg Havn',     pos: [9.92,  57.05], type: 'bulk'      },
    { name: 'Nordhavn (CPH)',    pos: [12.59, 55.71], type: 'container' },
    { name: 'Helsingør Havn',   pos: [12.62, 56.03], type: 'ferry'     },
    { name: 'Rødby Havn',       pos: [11.35, 54.66], type: 'ferry'     },
    { name: 'Frederikshavn',    pos: [10.54, 57.43], type: 'ferry'     },
    { name: 'Kalundborg Havn',  pos: [11.10, 55.68], type: 'oil'       },
    { name: 'Grenaa Havn',      pos: [10.88, 56.42], type: 'ferry'     },
  ];

  const FERRY_ROUTES = [
    { name: 'Rødby–Puttgarden',       path: [[11.35,54.66],[11.22,54.50]], op: 'Scandlines'         },
    { name: 'Helsingør–Helsingborg',  path: [[12.62,56.03],[12.69,56.04]], op: 'Scandlines/ForSea'  },
    { name: 'Frederikshavn–Göteborg', path: [[10.54,57.43],[11.97,57.71]], op: 'Stena Line'          },
    { name: 'Frederikshavn–Oslo',     path: [[10.54,57.43],[10.73,59.91]], op: 'Stena Line'          },
    { name: 'Aarhus–Odden',           path: [[10.22,56.15],[10.95,55.97]], op: 'Molslinjen'          },
    { name: 'Bornholm–Køge',          path: [[14.70,55.10],[12.20,55.46]], op: 'Bornholmstrafikken'  },
    { name: 'Rønne–Ystad',            path: [[14.70,55.10],[13.88,55.43]], op: 'Bornholmstrafikken'  },
  ];

  const UNDERSEA_CABLES = [
    { name: 'Viking Link (DK–UK)',    path: [[8.20,56.60],[6.40,55.80],[3.50,54.50],[0.80,53.50]], color: [60,160,255],  type: 'power', capacity: 1400, from: 'Danmark', to: 'UK',      note: 'HVDC · 760 km · idriftsat 2023' },
    { name: 'Cobra Cable (DK–NL)',    path: [[8.00,56.00],[6.50,55.50],[5.00,53.50],[4.80,52.80]], color: [60,160,255],  type: 'power', capacity: 700,  from: 'Danmark', to: 'Holland',  note: 'HVDC · 325 km · idriftsat 2019' },
    { name: 'NordLink (DK–NO)',       path: [[8.00,56.00],[8.20,57.50],[7.00,58.50],[6.50,58.80]], color: [60,255,160],  type: 'power', capacity: 1400, from: 'Danmark', to: 'Norge',    note: 'HVDC · 623 km · idriftsat 2021' },
    { name: 'Skagerrak 4 (DK–NO)',    path: [[9.50,57.50],[8.80,58.50],[8.20,59.00]],              color: [60,255,160],  type: 'power', capacity: 700,  from: 'Danmark', to: 'Norge',    note: 'HVDC · 244 km · idriftsat 2014' },
    { name: 'Baltic Pipe (gas DK–NO)',path: [[10.00,57.00],[9.50,57.50],[8.50,58.00],[7.50,58.50]],color: [255,160,40],  type: 'gas',   capacity: 10,   from: 'Danmark', to: 'Norge',    note: '10 mia. m³/år · idriftsat 2022' },
    { name: 'NordBalt (SE–LT)',       path: [[12.70,55.70],[14.50,56.20],[17.50,57.00],[21.00,56.50]],color:[60,200,255],type: 'power', capacity: 700,  from: 'Sverige', to: 'Litauen',  note: 'HVDC · 453 km · idriftsat 2015' },
    { name: 'SwePol Link (SE–PL)',    path: [[14.00,55.50],[15.50,55.00],[16.50,54.50],[18.00,54.20]],color:[120,255,120],type:'power', capacity: 600,  from: 'Sverige', to: 'Polen',    note: 'HVDC · 254 km · idriftsat 2000' },
  ];

  // ── Weather observation stations ───────────────────────────────────────────
  const WEATHER_STATIONS = [
    { name: 'København',  lat: 55.676, lon: 12.568 },
    { name: 'Aarhus',     lat: 56.156, lon: 10.203 },
    { name: 'Odense',     lat: 55.396, lon: 10.388 },
    { name: 'Aalborg',    lat: 57.047, lon: 9.921  },
    { name: 'Esbjerg',    lat: 55.476, lon: 8.459  },
    { name: 'Randers',    lat: 56.460, lon: 10.036 },
    { name: 'Kolding',    lat: 55.491, lon: 9.472  },
    { name: 'Horsens',    lat: 55.860, lon: 9.850  },
    { name: 'Vejle',      lat: 55.710, lon: 9.536  },
    { name: 'Roskilde',   lat: 55.642, lon: 12.087 },
    { name: 'Herning',    lat: 56.135, lon: 8.973  },
    { name: 'Helsingør',  lat: 56.036, lon: 12.614 },
    { name: 'Silkeborg',  lat: 56.170, lon: 9.552  },
    { name: 'Næstved',    lat: 55.229, lon: 11.760 },
    { name: 'Fredericia', lat: 55.566, lon: 9.750  },
    { name: 'Viborg',     lat: 56.452, lon: 9.400  },
    { name: 'Køge',       lat: 55.457, lon: 12.181 },
    { name: 'Holstebro',  lat: 56.359, lon: 8.617  },
    { name: 'Slagelse',   lat: 55.402, lon: 11.354 },
    { name: 'Hillerød',   lat: 55.929, lon: 12.308 },
    { name: 'Skagen',     lat: 57.722, lon: 10.578 },
    { name: 'Bornholm',   lat: 55.107, lon: 14.921 },
    { name: 'Sønderborg', lat: 54.909, lon: 9.793  },
    { name: 'Thisted',    lat: 56.961, lon: 8.693  },
    { name: 'Nykøbing F', lat: 54.769, lon: 11.873 },
  ];

  // ── Emergency infrastructure (Beredskab) ────────────────────────────────────
  const BRANDSTATIONER = [
    { name: 'Brandstation Valby',         lat: 55.669, lon: 12.508 },
    { name: 'Brandstation Østerbro',      lat: 55.709, lon: 12.575 },
    { name: 'Brandstation Frederiksberg', lat: 55.679, lon: 12.536 },
    { name: 'Brandstation Bispebjerg',    lat: 55.718, lon: 12.543 },
    { name: 'Brandstation Amager',        lat: 55.651, lon: 12.594 },
    { name: 'Brandstation Aarhus Nord',   lat: 56.195, lon: 10.210 },
    { name: 'Brandstation Aarhus Syd',    lat: 56.102, lon: 10.177 },
    { name: 'Brandstation Odense',        lat: 55.421, lon: 10.369 },
    { name: 'Brandstation Aalborg',       lat: 57.048, lon: 9.923  },
    { name: 'Brandstation Esbjerg',       lat: 55.480, lon: 8.450  },
    { name: 'Brandstation Randers',       lat: 56.462, lon: 10.040 },
    { name: 'Brandstation Kolding',       lat: 55.492, lon: 9.474  },
    { name: 'Brandstation Vejle',         lat: 55.712, lon: 9.540  },
    { name: 'Brandstation Horsens',       lat: 55.862, lon: 9.852  },
    { name: 'Brandstation Herning',       lat: 56.138, lon: 8.975  },
    { name: 'Brandstation Roskilde',      lat: 55.644, lon: 12.091 },
    { name: 'Brandstation Helsingør',     lat: 56.038, lon: 12.610 },
    { name: 'Brandstation Holstebro',     lat: 56.361, lon: 8.619  },
    { name: 'Brandstation Silkeborg',     lat: 56.172, lon: 9.554  },
    { name: 'Brandstation Viborg',        lat: 56.453, lon: 9.402  },
    { name: 'Brandstation Sønderborg',    lat: 54.910, lon: 9.795  },
    { name: 'Brandstation Fredericia',    lat: 55.568, lon: 9.752  },
    { name: 'Brandstation Næstved',       lat: 55.231, lon: 11.762 },
    { name: 'Brandstation Slagelse',      lat: 55.404, lon: 11.356 },
    { name: 'Brandstation Køge',          lat: 55.459, lon: 12.183 },
    { name: 'Brandstation Skagen',        lat: 57.724, lon: 10.580 },
    { name: 'Brandstation Bornholm',      lat: 55.101, lon: 14.698 },
    { name: 'Brandstation Nykøbing F',    lat: 54.771, lon: 11.875 },
  ];

  const SYGEHUSE = [
    { name: 'Rigshospitalet',                    lat: 55.697, lon: 12.571, type: 'Universitetshospital' },
    { name: 'Bispebjerg Hospital',               lat: 55.714, lon: 12.533, type: 'Akuthospital' },
    { name: 'Herlev Hospital',                   lat: 55.729, lon: 12.445, type: 'Universitetshospital' },
    { name: 'Gentofte Hospital',                 lat: 55.750, lon: 12.540, type: 'Hospitals' },
    { name: 'Amager & Hvidovre Hospital',        lat: 55.630, lon: 12.460, type: 'Akuthospital' },
    { name: 'Bornholms Hospital',                lat: 55.112, lon: 14.907, type: 'Hospitals' },
    { name: 'AUH Aarhus Universitetshospital',   lat: 56.176, lon: 10.153, type: 'Universitetshospital' },
    { name: 'Horsens Sygehus',                   lat: 55.860, lon: 9.828,  type: 'Akuthospital' },
    { name: 'Randers Regionshospital',           lat: 56.467, lon: 10.066, type: 'Akuthospital' },
    { name: 'Odense Universitetshospital (OUH)', lat: 55.398, lon: 10.360, type: 'Universitetshospital' },
    { name: 'Svendborg Sygehus',                 lat: 55.063, lon: 10.599, type: 'Hospitals' },
    { name: 'Sygehus Sønderjylland',             lat: 54.910, lon: 9.792,  type: 'Akuthospital' },
    { name: 'Sygehus Lillebælt, Kolding',        lat: 55.493, lon: 9.455,  type: 'Akuthospital' },
    { name: 'Vejle Sygehus',                     lat: 55.713, lon: 9.519,  type: 'Akuthospital' },
    { name: 'Aalborg Universitetshospital',      lat: 57.052, lon: 9.921,  type: 'Universitetshospital' },
    { name: 'Thisted Sygehus',                   lat: 56.964, lon: 8.693,  type: 'Hospitals' },
    { name: 'Herning Sygehus',                   lat: 56.130, lon: 8.986,  type: 'Akuthospital' },
    { name: 'Regionshospitalet Viborg',          lat: 56.457, lon: 9.384,  type: 'Akuthospital' },
    { name: 'Silkeborg Regionshospital',         lat: 56.176, lon: 9.571,  type: 'Hospitals' },
    { name: 'Holstebro Sygehus',                 lat: 56.358, lon: 8.607,  type: 'Akuthospital' },
    { name: 'Nordsjællands Hospital, Hillerød',  lat: 55.929, lon: 12.310, type: 'Akuthospital' },
    { name: 'Helsingør Hospital',                lat: 56.037, lon: 12.615, type: 'Hospitals' },
    { name: 'Roskilde Sygehus',                  lat: 55.641, lon: 12.075, type: 'Akuthospital' },
    { name: 'Næstved Sygehus',                   lat: 55.233, lon: 11.765, type: 'Akuthospital' },
    { name: 'Nykøbing F Sygehus',                lat: 54.770, lon: 11.868, type: 'Hospitals' },
    { name: 'Køge Sygehus',                      lat: 55.460, lon: 12.171, type: 'Hospitals' },
    { name: 'Slagelse Sygehus',                  lat: 55.409, lon: 11.354, type: 'Hospitals' },
  ];

  // ── Geo helpers ──────────────────────────────────────────────────────────────
  function distKm(lat1, lon1, lat2, lon2) {
    const R = 6371, toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ── Danish rail network ──────────────────────────────────────────────────────
  const TRAIN_ROUTES = [
    { name: 'Fredericia–Vejle–Horsens–Aarhus',   path: [[9.75,55.56],[9.54,55.71],[9.85,55.86],[9.93,56.03],[10.20,56.16]], type: 'ic' },
    { name: 'Aarhus–Randers–Hobro–Aalborg',       path: [[10.20,56.16],[10.04,56.46],[9.80,56.64],[9.92,57.05]], type: 'ic' },
    { name: 'København–Ringsted–Odense–Fredericia',path: [[12.57,55.67],[12.09,55.64],[11.79,55.45],[10.39,55.40],[9.75,55.56]], type: 'ic' },
    { name: 'Fredericia–Kolding–Esbjerg',          path: [[9.75,55.56],[9.47,55.49],[9.24,55.85],[8.76,55.96],[8.45,55.47]], type: 'ic' },
    { name: 'Aarhus–Silkeborg–Herning',            path: [[10.20,56.16],[9.93,56.03],[9.55,56.17],[8.97,56.13]], type: 'regional' },
    { name: 'Aarhus–Viborg (Langå)',               path: [[10.20,56.16],[10.04,56.46],[9.80,56.64],[9.40,56.45]], type: 'regional' },
    { name: 'København–Hillerød–Helsingør',        path: [[12.57,55.67],[12.31,55.93],[12.62,56.04]], type: 'regional' },
    { name: 'Roskilde–Næstved–Nykøbing F',         path: [[12.09,55.64],[11.76,55.23],[11.87,54.77]], type: 'regional' },
    { name: 'Kolding–Tinglev–Sønderborg',          path: [[9.47,55.49],[9.25,55.05],[9.79,54.91]], type: 'regional' },
    { name: 'Odense–Svendborg',                    path: [[10.39,55.40],[10.60,55.06]], type: 'regional' },
    { name: 'Aalborg–Frederikshavn–Skagen',        path: [[9.92,57.05],[10.54,57.43],[10.58,57.72]], type: 'regional' },
  ];

  const TRAIN_STATIONS = [
    { name: 'København H',  stationId: '8600626', pos: [12.565, 55.673], type: 'ic' },
    { name: 'Aarhus H',     stationId: '8600053', pos: [10.204, 56.150], type: 'ic' },
    { name: 'Odense',       stationId: '8600396', pos: [10.383, 55.400], type: 'ic' },
    { name: 'Aalborg',      stationId: '8600020', pos: [9.921,  57.049], type: 'ic' },
    { name: 'Vejle',        stationId: '8600615', pos: [9.537,  55.710], type: 'ic' },
    { name: 'Esbjerg',      stationId: '8600244', pos: [8.460,  55.476], type: 'ic' },
    { name: 'Kolding',      stationId: '8600341', pos: [9.474,  55.490], type: 'ic' },
    { name: 'Horsens',      stationId: '8600278', pos: [9.850,  55.862], type: 'ic' },
    { name: 'Fredericia',   stationId: '8600250', pos: [9.750,  55.566], type: 'ic' },
    { name: 'Randers',      stationId: '8600441', pos: [10.038, 56.462], type: 'regional' },
    { name: 'Herning',      stationId: '8600261', pos: [8.975,  56.135], type: 'regional' },
    { name: 'Silkeborg',    stationId: '8600502', pos: [9.553,  56.170], type: 'regional' },
    { name: 'Viborg',       stationId: '8600627', pos: [9.401,  56.453], type: 'regional' },
    { name: 'Roskilde',     stationId: '8600453', pos: [12.083, 55.641], type: 'ic' },
    { name: 'Hillerød',     stationId: '8600272', pos: [12.308, 55.929], type: 'regional' },
    { name: 'Helsingør',    stationId: '8600267', pos: [12.614, 56.036], type: 'regional' },
    { name: 'Sønderborg',   stationId: '8600553', pos: [9.792,  54.909], type: 'regional' },
    { name: 'Næstved',      stationId: '8600376', pos: [11.762, 55.230], type: 'regional' },
    { name: 'Nykøbing F',   stationId: '8600386', pos: [11.872, 54.769], type: 'regional' },
    { name: 'Svendborg',    stationId: '8600554', pos: [10.608, 55.059], type: 'regional' },
    { name: 'Frederikshavn',stationId: '8600255', pos: [10.536, 57.432], type: 'regional' },
  ];
  // ── Danish military installations (all public sources: forsvaret.dk, Wikipedia, NATO) ─
  const MILITARY_BASES = [
    // Air Force (Flyvevåbnet)
    { name: 'Flyvestation Karup',       branch: 'luftvåben', unit: 'Flyvevåbnets Officersskole · P-3C Orion base', pos: [9.1043, 56.2971], country: 'DK' },
    { name: 'Flyvestation Skrydstrup',  branch: 'luftvåben', unit: 'F-35A Lightning II · 727 Eskadrille',          pos: [9.267,  55.221],  country: 'DK' },
    { name: 'Flyvestation Aalborg',     branch: 'luftvåben', unit: 'C-130J Hercules · SAR helikoptere',            pos: [9.843,  57.089],  country: 'DK' },
    { name: 'Bornholms Radarleje',      branch: 'luftvåben', unit: 'NATO Integrated Air Defence System',           pos: [14.883, 55.117],  country: 'DK' },
    // Navy (Søværnet)
    { name: 'Søværnets Operative Kommando, Korsør', branch: 'søværnet', unit: 'SOK · Heimdal-klasse fregatter',    pos: [11.134, 55.332],  country: 'DK' },
    { name: 'Flådestation Frederikshavn', branch: 'søværnet', unit: 'Inspektionsskibe · Thetis-klasse',            pos: [10.539, 57.432],  country: 'DK' },
    { name: 'Holmen, København',          branch: 'søværnet', unit: 'DALO · Flådens Materieltjeneste',             pos: [12.594, 55.681],  country: 'DK' },
    // Army (Hæren)
    { name: 'Holstebro Kaserne',   branch: 'hæren', unit: 'Jydske Dragonregiment · Leopard 2A7',   pos: [8.576,  56.328], country: 'DK' },
    { name: 'Skive Kaserne',       branch: 'hæren', unit: 'Ingeniørregimentet',                     pos: [9.039,  56.540], country: 'DK' },
    { name: 'Varde Kaserne',       branch: 'hæren', unit: 'Artilleriregimentet · Efterretningscentret', pos: [8.470, 55.610], country: 'DK' },
    { name: 'Antvorskov Kaserne',  branch: 'hæren', unit: 'DANCON-stab · Efterforsyningsregimentet', pos: [11.310, 55.380], country: 'DK' },
    { name: 'Høvelte Kaserne',     branch: 'hæren', unit: 'Livgarden',                              pos: [12.401, 55.856], country: 'DK' },
    { name: 'Aalborg Kaserne',     branch: 'hæren', unit: 'Jægerkorpset (reserve støtte)',          pos: [9.946,  57.085], country: 'DK' },
    { name: 'Fredericia Kaserne',  branch: 'hæren', unit: 'Prinsens Livregiment · Panserbataljonen', pos: [9.750,  55.568], country: 'DK' },
    { name: 'Oksbøl',              branch: 'hæren', unit: 'Jydske Artilleriregiment · skydeområde',  pos: [8.285,  55.646], country: 'DK' },
    { name: 'Kastellet',           branch: 'hæren', unit: 'Slotsherren · Forsvarets efterretningstjeneste (FE)', pos: [12.592, 55.691], country: 'DK' },
    { name: 'Almegårds Kaserne',   branch: 'hæren', unit: 'Bornholms Værn',                         pos: [14.718, 55.124], country: 'DK' },
    // Greenland / Faroe Islands
    { name: 'Joint Arctic Command (Nuuk)', branch: 'fælles', unit: 'Arktisk Kommando · Knud Rasmussen-klasse', pos: [-51.722, 64.183], country: 'GL' },
    { name: 'Thule Air Base',             branch: 'fælles', unit: 'US Space Force · NORAD radar (Pituffik)',    pos: [-68.703, 76.531], country: 'GL' },
    { name: 'Færøernes Landstyre',        branch: 'fælles', unit: 'Danish liaison · coastal surveillance',      pos: [-6.768,  62.008], country: 'FO' },
  ];

  // ── Ministry buildings + party HQs (for politik layer) ────────────────────────
  const MINISTRY_LOCATIONS = [
    { id: 'ft',   name: 'Christiansborg (Folketing)',          pos: [12.5779, 55.6753], type: 'parliament', minister: null,          party: null  },
    { id: 'stm',  name: 'Statsministeriet',                    pos: [12.5796, 55.6755], type: 'ministry',   minister: 'Mette Frederiksen',    party: 'A' },
    { id: 'um',   name: 'Udenrigsministeriet',                 pos: [12.5938, 55.6712], type: 'ministry',   minister: 'Lars Løkke Rasmussen', party: 'M' },
    { id: 'fm',   name: 'Finansministeriet',                   pos: [12.5784, 55.6748], type: 'ministry',   minister: 'Nicolai Wammen',       party: 'A' },
    { id: 'jm',   name: 'Justitsministeriet',                  pos: [12.5792, 55.6742], type: 'ministry',   minister: 'Magnus Heunicke',      party: 'A' },
    { id: 'fmst', name: 'Forsvarsministeriet',                 pos: [12.5908, 55.6773], type: 'ministry',   minister: 'Troels Lund Poulsen',  party: 'V' },
    { id: 'sst',  name: 'Sundhedsministeriet',                 pos: [12.5871, 55.6848], type: 'ministry',   minister: 'Sophie Løhde',         party: 'V' },
    { id: 'bm',   name: 'Beskæftigelsesministeriet',           pos: [12.5861, 55.6752], type: 'ministry',   minister: 'Peter Hummelgaard',    party: 'A' },
    { id: 'skm',  name: 'Skatteministeriet',                   pos: [12.5991, 55.6726], type: 'ministry',   minister: 'Jeppe Bruus',          party: 'A' },
    { id: 'trm',  name: 'Transportministeriet',                pos: [12.5744, 55.6736], type: 'ministry',   minister: 'Thomas Danielsen',     party: 'V' },
    { id: 'kefm', name: 'Klima-, Energi- og Forsyningsmin.',   pos: [12.5898, 55.6762], type: 'ministry',   minister: 'Lars Aagaard',         party: 'M' },
    { id: 'ibm',  name: 'Indenrigs- og Boligministeriet',      pos: [12.5780, 55.6752], type: 'ministry',   minister: 'Kaare Dybvad Bek',     party: 'A' },
  ];

  const PARTY_COLORS_RGB = {
    A: [227, 45, 28], V: [0, 63, 135], M: [107, 63, 160], I: [0, 160, 214],
    D: [27, 58, 107], F: [232, 75, 58], Ø: [178, 34, 34],  C: [0, 107, 60],
    B: [155, 30, 173], O: [244, 168, 42], Å: [0, 193, 101],
  };

  // MMSI numbers of active Danish naval vessels — highlighted in skibstrafik+forsvar views.
  const NAVAL_MMSI = new Set([
    219103000, // HDMS Iver Huitfeldt (F360)
    219104000, // HDMS Peter Willemoes (F362)
    219101000, // HDMS Absalon (L16)
    219102000, // HDMS Esbern Snare (L17)
    219000127, // Svanen (støtteskib)
    220432000, // P521 Diana
    220434000, // P523 Flyvefisken
    220435000, // P524 Havkatten
    219002000, // HDMS Triton (P500)
    219003000, // HDMS Thetis (P550)
    219004000, // HDMS Vaedderen (P551)
    219005000, // HDMS Hvidbjørnen (P553)
    219006000, // HDMS Knud Rasmussen (P570)
    219007000, // HDMS Ejnar Mikkelsen (P571)
  ]);

  const M_PER_DEG_LAT = 111320;
  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  // Glide linearly from the current rendered position to the latest fix over
  // the whole update interval (_lerpDur). Linear = constant velocity = fluid;
  // the previous smoothstep easing made objects accelerate/decelerate between
  // fixes, which read as a "stepping" motion. Returns true while gliding so
  // the caller can skip dead-reckoning (no compounding/overshoot).
  function advanceLerp(obj, dur) {
    if (obj._lerpFrom && obj._lerpStart != null) {
      const d = obj._lerpDur || dur || LERP_MS;
      const t = Math.min((performance.now() - obj._lerpStart) / d, 1);
      obj.pos = [
        obj._lerpFrom[0] + (obj._lerpTo[0] - obj._lerpFrom[0]) * t,
        obj._lerpFrom[1] + (obj._lerpTo[1] - obj._lerpFrom[1]) * t,
      ];
      if (t >= 1) obj._lerpFrom = null;
      return true;
    }
    return false;
  }

  function advanceAircraft(ac, dt) {
    ac.forEach(p => {
      // While gliding to the latest fix, position comes purely from the lerp.
      if (advanceLerp(p)) return;
      // Lerp finished and no new fix yet → keep moving at reported velocity so
      // the aircraft never freezes (constant velocity, still fluid).
      if (!p.pos || !p.speed) return;
      const lat = p.pos[1];
      const distM = p.speed * dt;
      const rad = (p.heading || 0) * Math.PI / 180;
      const dLat = (distM * Math.cos(rad)) / M_PER_DEG_LAT;
      const dLon = (distM * Math.sin(rad)) / (M_PER_DEG_LAT * Math.cos(lat * Math.PI / 180));
      p.pos = [p.pos[0] + dLon, p.pos[1] + dLat];
    });
  }

  function advanceShips(ships, dt) {
    ships.forEach(s => {
      if (advanceLerp(s)) return;
      if (!s.pos || !s.sog) return;
      const lat = s.pos[1];
      const distM = s.sog * 0.514444 * dt;
      const rad = (s.cog || s.heading || 0) * Math.PI / 180;
      const dLat = (distM * Math.cos(rad)) / M_PER_DEG_LAT;
      const dLon = (distM * Math.sin(rad)) / (M_PER_DEG_LAT * Math.cos(lat * Math.PI / 180));
      s.pos = [s.pos[0] + dLon, s.pos[1] + dLat];
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
    const allFallback = [...TLE_FALLBACK, ...SURVEILLANCE_TLE];
    _satRecs = parseTLEs(allFallback.map(t => t.join('\n')).join('\n'));
    fetch(CELESTRAK_TLE)
      .then(r => r.ok ? r.text() : fetch(CELESTRAK_DIRECT, { mode: 'cors' }).then(r2 => r2.ok ? r2.text() : Promise.reject()))
      .then(txt => {
        const recs = parseTLEs(txt);
        if (recs.length) {
          const survRecs = parseTLEs(SURVEILLANCE_TLE.map(t => t.join('\n')).join('\n'));
          _satRecs = [...recs.slice(0, 350), ...survRecs];
        }
      })
      .catch(() => {})
      .finally(() => { _satFreshUntil = 0; computeSatellites(); computeGroundTracks(); syncSatelliteEntities(); updateStats(); });
  }

  // Stable satellite objects keyed by name. We mutate them in place (and set
  // smooth lerp targets) rather than rebuilding the array each tick, so the
  // entity position callbacks can read their own object directly — no O(N²)
  // name lookups in the render loop.
  const _satIndex = new Map();
  function computeSatellites() {
    const sat = window.satellite;
    if (!sat || !_satRecs.length) { _satellites = []; _satIndex.clear(); return; }
    const now = new Date();
    const gmst = sat.gstime(now);
    const t0 = performance.now();
    const seen = new Set();
    for (const s of _satRecs) {
      try {
        const pv = sat.propagate(s.rec, now);
        if (!pv || !pv.position) continue;
        const geo = sat.eciToGeodetic(pv.position, gmst);
        const lon = sat.degreesLong(geo.longitude);
        const lat = sat.degreesLat(geo.latitude);
        const altKm = geo.height;
        if (altKm > 100 && altKm < 42000 && lat >= -90 && lat <= 90) {
          seen.add(s.name);
          let o = _satIndex.get(s.name);
          if (!o) {
            o = { name: s.name, pos: [lon, lat], alt: altKm, surv: SURVEILLANCE_NAMES.has(s.name), type: satTypeOf(s.name) };
            _satIndex.set(s.name, o);
          } else {
            o.alt = altKm;
            // Snap (don't lerp) across the antimeridian or on big jumps,
            // otherwise glide smoothly from the current rendered position.
            if (Math.abs(lon - o.pos[0]) > 20) { o.pos = [lon, lat]; o._lerpFrom = null; }
            else { o._lerpFrom = [o.pos[0], o.pos[1]]; o._lerpTo = [lon, lat]; o._lerpStart = t0; }
          }
        }
      } catch {}
    }
    for (const k of _satIndex.keys()) if (!seen.has(k)) _satIndex.delete(k);
    _satellites = Array.from(_satIndex.values());
  }

  function computeGroundTracks() {
    const sat = window.satellite;
    if (!sat || !_satRecs.length) { _groundTracks = []; return; }
    const now = new Date();
    const tracks = [];
    for (const s of _satRecs.slice(0, 60)) {
      try {
        const pts = [];
        for (let m = -30; m <= 90; m += 4) {
          const t = new Date(now.getTime() + m * 60000);
          const gmst = sat.gstime(t);
          const pv = sat.propagate(s.rec, t);
          if (!pv || !pv.position) continue;
          const geo = sat.eciToGeodetic(pv.position, gmst);
          const lon = sat.degreesLong(geo.longitude);
          const lat = sat.degreesLat(geo.latitude);
          const altKm = geo.height;
          pts.push([lon, lat, altKm * 1000]);
        }
        if (pts.length >= 2)
          tracks.push({ name: s.name, pts, isSurveillance: SURVEILLANCE_NAMES.has(s.name) });
      } catch {}
    }
    _groundTracks = tracks;
  }

  // ── Colour helpers ───────────────────────────────────────────────────────────
  function colorForValue(t, goodHigh) {
    const TEAL = [0, 180, 216];
    const GOLD = [212, 175, 55];
    const RED  = [235, 64, 52];
    const clamp = x => Math.max(0, Math.min(1, x));
    const lerp  = (a, b, x) => Math.round(a + (b - a) * clamp(x));
    if (goodHigh) {
      const lo = [80, 140, 160];
      return [lerp(lo[0], GOLD[0], t), lerp(lo[1], GOLD[1], t), lerp(lo[2], GOLD[2], t)];
    }
    return [lerp(TEAL[0], RED[0], t), lerp(TEAL[1], RED[1], t), lerp(TEAL[2], RED[2], t)];
  }
  function normalise(value, metric) {
    const r = METRIC_RANGES[metric];
    if (!r) return 0;
    return Math.max(0, Math.min(1, (value - r.min) / (r.max - r.min)));
  }
  function bytes(rgb, a) { return window.Cesium.Color.fromBytes(rgb[0], rgb[1], rgb[2], a == null ? 255 : a); }

  // ── Airline colours (ICAO callsign prefix → [r,g,b]) ─────────────────────
  const AIRLINE_COLORS = {
    SAS:[0,45,130], DAN:[200,0,40], SJN:[0,100,200], EZY:[255,100,0],
    RYR:[0,50,150], DLH:[255,200,0], BAW:[0,56,145], KLM:[0,155,227],
    AFR:[0,60,150], IBE:[180,0,0],  THY:[220,0,40],  UAE:[0,120,80],
    QTR:[140,0,50], FIN:[0,120,200], NOZ:[220,60,0], NAX:[220,60,0],
    WZZ:[130,0,180], VLG:[250,180,0], TAP:[0,130,60], AUA:[150,0,0],
    BEL:[0,90,180], LOT:[180,0,0],   CSN:[200,0,30], CCA:[180,0,20],
    UAL:[0,40,130], AAL:[180,30,30], DAL:[0,50,120], SWA:[180,80,0],
  };
  const AIRLINE_NAMES = {
    // Scandinavian
    SAS:'SAS Scandinavian Airlines', DAN:'Maersk Air', SJN:'SAS Nordic',
    BCS:'European Air Charter', SCW:'Malmo Aviation', FLY:'Primera Air Scandinavia',
    // UK / Ireland
    EZY:'easyJet', BAW:'British Airways', VIR:'Virgin Atlantic', TOM:'TUI Airways',
    BEE:'Flybe', LOG:'Loganair', EXS:'Jet2', TCX:'TUI fly UK', DRT:'TUI fly Belgium',
    // Germany / Central Europe
    DLH:'Lufthansa', EWG:'Eurowings', CFG:'Condor', TUI:'TUIfly', GWI:'Germanwings',
    // Benelux
    KLM:'KLM Royal Dutch Airlines', TRA:'Transavia Netherlands', VLG:'Vueling Airlines',
    BEL:'Brussels Airlines',
    // France / Iberia
    AFR:'Air France', TVF:'Transavia France', IBE:'Iberia', VLG2:'Vueling',
    TAP:'TAP Air Portugal', RYR:'Ryanair', RKT:'Ryanair UK',
    // Eastern / Southern Europe
    WZZ:'Wizz Air', LOT:'LOT Polish Airlines', CSA:'Czech Airlines', AUA:'Austrian Airlines',
    THY:'Turkish Airlines', THL:'TUI fly Netherlands', OHY:'Onur Air', TKF:'Türkiye Hava Yolları',
    // Middle East
    UAE:'Emirates', QTR:'Qatar Airways', ETH:'Ethiopian Airlines', ETD:'Etihad Airways',
    GFA:'Gulf Air', MEA:'Middle East Airlines', OMA:'Oman Air', SVA:'Saudia',
    // Nordic budget
    NOZ:'Norwegian Air Norway', NAX:'Norwegian Air Shuttle', FIN:'Finnair',
    // North America
    UAL:'United Airlines', AAL:'American Airlines', DAL:'Delta Air Lines',
    SWA:'Southwest Airlines', ACA:'Air Canada', WJA:'WestJet',
    // Asia / Pacific
    CSN:'China Southern Airlines', CCA:'Air China', CES:'China Eastern Airlines',
    ANA:'All Nippon Airways', JAL:'Japan Airlines', KAL:'Korean Air',
    SIA:'Singapore Airlines', CPA:'Cathay Pacific', THA:'Thai Airways',
    // Cargo
    CLX:'Cargolux', FDX:'FedEx', UPS:'UPS Airlines', DHL:'DHL Air',
    NPT:'Night Air', TFL:'Arke Fly',
  };
  const _planeCanvasCache = new Map();
  function makePlaneCanvas(r, g, b) {
    const key = `${r},${g},${b}`;
    if (_planeCanvasCache.has(key)) return _planeCanvasCache.get(key);
    // High-res canvas (downscaled by the billboard) → crisp airliner shape.
    const sz = 44, c = document.createElement('canvas');
    c.width = c.height = sz;
    const ctx = c.getContext('2d');
    ctx.translate(sz / 2, sz / 2);
    // Top-down airliner silhouette, nose pointing UP (north). One continuous
    // outline: nose → swept main wings → rear tailplane → tail cone.
    const P = [
      [0, -19],            // nose tip
      [2.0, -13], [2.4, -4],
      [16.5, 3.5], [16.5, 6.5],   // right main wing (swept back)
      [2.6, 2.5], [2.4, 9],
      [6.6, 14.5], [6.6, 16.5],   // right tailplane
      [1.5, 12.5], [0, 18],       // tail cone
      [-1.5, 12.5],
      [-6.6, 16.5], [-6.6, 14.5], // left tailplane
      [-2.4, 9], [-2.6, 2.5],
      [-16.5, 6.5], [-16.5, 3.5], // left main wing
      [-2.4, -4], [-2.0, -13],
    ];
    ctx.beginPath();
    P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    ctx.shadowColor = `rgba(${r},${g},${b},0.55)`;
    ctx.shadowBlur = 4;
    ctx.fillStyle = `rgba(${r},${g},${b},0.96)`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    _planeCanvasCache.set(key, c);
    return c;
  }
  // Wind-field arrow: a tapered arrow pointing UP (north). Length & colour
  // scale with wind speed; cached per integer m/s bucket. Rotated per station.
  const _windArrowCache = new Map();
  function makeWindArrow(speed) {
    const s = Math.max(0, Math.min(25, Math.round(speed || 0)));
    if (_windArrowCache.has(s)) return _windArrowCache.get(s);
    const sz = 40, c = document.createElement('canvas');
    c.width = c.height = sz;
    const ctx = c.getContext('2d');
    ctx.translate(sz / 2, sz / 2);
    const len = 6 + Math.min(15, s * 0.9);          // shaft half-length
    // colour: calm blue → strong red
    const t = Math.min(1, s / 22);
    const r = Math.round(80 + t * 175), g = Math.round(200 - t * 150), b = Math.round(255 - t * 215);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, len); ctx.lineTo(0, -len + 2); ctx.stroke();   // shaft
    ctx.beginPath(); ctx.moveTo(0, -len - 3); ctx.lineTo(-4.5, -len + 4); ctx.lineTo(4.5, -len + 4); ctx.closePath(); ctx.fill(); // head
    _windArrowCache.set(s, c);
    return c;
  }
  function airlineColor(callsign) {
    if (!callsign) return [180, 220, 255];
    const pfx = callsign.trim().toUpperCase().substring(0, 3);
    return AIRLINE_COLORS[pfx] || AIRLINE_COLORS[pfx.substring(0, 2)] || [180, 220, 255];
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let Cesium     = null;
  let _viewer    = null;
  let _metric    = 'ledighed';
  let _view      = 'kommuner';
  let _pulse     = 0;
  let _rafId     = null;
  let _pinnedTooltip = false;
  let _aircraft  = [];
  let _aircraftStatus = 'loading';
  let _ships     = [];
  let _aisStatus = 'loading';
  let _satRecs   = [];
  let _satellites = [];
  let _satFreshUntil = 0;
  let _groundTracks = [];
  let _groundTracksFreshUntil = 0;
  let _infraPoints = null;      // cell-mast PointPrimitiveCollection
  let _infraLoaded = false;
  let _wifiPoints = null;       // WiFi hotspot PointPrimitiveCollection
  let _wifiLoaded = false;
  const _pointLayers = {};      // generic /points layers: name -> { coll, loaded }
  let _container = null;
  let _initialized = false;
  let _aircraftTimer = null;
  let _shipTimer = null;
  let _weatherTimer = null;
  let _powerTimer = null;
  let _power = null;
  let _aircraftRetryTimer = null;
  let _shipRetryTimer = null;
  let _aircraftRetryDelay = 0;
  let _shipRetryDelay = 0;
  let _lastFrameT = 0;
  let _config    = { cesiumIonToken: '', googleTilesKey: '' };
  let _kommuneDS = null;             // GeoJsonDataSource
  let _kommuneEntities = [];
  let _googleTileset = null;
  let _osmBuildings  = null;
  let _baseImagery   = null;
  let _googleActive  = false;

  // Entity registries
  const _acEnt       = new Map();   // icao24 → entity
  const _shipEnt     = new Map();   // mmsi   → entity
  const _satEnt      = new Map();   // name   → entity
  const _weatherEnt  = new Map();   // name   → entity
  const _windEnt     = new Map();   // name   → wind-arrow entity
  const _trackEnt    = [];          // ground-track polyline entities
  let _weather       = [];
  let _staticBuilt   = false;
  let _beredskabNews      = [];
  let _beredskabNewsFetch = 0;
  let _kystStations       = [];
  const _kystEnt          = new Map();  // id → entity
  let _togDepartures      = {};  // stationId → departures[]
  let _togFetched         = 0;
  let _togTimer           = null;
  let _gridFreq           = null;
  let _gridFreqTimer      = null;
  let _exchangeRates      = null;
  let _politikActivity    = null; // cached Folketing activity data
  const _politikMinEnt    = new Map(); // id → entity (minister person markers)
  let _politikMinFetched  = false;
  let _trafikEvents       = [];   // Vejdirektoratet traffic events
  let _trafikTimer        = null;
  const _trafikEnt        = new Map(); // id → entity
  let _trainPositions     = [];   // dead-reckoned IC train positions
  let _trainPosTimer      = null;
  const _trainPosEnt      = new Map(); // id → entity

  // ── Cesium globe init ────────────────────────────────────────────────────────
  const HOME = () => ({
    destination: Cesium.Cartesian3.fromDegrees(10.6, 53.6, 720000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-58), roll: 0 },
  });

  async function initViewer(container) {
    Cesium = window.Cesium;
    if (!Cesium) throw new Error('Cesium not loaded');

    if (_config.cesiumIonToken) Cesium.Ion.defaultAccessToken = _config.cesiumIonToken;

    // Dark CARTO basemap as the reliable base layer. OpenStreetMap's own tile
    // servers block direct app usage (their tile-usage policy), so we use
    // CARTO's free dark raster basemap instead — it also matches the HUD
    // aesthetic and its host is already in the server CSP allow-list.
    _baseImagery = new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      subdomains: 'abcd',
      credit: '© OpenStreetMap, © CARTO',
      maximumLevel: 19,
    });

    _viewer = new Cesium.Viewer(container, {
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(Promise.resolve(_baseImagery), {}),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: false,
      requestRenderMode: false,
      contextOptions: { webgl: { alpha: false } },
    });

    const scene = _viewer.scene;
    scene.backgroundColor = Cesium.Color.BLACK;
    scene.globe.baseColor = Cesium.Color.fromBytes(8, 10, 16);
    scene.globe.enableLighting = true;
    scene.globe.dynamicAtmosphereLighting = true;
    scene.globe.dynamicAtmosphereLightingFromSun = false;
    scene.globe.showGroundAtmosphere = true;
    scene.skyAtmosphere.show = true;
    scene.skyAtmosphere.brightnessShift = 0.1;
    scene.skyAtmosphere.saturationShift = 0.15;
    scene.fog.enabled = true;
    scene.fog.density = 0.00012;
    scene.fog.minimumBrightness = 0.18;
    scene.highDynamicRange = false;
    // Performance: cap the render rate (avoids overdrawing at 120/144 Hz) and
    // load slightly coarser terrain tiles — both ease the load on weaker GPUs
    // without a visible quality drop at this scale.
    _viewer.targetFrameRate = 60;
    scene.globe.maximumScreenSpaceError = 3;
    // CARTO's dark basemap is already dark; lift it slightly so coastlines and
    // labels stay legible under the gold HUD instead of crushing to black.
    if (_viewer.imageryLayers.length) {
      const l = _viewer.imageryLayers.get(0);
      l.brightness = 1.15; l.saturation = 0.85; l.contrast = 1.05; l.gamma = 1.0;
    }
    // Hide Cesium's default credit overlay clutter (keep required attributions
    // in the on-screen container that Cesium manages for Google tiles).
    try { _viewer.cesiumWidget.creditContainer.style.display = 'none'; } catch {}

    // World terrain + OSM Buildings (ion only).
    if (_config.cesiumIonToken) {
      Cesium.createWorldTerrainAsync().then(t => { if (_viewer) _viewer.scene.setTerrain(new Cesium.Terrain(Promise.resolve(t))); }).catch(() => {});
      Cesium.createOsmBuildingsAsync().then(ts => {
        _osmBuildings = ts;
        // Coarser tile budget so worldwide buildings don't stream-stutter the
        // camera; they sharpen as you zoom in.
        _osmBuildings.maximumScreenSpaceError = 24;
        _osmBuildings.show = !_googleActive;
        _viewer.scene.primitives.add(_osmBuildings);
      }).catch(() => {});
    }

    _viewer.camera.flyTo({ ...HOME(), duration: 0 });

    // Hover tooltips + click-to-pin
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((movement) => onHover(movement.endPosition), Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction((click) => {
      const picked = _viewer.scene.pick(click.position);
      const ent = picked && picked.id;
      if (ent && ent._kind) {
        // Pin the tooltip so the user can read/interact without it disappearing.
        _pinnedTooltip = true;
        onHoverForce(click.position, ent);
      } else {
        _pinnedTooltip = false;
        const el = document.getElementById('dk-tooltip');
        if (el) el.style.display = 'none';
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Double-click any object or municipality → fly the camera to it. Replace
    // Cesium's default double-click (which locks the camera onto the entity).
    _viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    handler.setInputAction((click) => {
      const picked = _viewer.scene.pick(click.position);
      const ent = picked && picked.id;
      if (ent && (ent._kind || ent.polygon)) flyToEntity(ent);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    _viewer._dkHandler = handler;

    // Compass needle follows camera heading
    scene.preRender.addEventListener(() => updateCompass());
  }

  // ── Google Photorealistic 3D Tiles toggle ─────────────────────────────────────
  async function toggleGoogleTiles() {
    if (!_config.googleTilesKey) return;
    const btn = document.getElementById('dk-google-btn');
    _googleActive = !_googleActive;
    try {
      if (_googleActive) {
        if (btn) { btn.classList.add('loading'); btn.disabled = true; }
        if (!_googleTileset) {
          _googleTileset = await Cesium.createGooglePhotorealistic3DTileset({ key: _config.googleTilesKey });
          _viewer.scene.primitives.add(_googleTileset);
        }
        _googleTileset.show = true;
        if (_osmBuildings) _osmBuildings.show = false;
        if (_viewer.imageryLayers.length) _viewer.imageryLayers.get(0).show = false;
        // Photoreal 3D is only visible from city-level altitude — at the
        // Denmark-wide framing the tiles read as flat terrain. Drop the camera
        // down over København so the photorealism is immediately obvious.
        const h = _viewer.camera.positionCartographic.height;
        if (h > 30000) {
          _viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(12.5763, 55.6753, 1800),
            orientation: { heading: Cesium.Math.toRadians(20), pitch: Cesium.Math.toRadians(-35), roll: 0 },
            duration: 2.5,
          });
        }
      } else {
        if (_googleTileset) _googleTileset.show = false;
        if (_osmBuildings) _osmBuildings.show = true;
        if (_viewer.imageryLayers.length) _viewer.imageryLayers.get(0).show = true;
      }
    } catch (e) {
      _googleActive = false;
      console.warn('[google3d] tileset failed — check key billing/restrictions', e);
      if (btn) { btn.title = 'Google 3D utilgængelig — tjek API-nøgle/billing'; btn.classList.add('error'); }
    } finally {
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    }
    if (btn) btn.classList.toggle('active', _googleActive);
  }

  // ── Municipalities (extruded choropleth) ──────────────────────────────────────
  function kommuneValue(ent) {
    const kd = ent._kd;
    return kd ? kd[_metric] : null;
  }
  function kommuneColor(ent) {
    if (_view !== 'kommuner') return Cesium.Color.TRANSPARENT;
    const v = kommuneValue(ent);
    if (v == null) return Cesium.Color.fromBytes(40, 40, 50, 150);
    const t = normalise(v, _metric);
    const c = colorForValue(t, (METRICS[_metric] || METRICS.ledighed).goodHigh);
    return Cesium.Color.fromBytes(c[0], c[1], c[2], 215);
  }
  function kommuneHeight(ent) {
    if (_view !== 'kommuner') return 0;
    const v = kommuneValue(ent);
    if (v == null) return 800;
    const t = normalise(v, _metric);
    // Keep the extrusion modest (max ~12 km). The old 80 km scale turned
    // municipalities into giant vertical "curtains" that smeared across the
    // whole view from any low camera angle.
    return 800 + t * 11200;
  }

  function styleKommune(ent) {
    const nameProp = ent.properties && (ent.properties.label_dk || ent.properties.name || ent.properties.NAME);
    const name = nameProp ? (nameProp.getValue ? nameProp.getValue() : nameProp) : null;
    ent._name = name;
    ent._kd = name && KD[name] ? KD[name] : null;
    ent._kind = 'kommune';
    if (!ent.polygon) return;
    // Flat base at ground level. perPositionHeight must be false or Cesium
    // ignores `height` and warns ("cannot have both height and
    // perPositionHeight"); it also caused faint vertical striping.
    ent.polygon.perPositionHeight = false;
    ent.polygon.height = 0;
    ent.polygon.outline = true;
    ent.polygon.outlineColor = Cesium.Color.fromBytes(212, 175, 55, 90);
    ent.polygon.closeTop = true;
    ent.polygon.closeBottom = true;
    applyKommuneStyle(ent);
  }
  // Colour/height are constant between metric or view changes, so set plain
  // values (not per-frame callbacks) — this avoids ~200 property evaluations
  // every single frame across all municipalities.
  const _VIEWS_HIDE_POLY = new Set(['lufttrafik', 'skibstrafik', 'satellitter', 'infra', 'miljo']);
  function applyKommuneStyle(ent) {
    if (!ent.polygon) return;
    const inKommune = (_view === 'kommuner');
    ent.polygon.material = new Cesium.ColorMaterialProperty(kommuneColor(ent));
    ent.polygon.extrudedHeight = kommuneHeight(ent);
    ent.polygon.outlineColor = inKommune
      ? Cesium.Color.fromBytes(212, 175, 55, 110)
      : Cesium.Color.fromBytes(200, 210, 220, 22);
    ent.polygon.outline = inKommune || (!_VIEWS_HIDE_POLY.has(_view));
  }
  function restyleKommuner() {
    if (_kommuneEntities) _kommuneEntities.forEach(applyKommuneStyle);
  }

  async function loadKommuner() {
    try {
      _kommuneDS = await Cesium.GeoJsonDataSource.load(GEO_URL, { clampToGround: false });
      await _viewer.dataSources.add(_kommuneDS);
      _kommuneEntities = _kommuneDS.entities.values;
      _kommuneEntities.forEach(styleKommune);
    } catch (e) { _kommuneDS = null; }
  }

  // ── Static layers (cities, airports, infra, jamming, NOTAM) ───────────────────
  function deg(lon, lat, h) { return Cesium.Cartesian3.fromDegrees(lon, lat, h || 0); }
  function degArr(path, h) {
    const flat = [];
    path.forEach(p => { flat.push(p[0], p[1], h || 0); });
    return Cesium.Cartesian3.fromDegreesArrayHeights(flat);
  }
  const FONT = '600 13px "Courier New", monospace';

  function buildStatic() {
    if (_staticBuilt) return;
    const ents = _viewer.entities;

    // Cities — gold pulsing dots + labels
    CITIES.forEach(c => {
      ents.add({
        position: deg(c.pos[0], c.pos[1]),
        point: {
          pixelSize: new Cesium.CallbackProperty(() => 7 + 3 * Math.sin(_pulse), false),
          color: Cesium.Color.fromBytes(212, 175, 55, 255),
          outlineColor: Cesium.Color.fromBytes(255, 230, 150, 200),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: c.name, font: '700 12px "Courier New", monospace',
          fillColor: Cesium.Color.fromBytes(212, 175, 55, 230),
          style: Cesium.LabelStyle.FILL, pixelOffset: new Cesium.Cartesian2(0, -18),
          scaleByDistance: new Cesium.NearFarScalar(2.0e5, 1.1, 3.0e6, 0.4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        _layer: 'cities', _kind: 'city', _data: c,
      });
    });

    // Train routes (tog)
    TRAIN_ROUTES.forEach(r => {
      ents.add({
        polyline: {
          positions: degArr(r.path, 0),
          width: r.type === 'ic' ? 2.5 : 1.5,
          material: r.type === 'ic'
            ? Cesium.Color.fromBytes(100, 180, 255, 210)
            : Cesium.Color.fromBytes(80, 140, 210, 160),
          clampToGround: true,
        },
        _layer: 'tog', show: false,
      });
    });
    // Train stations (tog)
    TRAIN_STATIONS.forEach(s => {
      ents.add({
        position: deg(s.pos[0], s.pos[1]),
        point: {
          pixelSize: s.type === 'ic' ? 10 : 7,
          color: Cesium.Color.fromBytes(100, 180, 255, 240),
          outlineColor: Cesium.Color.fromBytes(200, 230, 255, 200),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: s.name, font: '600 10px "Courier New", monospace',
          fillColor: Cesium.Color.fromBytes(160, 210, 255, 210),
          style: Cesium.LabelStyle.FILL,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.0, 2.0e6, 0.3),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        _layer: 'tog', _kind: 'tog', _data: s, show: false,
      });
    });

    // Christiansborg anchor (politik) — minister person markers are fetched dynamically
    ents.add({
      position: deg(12.5779, 55.6753),
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromBytes(212, 175, 55, 250),
        outlineColor: Cesium.Color.fromBytes(255, 255, 255, 200),
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: 'Christiansborg',
        font: '700 10px "Courier New", monospace',
        fillColor: Cesium.Color.fromBytes(212, 175, 55, 240),
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1.2, 8.0e5, 0.4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      _layer: 'politik', _kind: 'politik',
      _data: { id: 'ft', name: 'Christiansborg (Folketing)', pos: [12.5779, 55.6753], type: 'parliament' },
      show: false,
    });

    // Military bases (forsvar)
    MILITARY_BASES.forEach(b => {
      const col = b.branch === 'luftvåben' ? [60, 180, 255]   // blue for air
                : b.branch === 'søværnet'  ? [80, 230, 200]   // teal for navy
                : b.branch === 'fælles'    ? [230, 180, 60]   // gold for joint
                :                           [180, 80, 80];    // red for army
      const outCol = b.branch === 'luftvåben' ? [160, 230, 255]
                   : b.branch === 'søværnet'  ? [160, 255, 240]
                   : b.branch === 'fælles'    ? [255, 230, 120]
                   :                           [255, 160, 160];
      ents.add({
        position: deg(b.pos[0], b.pos[1]),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromBytes(col[0], col[1], col[2], 240),
          outlineColor: Cesium.Color.fromBytes(outCol[0], outCol[1], outCol[2], 200),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: b.name.split(',')[0],
          font: '600 10px "Courier New", monospace',
          fillColor: Cesium.Color.fromBytes(col[0], col[1], col[2], 210),
          style: Cesium.LabelStyle.FILL,
          pixelOffset: new Cesium.Cartesian2(0, -15),
          scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.0, 4.0e6, 0.3),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        _layer: 'forsvar', _kind: 'forsvar', _data: b, show: false,
      });
    });

    // Airports (lufttrafik)
    AIRPORTS.forEach(a => {
      ents.add({
        position: deg(a.pos[0], a.pos[1]),
        point: { pixelSize: 9, color: Cesium.Color.TRANSPARENT, outlineColor: Cesium.Color.fromBytes(212, 175, 55, 200), outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: a.name, font: FONT, fillColor: Cesium.Color.fromBytes(212, 175, 55, 220), pixelOffset: new Cesium.Cartesian2(0, 14), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        _layer: 'lufttrafik', show: false,
      });
    });

    // Undersea cables & pipelines
    UNDERSEA_CABLES.forEach(c => {
      ents.add({
        polyline: {
          positions: degArr(c.path, 0),
          width: c.type === 'gas' ? 3 : 2,
          material: bytes(c.color, 220),
          clampToGround: true,
        },
        _layer: 'cables', _kind: 'cable', _data: c, show: false,
      });
      const mid = c.path[Math.floor(c.path.length / 2)];
      ents.add({
        position: deg(mid[0], mid[1]),
        label: { text: c.name, font: '11px "Courier New", monospace', fillColor: bytes(c.color, 200), pixelOffset: new Cesium.Cartesian2(0, -8), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        _layer: 'cables', show: false,
      });
    });

    // Ferry routes
    FERRY_ROUTES.forEach(f => {
      ents.add({
        polyline: {
          positions: degArr(f.path, 0),
          width: 2,
          material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromBytes(160, 210, 255, 220), dashLength: 16 }),
          clampToGround: true,
        },
        _layer: 'ferry', _kind: 'ferry', _data: f, show: false,
      });
    });

    // Ports
    const portColor = t => {
      if (t === 'container') return [255, 200, 50];
      if (t === 'oil')       return [255, 80, 50];
      if (t === 'offshore')  return [100, 200, 255];
      if (t === 'ferry')     return [180, 140, 255];
      return [200, 200, 200];
    };
    PORTS.forEach(p => {
      ents.add({
        position: deg(p.pos[0], p.pos[1]),
        point: { pixelSize: 9, color: bytes(portColor(p.type), 235), outlineColor: Cesium.Color.fromBytes(255, 240, 180, 200), outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: p.name, font: '11px "Courier New", monospace', fillColor: Cesium.Color.fromBytes(255, 220, 100, 210), pixelOffset: new Cesium.Cartesian2(0, 14), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        _layer: 'ports', _kind: 'port', _data: p, show: false,
      });
    });

    // Wind farms — green columns sized by capacity (infrastruktur)
    WIND_FARMS.forEach(w => {
      ents.add({
        position: deg(w.pos[0], w.pos[1], 0),
        cylinder: {
          length: 1000 + Math.sqrt(w.mw) * 1600,
          topRadius: 600, bottomRadius: 600,
          material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => Cesium.Color.fromBytes(40, 200, 100, 150 + Math.round(60 * Math.sin(_pulse * 0.8))), false)),
          outline: true, outlineColor: Cesium.Color.fromBytes(160, 255, 180, 180),
        },
        label: { text: w.name, font: '11px "Courier New", monospace', fillColor: Cesium.Color.fromBytes(100, 255, 160, 210), pixelOffset: new Cesium.Cartesian2(0, -18), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        _layer: 'wind', _kind: 'wind', _data: w, show: false,
      });
    });

    // GPS jamming zones (overvågning) — pulsing red ellipses on ground
    GPS_JAMMING.forEach(j => {
      ents.add({
        position: deg(j.pos[0], j.pos[1]),
        ellipse: {
          semiMajorAxis: j.radius * 1000, semiMinorAxis: j.radius * 1000,
          material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => Cesium.Color.fromBytes(255, 60, 20, Math.round(j.intensity * (30 + 20 * Math.sin(_pulse * 0.6)))), false)),
          outline: true, outlineColor: Cesium.Color.fromBytes(255, 60, 20, 200), outlineWidth: 2,
          height: 0,
        },
        label: { text: j.name.toUpperCase(), font: '11px "Courier New", monospace', fillColor: Cesium.Color.fromBytes(255, 90, 40, 220), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        _layer: 'overvågning', _kind: 'jamming', _data: j, show: false,
      });
    });

    // NOTAM restricted airspace (overvågning) — amber ellipses
    NOTAMS.forEach(n => {
      const col = n.type === 'military' ? [255, 200, 0] : [255, 140, 0];
      ents.add({
        position: deg(n.center[0], n.center[1]),
        ellipse: {
          semiMajorAxis: n.radius * 1852, semiMinorAxis: n.radius * 1852,
          material: bytes(col, 28), outline: true, outlineColor: bytes(col, 200), outlineWidth: 2, height: 0,
        },
        label: { text: n.id, font: FONT, fillColor: bytes(col, 220), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        _layer: 'overvågning', _kind: 'notam', _data: n, show: false,
      });
    });

    _staticBuilt = true;
  }

  // ── Live entity sync (aircraft / ships / satellites) ──────────────────────────
  function syncAircraftEntities() {
    const ents = _viewer.entities;
    const seen = new Set();
    _aircraft.forEach(d => {
      seen.add(d.icao24);
      if (!_acEnt.has(d.icao24)) {
        const [ar, ag, ab] = airlineColor(d.callsign);
        const canvas = makePlaneCanvas(ar, ag, ab);
        const e = ents.add({
          position: new Cesium.CallbackProperty(() => d.pos ? deg(d.pos[0], d.pos[1], (d.altitude || 0)) : undefined, false),
          billboard: {
            image: canvas,
            width: 32, height: 32,
            // rotation is CCW in screen-space. Heading is CW from North.
            // rotation = -(heading in radians) makes 0° point up on screen.
            rotation: new Cesium.CallbackProperty(() => -((d.heading || 0) * Math.PI / 180), false),
            alignedAxis: Cesium.Cartesian3.ZERO,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.2, 8e6, 0.4),
          },
          _kind: 'aircraft', _data: d, _layer: 'lufttrafik',
        });
        e.show = _view === 'lufttrafik';
        _acEnt.set(d.icao24, e);
      } else {
        _acEnt.get(d.icao24)._data = d;
      }
    });
    for (const [k, e] of _acEnt) if (!seen.has(k)) { ents.remove(e); _acEnt.delete(k); }
  }

  function shipColor(s) {
    if (NAVAL_MMSI.has(Number(s.mmsi))) return [80, 230, 200];  // teal for Danish navy
    switch (s.type) {
      case 'tanker':    return [255, 90, 60];
      case 'cargo':     return [255, 160, 40];
      case 'passenger': return [80, 220, 255];
      case 'hsc':       return [180, 120, 255];
      default:          return [255, 200, 120];
    }
  }
  function syncShipEntities() {
    const ents = _viewer.entities;
    const seen = new Set();
    _ships.forEach(d => {
      seen.add(d.mmsi);
      if (!_shipEnt.has(d.mmsi)) {
        const e = ents.add({
          position: new Cesium.CallbackProperty(() => d.pos ? deg(d.pos[0], d.pos[1], 0) : undefined, false),
          point: {
            pixelSize: 6,
            color: new Cesium.CallbackProperty(() => bytes(shipColor(d), 235), false),
            outlineColor: Cesium.Color.fromBytes(255, 230, 180, 200), outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          _kind: 'ship', _data: d, _layer: 'skibstrafik',
        });
        e.show = (_view === 'skibstrafik');
        _shipEnt.set(d.mmsi, e);
      } else {
        _shipEnt.get(d.mmsi)._data = d;
      }
    });
    for (const [k, e] of _shipEnt) if (!seen.has(k)) { ents.remove(e); _shipEnt.delete(k); }
  }

  function syncSatelliteEntities() {
    if (!_viewer) return;
    const ents = _viewer.entities;
    const seen = new Set();
    const showSat = _view === 'satellitter';
    const showRecon = _view === 'overvågning';
    _satellites.forEach(d => {
      seen.add(d.name);
      if (!_satEnt.has(d.name)) {
        const t = SAT_TYPES[d.type || 'other'];
        const spec = {
          position: new Cesium.CallbackProperty(() => deg(d.pos[0], d.pos[1], d.alt * 1000), false),
          point: {
            pixelSize: t.size,
            color: Cesium.Color.fromBytes(...t.c),
            outlineColor: Cesium.Color.fromBytes(...t.oc),
            outlineWidth: t.ol,
            // No disableDepthTestDistance — let the globe occlude satellites on
            // the far side so they can't be seen "through" the Earth.
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 3e7, 0.5),
          },
          _kind: 'sat', _data: d, _layer: 'satellitter',
        };
        if (t.label) {
          spec.label = {
            text: d.name,
            font: `${d.type === 'station' ? 12 : 10}px "Courier New", monospace`,
            fillColor: Cesium.Color.fromBytes(...t.c),
            pixelOffset: new Cesium.Cartesian2(0, -(t.size + 4)),
            // Occluded by the globe too, so far-side labels don't bleed through.
            translucencyByDistance: new Cesium.NearFarScalar(8e5, 1.0, 4e7, 0.0),
          };
        }
        const e = ents.add(spec);
        e.show = showSat || (showRecon && (d.surv || d.type === 'recon'));
        _satEnt.set(d.name, e);
      } else {
        const e = _satEnt.get(d.name);
        e._data = d;
        e.show = showSat || (showRecon && (d.surv || d.type === 'recon'));
      }
    });
    for (const [k, e] of _satEnt) if (!seen.has(k)) { ents.remove(e); _satEnt.delete(k); }
  }

  function syncGroundTracks() {
    if (!_viewer) return;
    const ents = _viewer.entities;
    while (_trackEnt.length) { const e = _trackEnt.pop(); ents.remove(e); }
    // Orbital ground-tracks only appear in the surveillance view. The plain
    // satellite view stays clean — just the moving points, no lines.
    if (_view !== 'overvågning') return;
    const list = _groundTracks.filter(t => t.isSurveillance);
    list.forEach(t => {
      const e = ents.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(t.pts.flat()),
          width: t.isSurveillance ? 2.5 : 1.2,
          material: t.isSurveillance ? Cesium.Color.fromBytes(255, 100, 30, 220) : Cesium.Color.fromBytes(60, 230, 180, 150),
        },
        _layer: 'tracks',
      });
      _trackEnt.push(e);
    });
  }

  // ── View switching ─────────────────────────────────────────────────────────
  function applyView() {
    if (!_viewer) return;
    const v = _view;
    // Kommuner polygons: hidden entirely for views where they're just noise; ghostly
    // borders only in other non-kommuner views; full choropleth in kommuner view.
    const polyHidden = _VIEWS_HIDE_POLY && _VIEWS_HIDE_POLY.has(v);
    if (_kommuneEntities) _kommuneEntities.forEach(e => { if (e.polygon) e.show = !polyHidden; });
    // Static layers
    _viewer.entities.values.forEach(e => {
      const layer = e._layer;
      if (!layer) return;
      switch (layer) {
        case 'cities': e.show = true; break;
        case 'lufttrafik': e.show = (v === 'lufttrafik'); break;
        case 'skibstrafik': e.show = (v === 'skibstrafik'); break;
        case 'satellitter': e.show = (v === 'satellitter') || (v === 'overvågning' && e._data && e._data.surv); break;
        case 'cables': e.show = (v === 'infrastruktur' || v === 'overvågning'); break;
        case 'ferry':
        case 'ports': e.show = (v === 'infrastruktur'); break;
        case 'wind': e.show = (v === 'infrastruktur'); break;
        case 'overvågning': e.show = (v === 'overvågning'); break;
        case 'beredskab': e.show = (v === 'beredskab'); break;
        case 'vejr': e.show = (v === 'vejr'); break;
        case 'tog': e.show = (v === 'tog'); break;
        case 'forsvar': e.show = (v === 'forsvar'); break;
        case 'politik': e.show = (v === 'politik'); break;
        case 'trafik': e.show = (v === 'trafik' || v === 'tog'); break;
      }
    });
    // Live entities
    for (const e of _acEnt.values()) e.show = (v === 'lufttrafik');
    for (const [mmsi, e] of _shipEnt) {
      e.show = (v === 'skibstrafik') || (v === 'forsvar' && NAVAL_MMSI.has(Number(mmsi)));
    }
    for (const e of _satEnt.values()) e.show = (v === 'satellitter') || (v === 'overvågning' && e._data && (e._data.surv || e._data.type === 'recon'));
    for (const e of _weatherEnt.values()) e.show = (v === 'vejr');
    for (const e of _windEnt.values()) e.show = (v === 'vejr');
    // Polygon colour alpha + extrusion depend on the active view.
    restyleKommuner();
    syncGroundTracks();
    // Power readout is only relevant in the infrastructure view.
    const powerEl = document.getElementById('dk-power');
    if (powerEl) powerEl.style.display = (v === 'infrastruktur') ? '' : 'none';
    // Grid frequency: visible in infrastruktur view only.
    const freqEl = document.getElementById('dk-gridfreq');
    if (freqEl) freqEl.style.display = (v === 'infrastruktur') ? '' : 'none';
    // Metric/legend buttons: also hide in tog, forsvar, trafik and politik views.
    const metricBtns = document.getElementById('dk-metric-btns');
    if (metricBtns && (v === 'tog' || v === 'forsvar' || v === 'politik' || v === 'trafik' || v === 'infra' || v === 'miljo')) metricBtns.style.display = 'none';
    // Sync kyst entities visibility.
    for (const e of _kystEnt.values()) e.show = (v === 'vejr');
    // Sync trafik event entities.
    for (const e of _trafikEnt.values()) e.show = (v === 'trafik' || v === 'tog');
    // Sync live train position entities.
    for (const e of _trainPosEnt.values()) e.show = (v === 'trafik' || v === 'tog');
    // Pre-fetch recent news for beredskab tooltips.
    if (v === 'beredskab') fetchBeredskabNews();
    // Pre-fetch train departures when entering tog view.
    if (v === 'tog') { fetchTog(); fetchGridFreq(); }
    // Keep grid frequency refreshed in infrastruktur view too.
    if (v === 'infrastruktur') fetchGridFreq();
    // Minister person markers (politik view).
    for (const e of _politikMinEnt.values()) e.show = (v === 'politik');
    if (v === 'politik') { fetchPolitikActivity(); fetchPolitikMinistere(); }
    // Fetch traffic events + train positions for trafik/tog views.
    if (v === 'trafik' || v === 'tog') { fetchTrafikEvents(); fetchTrainPositions(); }
    // Telecom mast + WiFi hotspot layers (infra view).
    if (_infraPoints) _infraPoints.show = false;
    if (_wifiPoints)  _wifiPoints.show  = false;
    if (v === 'infra') {
      if (!_infraLoaded) fetchAndBuildInfra(); else if (_infraPoints) _infraPoints.show = true;
      if (!_wifiLoaded)  fetchAndBuildWifi();  else if (_wifiPoints)  _wifiPoints.show  = true;
    }
    // Environment overlay (miljo view): air quality + seismic + tide gauges.
    const MILJO_LAYERS = [
      ['luftkvalitet', '/api/luftkvalitet/points'],
      ['seismik',      '/api/seismik/points'],
      ['vandstand',    '/api/vandstand/points'],
    ];
    const inMiljo = (v === 'miljo');
    for (const [name, ep] of MILJO_LAYERS) {
      if (inMiljo) loadPointLayer(name, ep, true);
      else showPointLayer(name, false);
    }
  }

  // ── Hover / pin tooltips ─────────────────────────────────────────────────────
  function dispatchTooltip(ent, x, y, pinned) {
    switch (ent._kind) {
      case 'kommune':  tipKommune(ent, x, y, pinned); break;
      case 'aircraft': tip(x, y, aircraftHTML(ent._data), pinned); break;
      case 'ship':     tip(x, y, shipHTML(ent._data), pinned); break;
      case 'sat':      tip(x, y, satHTML(ent._data), pinned); break;
      case 'wind':     tip(x, y, windHTML(ent._data), pinned); break;
      case 'port':     tip(x, y, portHTML(ent._data), pinned); break;
      case 'ferry':    tip(x, y, ferryHTML(ent._data), pinned); break;
      case 'cable':     tip(x, y, cableHTML(ent._data), pinned); break;
      case 'jamming':   tip(x, y, jammingHTML(ent._data), pinned); break;
      case 'notam':     tip(x, y, notamHTML(ent._data), pinned); break;
      case 'vejr':      tip(x, y, weatherHTML(ent._data), pinned); break;
      case 'beredskab': tip(x, y, beredskabHTML(ent._data), pinned); break;
      case 'city':      tip(x, y, cityHTML(ent._data), pinned); break;
      case 'tog':       tip(x, y, trainStationHTML(ent._data), pinned); break;
      case 'kyst':      tip(x, y, kystHTML(ent._data), pinned); break;
      case 'forsvar':   tip(x, y, forsvarHTML(ent._data), pinned); break;
      case 'politik':   tip(x, y, politikHTML(ent._data), pinned); break;
      case 'minister':  tip(x, y, ministerHTML(ent._data), pinned); break;
      case 'trafik':    tip(x, y, trafikHTML(ent._data), pinned); break;
      case 'trainpos':  tip(x, y, trainPosHTML(ent._data), pinned); break;
      case 'telecom':   tip(x, y, infraHTML(ent._data), pinned); break;
      case 'wifi':      tip(x, y, wifiHTML(ent._data), pinned); break;
      case 'datapoint': tip(x, y, dataPointHTML(ent._data), pinned); break;
    }
  }
  function onHover(pos) {
    if (_pinnedTooltip) return;  // pinned — don't overwrite
    const el = document.getElementById('dk-tooltip');
    if (!el || !_viewer) return;
    const picked = _viewer.scene.pick(pos);
    const ent = picked && picked.id;
    if (!ent || !ent._kind) { el.style.display = 'none'; return; }
    dispatchTooltip(ent, pos.x, pos.y, false);
  }
  function onHoverForce(pos, ent) {
    dispatchTooltip(ent, pos.x, pos.y, true);
  }
  function closePin() { _pinnedTooltip = false; const el = document.getElementById('dk-tooltip'); if (el) el.style.display = 'none'; }
  window.__dkClosePin = closePin;
  function pinBtn() { return `<button class="dkt-pin-close" onclick="window.__dkClosePin()" title="Luk">×</button>`; }
  function tip(x, y, html, pinned) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    el.innerHTML = (pinned ? pinBtn() : '') + html;
    el.classList.toggle('dkt-pinned', !!pinned);
    el.style.display = 'block';
    el.style.left = (x + 14) + 'px';
    el.style.top  = (y - 10) + 'px';
  }
  function infraHTML(d) {
    const RADIO_COLOR = { GSM:'#ff5030', UMTS:'#ff9920', LTE:'#3399ff', NR:'#aa44ff' };
    const RADIO_LABEL = { GSM:'2G GSM', UMTS:'3G UMTS', LTE:'4G LTE', NR:'5G NR' };
    const col = RADIO_COLOR[d.radio] || '#fff';
    return `<div class="dkt-title" style="color:${col}">📡 ${RADIO_LABEL[d.radio] || d.radio}</div>
      <div class="dkt-row"><span class="dkt-k">Operatør</span><span class="dkt-v">${d.operator}</span></div>
      <div class="dkt-row"><span class="dkt-k">Område</span><span class="dkt-v">${d.area}</span></div>
      <div class="dkt-row"><span class="dkt-k">Net-ID</span><span class="dkt-v">MCC 238 · MNC ${d.mnc}</span></div>`;
  }
  function wifiHTML(d) {
    const TYPE_COLOR = { EDUROAM:'#4488ff', DSB:'#d4af37', AIRPORT:'#00d4ff', LIBRARY:'#ff8020', YOUSEE:'#50c878', MUNICIPAL:'#aa44ff', HOSPITAL:'#ff5050' };
    const TYPE_LABEL = { EDUROAM:'Eduroam', DSB:'DSB WiFi', AIRPORT:'Lufthavn WiFi', LIBRARY:'Bibliotek WiFi', YOUSEE:'YouSee Zone', MUNICIPAL:'Kommunalt WiFi', HOSPITAL:'Sygehus WiFi' };
    const col = TYPE_COLOR[d.type] || '#fff';
    return `<div class="dkt-title" style="color:${col}">📶 ${TYPE_LABEL[d.type] || d.type}</div>
      <div class="dkt-row"><span class="dkt-k">Sted</span><span class="dkt-v">${d.name}</span></div>
      <div class="dkt-row"><span class="dkt-k">SSID</span><span class="dkt-v">${d.ssid}</span></div>`;
  }
  function aircraftHTML(ac) {
    const spdKt = ac.speed ? Math.round(ac.speed * 1.94384) : null;
    const pfx = (ac.callsign || '').trim().toUpperCase();
    const airline = AIRLINE_NAMES[pfx.substring(0,3)] || AIRLINE_NAMES[pfx.substring(0,2)] || '—';
    return `<div class="dkt-title">${ac.callsign || ac.icao24 || 'Ukendt fly'}</div>
      <div class="dkt-row"><span class="dkt-k">ICAO24</span><span class="dkt-v">${ac.icao24 || '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Flyselskab</span><span class="dkt-v">${airline}</span></div>
      <div class="dkt-row"><span class="dkt-k">Højde</span><span class="dkt-v">${ac.altitude ? Math.round(ac.altitude).toLocaleString('da-DK') + ' m' : 'jord'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Fart</span><span class="dkt-v">${spdKt != null ? spdKt + ' kt' : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kurs</span><span class="dkt-v">${ac.heading != null ? Math.round(ac.heading) + '°' : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">ADS-B · live</span></div>`;
  }
  function shipHTML(s) {
    const cog = (s.cog != null) ? Math.round(s.cog) : (s.heading != null ? Math.round(s.heading) : null);
    return `<div class="dkt-title">${s.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${s.type || 'vessel'}</span></div>
      <div class="dkt-row"><span class="dkt-k">MMSI</span><span class="dkt-v">${s.mmsi || '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Fart</span><span class="dkt-v">${s.sog != null ? s.sog.toFixed(1) + ' kn' : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kurs</span><span class="dkt-v">${cog != null ? cog + '°' : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Position</span><span class="dkt-v">${s.pos[1].toFixed(3)}°N ${s.pos[0].toFixed(3)}°E</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">AIS · live</span></div>`;
  }
  function satHTML(s) {
    const t = SAT_TYPES[s.type || 'other'];
    const col = t.c;
    return `<div class="dkt-title" style="color:rgb(${col[0]},${col[1]},${col[2]})">${s.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${t.name}</span></div>
      <div class="dkt-row"><span class="dkt-k">Højde</span><span class="dkt-v">${Math.round(s.alt)} km</span></div>
      <div class="dkt-row"><span class="dkt-k">Position</span><span class="dkt-v">${s.pos[1].toFixed(2)}°N ${s.pos[0].toFixed(2)}°E</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">TLE · live</span></div>`;
  }
  function weatherHTML(w) {
    const code = w.code ?? 0;
    const icon = code <= 2 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '🌨️' : code <= 82 ? '🌦️' : code <= 86 ? '🌨️' : '⛈️';
    const windDir = w.windDir != null ? ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(w.windDir / 22.5) % 16] : '—';
    let aqiRow = '';
    if (w.aqi != null) {
      const a = w.aqi;
      const lbl = a <= 20 ? 'God' : a <= 40 ? 'Rimelig' : a <= 60 ? 'Moderat' : a <= 80 ? 'Ringe' : a <= 100 ? 'Dårlig' : 'Meget dårlig';
      const col = a <= 20 ? '#51cf66' : a <= 40 ? '#94d82d' : a <= 60 ? '#fcc419' : a <= 80 ? '#ff922b' : '#ff6b6b';
      aqiRow = `<div class="dkt-row"><span class="dkt-k">Luftkvalitet</span><span class="dkt-v" style="color:${col}">${Math.round(a)} · ${lbl}</span></div>`;
    }
    return `<div class="dkt-title" style="color:#60c8ff">${icon} ${w.name}</div>
      <div class="dkt-row"><span class="dkt-k">Temperatur</span><span class="dkt-v">${w.temp != null ? w.temp.toFixed(1) + ' °C' : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Vind</span><span class="dkt-v">${w.wind != null ? w.wind.toFixed(1) + ' m/s fra ' + windDir : '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Nedbør</span><span class="dkt-v">${w.precip != null ? w.precip.toFixed(1) + ' mm' : '—'}</span></div>
      ${aqiRow}
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">Open-Meteo · live</span></div>`;
  }
  function beredskabHTML(b) {
    const icons = { brand: '🔥', sygehus: '🏥' };
    const relevantTopics = b.kind === 'brand'
      ? ['Kriminalitet', 'Katastrofer', 'Forsvar']
      : ['Sundhed', 'Psykiatri'];
    const recentNews = _beredskabNews.filter(n =>
      relevantTopics.includes(n.topicLabel) && n.minutesAgo != null && n.minutesAgo < 60
    ).slice(0, 3);
    const newsHTML = recentNews.length
      ? `<div class="dkt-section">Aktuelle hændelser (seneste time)</div>` +
        recentNews.map(n => `<div class="dkt-news-item">${n.minutesAgo < 10 ? '<span class="dkt-live">●</span> ' : ''}${n.title}</div>`).join('')
      : '';
    return `<div class="dkt-title" style="color:${b.kind === 'brand' ? '#ff6060' : '#60c8ff'}">${icons[b.kind] || '⚠️'} ${b.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${b.subtype || (b.kind === 'brand' ? 'Brandstation' : 'Sygehus')}</span></div>
      ${newsHTML}`;
  }

  function cityHTML(c) {
    const lat = c.pos[1], lon = c.pos[0];
    const pop = c.pop ? c.pop.toLocaleString('da-DK') : '—';
    let beredskabSection = '';
    if (_view === 'beredskab') {
      const nearBrand = BRANDSTATIONER
        .map(b => ({ ...b, km: distKm(lat, lon, b.lat, b.lon) }))
        .filter(b => b.km < 25)
        .sort((a, b) => a.km - b.km)
        .slice(0, 3);
      const nearSygehus = SYGEHUSE
        .map(h => ({ ...h, km: distKm(lat, lon, h.lat, h.lon) }))
        .filter(h => h.km < 40)
        .sort((a, b) => a.km - b.km)
        .slice(0, 3);
      const brandRows = nearBrand.map(b =>
        `<div class="dkt-row"><span class="dkt-k" style="color:#ff9060">🔥</span><span class="dkt-v">${b.name} <em>(${b.km.toFixed(1)} km)</em></span></div>`
      ).join('');
      const sygehusRows = nearSygehus.map(h =>
        `<div class="dkt-row"><span class="dkt-k" style="color:#60c8ff">🏥</span><span class="dkt-v">${h.name} <em>(${h.km.toFixed(1)} km)</em></span></div>`
      ).join('');
      if (brandRows || sygehusRows) {
        beredskabSection = `<div class="dkt-section">Beredskab i nærheden</div>${brandRows}${sygehusRows}`;
      }
      const recentNews = _beredskabNews.filter(n => n.minutesAgo != null && n.minutesAgo < 60).slice(0, 3);
      if (recentNews.length) {
        beredskabSection += `<div class="dkt-section">Aktuelle hændelser</div>` +
          recentNews.map(n => `<div class="dkt-news-item">${n.minutesAgo < 10 ? '<span class="dkt-live">●</span> ' : ''}${n.title}</div>`).join('');
      }
    }
    return `<div class="dkt-title" style="color:#d4af37">● ${c.name}</div>
      <div class="dkt-row"><span class="dkt-k">Befolkning</span><span class="dkt-v">${pop}</span></div>
      ${beredskabSection}`;
  }

  async function fetchBeredskabNews() {
    const now = Date.now();
    if (now - _beredskabNewsFetch < 5 * 60 * 1000) return;
    _beredskabNewsFetch = now;
    try {
      const res = await fetch('/api/news?limit=40');
      if (!res.ok) return;
      const data = await res.json();
      _beredskabNews = (data.items || data || []).filter(n => n.minutesAgo != null && n.minutesAgo < 60);
    } catch (_) {}
  }
  function trainStationHTML(s) {
    const deps = _togDepartures[s.stationId] || [];
    const typeLabel = s.type === 'ic' ? 'IC / Intercity' : 'Regionaltog / S-Tog';
    const depRows = deps.length
      ? deps.slice(0, 5).map(d => {
          const delay = d.delayMin > 0 ? ` <span style="color:#ff8060">+${d.delayMin}m</span>` : '';
          const cancelled = d.cancelled ? ' <span style="color:#ff4040">AFLYST</span>' : '';
          return `<div class="dkt-row">
            <span class="dkt-k">${d.time}${delay}${cancelled}</span>
            <span class="dkt-v">${d.direction} <em style="color:rgba(255,255,255,0.45)">${d.name}</em></span>
          </div>`;
        }).join('')
      : `<div class="dkt-row"><span class="dkt-k" style="color:rgba(255,255,255,0.4)">Ingen live-data</span></div>`;
    return `<div class="dkt-title" style="color:#64b4ff">🚆 ${s.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${typeLabel}</span></div>
      <div class="dkt-section">Næste afgange</div>
      ${depRows}`;
  }

  async function fetchTog() {
    try {
      const r = await fetch('/api/tog/departures', { signal: AbortSignal.timeout(12000) });
      if (!r.ok) return;
      const data = await r.json();
      _togDepartures = {};
      (data.stations || []).forEach(s => { _togDepartures[s.stationId] = s.departures || []; });
      _togFetched = Date.now();
    } catch {}
  }

  async function fetchGridFreq() {
    try {
      const r = await fetch('/api/energi/frequency', { signal: AbortSignal.timeout(6000) });
      if (!r.ok) return;
      _gridFreq = await r.json();
      renderGridFreq();
    } catch {}
  }

  function renderGridFreq() {
    const el = document.getElementById('dk-gridfreq');
    if (!el || !_gridFreq) return;
    const hz = _gridFreq.frequency;
    const imb = _gridFreq.imbalance;
    if (hz == null) { el.style.display = 'none'; return; }
    const dev = Math.abs(hz - 50.0);
    const col = dev < 0.05 ? '#3ddc97' : dev < 0.1 ? '#ffc800' : '#ff6060';
    const imbStr = imb != null ? (imb > 0 ? `+${Math.round(imb)}` : `${Math.round(imb)}`) + ' MW' : '';
    el.style.display = '';
    el.innerHTML = `<span class="dk-power-dot" style="background:${col}"></span>⚡ FREKVENS · `
      + `<b style="color:${col}">${hz.toFixed(3)} Hz</b>`
      + (imbStr ? ` · ⇅ ${imbStr}` : '');
  }

  async function fetchExchangeRates() {
    try {
      const r = await fetch('/api/nationalbank/rates', { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return;
      _exchangeRates = await r.json();
    } catch {}
  }

  async function fetchKystData() {
    try {
      const r = await fetch('/api/kyst/vandstand', { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return;
      const data = await r.json();
      _kystStations = data.stations || [];
      syncKystEntities();
    } catch {}
  }

  function syncKystEntities() {
    if (!_viewer) return;
    const showKyst = _view === 'vejr';
    const seen = new Set();
    _kystStations.forEach(s => {
      const key = s.id || s.name;
      seen.add(key);
      const level = s.level ?? 0;
      const storm = level > 100 ? '#ff4040' : level > 60 ? '#ffc800' : level > 20 ? '#60c8ff' : '#80e0ff';
      const label = `${level > 0 ? '+' : ''}${Math.round(level)} cm`;
      if (!_kystEnt.has(key)) {
        const e = _viewer.entities.add({
          position: deg(s.lon, s.lat, 500),
          point: {
            pixelSize: 9, color: Cesium.Color.fromCssColorString(storm),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.5), outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: label, font: 'bold 10px "Courier New", monospace',
            fillColor: Cesium.Color.fromCssColorString(storm),
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            translucencyByDistance: new Cesium.NearFarScalar(4e5, 1.0, 2e6, 0.0),
          },
          _layer: 'vejr', _kind: 'kyst', _data: s, show: showKyst,
        });
        _kystEnt.set(key, e);
      } else {
        const e = _kystEnt.get(key);
        e.show = showKyst;
        e._data = s;
        if (e.label) e.label.text = label;
        if (e.point) e.point.color = Cesium.Color.fromCssColorString(storm);
      }
    });
    for (const [k, e] of _kystEnt) {
      if (!seen.has(k)) { _viewer.entities.remove(e); _kystEnt.delete(k); }
    }
  }

  function kystHTML(s) {
    const level = s.level ?? 0;
    const risk = level > 100 ? '⚠ Stormflod' : level > 60 ? '⚠ Forhøjet' : '✓ Normal';
    const col = level > 100 ? '#ff4040' : level > 60 ? '#ffc800' : '#60c8ff';
    return `<div class="dkt-title" style="color:${col}">〜 ${s.name}</div>
      <div class="dkt-row"><span class="dkt-k">Vandstand</span><span class="dkt-v" style="color:${col}">${level > 0 ? '+' : ''}${Math.round(level)} cm (DVR90)</span></div>
      <div class="dkt-row"><span class="dkt-k">Status</span><span class="dkt-v" style="color:${col}">${risk}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">Kystdirektoratet · live</span></div>`;
  }

  function forsvarHTML(b) {
    const branchLabel = { luftvåben: '✈ Flyvevåbnet', søværnet: '⚓ Søværnet', hæren: '🛡 Hæren', fælles: '★ Fælles kommando' }[b.branch] || b.branch;
    const col = b.branch === 'luftvåben' ? '#3cb4ff'
              : b.branch === 'søværnet'  ? '#50e6c8'
              : b.branch === 'fælles'    ? '#e6b43c'
              :                           '#b45050';
    const countryLabel = { DK: 'Danmark', GL: 'Grønland', FO: 'Færøerne' }[b.country] || b.country;
    return `<div class="dkt-title" style="color:${col}">🛡 ${b.name}</div>
      <div class="dkt-row"><span class="dkt-k">Afdeling</span><span class="dkt-v" style="color:${col}">${branchLabel}</span></div>
      <div class="dkt-row"><span class="dkt-k">Enhed / rolle</span><span class="dkt-v">${b.unit}</span></div>
      <div class="dkt-row"><span class="dkt-k">Land</span><span class="dkt-v">${countryLabel}</span></div>
      <div class="dkt-row"><span class="dkt-k">Position</span><span class="dkt-v">${b.pos[1].toFixed(3)}°N ${b.pos[0].toFixed(3)}°E</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">forsvaret.dk · offentligt</span></div>`;
  }

  function politikHTML(m) {
    const rgb = PARTY_COLORS_RGB[m.party] || [212, 175, 55];
    const col = m.type === 'parliament' ? '#d4af37' : `rgb(${rgb.join(',')})`;
    const icon = m.type === 'parliament' ? '🏛' : '🏢';
    const act = _politikActivity;
    let actHtml = '';
    if (act && m.type === 'parliament') {
      const latest = act.votes[0];
      if (latest) {
        const d = new Date(latest.dato);
        const age = Math.round((Date.now() - d) / 3600000);
        actHtml = `<div class="dkt-row"><span class="dkt-k">Seneste afstemning</span><span class="dkt-v">${latest.titel?.slice(0,50) || '—'}… (${age < 24 ? age+'t' : Math.floor(age/24)+'d'} siden)</span></div>`;
      }
    }
    const xHandle = m.minister ? POLITICIAN_X_HANDLES[m.minister] : null;
    const xRow = xHandle ? `<div class="dkt-row"><span class="dkt-k">X / Twitter</span><span class="dkt-v">@${xHandle}</span></div>` : '';
    return `<div class="dkt-title" style="color:${col}">${icon} ${m.name}</div>
      ${m.minister ? `<div class="dkt-row"><span class="dkt-k">Minister</span><span class="dkt-v" style="color:${col}">${m.minister}</span></div>` : ''}
      ${m.party ? `<div class="dkt-row"><span class="dkt-k">Parti</span><span class="dkt-v">${m.party}</span></div>` : ''}
      ${xRow}
      ${actHtml}
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">ft.dk · Statsministeriet</span></div>`;
  }

  const POLITICIAN_X_HANDLES = {
    'Mette Frederiksen': 'mettefrederiksen', 'Lars Løkke Rasmussen': 'larsloekke',
    'Nicolai Wammen': 'nicolaiwammen',       'Peter Hummelgaard': 'phummelgaard',
    'Magnus Heunicke': 'magnusheunicke',     'Sophie Løhde': 'sophieloehde',
    'Troels Lund Poulsen': 'troelslundp',    'Mattias Tesfaye': 'mattias_tesfaye',
    'Jeppe Bruus': 'jeppebruus',             'Christina Egelund': 'cegelund',
    'Kaare Dybvad Bek': 'kaarebek',          'Lars Aagaard': 'lars_aagaard_dk',
    'Thomas Danielsen': 'thomasd_dk',
  };

  function ministerHTML(m) {
    const col = m.color || '#888';
    const partiLabel = { A:'Socialdemokratiet', V:'Venstre', M:'Moderaterne', I:'Liberal Alliance', D:'Danmarksdemokraterne', F:'SF', Ø:'Enhedslisten', C:'Konservative', B:'Radikale', O:'Dansk Folkeparti', Å:'Alternativet' }[m.parti] || m.parti;
    const act = _politikActivity;
    let latestSpeech = '';
    if (act?.speeches?.length) {
      const mine = act.speeches.find(s => s.taler && m.navn && s.taler.includes(m.navn.split(' ')[1]));
      if (mine) {
        const d = new Date(mine.dato);
        const age = Math.round((Date.now() - d) / 3600000);
        latestSpeech = `<div class="dkt-row"><span class="dkt-k">Seneste tale</span><span class="dkt-v">${age < 24 ? age + 't siden' : Math.floor(age / 24) + 'd siden'}</span></div>`;
      }
    }
    const xRow = m.x ? `<div class="dkt-row"><span class="dkt-k">X / Twitter</span><span class="dkt-v"><a href="https://x.com/${m.x}" target="_blank" rel="noopener" style="color:${col}">@${m.x}</a></span></div>` : '';
    return `<div class="dkt-title" style="color:${col}">👤 ${m.navn}</div>
      <div class="dkt-row"><span class="dkt-k">Titel</span><span class="dkt-v" style="color:${col}">${m.title}</span></div>
      <div class="dkt-row"><span class="dkt-k">Parti</span><span class="dkt-v"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:4px"></span>${m.parti} — ${partiLabel}</span></div>
      <div class="dkt-row"><span class="dkt-k">Valgkreds</span><span class="dkt-v">${m.storkreds}</span></div>
      ${xRow}${latestSpeech}
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">Statsministeriet · ft.dk</span></div>`;
  }

  async function fetchPolitikActivity() {
    try {
      const data = await fetch('/api/politiker/activity').then(r => r.json());
      _politikActivity = data;
    } catch (e) { console.warn('[politik] activity fetch failed', e); }
  }

  async function fetchPolitikMinistere() {
    if (_politikMinFetched) return;
    _politikMinFetched = true;
    try {
      const data = await fetch('/api/politiker/ministers').then(r => r.json());
      syncPolitikMinistere(data.ministers || []);
    } catch (e) { console.warn('[politik] ministers fetch failed', e); }
  }

  function syncPolitikMinistere(ministers) {
    const show = (_view === 'politik');
    ministers.forEach(m => {
      if (_politikMinEnt.has(m.id)) return;
      const rgb = hexToRgb(m.color);
      const e = _viewer.entities.add({
        position: deg(m.pos[0], m.pos[1]),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromBytes(rgb[0], rgb[1], rgb[2], 245),
          outlineColor: Cesium.Color.fromBytes(255, 255, 255, 200),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: m.navn.split(' ').pop(),
          font: '600 9px "Courier New", monospace',
          fillColor: Cesium.Color.fromBytes(rgb[0], rgb[1], rgb[2], 220),
          style: Cesium.LabelStyle.FILL,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          scaleByDistance: new Cesium.NearFarScalar(3.0e5, 1.0, 2.0e6, 0.3),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        _layer: 'politik', _kind: 'minister', _data: m, show,
      });
      _politikMinEnt.set(m.id, e);
    });
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  async function fetchTrafikEvents() {
    try {
      const data = await fetch('/api/trafik/events').then(r => r.json());
      _trafikEvents = data.events || [];
      syncTrafikEntities();
    } catch (e) { console.warn('[trafik] events fetch failed', e); }
  }

  function syncTrafikEntities() {
    if (!_viewer) return;
    const ents = _viewer.entities;
    const seen = new Set();
    const show = _view === 'trafik' || _view === 'tog';
    _trafikEvents.forEach(ev => {
      if (!ev.pos) return;
      seen.add(ev.id);
      if (!_trafikEnt.has(ev.id)) {
        const col = ev.type === 'congestion' ? [255, 80, 30] : ev.type === 'accident' ? [255, 40, 40] : [255, 200, 40];
        const e = ents.add({
          position: deg(ev.pos[0], ev.pos[1]),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromBytes(col[0], col[1], col[2], 220),
            outlineColor: Cesium.Color.fromBytes(255, 255, 255, 160),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          _layer: 'trafik', _kind: 'trafik', _data: ev, show,
        });
        _trafikEnt.set(ev.id, e);
      } else {
        _trafikEnt.get(ev.id).show = show;
      }
    });
    for (const [k, e] of _trafikEnt) { if (!seen.has(k)) { ents.remove(e); _trafikEnt.delete(k); } }
  }

  async function fetchTrainPositions() {
    try {
      const data = await fetch('/api/tog/positions').then(r => r.json());
      _trainPositions = data.trains || [];
      syncTrainPosEntities();
    } catch (e) { console.warn('[tog] positions fetch failed', e); }
  }

  function syncTrainPosEntities() {
    if (!_viewer) return;
    const ents = _viewer.entities;
    const seen = new Set();
    const show = _view === 'trafik' || _view === 'tog';
    _trainPositions.forEach(tr => {
      if (!tr.pos) return;
      seen.add(tr.id);
      const isIC = tr.type === 'IC' || tr.type === 'Lyn';
      const col = tr.cancelled ? [200, 50, 50] : tr.delayMin > 5 ? [255, 160, 30] : isIC ? [60, 200, 255] : [120, 200, 120];
      if (!_trainPosEnt.has(tr.id)) {
        const e = ents.add({
          position: new Cesium.CallbackProperty(() => tr.pos ? deg(tr.pos[0], tr.pos[1], 0) : undefined, false),
          point: {
            pixelSize: isIC ? 10 : 7,
            color: Cesium.Color.fromBytes(col[0], col[1], col[2], 240),
            outlineColor: Cesium.Color.fromBytes(255, 255, 255, 200),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: tr.name || '🚄',
            font: '700 9px "Courier New", monospace',
            fillColor: Cesium.Color.fromBytes(col[0], col[1], col[2], 220),
            style: Cesium.LabelStyle.FILL,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            scaleByDistance: new Cesium.NearFarScalar(5e4, 1.1, 8e5, 0.3),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          _kind: 'trainpos', _data: tr, show,
        });
        _trainPosEnt.set(tr.id, e);
      } else {
        const e = _trainPosEnt.get(tr.id);
        e._data = tr;
        e.show = show;
      }
    });
    for (const [k, e] of _trainPosEnt) { if (!seen.has(k)) { ents.remove(e); _trainPosEnt.delete(k); } }
  }

  async function fetchAndBuildInfra() {
    _infraLoaded = true; // prevent double-fetch
    if (!_viewer) { _infraLoaded = false; return; }
    try {
      const d = await fetch('/api/telecom/masts').then(r => r.json());
      const towers = d.towers || [];
      if (_infraPoints) { try { _viewer.scene.primitives.remove(_infraPoints); } catch (_) {} }
      _infraPoints = new Cesium.PointPrimitiveCollection();
      const COLORS = {
        GSM:  Cesium.Color.fromBytes(255, 76, 51, 230),
        UMTS: Cesium.Color.fromBytes(255, 153, 26, 230),
        LTE:  Cesium.Color.fromBytes(51, 153, 255, 230),
        NR:   Cesium.Color.fromBytes(170, 68, 255, 235),
      };
      const SIZES = { GSM: 4, UMTS: 4.5, LTE: 5, NR: 7 };
      for (const t of towers) {
        _infraPoints.add({
          position: Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 60),
          color: COLORS[t.radio] || Cesium.Color.WHITE,
          pixelSize: SIZES[t.radio] || 5,
          outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          id: { _kind: 'telecom', _data: t },
        });
      }
      _viewer.scene.primitives.add(_infraPoints);
      _infraPoints.show = (_view === 'infra');
    } catch (e) {
      console.warn('[infra] fetch failed', e);
      _infraLoaded = false;
    }
  }

  async function fetchAndBuildWifi() {
    _wifiLoaded = true;
    if (!_viewer) { _wifiLoaded = false; return; }
    try {
      const d = await fetch('/api/wifi/hotspots').then(r => r.json());
      const spots = d.hotspots || [];
      if (_wifiPoints) { try { _viewer.scene.primitives.remove(_wifiPoints); } catch (_) {} }
      _wifiPoints = new Cesium.PointPrimitiveCollection();
      const COLORS = {
        EDUROAM:   Cesium.Color.fromBytes(68, 136, 255, 242),
        DSB:       Cesium.Color.fromBytes(212, 175, 55, 242),
        AIRPORT:   Cesium.Color.fromBytes(0, 212, 255, 242),
        LIBRARY:   Cesium.Color.fromBytes(255, 128, 32, 242),
        YOUSEE:    Cesium.Color.fromBytes(80, 200, 120, 242),
        MUNICIPAL: Cesium.Color.fromBytes(170, 68, 255, 242),
        HOSPITAL:  Cesium.Color.fromBytes(255, 80, 80, 242),
      };
      for (const s of spots) {
        _wifiPoints.add({
          position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 90),
          color: COLORS[s.type] || Cesium.Color.WHITE,
          pixelSize: 8,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          id: { _kind: 'wifi', _data: s },
        });
      }
      _viewer.scene.primitives.add(_wifiPoints);
      _wifiPoints.show = (_view === 'infra');
    } catch (e) {
      console.warn('[wifi] fetch failed', e);
      _wifiLoaded = false;
    }
  }

  // Generic /points layer loader — builds a PointPrimitiveCollection from any
  // endpoint returning { points: [{ lat, lon, color:[r,g,b], size, tip }] }.
  async function loadPointLayer(name, endpoint, visible) {
    if (!_viewer) return;
    let L = _pointLayers[name];
    if (L && L.loaded) { if (L.coll) L.coll.show = visible; return; }
    _pointLayers[name] = L = { coll: null, loaded: true };
    try {
      const d = await fetch(endpoint).then(r => r.json());
      const pts = d.points || [];
      const coll = new Cesium.PointPrimitiveCollection();
      for (const p of pts) {
        const c = p.color || [255, 255, 255];
        coll.add({
          position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 120),
          color: Cesium.Color.fromBytes(c[0], c[1], c[2], 235),
          pixelSize: p.size || 8,
          outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          id: { _kind: 'datapoint', _data: p },
        });
      }
      _viewer.scene.primitives.add(coll);
      coll.show = visible;
      L.coll = coll;
    } catch (e) {
      console.warn('[points] load failed', name, e);
      L.loaded = false;
    }
  }
  function showPointLayer(name, visible) {
    const L = _pointLayers[name];
    if (L && L.coll) L.coll.show = visible;
  }
  function dataPointHTML(d) {
    const t = d.tip || {};
    const rows = (t.rows || []).map(r => `<div class="dkt-row"><span class="dkt-k">${r[0]}</span><span class="dkt-v">${r[1]}</span></div>`).join('');
    return `<div class="dkt-title">${t.title || 'Datapunkt'}</div>${rows}`;
  }

  function trafikHTML(ev) {
    const typeLabel = { congestion: '🚦 Kø', accident: '💥 Uheld', roadworks: '🚧 Vejarbejde', info: 'ℹ Info' }[ev.type] || ev.type;
    const col = ev.type === 'congestion' ? '#ff5020' : ev.type === 'accident' ? '#ff2828' : '#ffc828';
    return `<div class="dkt-title" style="color:${col}">${typeLabel}: ${ev.road || ev.name}</div>
      ${ev.description ? `<div class="dkt-row"><span class="dkt-k">Info</span><span class="dkt-v">${ev.description}</span></div>` : ''}
      ${ev.isFallback ? `<div class="dkt-row"><span class="dkt-k">Data</span><span class="dkt-v" style="color:#888">Statisk (sæt VDAPI_KEY for live)</span></div>` : ''}
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">Vejdirektoratet</span></div>`;
  }

  function trainPosHTML(tr) {
    const delayCol = tr.delayMin > 10 ? '#ff4040' : tr.delayMin > 2 ? '#ffc820' : '#60e080';
    const delayStr = tr.cancelled ? '❌ Aflyst' : tr.delayMin > 0 ? `+${tr.delayMin} min forsinket` : 'Til tiden';
    return `<div class="dkt-title" style="color:#64b4ff">🚄 ${tr.name || 'Tog'}</div>
      <div class="dkt-row"><span class="dkt-k">Fra</span><span class="dkt-v">${tr.from || '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Mod</span><span class="dkt-v">${tr.to || '—'}</span></div>
      <div class="dkt-row"><span class="dkt-k">Status</span><span class="dkt-v" style="color:${delayCol}">${delayStr}</span></div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">Rejseplanen (estimeret)</span></div>`;
  }

  function windHTML(w) {
    return `<div class="dkt-title" style="color:#60dc80">⚡ ${w.name}</div>
      <div class="dkt-row"><span class="dkt-k">Kapacitet</span><span class="dkt-v">${w.mw} MW</span></div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">Havvind (offshore)</span></div>`;
  }
  function portHTML(p) {
    const typeLabels = { container:'Container', oil:'Olie/gas', offshore:'Offshore service', ferry:'Færgehavn', bulk:'Bulk' };
    const nearby = _ships.filter(s => { const dx = s.pos[0] - p.pos[0], dy = s.pos[1] - p.pos[1]; return Math.sqrt(dx*dx + dy*dy) < 0.15; }).length;
    return `<div class="dkt-title" style="color:#ffd060">⚓ ${p.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${typeLabels[p.type] || p.type}</span></div>
      ${nearby ? `<div class="dkt-row"><span class="dkt-k">AIS i nærheden</span><span class="dkt-v">${nearby} fartøjer</span></div>` : ''}`;
  }
  function ferryHTML(f) {
    return `<div class="dkt-title" style="color:#a0c8ff">⛴ ${f.name}</div>
      <div class="dkt-row"><span class="dkt-k">Operatør</span><span class="dkt-v">${f.op}</span></div>`;
  }
  function cableHTML(c) {
    const typeLabel = { power: 'Elkabel (HVDC)', gas: 'Gasrørledning' }[c.type] || c.type;
    const cap = c.capacity ? (c.type === 'gas' ? `${c.capacity} mia. m³/år` : `${c.capacity} MW`) : null;
    return `<div class="dkt-title" style="color:rgb(${c.color.join(',')})">▬ ${c.name}</div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${typeLabel}</span></div>
      ${c.from ? `<div class="dkt-row"><span class="dkt-k">Forbinder</span><span class="dkt-v">${c.from} ↔ ${c.to}</span></div>` : ''}
      ${cap ? `<div class="dkt-row"><span class="dkt-k">Kapacitet</span><span class="dkt-v">${cap}</span></div>` : ''}
      ${c.note ? `<div class="dkt-row"><span class="dkt-k">Info</span><span class="dkt-v">${c.note}</span></div>` : ''}`;
  }
  function jammingHTML(j) {
    return `<div class="dkt-title" style="color:#ff4014">⚠ GPS JAMMING</div>
      <div class="dkt-row"><span class="dkt-k">Kilde</span><span class="dkt-v">${j.name}</span></div>
      <div class="dkt-row"><span class="dkt-k">Radius</span><span class="dkt-v">~${j.radius} km</span></div>
      <div class="dkt-row"><span class="dkt-k">Intensitet</span><span class="dkt-v">${Math.round(j.intensity * 100)}%</span></div>`;
  }
  function notamHTML(n) {
    const typeLabel = { military: 'Militær', restricted: 'Begrænset', tma: 'TMA' }[n.type] || n.type;
    return `<div class="dkt-title" style="color:#ffc800">NOTAM ${n.id}</div>
      <div class="dkt-row"><span class="dkt-k">Navn</span><span class="dkt-v">${n.name}</span></div>
      <div class="dkt-row"><span class="dkt-k">Type</span><span class="dkt-v">${typeLabel}</span></div>
      <div class="dkt-row"><span class="dkt-k">Radius</span><span class="dkt-v">${n.radius} nm</span></div>`;
  }
  function tipKommune(ent, x, y, pinned) {
    const el = document.getElementById('dk-tooltip');
    if (!el) return;
    const name = ent._name;
    const kd = ent._kd;
    if (!name) { el.style.display = 'none'; return; }
    let rows = '';
    if (kd) {
      Object.entries(METRICS).forEach(([k, m]) => {
        const v = kd[k];
        if (v == null) return;
        const t = normalise(v, k);
        const bc = colorForValue(t, m.goodHigh);
        const barW = Math.round(t * 56);
        const active = k === _metric ? ' dkt-row-active' : '';
        const destPanel = JSON.stringify(METRIC_PANELS[k] || 'kommuner');
        rows += `<div class="dkt-row${active}" style="cursor:pointer" title="Gå til ${m.label}" onclick="(function(){var p=${destPanel};if(window.__navigateFromMap)window.__navigateFromMap(p);else if(window.__mkClick)window.__mkClick(p);})()">
          <span class="dkt-k">${m.label}</span>
          <span class="dkt-v">${m.format(v)}</span>
          <div class="dkt-bar" style="width:${barW}px;background:rgb(${bc[0]},${bc[1]},${bc[2]})"></div>
          <span class="dkt-link-arrow">›</span>
        </div>`;
      });
    }
    el.innerHTML = (pinned ? pinBtn() : '') + `<div class="dkt-title">${name}</div>${rows}
      <div class="dkt-footer"><button class="dkt-goto" onclick="if(window.__navigateFromMap)window.__navigateFromMap('kommuner');else window.__mkClick&&window.__mkClick('kommuner')">Se alle kommuner →</button></div>`;
    el.classList.toggle('dkt-pinned', !!pinned);
    el.style.display = 'block';
    el.style.left = (x + 14) + 'px';
    el.style.top  = (y - 10) + 'px';
  }

  // ── Dataportal navigation ─────────────────────────────────────────────────
  function navigateFromMap(panelId) {
    const wrap = document.getElementById('dk-wrap');
    if (wrap) {
      wrap.style.transition = 'opacity 0.35s ease';
      wrap.style.opacity = '0';
      document.body.classList.add('dk-portal-transition');
      setTimeout(() => {
        if (window.__mkClick) window.__mkClick(panelId);
        wrap.style.opacity = '';
        wrap.style.transition = '';
        setTimeout(() => document.body.classList.remove('dk-portal-transition'), 800);
      }, 360);
    } else if (window.__mkClick) {
      window.__mkClick(panelId);
    }
  }
  window.__navigateFromMap = navigateFromMap;

  function updateDataPortal(view) {
    const el = document.getElementById('dk-portal-items');
    if (!el) return;
    const links = VIEW_DATA_LINKS[view] || [];
    el.innerHTML = links.map(link => {
      const stat = link.stat();
      return `<button class="dk-portal-item" data-panel="${link.panel}">
        <span class="dk-portal-icon">${link.icon}</span>
        <span class="dk-portal-label">${link.label}</span>
        ${stat ? `<span class="dk-portal-stat">${stat}</span>` : ''}
        <span class="dk-portal-arrow">→</span>
      </button>`;
    }).join('');
    el.querySelectorAll('.dk-portal-item').forEach(btn => {
      btn.addEventListener('click', () => navigateFromMap(btn.dataset.panel));
    });
  }

  // ── Aircraft / ship fetch ────────────────────────────────────────────────────
  function parseStates(states) {
    return (states || [])
      .filter(s => s && s[5] != null && s[6] != null)
      .map(s => ({
        icao24:   s[0] || '',
        callsign: (s[1] || '').trim(),
        origin:   s[2] || '—',
        pos:      [s[5], s[6]],
        altitude: s[7] || s[13] || 0,
        speed:    s[9] || 0,
        heading:  s[10] || 0,
      }));
  }
  function mergeContacts(current, incoming, key, lerpDur) {
    const map = new Map(current.map(c => [c[key], c]));
    const now = performance.now();
    return incoming.map(n => {
      const prev = map.get(n[key]);
      if (!prev) return n;
      const oldPos = prev.pos ? [prev.pos[0], prev.pos[1]] : null;
      Object.assign(prev, n);
      if (oldPos && n.pos) {
        const dx = n.pos[0] - oldPos[0], dy = n.pos[1] - oldPos[1];
        if (dx*dx + dy*dy > 0.00005 * 0.00005) {
          // Glide from where it's drawn now to the new fix over the whole
          // refresh interval, so motion stays continuous between updates.
          prev._lerpFrom  = oldPos;
          prev._lerpTo    = [n.pos[0], n.pos[1]];
          prev._lerpStart = now;
          prev._lerpDur   = lerpDur || LERP_MS;
        }
      }
      return prev;
    });
  }
  async function fetchAircraft() {
    if (_aircraftRetryTimer) return;
    try {
      const r = await fetch(OPENSKY_URL, { signal: AbortSignal.timeout(9000) });
      if (r.ok) {
        const d = await r.json();
        const live = parseStates(d && d.states);
        _aircraft = mergeContacts(_aircraft, live, 'icao24', AIRCRAFT_REFRESH_MS);
        _aircraftStatus = live.length ? 'live' : (d.source === 'none' ? 'unavailable' : 'empty');
        _aircraftRetryDelay = 0;
        syncAircraftEntities();
      } else if (r.status === 503 || r.status === 502) {
        if (!_aircraft.length) _aircraftStatus = 'koldstart';
        _aircraftRetryDelay = _aircraftRetryDelay ? Math.min(_aircraftRetryDelay * 2, 30000) : 6000;
        _aircraftRetryTimer = setTimeout(() => { _aircraftRetryTimer = null; fetchAircraft(); }, _aircraftRetryDelay);
      } else {
        _aircraftStatus = 'unavailable';
      }
    } catch { _aircraftStatus = 'unavailable'; }
    updateStats();
  }
  async function fetchShips() {
    if (_shipRetryTimer) return;
    try {
      const r = await fetch(AIS_URL, { signal: AbortSignal.timeout(9000) });
      if (r.ok) {
        const d = await r.json();
        const live = (d.vessels || []).filter(v => v.pos && v.pos.length === 2);
        _ships = mergeContacts(_ships, live, 'mmsi', SHIP_REFRESH_MS);
        _aisStatus = d.status || (live.length ? 'live' : 'empty');
        _shipRetryDelay = 0;
        syncShipEntities();
      } else if (r.status === 503 || r.status === 502) {
        if (!_ships.length) _aisStatus = 'koldstart';
        _shipRetryDelay = _shipRetryDelay ? Math.min(_shipRetryDelay * 2, 30000) : 6000;
        _shipRetryTimer = setTimeout(() => { _shipRetryTimer = null; fetchShips(); }, _shipRetryDelay);
      } else {
        _aisStatus = 'unavailable';
      }
    } catch { _aisStatus = 'unavailable'; }
    updateStats();
  }

  // Live electricity production (Energinet via /api/energi). Shown as a small
  // always-on read-out in the HUD — real-time data, no extra menu.
  async function fetchPower() {
    try {
      const r = await fetch('/api/energi/current', { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return;
      _power = await r.json();
      renderPower();
    } catch { /* non-critical */ }
  }
  function renderPower() {
    const el = document.getElementById('dk-power');
    if (!el || !_power) return;
    const mw = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + ' GW' : Math.round(v) + ' MW');
    const wind = (_power.wind_onshore || 0) + (_power.wind_offshore || 0);
    const flow = _power.exchange > 0 ? `eksport ${mw(_power.exchange)}` : `import ${mw(Math.abs(_power.exchange || 0))}`;
    el.innerHTML = `<span class="dk-power-dot"></span>⚡ STRØM NU · `
      + `<b>${_power.renewablePct ?? '–'}%</b> grøn · `
      + `🌬 ${mw(wind)} · ☀ ${mw(_power.solar || 0)} · `
      + `${flow}`;
  }

  async function fetchWeather() {
    const lats = WEATHER_STATIONS.map(s => s.lat).join(',');
    const lons = WEATHER_STATIONS.map(s => s.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,windspeed_10m,winddirection_10m,weathercode,precipitation&wind_speed_unit=ms&timezone=auto`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return;
      const data = await r.json();
      const list = Array.isArray(data) ? data : [data];
      _weather = WEATHER_STATIONS.map((s, i) => ({
        name: s.name, lat: s.lat, lon: s.lon,
        temp:    list[i]?.current?.temperature_2m     ?? null,
        wind:    list[i]?.current?.windspeed_10m      ?? null,
        windDir: list[i]?.current?.winddirection_10m  ?? null,
        code:    list[i]?.current?.weathercode        ?? 0,
        precip:  list[i]?.current?.precipitation      ?? null,
      }));
      syncWeatherEntities();
      fetchAirQuality();   // enrich with live European AQI (separate endpoint)
    } catch {}
  }

  // Live air quality (European AQI) from Open-Meteo — free, no key. Merged
  // into _weather so it shows in the weather tooltip.
  async function fetchAirQuality() {
    if (!_weather.length) return;
    const lats = _weather.map(s => s.lat).join(',');
    const lons = _weather.map(s => s.lon).join(',');
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=european_aqi&timezone=auto`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return;
      const data = await r.json();
      const list = Array.isArray(data) ? data : [data];
      _weather.forEach((w, i) => { w.aqi = list[i]?.current?.european_aqi ?? null; });
    } catch {}
  }

  function tempColor(t) {
    if (t == null) return [160, 160, 160];
    if (t <= -10) return [80,  80,  220];
    if (t <=   0) return [100, 160, 255];
    if (t <=  10) return [100, 220, 255];
    if (t <=  20) return [100, 255, 180];
    if (t <=  28) return [255, 220,  60];
    return [255, 80, 40];
  }

  function syncWeatherEntities() {
    if (!_viewer) return;
    const ents = _viewer.entities;
    const showVejr = _view === 'vejr';
    const seen = new Set();
    _weather.forEach(w => {
      seen.add(w.name);
      const code = w.code ?? 0;
      const icon = code <= 2 ? '☀' : code <= 3 ? '⛅' : code <= 48 ? '≋' : code <= 67 ? '☂' : code <= 77 ? '❄' : code <= 82 ? '⛆' : '⚡';
      const [r, g, b] = tempColor(w.temp);
      const label = w.temp != null ? `${icon} ${w.temp > 0 ? '+' : ''}${w.temp.toFixed(0)}°` : icon;
      if (!_weatherEnt.has(w.name)) {
        const e = ents.add({
          position: deg(w.lon, w.lat, 800),
          point: {
            pixelSize: 10, color: Cesium.Color.fromBytes(r, g, b, 220),
            outlineColor: Cesium.Color.fromBytes(255, 255, 255, 160), outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: label, font: 'bold 13px "Courier New", monospace',
            fillColor: Cesium.Color.fromBytes(r, g, b, 255),
            outlineColor: Cesium.Color.BLACK, outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            translucencyByDistance: new Cesium.NearFarScalar(5e5, 1.0, 3e6, 0.0),
          },
          _kind: 'vejr', _data: w, _layer: 'vejr',
        });
        e.show = showVejr;
        _weatherEnt.set(w.name, e);
      } else {
        const e = _weatherEnt.get(w.name);
        e.show = showVejr;
        e._data = w;
        if (e.label) e.label.text = label;
        if (e.point) e.point.color = Cesium.Color.fromBytes(r, g, b, 220);
        if (e.label) e.label.fillColor = Cesium.Color.fromBytes(r, g, b, 255);
      }
    });
    for (const [k, e] of _weatherEnt) if (!seen.has(k)) { ents.remove(e); _weatherEnt.delete(k); }

    // Wind-field arrows: one per station, pointing the way the wind blows TO
    // (meteorological direction + 180°), length/colour by speed.
    _weather.forEach(w => {
      if (w.wind == null || w.windDir == null) return;
      const blowTo = (w.windDir + 180) % 360;
      const rot = -(blowTo * Math.PI / 180);
      if (!_windEnt.has(w.name)) {
        const e = ents.add({
          position: deg(w.lon, w.lat, 400),
          billboard: {
            image: makeWindArrow(w.wind), width: 30, height: 30,
            rotation: rot, alignedAxis: Cesium.Cartesian3.ZERO,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            pixelOffset: new Cesium.Cartesian2(0, 16),
            translucencyByDistance: new Cesium.NearFarScalar(5e5, 1.0, 3e6, 0.0),
          },
          _kind: 'vejr', _data: w, _layer: 'vejr',
        });
        e.show = showVejr;
        _windEnt.set(w.name, e);
      } else {
        const e = _windEnt.get(w.name);
        e.show = showVejr;
        e._data = w;
        if (e.billboard) { e.billboard.image = makeWindArrow(w.wind); e.billboard.rotation = rot; }
      }
    });
    for (const [k, e] of _windEnt) if (!seen.has(k)) { ents.remove(e); _windEnt.delete(k); }
  }

  function buildBeredskabLayer() {
    if (!_viewer) return;
    const ents = _viewer.entities;
    const showB = _view === 'beredskab';
    BRANDSTATIONER.forEach(b => {
      ents.add({
        position: deg(b.lon, b.lat, 500),
        point: { pixelSize: 9, color: Cesium.Color.fromBytes(255, 80, 40, 240), outlineColor: Cesium.Color.fromBytes(255, 200, 0, 200), outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: '🔥', font: '14px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -18), disableDepthTestDistance: Number.POSITIVE_INFINITY, translucencyByDistance: new Cesium.NearFarScalar(2e4, 1.0, 2e5, 0.0) },
        show: showB,
        _kind: 'beredskab', _data: { ...b, kind: 'brand' }, _layer: 'beredskab',
      });
    });
    SYGEHUSE.forEach(h => {
      ents.add({
        position: deg(h.lon, h.lat, 500),
        point: { pixelSize: 10, color: Cesium.Color.fromBytes(50, 180, 255, 240), outlineColor: Cesium.Color.fromBytes(255, 255, 255, 200), outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: '🏥', font: '14px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -18), disableDepthTestDistance: Number.POSITIVE_INFINITY, translucencyByDistance: new Cesium.NearFarScalar(5e4, 1.0, 5e5, 0.0) },
        show: showB,
        _kind: 'beredskab', _data: { ...h, kind: 'sygehus', subtype: h.type }, _layer: 'beredskab',
      });
    });
  }

  // ── Stats bar ──────────────────────────────────────────────────────────────
  function statusTag(status) {
    if (status === 'live') return '<span style="color:#5fd35f">live</span>';
    if (status === 'no-key') return '<span style="color:#ff8040">AIS-nøgle mangler</span>';
    if (status === 'connecting' || status === 'reconnecting' || status === 'loading')
      return '<span style="color:#d4af37">forbinder…</span>';
    if (status === 'koldstart') return '<span style="color:#d4af37">koldstart…</span>';
    if (status === 'empty') return '<span style="color:#888">ingen i området</span>';
    return '<span style="color:#cc5544">utilgængelig</span>';
  }
  function updateStats() {
    const el = document.getElementById('dk-stats');
    if (!el) return;
    const survCount = _satellites.filter(s => s.surv).length;
    el.innerHTML = `
      <span class="dk-stat"><i class="ph ph-airplane-tilt"></i> ${_aircraft.length} fly ${statusTag(_aircraftStatus)}</span>
      <span class="dk-stat"><i class="ph ph-boat"></i> ${_ships.length} skibe ${statusTag(_aisStatus)}</span>
      <span class="dk-stat"><i class="ph ph-globe-stand"></i> ${_satellites.length} sat · <span style="color:#ff8040">${survCount} overvågning</span></span>
    `;
  }

  // ── Animation loop (dead-reckon + recompute satellites) ───────────────────────
  function startLoop() {
    if (_rafId) return;
    _lastFrameT = performance.now();
    function frame(now) {
      const panel = document.getElementById('panel-danmarkskort');
      if (!panel || !panel.classList.contains('active')) { _rafId = null; return; }
      const dt = Math.min((now - _lastFrameT) / 1000, 0.1);
      _lastFrameT = now;
      _pulse += 0.05;
      if (_view === 'skibstrafik') advanceShips(_ships, dt);
      if (_view === 'lufttrafik') advanceAircraft(_aircraft, dt);
      if (_view === 'vejr' || _view === 'beredskab') {
        if (!_weather.length) fetchWeather();
      }
      if (_view === 'satellitter' || _view === 'overvågning') {
        // Glide every satellite toward its last propagated target each frame.
        for (let i = 0; i < _satellites.length; i++) advanceLerp(_satellites[i], SAT_LERP_MS);
        const t = Date.now();
        if (t >= _satFreshUntil) { computeSatellites(); syncSatelliteEntities(); _satFreshUntil = t + SAT_RECOMPUTE_MS; updateStats(); }
        // Ground-tracks are surveillance-only and expensive — compute sparingly.
        if (_view === 'overvågning' && t >= _groundTracksFreshUntil) { computeGroundTracks(); syncGroundTracks(); _groundTracksFreshUntil = t + 30000; }
      }
      _rafId = requestAnimationFrame(frame);
    }
    _rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    if (_aircraftTimer) { clearInterval(_aircraftTimer); _aircraftTimer = null; }
    if (_shipTimer) { clearInterval(_shipTimer); _shipTimer = null; }
    if (_weatherTimer) { clearInterval(_weatherTimer); _weatherTimer = null; }
    if (_powerTimer) { clearInterval(_powerTimer); _powerTimer = null; }
    if (_togTimer) { clearInterval(_togTimer); _togTimer = null; }
    if (_gridFreqTimer) { clearInterval(_gridFreqTimer); _gridFreqTimer = null; }
    if (_trafikTimer) { clearInterval(_trafikTimer); _trafikTimer = null; }
    if (_trainPosTimer) { clearInterval(_trainPosTimer); _trainPosTimer = null; }
  }

  // ── Legend ───────────────────────────────────────────────────────────────────
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
      swatches += `<div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(${r_},${g_},${b_})"></div><div class="dk-leg-lbl">${metricCfg.format(val)}</div></div>`;
    }
    return `<div class="dk-legend-inner">${swatches}</div>`;
  }
  function refreshLegend() {
    const el = document.getElementById('dk-legend');
    if (!el) return;
    if (_view === 'satellitter' || _view === 'overvågning') {
      const items = Object.entries(SAT_TYPES)
        .filter(([k]) => _view === 'satellitter' ? true : (k === 'recon' || k === 'station'))
        .map(([, t]) => `<div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(${t.c[0]},${t.c[1]},${t.c[2]});width:10px;height:10px;border-radius:50%"></div><div class="dk-leg-lbl">${t.name}</div></div>`)
        .join('');
      el.innerHTML = `<div class="dk-legend-inner">${items}</div>`;
    } else if (_view === 'vejr') {
      el.innerHTML = `<div class="dk-legend-inner">
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(80,80,220)"></div><div class="dk-leg-lbl">≤−10°C</div></div>
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(100,220,255)"></div><div class="dk-leg-lbl">0°C</div></div>
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(100,255,180)"></div><div class="dk-leg-lbl">10°C</div></div>
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(255,220,60)"></div><div class="dk-leg-lbl">20°C</div></div>
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(255,80,40)"></div><div class="dk-leg-lbl">≥28°C</div></div>
      </div>`;
    } else if (_view === 'beredskab') {
      el.innerHTML = `<div class="dk-legend-inner">
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(255,80,40);border-radius:50%"></div><div class="dk-leg-lbl">Brandstation</div></div>
        <div class="dk-leg-step"><div class="dk-leg-swatch" style="background:rgb(50,180,255);border-radius:50%"></div><div class="dk-leg-lbl">Sygehus</div></div>
      </div>`;
    } else {
      el.innerHTML = buildLegendHTML(_metric);
    }
  }

  // ── Navigation controls ───────────────────────────────────────────────────────
  function updateCompass() {
    if (!_viewer) return;
    const c = document.getElementById('dk-compass-needle');
    if (c) c.style.transform = `rotate(${-Cesium.Math.toDegrees(_viewer.camera.heading)}deg)`;
    const p = document.getElementById('dk-pitch-val');
    if (p) p.textContent = Math.round(-Cesium.Math.toDegrees(_viewer.camera.pitch)) + '°';
  }
  function flyHome() { _viewer.camera.flyTo({ ...HOME(), duration: 1.0 }); }
  let _lighting = false;
  function toggleLighting() {
    if (!_viewer) return;
    _lighting = !_lighting;
    const globe = _viewer.scene.globe;
    globe.enableLighting = _lighting;
    globe.dynamicAtmosphereLighting = _lighting;
    if (_lighting) {
      // Cesium's default clock starts at J2000 epoch — the sun would be in the
      // wrong position. Snap to the actual current UTC time so the terminator
      // and shadow fall correctly for right now.
      _viewer.clock.currentTime = Cesium.JulianDate.now();
      _viewer.clock.shouldAnimate = false;
    }
    if (_viewer.scene.skyAtmosphere) _viewer.scene.skyAtmosphere.show = true;
    const btn = document.getElementById('dk-sun-btn');
    if (btn) btn.classList.toggle('active', _lighting);
  }
  function flyToEntity(ent) {
    if (!_viewer || !ent) return;
    try {
      _viewer.flyTo(ent, {
        duration: 1.2,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-55), 180000),
      }).catch(() => {});
    } catch (e) { /* non-critical */ }
  }
  function flyToLonLat(lon, lat, height = 90000) {
    if (!_viewer) return;
    _viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
      duration: 1.2,
    });
  }
  // Search index: 25 major cities + all 98 municipalities (resolved live).
  function polygonCentroid(ent) {
    // Extract the centroid of a GeoJSON polygon entity by averaging its
    // exterior ring positions (Cartographic). Works for both simple and
    // complex polygons — good enough for a camera fly-to target.
    try {
      const hier = ent.polygon && ent.polygon.hierarchy && ent.polygon.hierarchy.getValue(Cesium.JulianDate.now());
      const positions = hier ? (hier.positions || hier) : null;
      if (!positions || !positions.length) return null;
      let sumLon = 0, sumLat = 0;
      positions.forEach(p => {
        const c = Cesium.Cartographic.fromCartesian(p);
        sumLon += Cesium.Math.toDegrees(c.longitude);
        sumLat += Cesium.Math.toDegrees(c.latitude);
      });
      return { lon: sumLon / positions.length, lat: sumLat / positions.length };
    } catch { return null; }
  }
  function searchPlaces(q) {
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];
    for (const s of WEATHER_STATIONS) {
      if (s.name.toLowerCase().includes(q)) out.push({ label: s.name, kind: 'By', lon: s.lon, lat: s.lat });
    }
    if (_kommuneEntities) {
      for (const e of _kommuneEntities) {
        if (e._name && e._name.toLowerCase().includes(q) && !out.some(o => o.label === e._name)) {
          const c = polygonCentroid(e);
          out.push({ label: e._name, kind: 'Kommune', lon: c ? c.lon : null, lat: c ? c.lat : null, ent: e });
        }
      }
    }
    return out.sort((a, b) => a.label.length - b.label.length).slice(0, 7);
  }
  function gotoPlace(p) {
    if (!p) return;
    // Always prefer an explicit centroid lon/lat — flyTo on a polygon entity
    // uses the bounding-sphere centre which is often offset from the visible
    // label because of irregular polygon shapes. flyToLonLat aims the camera
    // exactly at the computed centroid.
    if (p.lon != null) flyToLonLat(p.lon, p.lat, 120000);
    else if (p.ent) flyToEntity(p.ent);
  }
  function setTopDown() {
    const c = _viewer.camera.positionCartographic;
    _viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 0.8 });
  }
  function resetNorth() {
    const c = _viewer.camera.positionCartographic;
    _viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height), orientation: { heading: 0, pitch: _viewer.camera.pitch, roll: 0 }, duration: 0.7 });
  }
  function zoomBy(factor) {
    const h = _viewer.camera.positionCartographic.height;
    _viewer.camera.zoomIn(h * factor);
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  function buildUI(container) {
    const googleBtn = _config.googleTilesKey
      ? `<button class="dk-nav-btn" id="dk-google-btn" title="Google Fotorealistisk 3D">🌍</button>` : '';
    container.innerHTML = `
<div class="dk-wrap" id="dk-wrap">
  <div id="dk-cesium" class="dk-cesium"></div>

  <div class="dk-hud">
    <div class="dk-hud-title">DANMARKSMASKINEN</div>
    <div class="dk-search-wrap">
      <input type="text" id="dk-search" class="dk-search" placeholder="🔍 Find by eller kommune…" autocomplete="off" spellcheck="false">
      <div class="dk-search-results" id="dk-search-results"></div>
    </div>
    <div class="dk-view-btns" id="dk-view-btns">
      <button class="dk-btn active" data-view="kommuner">KOMMUNER</button>
      <button class="dk-btn" data-view="lufttrafik">LUFTTRAFIK</button>
      <button class="dk-btn" data-view="skibstrafik">SKIBSTRAFIK</button>
      <button class="dk-btn" data-view="satellitter">SATELLITTER</button>
      <button class="dk-btn dk-btn-intel" data-view="overvågning">⚑ OVERVÅGNING</button>
      <button class="dk-btn dk-btn-infra" data-view="infrastruktur">⚡ INFRASTRUKTUR</button>
      <button class="dk-btn dk-btn-vejr" data-view="vejr">☁ VEJR</button>
      <button class="dk-btn dk-btn-beredskab" data-view="beredskab">🚨 BEREDSKAB</button>
      <button class="dk-btn dk-btn-tog" data-view="tog">🚆 TOG</button>
      <button class="dk-btn dk-btn-forsvar" data-view="forsvar">🛡 FORSVAR</button>
      <button class="dk-btn dk-btn-trafik" data-view="trafik">🚦 TRAFIK</button>
      <button class="dk-btn dk-btn-politik" data-view="politik">🏛 POLITIK</button>
      <button class="dk-btn dk-btn-telecom" data-view="infra">📡 NETVÆRK</button>
      <button class="dk-btn dk-btn-miljo" data-view="miljo">🌫 MILJØ</button>
    </div>
    <div class="dk-metric-btns" id="dk-metric-btns">
      <button class="dk-btn active" data-metric="ledighed">LEDIGHED</button>
      <button class="dk-btn" data-metric="indkomst">INDKOMST</button>
      <button class="dk-btn" data-metric="boligpris">BOLIGPRIS</button>
      <button class="dk-btn" data-metric="befolkning">BEFOLKNING</button>
      <button class="dk-btn" data-metric="co2">CO₂</button>
      <button class="dk-btn" data-metric="skat">SKAT</button>
      <button class="dk-btn" data-metric="erhverv">ERHVERV</button>
      <button class="dk-btn" data-metric="uddannelse">UDDANNELSE</button>
      <button class="dk-btn" data-metric="valgdeltagelse">VALGDELTAGELSE</button>
      <button class="dk-btn" data-metric="medianalder">MEDIANALDER</button>
      <button class="dk-btn" data-metric="kriminalitet">KRIMINALITET</button>
      <button class="dk-btn" data-metric="middellevetid">MIDDELLEVETID</button>
      <button class="dk-btn" data-metric="boligejer">BOLIGEJERE</button>
      <button class="dk-btn" data-metric="healthineq">SUNDHEDSULIGHED</button>
      <button class="dk-btn" data-metric="mental">PSYKISK PRES</button>
      <button class="dk-btn" data-metric="green">GRØN OMSTILLING</button>
      <button class="dk-btn" data-metric="mobility">MOBILITET</button>
    </div>
    <div class="dk-legend" id="dk-legend"></div>
    <div class="dk-stats" id="dk-stats"></div>
    <div class="dk-power" id="dk-power"></div>
    <div class="dk-power" id="dk-gridfreq" style="display:none"></div>
  </div>

  <div class="dk-tooltip" id="dk-tooltip"></div>

  <div class="dk-nav" id="dk-nav">
    <button class="dk-nav-btn" id="dk-zoom-in" title="Zoom ind">+</button>
    <button class="dk-nav-btn" id="dk-zoom-out" title="Zoom ud">−</button>
    <button class="dk-compass" id="dk-compass" title="Peg mod nord">
      <span class="dk-compass-needle" id="dk-compass-needle">▲</span>
      <span class="dk-compass-n">N</span>
    </button>
    <button class="dk-nav-btn" id="dk-topdown" title="Set ovenfra (2D)">⊕</button>
    <button class="dk-nav-btn" id="dk-sun-btn" title="Dag/nat-lys (solens position)">☀</button>
    ${googleBtn}
    <button class="dk-nav-btn" id="dk-reset" title="Nulstil visning">⟲</button>
    <div class="dk-pitch" title="Hældning">∡ <span id="dk-pitch-val">58°</span></div>
  </div>

  <div class="dk-hint" id="dk-hint">Træk for at panorere · scroll for zoom · dobbeltklik for at flyve hen til · højreklik-træk (eller ⌘/Ctrl-træk) for at vippe &amp; rotere</div>

  <div class="dk-loading" id="dk-loading">
    <div class="dk-loading-text">INDLÆSER DANMARKSMASKINEN</div>
    <div class="dk-loading-sub">WebGL · CesiumJS · realtidsdata</div>
  </div>
</div>`;

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
        if ((_view === 'overvågning' || _view === 'satellitter')) {
          if (!_satellites.length) { computeSatellites(); syncSatelliteEntities(); }
          if (!_groundTracks.length) computeGroundTracks();
        }
        applyView();
      });
    });

    container.querySelectorAll('[data-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        _metric = btn.dataset.metric;
        container.querySelectorAll('[data-metric]').forEach(b => b.classList.toggle('active', b === btn));
        restyleKommuner();
        refreshLegend();
        const tt = document.getElementById('dk-tooltip');
        if (tt) tt.style.display = 'none';
      });
    });

    // Search-to-fly: type a city or municipality, pick a result, fly there.
    const searchInput = document.getElementById('dk-search');
    const searchRes   = document.getElementById('dk-search-results');
    if (searchInput && searchRes) {
      let sel = -1, current = [];
      const renderRes = () => {
        if (!current.length) { searchRes.style.display = 'none'; searchRes.innerHTML = ''; return; }
        searchRes.style.display = 'block';
        searchRes.innerHTML = current.map((p, i) =>
          `<div class="dk-search-item${i === sel ? ' dk-sr-active' : ''}" data-sr="${i}">${p.label}<span class="dk-sr-kind">${p.kind}</span></div>`).join('');
      };
      const choose = (i) => {
        const p = current[i]; if (!p) return;
        gotoPlace(p); searchInput.value = p.label; current = []; sel = -1; renderRes(); searchInput.blur();
      };
      searchInput.addEventListener('input', () => { current = searchPlaces(searchInput.value); sel = -1; renderRes(); });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, current.length - 1); renderRes(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); renderRes(); e.preventDefault(); }
        else if (e.key === 'Enter') { choose(sel >= 0 ? sel : 0); }
        else if (e.key === 'Escape') { current = []; renderRes(); searchInput.blur(); }
      });
      searchRes.addEventListener('mousedown', (e) => {
        const it = e.target.closest('[data-sr]'); if (it) { e.preventDefault(); choose(parseInt(it.dataset.sr, 10)); }
      });
      searchInput.addEventListener('blur', () => setTimeout(renderRes, 150));
    }

    const bind = (id, fn) => { const e = document.getElementById(id); if (e) e.addEventListener('click', fn); };
    bind('dk-zoom-in',  () => zoomBy(0.35));
    bind('dk-zoom-out', () => zoomBy(-0.5));
    bind('dk-compass',  resetNorth);
    bind('dk-topdown',  setTopDown);
    bind('dk-sun-btn',  toggleLighting);
    bind('dk-reset',    flyHome);
    bind('dk-google-btn', toggleGoogleTiles);

    setTimeout(() => { const h = document.getElementById('dk-hint'); if (h) h.classList.add('dk-hint-fade'); }, 6000);

    refreshLegend();
    updateStats();
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init(panel) {
    _container = panel;

    try {
      const r = await fetch(CONFIG_URL);
      if (r.ok) _config = await r.json();
    } catch { /* token-free fallback */ }

    buildUI(panel);

    const cesiumDiv = document.getElementById('dk-cesium');
    try {
      await initViewer(cesiumDiv);
    } catch (e) {
      const loading = document.getElementById('dk-loading');
      if (loading) loading.innerHTML = '<div class="dk-loading-text" style="color:#eb4034">CESIUM INDLÆSNING FEJLEDE</div>';
      return;
    }

    await loadKommuner();
    buildStatic();
    applyView();

    const loading = document.getElementById('dk-loading');
    if (loading) loading.style.display = 'none';

    _initialized = true;

    buildBeredskabLayer();
    loadSatellites();
    fetchAircraft();
    fetchShips();
    fetchWeather();
    fetchPower();
    fetchGridFreq();
    fetchExchangeRates();
    fetchKystData();
    _aircraftTimer = setInterval(fetchAircraft, AIRCRAFT_REFRESH_MS);
    _shipTimer = setInterval(fetchShips, SHIP_REFRESH_MS);
    _weatherTimer = setInterval(fetchWeather, 10 * 60 * 1000);
    _powerTimer = setInterval(fetchPower, 5 * 60 * 1000);
    _gridFreqTimer = setInterval(fetchGridFreq, 30 * 1000);    // grid freq every 30s
    _togTimer = setInterval(fetchTog, 60 * 1000);              // train departures every 60s
    _trafikTimer = setInterval(fetchTrafikEvents, 3 * 60 * 1000); // traffic events every 3 min
    _trainPosTimer = setInterval(fetchTrainPositions, 30 * 1000); // train positions every 30s

    startLoop();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  VG.danmarkskort.render = function (panel) {
    if (!panel) return;
    if (!_initialized) {
      init(panel);
    } else if (!document.getElementById('dk-cesium') || !_viewer) {
      _initialized = false;
      _viewer = null;
      init(panel);
    } else {
      startLoop();
    }
  };

  VG.danmarkskort.setContextView = function (view, metric) {
    if (!_viewer || !_container) return;
    if (view) {
      _view = view;
      _container.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    }
    if (metric) {
      _metric = metric;
      _container.querySelectorAll('[data-metric]').forEach(b => b.classList.toggle('active', b.dataset.metric === metric));
    }
    applyView();
    restyleKommuner();
    refreshLegend();
    window.dispatchEvent(new Event('resize'));
  };

  VG.danmarkskort.destroy = function () {
    stopLoop();
    if (_viewer && _infraPoints) { try { _viewer.scene.primitives.remove(_infraPoints); } catch (_) {} }
    if (_viewer && _wifiPoints)  { try { _viewer.scene.primitives.remove(_wifiPoints); } catch (_) {} }
    for (const k in _pointLayers) { const L = _pointLayers[k]; if (_viewer && L && L.coll) { try { _viewer.scene.primitives.remove(L.coll); } catch (_) {} } delete _pointLayers[k]; }
    _infraPoints = null; _infraLoaded = false; _wifiPoints = null; _wifiLoaded = false;
    if (_viewer) {
      try { if (_viewer._dkHandler) _viewer._dkHandler.destroy(); } catch {}
      try { _viewer.destroy(); } catch {}
      _viewer = null;
    }
    _acEnt.clear(); _shipEnt.clear(); _satEnt.clear(); _weatherEnt.clear(); _windEnt.clear(); _trackEnt.length = 0;
    _trafikEnt.clear(); _trainPosEnt.clear(); _kystEnt.clear();
    _weather = [];
    _staticBuilt = false; _kommuneDS = null; _kommuneEntities = [];
    _initialized = false;
  };

})();
