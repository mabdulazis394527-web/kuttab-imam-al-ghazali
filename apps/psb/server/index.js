// Server lokal / VPS: API + frontend hasil build (dist/)
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config, ROOT } from './lib/config.js';
import { createApp, ensureReady } from './app.js';

const dist = path.join(ROOT, 'dist');
const app = createApp({
  serveStatic: (a) => {
    if (!fs.existsSync(dist)) return;
    a.use(express.static(dist, { index: false, maxAge: '1h' }));
    a.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  },
});

await ensureReady();
app.listen(config.port, () => {
  console.log(`\n  Kuttab Imam Al-Ghazali — PSB berjalan di http://localhost:${config.port}\n`);
});
