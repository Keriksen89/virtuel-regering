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
import kommunerRouter from './routes/kommuner.js';
import rygterRouter from './routes/rygter.js';
import newsRouter from './routes/news.js';
import xfeedRouter from './routes/xfeed.js';
import openskyRouter from './routes/opensky.js';

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
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://platform.twitter.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", "https://www.reddit.com", "https://opensky-network.org", "https://celestrak.org", "https://celestrak.com", "https://*.basemaps.cartocdn.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://unpkg.com"],
      frameSrc: ["'self'", "https://platform.twitter.com", "https://twitter.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
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
app.use('/api/energi', energiRouter);
app.use('/api/kommuner', kommunerRouter);
app.use('/api/rygter', rygterRouter);
app.use('/api/news', newsRouter);
app.use('/api/xfeed', xfeedRouter);
app.use('/api/opensky', openskyRouter);

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
