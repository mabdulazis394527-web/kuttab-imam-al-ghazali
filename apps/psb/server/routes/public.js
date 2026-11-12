import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { all, one, run, getSettings } from '../lib/db.js';
import { validate, HttpError, parseJSON } from '../lib/util.js';
import { STATUS } from '../../shared/constants.js';

const r = Router();
const PUBLIC_SETTING_KEYS = [
  'school_name', 'tagline', 'vision', 'missions', 'address', 'city', 'phone', 'whatsapp', 'email',
  'instagram', 'youtube', 'maps_url', 'academic_year', 'bank_accounts', 'hero_title', 'hero_subtitle',
  'registration_open', 'office_hours', 'requirements',
];

export const ACTIVE_STATUSES = `'accepted','reregistration','enrolled'`;

export function programsWithFill() {
  return all(`SELECT p.*,
      (SELECT COUNT(*) FROM applications a WHERE a.program_id=p.id AND a.status IN (${ACTIVE_STATUSES})) AS filled,
      (SELECT COUNT(*) FROM applications a WHERE a.program_id=p.id AND a.status NOT IN ('draft','cancelled')) AS applicants
    FROM programs p ORDER BY p.sort, p.id`).map((p) => ({ ...p, highlights: parseJSON(p.highlights, []) }));
}

export function currentWave() {
  const today = new Date().toISOString().slice(0, 10);
  return one('SELECT * FROM waves WHERE active=1 AND start_date<=? AND end_date>=? ORDER BY start_date LIMIT 1', today, today) || null;
}

r.get('/info', (_req, res) => {
  const s = getSettings();
  const settings = Object.fromEntries(PUBLIC_SETTING_KEYS.map((k) => [k, s[k] ?? null]));
  const programs = programsWithFill().filter((p) => p.active);
  const waves = all('SELECT * FROM waves WHERE active=1 ORDER BY start_date');
  const faqs = all('SELECT id,question,answer FROM faqs WHERE published=1 ORDER BY sort,id');
  const announcements = all("SELECT id,title,body,pinned,created_at FROM announcements WHERE published=1 AND audience='public' ORDER BY pinned DESC, created_at DESC LIMIT 6");
  const totals = one(`SELECT COUNT(*) AS applicants FROM applications WHERE status NOT IN ('draft','cancelled')`);
  res.json({ settings, programs, waves, currentWave: currentWave(), faqs, announcements, totals });
});

const statusLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' } });

// Cek status publik: wajib nomor pendaftaran + tanggal lahir ananda
r.post('/status', statusLimiter, (req, res) => {
  const { reg_number, birth_date } = validate(z.object({
    reg_number: z.string().trim().min(5, 'Nomor pendaftaran wajib diisi'),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir wajib diisi'),
  }), req.body);
  const a = one(`SELECT a.id,a.reg_number,a.full_name,a.status,a.birth_date,a.observation_at,a.observation_place,
      p.name AS program_name, w.name AS wave_name, w.announcement_date
    FROM applications a LEFT JOIN programs p ON p.id=a.program_id LEFT JOIN waves w ON w.id=a.wave_id
    WHERE a.reg_number=? COLLATE NOCASE`, reg_number);
  if (!a || a.birth_date !== birth_date) throw new HttpError(404, 'Data tidak ditemukan. Pastikan nomor pendaftaran dan tanggal lahir sesuai.');
  const history = all('SELECT status, created_at FROM status_history WHERE application_id=? ORDER BY id', a.id)
    .map((h) => ({ ...h, label: STATUS[h.status]?.label }));
  const { id, birth_date: _b, ...rest } = a;
  res.json({ ...rest, status_label: STATUS[a.status]?.label, status_desc: STATUS[a.status]?.desc, history });
});

// Verifikasi keaslian kartu via QR
r.get('/verify/:reg', (req, res) => {
  const a = one(`SELECT a.reg_number,a.full_name,a.status,p.name AS program_name,w.name AS wave_name,w.academic_year
    FROM applications a LEFT JOIN programs p ON p.id=a.program_id LEFT JOIN waves w ON w.id=a.wave_id
    WHERE a.reg_number=? COLLATE NOCASE`, req.params.reg);
  if (!a) throw new HttpError(404, 'Nomor pendaftaran tidak terdaftar.');
  const masked = a.full_name.split(' ').map((w, i) => (i === 0 ? w : w[0] + '.')).join(' ');
  res.json({ ...a, full_name: masked, status_label: STATUS[a.status]?.label, valid: true });
});

r.post('/inquiry', statusLimiter, (req, res) => {
  const d = validate(z.object({
    name: z.string().trim().min(2, 'Nama wajib diisi').max(100),
    phone: z.string().trim().max(30).optional().default(''),
    email: z.union([z.literal(''), z.email('Email tidak valid')]).optional().default(''),
    message: z.string().trim().min(5, 'Pesan terlalu pendek').max(2000),
  }), req.body);
  run('INSERT INTO inquiries(name,phone,email,message) VALUES(?,?,?,?)', d.name, d.phone, d.email, d.message);
  res.status(201).json({ ok: true });
});

export default r;
