import express from 'express';
const router = express.Router();

const SOURCES = [
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle',
  'https://celestrak.com/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle',
  'https://celestrak.org/NORAD/elements/visual.txt',
];
const FETCH_HEADERS = { 'User-Agent': 'VirtuelRegering/2.0 (satellite-tracker; +https://virtuel-regering.onrender.com)' };
const CACHE_MS = 4 * 60 * 60 * 1000; // 4 hours
let _cache = { at: 0, text: null };

async function fetchTLE() {
  for (const url of SOURCES) {
    try {
      const r = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const text = await r.text();
      if (text.trim().length < 100 || !text.includes('1 ')) continue;
      return text;
    } catch { /* try next */ }
  }
  return null;
}

router.get('/', async (req, res) => {
  const now = Date.now();
  if (_cache.text && now - _cache.at < CACHE_MS) {
    return res.type('text/plain').send(_cache.text);
  }
  const text = await fetchTLE();
  if (text) {
    _cache = { at: now, text };
    return res.type('text/plain').send(text);
  }
  if (_cache.text) return res.type('text/plain').send(_cache.text);
  res.status(502).json({ error: 'TLE unavailable' });
});

export default router;
