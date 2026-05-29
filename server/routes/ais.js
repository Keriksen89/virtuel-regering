import express from 'express';
import WebSocket from 'ws';

const router = express.Router();

// Real-time AIS via aisstream.io. Holds one WebSocket open, accumulates vessel
// positions in memory, and serves a live snapshot over REST. No simulated data
// — returns empty list with status flag if key is absent or connection fails.

const API_KEY = process.env.AISSTREAM_API_KEY || '';
const WS_URL = 'wss://stream.aisstream.io/v0/stream';
// Danish waters bounding box [[minLat,minLon],[maxLat,maxLon]]
const BBOX = [[54.4, 7.5], [58.2, 15.6]];
const STALE_MS = 6 * 60 * 1000;   // drop vessels not heard from in 6 min
const MAX_VESSELS = 800;
const CONNECT_TIMEOUT_MS = 45000; // mark error if no open within 45s
const PING_INTERVAL_MS = 30000;   // keepalive ping every 30s

// DigitalTraffic (Finland) — free no-auth Baltic/North-Sea AIS REST
const DT_LOC_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations';
const DT_VES_URL = 'https://meri.digitraffic.fi/api/ais/v1/vessels';
const DT_HEADERS = { 'Digitraffic-User': 'VirtuelRegering/2.0', Accept: 'application/json' };
// Danish waters bbox for server-side filter
const BBOX_LAT = [54.3, 58.3], BBOX_LON = [7.3, 15.7];

const vessels = new Map(); // mmsi -> { mmsi, name, pos:[lon,lat], cog, sog, heading, type, t }
let status = API_KEY ? 'connecting' : 'no-key';
let ws = null;
let reconnectDelay = 2000;
let connectTimer = null;
let pingTimer = null;

function clearTimers() {
  if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
  if (pingTimer)    { clearInterval(pingTimer);   pingTimer = null; }
}

function connect() {
  if (!API_KEY) { status = 'no-key'; return; }
  status = 'connecting';
  clearTimers();

  try {
    ws = new WebSocket(WS_URL, { handshakeTimeout: 20000 });
  } catch (e) {
    status = 'error';
    scheduleReconnect();
    return;
  }

  // Watchdog: if socket never opens, force-reconnect
  connectTimer = setTimeout(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      status = 'error';
      try { ws.terminate(); } catch {}
    }
  }, CONNECT_TIMEOUT_MS);

  ws.on('open', () => {
    clearTimers();
    status = 'live';
    reconnectDelay = 2000;
    ws.send(JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: [BBOX],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    }));
    // Keepalive: send ping frame every 30s
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.ping();
    }, PING_INTERVAL_MS);
  });

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    const meta = msg.MetaData || {};
    const mmsi = meta.MMSI || (msg.Message && msg.Message.PositionReport && msg.Message.PositionReport.UserID);
    if (!mmsi) return;

    if (msg.MessageType === 'PositionReport' && msg.Message && msg.Message.PositionReport) {
      const pr = msg.Message.PositionReport;
      const lat = pr.Latitude, lon = pr.Longitude;
      if (lat == null || lon == null) return;
      const existing = vessels.get(mmsi) || {};
      vessels.set(mmsi, {
        mmsi,
        name: (meta.ShipName || existing.name || '').trim() || ('MMSI ' + mmsi),
        pos: [lon, lat],
        cog: pr.Cog != null ? pr.Cog : (existing.cog || 0),
        sog: pr.Sog != null ? pr.Sog : (existing.sog || 0),
        heading: (pr.TrueHeading != null && pr.TrueHeading < 360) ? pr.TrueHeading : (existing.heading || pr.Cog || 0),
        type: existing.type || 'vessel',
        nav: pr.NavigationalStatus != null ? pr.NavigationalStatus : (existing.nav ?? null),
        t: Date.now(),
      });
    } else if (msg.MessageType === 'ShipStaticData' && msg.Message && msg.Message.ShipStaticData) {
      const sd = msg.Message.ShipStaticData;
      const existing = vessels.get(mmsi);
      if (existing) {
        existing.name = (meta.ShipName || sd.Name || existing.name || '').trim() || existing.name;
        existing.type = shipTypeLabel(sd.Type) || existing.type;
      }
    }

    if (vessels.size > MAX_VESSELS) pruneOldest();
  });

  ws.on('close', () => {
    clearTimers();
    status = 'reconnecting';
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error('[ais] WebSocket error:', err.message);
    status = 'error';
    clearTimers();
    try { ws.terminate(); } catch {}
  });
}

function scheduleReconnect() {
  setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 60000);
}

function pruneStale() {
  const cutoff = Date.now() - STALE_MS;
  for (const [mmsi, v] of vessels) if (v.t < cutoff) vessels.delete(mmsi);
}

function pruneOldest() {
  const arr = [...vessels.entries()].sort((a, b) => a[1].t - b[1].t);
  const drop = arr.slice(0, arr.length - MAX_VESSELS);
  for (const [mmsi] of drop) vessels.delete(mmsi);
}

function shipTypeLabel(t) {
  if (t == null) return null;
  if (t >= 60 && t <= 69) return 'passenger';
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 40 && t <= 49) return 'hsc';
  if (t >= 30 && t <= 39) return 'fishing/special';
  return 'vessel';
}

// ── DigitalTraffic REST fallback (Baltic coverage, no auth) ──────────────────
let _dtVesselNames = new Map(); // mmsi → {name, type}
let _dtVesselsFetchedAt = 0;

async function fetchDigitalTraffic() {
  try {
    // Refresh vessel metadata once per hour
    if (Date.now() - _dtVesselsFetchedAt > 3600000) {
      const rv = await fetch(DT_VES_URL, { headers: DT_HEADERS, signal: AbortSignal.timeout(8000) });
      if (rv.ok) {
        const list = await rv.json();
        _dtVesselNames = new Map((list || []).map(v => [v.mmsi, { name: v.name || '', type: shipTypeLabel(v.shipType) }]));
        _dtVesselsFetchedAt = Date.now();
      }
    }
    const rl = await fetch(DT_LOC_URL, { headers: DT_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!rl.ok) return;
    const locs = await rl.json();
    let added = 0;
    for (const l of (locs || [])) {
      // DigitalTraffic uses x/y for lon/lat in some versions, lat/lon in others
      const lat = l.y ?? l.lat;
      const lon = l.x ?? l.lon;
      if (lat == null || lon == null) continue;
      if (lat < BBOX_LAT[0] || lat > BBOX_LAT[1] || lon < BBOX_LON[0] || lon > BBOX_LON[1]) continue;
      const mmsi = l.mmsi;
      if (!mmsi) continue;
      const meta = _dtVesselNames.get(mmsi) || {};
      const existing = vessels.get(mmsi) || {};
      // Don't overwrite fresher aisstream data
      if (existing.t && Date.now() - existing.t < 120000) continue;
      vessels.set(mmsi, {
        mmsi,
        name: (meta.name || existing.name || '').trim() || ('MMSI ' + mmsi),
        pos: [lon, lat],
        cog: l.cog ?? existing.cog ?? 0,
        sog: l.sog ?? existing.sog ?? 0,
        heading: (l.heading != null && l.heading < 360) ? l.heading : (existing.heading ?? l.cog ?? 0),
        type: meta.type || existing.type || 'vessel',
        nav: l.navStat ?? existing.nav ?? null,
        t: Date.now(),
        src: 'digitraffic',
      });
      added++;
    }
    if (added > 0 && status !== 'live') status = 'live';
  } catch { /* silently skip */ }
}

setInterval(pruneStale, 60000).unref();
setInterval(fetchDigitalTraffic, 90000).unref(); // supplement every 90s
fetchDigitalTraffic(); // initial poll on startup
connect();

router.get('/', (req, res) => {
  pruneStale();
  res.json({
    status,
    count: vessels.size,
    vessels: [...vessels.values()],
    time: Math.floor(Date.now() / 1000),
  });
});

export default router;
