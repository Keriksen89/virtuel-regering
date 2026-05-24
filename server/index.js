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
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
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
    if (filepath.endsWith('.html')) {
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
  console.log(`Virtuel Regering 1.0 listening on http://${HOST}:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
