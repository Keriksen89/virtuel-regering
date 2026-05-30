import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dstRouter from './routes/dst.js';
import odaRouter from './routes/oda.js';
import budgetRouter from './routes/budget.js';
import partyRouter from './routes/party.js';
import demoRouter from './routes/demographics.js';
import governmentRouter from './routes/government.js';
import livedataRouter from './routes/livedata.js';
import borgerforslagRouter from './routes/borgerforslag.js';
import energiRouter from './routes/energi.js';
import gridfreqRouter from './routes/gridfreq.js';
import togRouter from './routes/tog.js';
import nationalbankRouter from './routes/nationalbank.js';
import kommunerRouter from './routes/kommuner.js';
import rygterRouter from './routes/rygter.js';
import newsRouter from './routes/news.js';
import xfeedRouter from './routes/xfeed.js';
import openskyRouter from './routes/opensky.js';
import aisRouter from './routes/ais.js';
import tleRouter from './routes/tle.js';
import geoconfigRouter from './routes/geoconfig.js';
import dmiRouter from './routes/dmi.js';
import kystRouter from './routes/kyst.js';
import stocksRouter from './routes/stocks.js';
import politikerRouter from './routes/politiker.js';
import trafikRouter from './routes/trafik.js';
import derivedRouter from './routes/derived.js';
import telecomRouter from './routes/telecom.js';
import wifiRouter from './routes/wifi.js';
import luftkvalitetRouter from './routes/luftkvalitet.js';
import seismikRouter from './routes/seismik.js';
import vandstandRouter from './routes/vandstand.js';
import elspotRouter from './routes/elspot.js';
import ladestanderRouter from './routes/ladestander.js';
import flystatusRouter from './routes/flystatus.js';
import cvrRouter from './routes/cvr.js';
import kriminalitetRouter from './routes/kriminalitet.js';
import udbudRouter from './routes/udbud.js';
import bbrRouter from './routes/bbr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // CesiumJS needs WASM ('wasm-unsafe-eval') and spawns its workers from
      // blob: URLs.
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "blob:", "https://unpkg.com", "https://platform.twitter.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      // Cesium ion (tokens + asset CDN), Google Photorealistic 3D Tiles, and
      // token-free OpenStreetMap raster imagery.
      connectSrc: ["'self'", "data:", "https://www.reddit.com", "https://*.basemaps.cartocdn.com", "https://celestrak.org", "https://celestrak.com", "https://api.cesium.com", "https://assets.ion.cesium.com", "https://*.cesium.com", "https://tile.googleapis.com", "https://tile.openstreetmap.org", "https://*.tile.openstreetmap.org", "https://api.open-meteo.com", "https://air-quality-api.open-meteo.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://unpkg.com"],
      frameSrc: ["'self'", "https://platform.twitter.com", "https://twitter.com", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      // Don't force assets to HTTPS — the app may be served over plain HTTP
      // (e.g. before a TLS cert is installed, or behind a proxy that
      // terminates TLS). With SSL configured everything is HTTPS anyway.
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false,
  // Google's referer-restricted Maps key requires a Referer header matching the
  // site. Helmet's default (no-referrer) strips it entirely, so every tile
  // fetch to tile.googleapis.com 403s. strict-origin-when-cross-origin sends
  // just the origin (https://oculusomnividens.dk/) cross-origin — enough to
  // satisfy the key restriction without leaking full URLs.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '64kb' }));

app.use('/api/dst', dstRouter);
app.use('/api/oda', odaRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/party', partyRouter);
app.use('/api/demographics', demoRouter);
app.use('/api/government', governmentRouter);
app.use('/api/livedata', livedataRouter);
app.use('/api/borgerforslag', borgerforslagRouter);
app.use('/api/energi', gridfreqRouter);
app.use('/api/energi', energiRouter);
app.use('/api/tog', togRouter);
app.use('/api/nationalbank', nationalbankRouter);
app.use('/api/kommuner', kommunerRouter);
app.use('/api/rygter', rygterRouter);
app.use('/api/news', newsRouter);
app.use('/api/xfeed', xfeedRouter);
app.use('/api/opensky', openskyRouter);
app.use('/api/ais', aisRouter);
app.use('/api/tle', tleRouter);
app.use('/api/geo', geoconfigRouter);
app.use('/api/dmi', dmiRouter);
app.use('/api/kyst', kystRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/politiker', politikerRouter);
app.use('/api/trafik', trafikRouter);
app.use('/api/derived', derivedRouter);
app.use('/api/telecom', telecomRouter);
app.use('/api/wifi', wifiRouter);
app.use('/api/luftkvalitet', luftkvalitetRouter);
app.use('/api/seismik', seismikRouter);
app.use('/api/vandstand', vandstandRouter);
app.use('/api/elspot', elspotRouter);
app.use('/api/ladestander', ladestanderRouter);
app.use('/api/flystatus', flystatusRouter);
app.use('/api/cvr', cvrRouter);
app.use('/api/kriminalitet', kriminalitetRouter);
app.use('/api/udbud', udbudRouter);
app.use('/api/bbr', bbrRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(express.static(PUBLIC_DIR, {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filepath) => {
    // HTML and app source must revalidate so deploys reach users immediately.
    // The large immutable vendor bundle can still be cached aggressively.
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filepath.includes(`${path.sep}vendor${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    } else if (filepath.endsWith('.js') || filepath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Oculus Omnividens listening on http://${HOST}:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
