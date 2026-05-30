import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const DEFAULT_TICKERS = [
  // Danish indices + stocks
  { symbol: '^OMXC25',    name: 'OMX C25',       type: 'index', country: 'DK' },
  { symbol: 'NOVO-B.CO',  name: 'Novo Nordisk',  type: 'stock', country: 'DK' },
  { symbol: 'DSV.CO',     name: 'DSV',            type: 'stock', country: 'DK' },
  { symbol: 'MAERSK-B.CO',name: 'A.P. Møller',   type: 'stock', country: 'DK' },
  { symbol: 'ORSTED.CO',  name: 'Ørsted',         type: 'stock', country: 'DK' },
  { symbol: 'CARL-B.CO',  name: 'Carlsberg',      type: 'stock', country: 'DK' },
  // Global indices
  { symbol: '^GSPC',      name: 'S&P 500',        type: 'index', country: 'US' },
  { symbol: '^IXIC',      name: 'NASDAQ',          type: 'index', country: 'US' },
  { symbol: '^GDAXI',     name: 'DAX',             type: 'index', country: 'DE' },
  { symbol: '^FTSE',      name: 'FTSE 100',        type: 'index', country: 'GB' },
  { symbol: '^OMXS30',    name: 'OMX Stockholm',  type: 'index', country: 'SE' },
  // Commodities
  { symbol: 'GC=F',       name: 'Guld',            type: 'commodity', country: null },
  { symbol: 'CL=F',       name: 'Råolie (WTI)',   type: 'commodity', country: null },
  // Crypto
  { symbol: 'BTC-USD',    name: 'Bitcoin',         type: 'crypto', country: null },
];

const FALLBACK_QUOTES = DEFAULT_TICKERS.map(t => ({
  ...t,
  price: null, change: null, changePct: null, currency: t.country === 'DK' ? 'DKK' : 'USD',
  isFallback: true,
}));

async function fetchQuote(ticker) {
  const url = `${YAHOO_BASE}/${encodeURIComponent(ticker.symbol)}?interval=1d&range=1d`;
  const data = await fetchJSON(url, { timeout: 8000 });
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price  = meta.regularMarketPrice ?? null;
  const prev   = meta.previousClose ?? meta.chartPreviousClose ?? null;
  const change = price != null && prev != null ? price - prev : null;
  const changePct = change != null && prev ? (change / prev) * 100 : null;
  return {
    ...ticker,
    price,
    change,
    changePct,
    currency: meta.currency || 'USD',
    marketState: meta.marketState || 'CLOSED',
    isFallback: false,
  };
}

// GET /quotes — fetch quotes for a comma-separated list of symbols, or all defaults
router.get('/quotes', async (req, res) => {
  const requested = req.query.symbols
    ? req.query.symbols.split(',').map(s => s.trim().toUpperCase())
    : null;
  const tickers = requested
    ? requested.map(sym => DEFAULT_TICKERS.find(t => t.symbol === sym) || { symbol: sym, name: sym, type: 'stock', country: null })
    : DEFAULT_TICKERS;

  const cacheKey = `stocks:quotes:${tickers.map(t => t.symbol).join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const results = await Promise.allSettled(tickers.map(t => fetchQuote(t)));
  const quotes = results.map((r, i) =>
    r.status === 'fulfilled' && r.value ? r.value : { ...tickers[i], price: null, change: null, changePct: null, isFallback: true }
  );

  const hasData = quotes.some(q => !q.isFallback);
  const ttl = hasData ? 5 * 60 : 60;  // 5 min if live, 1 min if all failed
  cache.set(cacheKey, quotes, ttl);
  res.setHeader('X-Cache', 'MISS');
  res.json(quotes);
});

// GET /ticker/:symbol — single ticker detail
router.get('/ticker/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const cacheKey = `stocks:ticker:${sym}`;
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const ticker = DEFAULT_TICKERS.find(t => t.symbol === sym) || { symbol: sym, name: sym, type: 'stock', country: null };
  try {
    const quote = await fetchQuote(ticker);
    const result = quote || { ...ticker, price: null, change: null, changePct: null, isFallback: true };
    cache.set(cacheKey, result, 5 * 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[stocks] ticker failed:', sym, err.message);
    const fb = { ...ticker, price: null, change: null, changePct: null, isFallback: true };
    cache.set(cacheKey, fb, 60);
    res.json(fb);
  }
});

export default router;
