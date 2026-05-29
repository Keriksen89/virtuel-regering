import express from 'express';
const router = express.Router();

// Real-time AIS via aisstream.io (free API key required, set AISSTREAM_API_KEY).
// We hold one WebSocket open, accumulate vessel positions in memory, and serve
// the live snapshot over REST. No simulated data — if there is no key or no
// connection, we return an empty list with a status flag.

const API_KEY = process.env.AISSTREAM_API_KEY || '';
const WS_URL = 'wss://stream.aisstream.io/v0/stream';
// Danish waters bounding box [[minLat,minLon],[maxLat,maxLon]]
const BBOX = [[54.4, 7.5], [58.2, 15.6]];
const STALE_MS = 6 * 60 * 1000;   // drop vessels not heard from in 6 min
const MAX_VESSELS = 800;

const vessels = new Map(); // mmsi -> { mmsi, name, pos:[lon,lat], cog, sog, heading, type, t }
let status = API_KEY ? 'connecting' : 'no-key';
let ws = null;
let reconnectDelay = 2000;

function connect() {
  if (!API_KEY) { status = 'no-key'; return; }
  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    status = 'error';
    scheduleReconnect();
    return;
  }

  ws.addEventListener('open', () => {
    status = 'live';
    reconnectDelay = 2000;
    ws.send(JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: [BBOX],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    }));
  });

  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString()); }
    catch { return; }
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

  ws.addEventListener('close', () => { status = 'reconnecting'; scheduleReconnect(); });
  ws.addEventListener('error', () => { status = 'error'; try { ws.close(); } catch {} });
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

setInterval(pruneStale, 60000).unref();
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
