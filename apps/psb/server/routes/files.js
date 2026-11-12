import { Router } from 'express';
import { one } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { sendStored } from '../lib/storage.js';
import { HttpError } from '../lib/util.js';

const r = Router();
r.use(requireAuth);

async function send(req, res, row, filename, mime, ownerId) {
  if (!row || !filename) throw new HttpError(404, 'Berkas tidak ditemukan.');
  const staff = ['admin', 'panitia'].includes(req.user.role);
  if (!staff && ownerId !== req.user.id) throw new HttpError(403, 'Anda tidak memiliki akses ke berkas ini.');
  await sendStored(res, filename, mime);
}

const num = (v) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'ID tidak valid.'); return n; };

r.get('/document/:id', async (req, res) => {
  const d = await one('SELECT d.*, a.user_id FROM documents d JOIN applications a ON a.id=d.application_id WHERE d.id=?', num(req.params.id));
  await send(req, res, d, d?.filename, d?.mime, d?.user_id);
});

r.get('/payment/:id', async (req, res) => {
  const p = await one('SELECT p.*, a.user_id FROM payments p JOIN applications a ON a.id=p.application_id WHERE p.id=?', num(req.params.id));
  await send(req, res, p, p?.proof_filename, p?.proof_mime, p?.user_id);
});

export default r;
