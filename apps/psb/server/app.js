import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './lib/config.js';
import { initDb } from './lib/db.js';
import { loadUser } from './lib/auth.js';
import { HttpError } from './lib/util.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import portalRoutes from './routes/portal.js';
import adminRoutes from './routes/admin.js';
import fileRoutes from './routes/files.js';
import { seedBase } from './seed.js';
import { ensureBucket } from './lib/storage.js';

// Pastikan database siap & data dasar ada (sekali per proses / cold start)
let ready = null;
export const ensureReady = () => (ready ||= (async () => { await initDb(); await seedBase(); await ensureBucket().catch((e) => console.error('Bucket:', e.message)); })().catch((e) => { ready = null; throw e; }));

export function createApp({ serveStatic } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const storageOrigin = config.supabaseUrl ? [config.supabaseUrl] : [];
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', ...storageOrigin],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'self'", 'blob:', ...storageOrigin],
        objectSrc: ["'self'", 'blob:', ...storageOrigin],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  // Di Netlify Functions tidak ada socket asli: ambil IP klien dari header CDN
  app.use((req, _res, next) => {
    if (!req.ip) {
      const ip = req.headers['x-nf-client-connection-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '0.0.0.0';
      Object.defineProperty(req, 'ip', { value: ip, configurable: true });
    }
    next();
  });
  app.use(async (_req, _res, next) => { try { await ensureReady(); next(); } catch (e) { next(e); } });
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

  serveStatic?.(app);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = `Ukuran berkas maksimal ${config.maxUploadMB} MB.`; }
    if (err.type === 'entity.parse.failed') { status = 400; message = 'Format data tidak valid.'; }
    if (err.code === '23505') { status = 409; message = 'Data sudah ada.'; }
    if (status >= 500) { console.error(err); message = 'Terjadi kesalahan pada server.'; }
    res.status(status).json({ error: message, fields: err.details });
  });
  return app;
}
