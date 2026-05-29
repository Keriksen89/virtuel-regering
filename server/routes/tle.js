import express from 'express';
const router = express.Router();

const BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const FETCH_HEADERS = { 'User-Agent': 'VirtuelRegering/2.0 (satellite-tracker; +https://oculusomnividens.dk)' };
const CACHE_MS = 3 * 60 * 60 * 1000; // 3 hours

// Groups to fetch. limit = max satellites to include from that group.
const GROUPS = [
  { url: `${BASE}?GROUP=stations&FORMAT=tle`,  limit: 999 },  // ~10 space stations
  { url: `${BASE}?GROUP=weather&FORMAT=tle`,   limit: 999 },  // ~30 weather satellites
  { url: `${BASE}?GROUP=gps-ops&FORMAT=tle`,   limit: 999 },  // ~31 GPS satellites
  { url: `${BASE}?GROUP=starlink&FORMAT=tle`,  limit: 200 },  // cap Starlink at 200
  { url: `${BASE}?GROUP=resource&FORMAT=tle`,  limit: 60  },  // earth observation
  { url: `${BASE}?GROUP=visual&FORMAT=tle`,    limit: 40  },  // other visible
];

let _cache = { at: 0, text: null };

function parseTLEBlocks(text) {
  const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.length);
  const out = [];
  for (let i = 0; i + 2 < lines.length + 1; i++) {
    if (lines[i + 1]?.[0] === '1' && lines[i + 2]?.[0] === '2') {
      out.push([lines[i], lines[i + 1], lines[i + 2]]);
      i += 2;
    }
  }
  return out;
}

async function fetchGroup({ url, limit }) {
  try {
    const r = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    const text = await r.text();
    if (!text.includes('1 ')) return [];
    const blocks = parseTLEBlocks(text);
    return limit < blocks.length ? blocks.slice(0, limit) : blocks;
  } catch {
    return [];
  }
}

async function buildTLE() {
  const results = await Promise.all(GROUPS.map(fetchGroup));
  const seen = new Set();
  const lines = [];
  for (const blocks of results) {
    for (const [name, l1, l2] of blocks) {
      const key = name.replace(/^0\s+/, '').trim();
      if (!seen.has(key)) {
        seen.add(key);
        lines.push(key, l1, l2);
      }
    }
  }
  return lines.join('\n');
}

router.get('/', async (req, res) => {
  const now = Date.now();
  if (_cache.text && now - _cache.at < CACHE_MS) {
    return res.type('text/plain').send(_cache.text);
  }
  const text = await buildTLE();
  if (text && text.length > 100) {
    _cache = { at: now, text };
    return res.type('text/plain').send(text);
  }
  if (_cache.text) return res.type('text/plain').send(_cache.text);
  res.status(502).json({ error: 'TLE unavailable' });
});

export default router;
