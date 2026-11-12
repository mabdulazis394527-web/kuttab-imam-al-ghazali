import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { config, ROOT } from './lib/config.js';
import { one } from './lib/db.js';
import { loadUser } from './lib/auth.js';
import { HttpError } from './lib/util.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import portalRoutes from './routes/portal.js';
import adminRoutes from './routes/admin.js';
import fileRoutes from './routes/files.js';
import { seedBase } from './seed.js';

if (!one('SELECT id FROM users LIMIT 1')) seedBase();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'blob:', 'https://www.google.com'],
      objectSrc: ["'self'", 'blob:'],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(loadUser);

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint tidak ditemukan.')));

// Frontend hasil build
const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;
  if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = `Ukuran berkas maksimal ${config.maxUploadMB} MB.`; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Format data tidak valid.'; }
  if (status >= 500) { console.error(err); message = 'Terjadi kesalahan pada server.'; }
  res.status(status).json({ error: message, fields: err.details });
});

app.listen(config.port, () => {
  console.log(`\n  Kuttab Imam Al-Ghazali — PSB berjalan di http://localhost:${config.port}\n`);
});
