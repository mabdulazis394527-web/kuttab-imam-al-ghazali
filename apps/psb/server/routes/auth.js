import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { one, run, insert } from '../lib/db.js';
import { issueToken, clearToken, requireAuth } from '../lib/auth.js';
import { validate, HttpError, audit, notify } from '../lib/util.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi 15 menit lagi.' } });

const phone = z.string().trim().regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)');
const password = z.string().min(8, 'Kata sandi minimal 8 karakter').max(100);

r.post('/register', limiter, async (req, res) => {
  const d = validate(z.object({
    name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(100),
    email: z.email('Email tidak valid').transform((s) => s.toLowerCase()),
    phone, password,
  }), req.body);
  if (await one('SELECT id FROM users WHERE email=?', d.email)) throw new HttpError(409, 'Email sudah terdaftar. Silakan masuk.', { email: 'Email sudah terdaftar' });
  const hash = await bcrypt.hash(d.password, 10);
  const id = await insert('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)', d.name, d.email, d.phone, hash, 'parent');
  const user = await one('SELECT id,name,email,phone,role FROM users WHERE id=?', id);
  await notify(user.id, 'Ahlan wa sahlan!', 'Akun Anda berhasil dibuat. Silakan mulai mengisi formulir pendaftaran ananda.', '/portal');
  issueToken(res, user);
  req.user = user; await audit(req, 'register', 'user', user.id);
  res.status(201).json({ user });
});

r.post('/login', limiter, async (req, res) => {
  const d = validate(z.object({ email: z.string().trim().min(1, 'Email wajib diisi'), password: z.string().min(1, 'Kata sandi wajib diisi') }), req.body);
  const u = await one('SELECT * FROM users WHERE email=?', d.email.toLowerCase());
  if (!u || !(await bcrypt.compare(d.password, u.password_hash))) throw new HttpError(401, 'Email atau kata sandi salah.');
  if (!u.active) throw new HttpError(403, 'Akun dinonaktifkan. Hubungi panitia.');
  await run('UPDATE users SET last_login_at=now_txt() WHERE id=?', u.id);
  issueToken(res, u);
  const user = { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
  req.user = user; await audit(req, 'login', 'user', u.id);
  res.json({ user });
});

r.post('/logout', (_req, res) => { clearToken(res); res.json({ ok: true }); });

r.get('/me', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!req.user) return res.json({ user: null });
  const { c } = await one('SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND read_at IS NULL', req.user.id);
  res.json({ user: req.user, unread: c });
});

r.put('/profile', requireAuth, async (req, res) => {
  const d = validate(z.object({ name: z.string().trim().min(3).max(100), phone }), req.body);
  await run('UPDATE users SET name=?, phone=? WHERE id=?', d.name, d.phone, req.user.id);
  res.json({ user: await one('SELECT id,name,email,phone,role FROM users WHERE id=?', req.user.id) });
});

r.put('/password', requireAuth, async (req, res) => {
  const d = validate(z.object({ current: z.string().min(1, 'Wajib diisi'), password }), req.body);
  const u = await one('SELECT password_hash FROM users WHERE id=?', req.user.id);
  if (!(await bcrypt.compare(d.current, u.password_hash))) throw new HttpError(400, 'Kata sandi lama salah.', { current: 'Kata sandi lama salah' });
  await run('UPDATE users SET password_hash=? WHERE id=?', await bcrypt.hash(d.password, 10), req.user.id);
  await audit(req, 'change_password', 'user', req.user.id);
  res.json({ ok: true });
});

export default r;
