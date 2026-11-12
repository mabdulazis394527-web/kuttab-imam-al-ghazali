import { Router } from 'express';
import fs from 'node:fs';
import { one } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { uploadPath } from '../lib/upload.js';
import { HttpError } from '../lib/util.js';

const r = Router();
r.use(requireAuth);

function send(req, res, row, filename, mime, ownerId) {
  if (!row) throw new HttpError(404, 'Berkas tidak ditemukan.');
  const staff = ['admin', 'panitia'].includes(req.user.role);
  if (!staff && ownerId !== req.user.id) throw new HttpError(403, 'Anda tidak memiliki akses ke berkas ini.');
  const p = uploadPath(filename);
  if (!fs.existsSync(p)) throw new HttpError(404, 'Berkas tidak ditemukan.');
  res.setHeader('Content-Type', mime || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(p);
}

r.get('/document/:id', (req, res) => {
  const d = one('SELECT d.*, a.user_id FROM documents d JOIN applications a ON a.id=d.application_id WHERE d.id=?', Number(req.params.id));
  send(req, res, d, d?.filename, d?.mime, d?.user_id);
});

r.get('/payment/:id', (req, res) => {
  const p = one('SELECT p.*, a.user_id FROM payments p JOIN applications a ON a.id=p.application_id WHERE p.id=?', Number(req.params.id));
  const mime = p?.proof_filename?.endsWith('.pdf') ? 'application/pdf' : p?.proof_filename?.endsWith('.png') ? 'image/png' : p?.proof_filename?.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  send(req, res, p, p?.proof_filename, mime, p?.user_id);
});

export default r;
