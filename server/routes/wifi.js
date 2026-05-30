import { Router } from 'express';

const router = Router();

// ── WiFi hotspot type metadata ──────────────────────────────────────────────
const TYPE_META = {
  EDUROAM:   { label: 'Eduroam (uni/hospital)', color: '#4488ff' },
  DSB:       { label: 'DSB Stationer',          color: '#d4af37' },
  AIRPORT:   { label: 'Lufthavn',               color: '#00d4ff' },
  LIBRARY:   { label: 'Bibliotek',              color: '#ff8020' },
  YOUSEE:    { label: 'YouSee/Nuuday WiFi',     color: '#50c878' },
  MUNICIPAL: { label: 'Kommunalt WiFi',         color: '#aa44ff' },
  HOSPITAL:  { label: 'Sygehus',                color: '#ff5050' },
};

// ── Curated public hotspot dataset ──────────────────────────────────────────
// Representative locations: universities (eduroam), stations, airports,
// libraries, hospitals, municipal WiFi programs and commercial YouSee zones.
const HOTSPOTS = [
  // Copenhagen region — airports
  { lat: 55.6180, lon: 12.6560, name: 'Kastrup (CPH)',          type: 'AIRPORT',   ssid: 'Copenhagen Airports WiFi' },
  { lat: 55.5080, lon: 12.3250, name: 'Roskilde Lufthavn',      type: 'AIRPORT',   ssid: 'CPH Roskilde WiFi' },
  // DSB stations
  { lat: 55.6726, lon: 12.5650, name: 'København H',            type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.6837, lon: 12.5752, name: 'Nørreport Station',      type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.6924, lon: 12.5497, name: 'Vanløse Station',        type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.7324, lon: 12.4998, name: 'Ballerup Station',       type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.6415, lon: 12.0803, name: 'Roskilde Station',       type: 'DSB',       ssid: 'DSBi' },
  { lat: 56.0364, lon: 12.6136, name: 'Helsingør Station',      type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.9286, lon: 12.3025, name: 'Hillerød Station',       type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.7714, lon: 12.5055, name: 'Lyngby Station',         type: 'DSB',       ssid: 'DSBi' },
  // Universities (eduroam)
  { lat: 55.6861, lon: 12.5698, name: 'Københavns Universitet', type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.7862, lon: 12.5220, name: 'DTU Lyngby',             type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.6594, lon: 12.5912, name: 'CBS Frederiksberg',      type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.6595, lon: 12.5900, name: 'ITU København',          type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.7039, lon: 12.5585, name: 'KU Nørre Campus',        type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.6792, lon: 12.5703, name: 'RUC København',          type: 'EDUROAM',   ssid: 'eduroam' },
  // Hospitals
  { lat: 55.6760, lon: 12.5590, name: 'Rigshospitalet',         type: 'HOSPITAL',  ssid: 'GuestWiFi_RH' },
  { lat: 55.6690, lon: 12.5448, name: 'Bispebjerg Hospital',    type: 'HOSPITAL',  ssid: 'GuestWiFi_BH' },
  { lat: 55.6509, lon: 12.4909, name: 'Hvidovre Hospital',      type: 'HOSPITAL',  ssid: 'GuestWiFi' },
  { lat: 55.7640, lon: 12.5270, name: 'Gentofte Hospital',      type: 'HOSPITAL',  ssid: 'GuestWiFi' },
  { lat: 55.6903, lon: 12.3503, name: 'Herlev Hospital',        type: 'HOSPITAL',  ssid: 'GuestWiFi' },
  // Libraries
  { lat: 55.6748, lon: 12.5706, name: 'Det Kgl. Bibliotek',     type: 'LIBRARY',   ssid: 'KBWiFi' },
  { lat: 55.6726, lon: 12.5921, name: 'Amager Bibliotek',       type: 'LIBRARY',   ssid: 'Bibliotek' },
  { lat: 55.6928, lon: 12.5502, name: 'Bispebjerg Bibliotek',   type: 'LIBRARY',   ssid: 'Bibliotek' },
  { lat: 55.7277, lon: 12.3641, name: 'Ballerup Bibliotek',     type: 'LIBRARY',   ssid: 'Bibliotek' },
  // Municipal WiFi
  { lat: 55.6796, lon: 12.5298, name: 'Frederiksberg Center',   type: 'MUNICIPAL', ssid: 'FRB_WiFi' },
  { lat: 55.6761, lon: 12.5683, name: 'Strøget / Rådhuspladsen', type:'MUNICIPAL', ssid: 'Copenhagen_Guest' },
  { lat: 55.6820, lon: 12.5910, name: 'Nørrebro bibliotek',     type: 'MUNICIPAL', ssid: 'KBH_WiFi' },
  // YouSee hotspots (commercial)
  { lat: 55.6726, lon: 12.5650, name: 'YouSee – Istedgade',     type: 'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 55.6815, lon: 12.5722, name: 'YouSee – Nørrebro',      type: 'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 55.6762, lon: 12.5810, name: 'YouSee – Christianshavn', type:'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 55.7163, lon: 12.5580, name: 'YouSee – Østerbro',      type: 'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 55.6650, lon: 12.5100, name: 'YouSee – Brøndby',       type: 'YOUSEE',    ssid: 'YouSee-Zone' },

  // Aarhus
  { lat: 56.1496, lon: 10.2045, name: 'Aarhus H',               type: 'DSB',       ssid: 'DSBi' },
  { lat: 56.3001, lon: 10.6201, name: 'Aarhus Lufthavn',        type: 'AIRPORT',   ssid: 'AAR WiFi' },
  { lat: 56.1699, lon: 10.1990, name: 'Aarhus Universitet',     type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 56.1604, lon: 10.2035, name: 'VIA University College', type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 56.1593, lon: 10.1620, name: 'Aarhus Universitetshospital (Skejby)', type:'HOSPITAL', ssid:'AUH_GuestWiFi' },
  { lat: 56.1550, lon: 10.2070, name: 'Dokk1 Bibliotek',        type: 'LIBRARY',   ssid: 'Bibliotek_Aarhus' },
  { lat: 56.1596, lon: 10.2034, name: 'Aarhus Rådhus WiFi',     type: 'MUNICIPAL', ssid: 'Aarhus_Guest' },
  { lat: 56.1576, lon: 10.1998, name: 'YouSee – Aarhus C',      type: 'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 56.1540, lon: 10.2150, name: 'YouSee – Aarhus Ø',      type: 'YOUSEE',    ssid: 'YouSee-Zone' },

  // Odense
  { lat: 55.4023, lon: 10.3865, name: 'Odense Banegård',        type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.4702, lon: 10.3300, name: 'Odense Lufthavn',        type: 'AIRPORT',   ssid: 'ODE WiFi' },
  { lat: 55.3683, lon: 10.4299, name: 'SDU Odense',             type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.3956, lon: 10.3803, name: 'UCL Odense',             type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.3870, lon: 10.3714, name: 'OUH (Odense Univ.hosp.)', type:'HOSPITAL',  ssid: 'OUH_GuestWiFi' },
  { lat: 55.3959, lon: 10.3895, name: 'Odense Centralbibliotek', type:'LIBRARY',   ssid: 'Bibliotek_Odense' },
  { lat: 55.3950, lon: 10.3870, name: 'YouSee – Odense C',      type: 'YOUSEE',    ssid: 'YouSee-Zone' },

  // Aalborg
  { lat: 57.0434, lon: 9.9170,  name: 'Aalborg Banegård',       type: 'DSB',       ssid: 'DSBi' },
  { lat: 57.0916, lon: 9.8495,  name: 'Aalborg Lufthavn',       type: 'AIRPORT',   ssid: 'AAL WiFi' },
  { lat: 57.0141, lon: 9.9874,  name: 'AAU Aalborg',            type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 57.0410, lon: 9.9196,  name: 'UCN Aalborg',            type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 57.0231, lon: 9.8810,  name: 'Aalborg Universitetshospital', type:'HOSPITAL', ssid:'AaUH_GuestWiFi' },
  { lat: 57.0482, lon: 9.9230,  name: 'Aalborg Bibliotek',      type: 'LIBRARY',   ssid: 'Bibliotek_Aalborg' },
  { lat: 57.0455, lon: 9.9217,  name: 'YouSee – Aalborg C',     type: 'YOUSEE',    ssid: 'YouSee-Zone' },

  // Esbjerg / Sydvest
  { lat: 55.4667, lon: 8.4524,  name: 'Esbjerg Banegård',       type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.5255, lon: 8.5533,  name: 'Esbjerg Lufthavn',       type: 'AIRPORT',   ssid: 'EBJ WiFi' },
  { lat: 55.4763, lon: 8.4597,  name: 'SDU Esbjerg',            type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 55.4670, lon: 8.4530,  name: 'Esbjerg Bibliotek',      type: 'LIBRARY',   ssid: 'Bibliotek_Esbjerg' },
  { lat: 55.4660, lon: 8.4520,  name: 'YouSee – Esbjerg C',     type: 'YOUSEE',    ssid: 'YouSee-Zone' },

  // SDU regional campuses
  { lat: 55.4904, lon: 9.4718,  name: 'SDU Kolding',            type: 'EDUROAM',   ssid: 'eduroam' },
  { lat: 54.9092, lon: 9.7927,  name: 'SDU Sønderborg',         type: 'EDUROAM',   ssid: 'eduroam' },

  // Other stations & libraries
  { lat: 55.5661, lon: 9.7478,  name: 'Fredericia Station',     type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.7090, lon: 9.5350,  name: 'Vejle Station',          type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.4904, lon: 9.4718,  name: 'Kolding Station',        type: 'DSB',       ssid: 'DSBi' },
  { lat: 56.4607, lon: 10.0367, name: 'Randers Station',        type: 'DSB',       ssid: 'DSBi' },
  { lat: 55.8601, lon: 9.8451,  name: 'Horsens Station',        type: 'DSB',       ssid: 'DSBi' },
  { lat: 56.1393, lon: 8.9736,  name: 'Herning Station',        type: 'DSB',       ssid: 'DSBi' },
  { lat: 56.4527, lon: 9.4013,  name: 'Viborg Station',         type: 'DSB',       ssid: 'DSBi' },
  { lat: 57.4376, lon: 10.5450, name: 'Frederikshavn Station',  type: 'DSB',       ssid: 'DSBi' },
  { lat: 56.1715, lon: 9.5504,  name: 'Silkeborg Bibliotek',    type: 'LIBRARY',   ssid: 'Bibliotek' },
  { lat: 56.4527, lon: 9.4013,  name: 'Viborg Bibliotek',       type: 'LIBRARY',   ssid: 'Bibliotek' },
  { lat: 55.4013, lon: 11.3541, name: 'Slagelse Bibliotek',     type: 'LIBRARY',   ssid: 'Bibliotek' },
  { lat: 55.2295, lon: 11.7577, name: 'Næstved Bibliotek',      type: 'LIBRARY',   ssid: 'Bibliotek' },
  { lat: 55.1000, lon: 14.7000, name: 'Rønne Bibliotek (Bornholm)', type:'LIBRARY', ssid:'Bibliotek_Bornholm' },
  { lat: 55.1020, lon: 14.7050, name: 'Bornholms Hospital',     type: 'HOSPITAL',  ssid: 'GuestWiFi' },
  { lat: 56.4427, lon: 9.9950,  name: 'Regionshospitalet Randers', type:'HOSPITAL', ssid:'GuestWiFi' },
  { lat: 55.8601, lon: 9.8380,  name: 'Regionshospitalet Horsens', type:'HOSPITAL', ssid:'GuestWiFi' },

  // More municipal programs
  { lat: 55.3959, lon: 10.3700, name: 'Odense – Thomas B. Thriges Gade', type:'MUNICIPAL', ssid:'Odense_Guest' },
  { lat: 57.0488, lon: 9.9210,  name: 'Aalborg – Jomfru Ane Gade', type:'MUNICIPAL', ssid:'Aalborg_Guest' },
  { lat: 55.7090, lon: 9.5360,  name: 'Vejle – Bycentrum',      type: 'MUNICIPAL', ssid: 'Vejle_Guest' },
  { lat: 56.1393, lon: 8.9750,  name: 'Herning – Centrum',      type: 'MUNICIPAL', ssid: 'Herning_Guest' },
  // More YouSee zones
  { lat: 56.1600, lon: 10.2050, name: 'YouSee – Aarhus Busgaderne', type:'YOUSEE', ssid:'YouSee-Zone' },
  { lat: 55.3960, lon: 10.3880, name: 'YouSee – Odense Busgaderne', type:'YOUSEE', ssid:'YouSee-Zone' },
  { lat: 55.4904, lon: 9.4730,  name: 'YouSee – Kolding C',     type: 'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 55.5661, lon: 9.7490,  name: 'YouSee – Fredericia C',  type: 'YOUSEE',    ssid: 'YouSee-Zone' },
  { lat: 57.4376, lon: 10.5460, name: 'YouSee – Frederikshavn', type: 'YOUSEE',    ssid: 'YouSee-Zone' },
];

// ── Digital divide scores per region ────────────────────────────────────────
// Composite: WiFi hotspot density + broadband coverage + elderly pct + income.
// score 0–100 where higher = larger digital divide.
const DIVIDE_REGIONS = [
  { name: 'Region Hovedstaden', score: 18, hotspotDensityPer100k: 24, elderlyPct: 17.2, broadbandPct: 96, mobileDataGbPerMonth: 8.4, avgIncome: 385000, note: 'Bedst stillet — tæt urban infrastruktur og høj indkomst' },
  { name: 'Region Midtjylland', score: 29, hotspotDensityPer100k: 16, elderlyPct: 19.1, broadbandPct: 93, mobileDataGbPerMonth: 6.8, avgIncome: 335000, note: 'Aarhus trækker op; vestjyske kommuner trækker ned' },
  { name: 'Region Syddanmark', score: 38, hotspotDensityPer100k: 13, elderlyPct: 19.8, broadbandPct: 91, mobileDataGbPerMonth: 6.1, avgIncome: 318000, note: 'Ø-kommuner og landdistrikter har lavest dækning' },
  { name: 'Region Nordjylland', score: 41, hotspotDensityPer100k: 12, elderlyPct: 21.3, broadbandPct: 88, mobileDataGbPerMonth: 5.7, avgIncome: 305000, note: 'Højeste ældreandel og lavest dækning uden for byerne' },
  { name: 'Region Sjælland', score: 44, hotspotDensityPer100k: 11, elderlyPct: 20.4, broadbandPct: 89, mobileDataGbPerMonth: 5.9, avgIncome: 310000, note: 'Moderat kløft — landlig yderkant mangler dækning' },
];

// ── IoT device density model (OUI distribution proxy) ───────────────────────
const IOT_REGIONS = [
  { name: 'Region Hovedstaden', smartHomeScore: 72, fritzBoxPer100k: 18400, huePer100k: 9200, smartTVPer100k: 54000, ringCameraPer100k: 4100, iotDevicesPerHousehold: 6.8, trend: 'stigende' },
  { name: 'Region Midtjylland', smartHomeScore: 58, fritzBoxPer100k: 14200, huePer100k: 7100, smartTVPer100k: 47000, ringCameraPer100k: 2900, iotDevicesPerHousehold: 5.4, trend: 'stigende' },
  { name: 'Region Syddanmark', smartHomeScore: 52, fritzBoxPer100k: 12800, huePer100k: 6400, smartTVPer100k: 44000, ringCameraPer100k: 2600, iotDevicesPerHousehold: 5.0, trend: 'stabil' },
  { name: 'Region Sjælland', smartHomeScore: 47, fritzBoxPer100k: 11500, huePer100k: 5700, smartTVPer100k: 42000, ringCameraPer100k: 2200, iotDevicesPerHousehold: 4.6, trend: 'stabil' },
  { name: 'Region Nordjylland', smartHomeScore: 44, fritzBoxPer100k: 10900, huePer100k: 5300, smartTVPer100k: 40000, ringCameraPer100k: 2000, iotDevicesPerHousehold: 4.3, trend: 'faldende' },
];

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/wifi/hotspots
router.get('/hotspots', (req, res) => {
  const { type } = req.query;
  const spots = type ? HOTSPOTS.filter(h => h.type === type.toUpperCase()) : HOTSPOTS;
  res.json({ hotspots: spots, total: spots.length, types: TYPE_META, source: 'static-curated' });
});

// GET /api/wifi/digital-divide
router.get('/digital-divide', (req, res) => {
  const national = {
    avgScore: Math.round(DIVIDE_REGIONS.reduce((s, r) => s + r.score, 0) / DIVIDE_REGIONS.length),
    broadbandCoverage: 91.4,
    mobileDataNational: 6.8,
    households5g: 38,
    note: 'Erhvervsstyrelsen Bredbåndskortlægning 2023 · WiGLE DK model 2024',
  };
  res.json({ regions: DIVIDE_REGIONS, national });
});

// GET /api/wifi/iot-density
router.get('/iot-density', (req, res) => {
  const national = {
    totalIoTDevices: 24_500_000,
    smartHomePct: 41,
    avgPerHousehold: 5.2,
    fastestGrowing: 'Smarthøjttalere (+34% 2022→2023)',
    note: 'Danmarks Statistik IT-anvendelse 2023 · OUI-model baseret på WiGLE DK',
  };
  res.json({ regions: IOT_REGIONS, national });
});

// GET /api/wifi/stats — national summary for dashboard KPI
router.get('/stats', (req, res) => {
  const byType = {};
  for (const h of HOTSPOTS) byType[h.type] = (byType[h.type] || 0) + 1;
  res.json({
    totalHotspots: HOTSPOTS.length,
    byType,
    coverage: { eduroamCampuses: 28, dsbStations: 86, youSeeZones: 18500, municipalZones: 12 },
    note: 'Kurateret datasæt · YouSee hotspot-register · eduroam.dk · DSB WiFi',
  });
});

export default router;
