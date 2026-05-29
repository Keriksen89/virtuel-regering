import express from 'express';
const router = express.Router();

// Denmark + surrounding airspace
const BBOX = { lamin: 54.4, lomin: 7.5, lamax: 58.2, lomax: 15.4 };
// adsb.lol / adsb.fi use a centre + radius (nautical miles)
const CENTER = { lat: 56.0, lon: 10.5, distNm: 250 };

const CACHE_MS = 8000;
let _cache = { at: 0, payload: null };

// Normalise every upstream into the OpenSky "states" array the client expects:
// [icao24, callsign, origin_country, t_pos, t, lon, lat, baro_alt, on_ground,
//  velocity, true_track, vert_rate, sensors, geo_alt, squawk, spi, position_src]
function fromAdsb(aircraft) {
  return (aircraft || [])
    .filter(a => a && (a.lat != null) && (a.lon != null))
    .map(a => {
      const altRaw = a.alt_baro != null ? a.alt_baro : a.alt_geom;
      const altFt = (typeof altRaw === 'number') ? altRaw : 0; // "ground" => 0
      const altM = altFt * 0.3048;
      const gsKt = typeof a.gs === 'number' ? a.gs : 0;
      const velMs = gsKt * 0.514444;
      return [
        (a.hex || a.icao || '').toLowerCase(),
        (a.flight || a.r || '').trim(),
        a.flag || a.country || '—',
        null,
        Math.floor(Date.now() / 1000),
        a.lon,
        a.lat,
        altM,
        altRaw === 'ground',
        velMs,
        typeof a.track === 'number' ? a.track : (a.true_heading || 0),
        typeof a.baro_rate === 'number' ? a.baro_rate * 0.00508 : 0,
        null,
        a.alt_geom != null ? a.alt_geom * 0.3048 : altM,
        a.squawk || null,
        false,
        0,
      ];
    });
}

function inBox(s) {
  return s[5] != null && s[6] != null &&
    s[6] >= BBOX.lamin && s[6] <= BBOX.lamax &&
    s[5] >= BBOX.lomin && s[5] <= BBOX.lomax;
}

async function tryAdsbLol() {
  const url = `https://api.adsb.lol/v2/lat/${CENTER.lat}/lon/${CENTER.lon}/dist/${CENTER.distNm}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error('adsb.lol ' + r.status);
  const d = await r.json();
  return fromAdsb(d.ac || d.aircraft);
}

async function tryAdsbFi() {
  const url = `https://opendata.adsb.fi/api/v2/lat/${CENTER.lat}/lon/${CENTER.lon}/dist/${CENTER.distNm}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error('adsb.fi ' + r.status);
  const d = await r.json();
  return fromAdsb(d.ac || d.aircraft);
}

async function tryOpenSky() {
  const q = `lamin=${BBOX.lamin}&lomin=${BBOX.lomin}&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;
  const r = await fetch(`https://opensky-network.org/api/states/all?${q}`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error('opensky ' + r.status);
  const d = await r.json();
  return (d.states || []);
}

router.get('/', async (req, res) => {
  const now = Date.now();
  if (_cache.payload && now - _cache.at < CACHE_MS) {
    return res.json(_cache.payload);
  }

  let states = [];
  let source = 'none';
  for (const [name, fn] of [['adsb.lol', tryAdsbLol], ['adsb.fi', tryAdsbFi], ['opensky', tryOpenSky]]) {
    try {
      const s = await fn();
      if (s && s.length) {
        states = s.filter(inBox);
        source = name;
        break;
      }
    } catch (e) {
      // try next provider
    }
  }

  const payload = { states, source, time: Math.floor(now / 1000) };
  _cache = { at: now, payload };
  res.json(payload);
});

export default router;
