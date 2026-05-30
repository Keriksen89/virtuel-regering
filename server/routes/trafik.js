import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();

// Vejdirektoratet DATEX II / NAP API (free after registration at nap.vd.dk)
const VD_BASE = 'https://data.vd.dk/api';

// Known major Danish road corridors with approximate centerpoints (for fallback dots)
const STATIC_ROADS = [
  { id: 'e20-kbh',     name: 'E20 København (Motorringen)',     pos: [12.523, 55.693], road: 'E20', type: 'congestion' },
  { id: 'e20-ringsted',name: 'E20 Køge Bugt Motorvejen',        pos: [12.123, 55.530], road: 'E20', type: 'info' },
  { id: 'e45-aarhus',  name: 'E45 Aarhus N (Djurslandsmotorvejen)', pos: [10.248, 56.195], road: 'E45', type: 'info' },
  { id: 'e45-vejle',   name: 'E45 Vejle-Bredstrup',             pos: [9.651, 55.650],  road: 'E45', type: 'info' },
  { id: 'e20-odb',     name: 'E20 Odense (Svendborgmotorvejen)',pos: [10.390, 55.378], road: 'E20', type: 'info' },
];

// GET /events — live traffic events from Vejdirektoratet (requires VDAPI_KEY env var)
router.get('/events', async (req, res) => {
  const cacheKey = 'trafik:events';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const apiKey = process.env.VDAPI_KEY;

  if (!apiKey) {
    // Return static fallback with info about how to enable live data
    const fallback = {
      events: STATIC_ROADS.map(r => ({ ...r, description: 'Statisk referencepunkt — tilslut VDAPI_KEY for live trafikdata', isFallback: true })),
      isFallback: true,
      note: 'Sæt VDAPI_KEY env-variabel (gratis fra nap.vd.dk) for live trafikdata fra Vejdirektoratet',
      source: 'Vejdirektoratet (statisk fallback)',
      fetched: new Date().toISOString(),
    };
    cache.set(cacheKey, fallback, 5 * 60);
    return res.json(fallback);
  }

  try {
    const url = `${VD_BASE}/trafficevent?format=json&apikey=${apiKey}&limit=50`;
    const data = await fetchJSON(url, { timeout: 8000 });

    const events = (data?.trafficEventTable?.trafficEvent || []).map(e => {
      const loc = e.groupOfLocations?.linearWithinLinearElement || e.groupOfLocations?.point;
      const coords = loc?.tpegpointLocation?.point?.pointByCoordinates?.sitePoint
        || loc?.alertCLinear?.alertCMethod4Point?.alertCLocation?.specificLocation?.coordinates;
      return {
        id: e.id || Math.random().toString(36).slice(2),
        name: e.situation?.situationRecord?.[0]?.generalPublicComment?.comment?.values?.value?.[0]?._ || 'Trafikhændelse',
        type: e.situation?.situationRecord?.[0]?.['@type'] || 'trafficCongestion',
        road: e.situation?.situationRecord?.[0]?.locationReference?.locationName || null,
        pos: coords ? [coords.longitude, coords.latitude] : null,
        description: e.situation?.situationRecord?.[0]?.impact?.delays?.delayTimeValue
          ? `Forsinkelse: ~${e.situation.situationRecord[0].impact.delays.delayTimeValue} min`
          : null,
        severity: e.situation?.situationRecord?.[0]?.management?.informationManager?.urgency || null,
        isFallback: false,
      };
    }).filter(e => e.pos);

    const result = { events, source: 'Vejdirektoratet · DATEX II', fetched: new Date().toISOString() };
    cache.set(cacheKey, result, 3 * 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[trafik] events failed:', err.message);
    const fallback = {
      events: STATIC_ROADS.map(r => ({ ...r, isFallback: true })),
      isFallback: true,
      source: 'Statisk fallback',
      fetched: new Date().toISOString(),
    };
    cache.set(cacheKey, fallback, 60);
    res.json(fallback);
  }
});

// GET /roadcams — Vejdirektoratet public traffic cameras (SOAP API, no key needed)
// Returns static list of known camera locations as reference points
router.get('/roadcams', (req, res) => {
  const CAMS = [
    { id: 'cam-e20-amager', name: 'E20 Amager Motorvejen', pos: [12.604, 55.642], road: 'E20' },
    { id: 'cam-e20-kbh',    name: 'E20 Motorringen Kbh',   pos: [12.498, 55.692], road: 'E20' },
    { id: 'cam-e47-oresund',name: 'E47 Øresundsmotorvejen',pos: [12.658, 55.622], road: 'E47' },
    { id: 'cam-e45-vejle',  name: 'E45 Vejlebro',           pos: [9.539, 55.710],  road: 'E45' },
    { id: 'cam-e45-aarhus', name: 'E45 Aarhus Syd',         pos: [10.208, 56.105], road: 'E45' },
    { id: 'cam-e20-fyn',    name: 'E20 Lillebæltsbroen',    pos: [9.749, 55.534],  road: 'E20' },
    { id: 'cam-e20-odb',    name: 'E20 Odense Øst',         pos: [10.458, 55.397], road: 'E20' },
    { id: 'cam-e45-aalborg',name: 'E45 Limfjordsbroen',     pos: [9.928, 57.045],  road: 'E45' },
  ];
  res.json({ cameras: CAMS, source: 'Vejdirektoratet (statisk)' });
});

export default router;
