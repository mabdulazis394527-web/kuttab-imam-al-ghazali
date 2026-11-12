import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs';
import QRCode from 'qrcode';
import { all, one, run, tx, getSettings } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { upload, uploadPath } from '../lib/upload.js';
import { validate, HttpError, audit, changeStatus, hydrateApp, asyncH } from '../lib/util.js';
import { DOC_TYPES, STATUS, ageAt, academicRefDate } from '../../shared/constants.js';
import { currentWave } from './public.js';

const r = Router();
r.use(requireAuth);

const EDITABLE = ['draft', 'revision'];
const DOC_EDITABLE = ['draft', 'revision', 'waiting_payment', 'verification'];

function ownApp(req, id) {
  const a = one('SELECT * FROM applications WHERE id=? AND user_id=?', Number(id), req.user.id);
  if (!a) throw new HttpError(404, 'Data pendaftaran tidak ditemukan.');
  return a;
}

export function appDetail(id) {
  const a = hydrateApp(one(`SELECT a.*, p.name AS program_name, p.code AS program_code, p.age_min, p.age_max,
      w.name AS wave_name, w.academic_year, w.registration_fee, w.announcement_date, w.observation_date
    FROM applications a LEFT JOIN programs p ON p.id=a.program_id LEFT JOIN waves w ON w.id=a.wave_id WHERE a.id=?`, id));
  if (!a) return null;
  a.documents = all('SELECT id,type,original_name,mime,size,status,note,uploaded_at FROM documents WHERE application_id=? ORDER BY id', id);
  a.payments = all('SELECT id,kind,amount,payer_name,bank_name,paid_at,status,note,verified_at,created_at FROM payments WHERE application_id=? ORDER BY id DESC', id);
  a.history = all(`SELECT h.status,h.note,h.created_at,u.name AS actor FROM status_history h LEFT JOIN users u ON u.id=h.actor_id
    WHERE h.application_id=? ORDER BY h.id`, id);
  a.age = a.birth_date && a.academic_year ? ageAt(a.birth_date, academicRefDate(a.academic_year)) : null;
  a.status_label = STATUS[a.status]?.label;
  return a;
}

/** Hitung kelengkapan per bagian formulir — dipakai wizard & validasi kirim. */
export function completeness(a, docs) {
  const f = a.father || {}, m = a.mother || {}, c = a.commitments || {};
  const sections = {
    program: !!(a.program_id && a.wave_id),
    santri: !!(a.full_name && a.gender && a.birth_place && a.birth_date && a.address && a.city),
    kesehatan: !!(a.blood_type !== null && a.blood_type !== undefined && a.height_cm && a.weight_kg),
    orangtua: !!(f.name && f.phone && f.occupation && m.name && m.phone && m.occupation),
    komitmen: !!(a.motivation && c.visi && c.kerjasama && c.adab && c.data),
    berkas: DOC_TYPES.filter((d) => d.required).every((d) => docs.some((x) => x.type === d.key)),
  };
  const done = Object.values(sections).filter(Boolean).length;
  return { sections, percent: Math.round((done / Object.keys(sections).length) * 100), complete: done === Object.keys(sections).length };
}

r.get('/applications', (req, res) => {
  const rows = all(`SELECT a.id,a.reg_number,a.full_name,a.nickname,a.gender,a.birth_date,a.status,a.created_at,a.submitted_at,a.updated_at,
      a.program_id,a.wave_id,a.father,a.mother,a.commitments,a.motivation,a.address,a.city,a.birth_place,a.blood_type,a.height_cm,a.weight_kg,
      p.name AS program_name, w.name AS wave_name, w.academic_year
    FROM applications a LEFT JOIN programs p ON p.id=a.program_id LEFT JOIN waves w ON w.id=a.wave_id
    WHERE a.user_id=? ORDER BY a.id DESC`, req.user.id);
  res.json(rows.map((raw) => {
    const a = hydrateApp(raw);
    const docs = all('SELECT type FROM documents WHERE application_id=?', a.id);
    const photo = one("SELECT id FROM documents WHERE application_id=? AND type='photo'", a.id);
    return {
      id: a.id, reg_number: a.reg_number, full_name: a.full_name, nickname: a.nickname, gender: a.gender, status: a.status,
      status_label: STATUS[a.status]?.label, program_name: a.program_name, wave_name: a.wave_name, academic_year: a.academic_year,
      created_at: a.created_at, submitted_at: a.submitted_at, photo_id: photo?.id ?? null, progress: completeness(a, docs),
    };
  }));
});

r.post('/applications', (req, res) => {
  const d = validate(z.object({ program_id: z.coerce.number().int().positive('Pilih jenjang') }), req.body);
  const program = one('SELECT * FROM programs WHERE id=? AND active=1', d.program_id);
  if (!program) throw new HttpError(400, 'Jenjang tidak tersedia.');
  const s = getSettings();
  if (s.registration_open === false) throw new HttpError(400, 'Pendaftaran sedang ditutup.');
  const wave = currentWave();
  if (!wave) throw new HttpError(400, 'Belum ada gelombang pendaftaran yang dibuka saat ini.');
  const drafts = one("SELECT COUNT(*) c FROM applications WHERE user_id=? AND status='draft'", req.user.id).c;
  if (drafts >= 5) throw new HttpError(400, 'Terlalu banyak draf. Selesaikan draf yang ada terlebih dahulu.');
  const { lastInsertRowid } = run('INSERT INTO applications(user_id,program_id,wave_id,status) VALUES(?,?,?,?)', req.user.id, program.id, wave.id, 'draft');
  run('INSERT INTO status_history(application_id,status,note,actor_id) VALUES(?,?,?,?)', lastInsertRowid, 'draft', 'Formulir dibuat', req.user.id);
  audit(req, 'create_application', 'application', Number(lastInsertRowid));
  res.status(201).json(appDetail(lastInsertRowid));
});

r.get('/applications/:id', (req, res) => {
  const a = ownApp(req, req.params.id);
  const d = appDetail(a.id);
  d.progress = completeness(d, d.documents);
  d.bank_accounts = getSettings().bank_accounts || [];
  d.reregistration_fee = one('SELECT entry_fee FROM programs WHERE id=?', a.program_id)?.entry_fee ?? 0;
  res.json(d);
});

const optStr = (max = 200) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const parentSchema = z.object({
  name: optStr(100), nik: optStr(20), birth_place: optStr(60), birth_date: optStr(10), education: optStr(40),
  occupation: optStr(80), income: optStr(40), phone: optStr(20), email: optStr(100), quran_level: optStr(60), religious_study: optStr(200),
}).partial();

const appSchema = z.object({
  program_id: z.coerce.number().int().positive().optional(),
  full_name: optStr(100), nickname: optStr(40), gender: z.enum(['L', 'P']).optional().nullable(),
  birth_place: optStr(60), birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid').optional().nullable(),
  nik: z.string().trim().regex(/^(\d{16})?$/, 'NIK harus 16 digit').optional().nullable(),
  kk_number: z.string().trim().regex(/^(\d{16})?$/, 'No. KK harus 16 digit').optional().nullable(),
  child_order: z.coerce.number().int().min(1).max(20).optional().nullable(),
  siblings: z.coerce.number().int().min(0).max(20).optional().nullable(),
  address: optStr(300), city: optStr(60), province: optStr(60), postal_code: optStr(10),
  previous_school: optStr(100), quran_ability: optStr(60), memorization: optStr(200),
  blood_type: z.enum(['A', 'B', 'AB', 'O', '-']).optional().nullable(),
  height_cm: z.coerce.number().int().min(50).max(200).optional().nullable(),
  weight_kg: z.coerce.number().int().min(5).max(120).optional().nullable(),
  allergies: optStr(300), medical_history: optStr(500), special_needs: optStr(500),
  father: parentSchema.optional(), mother: parentSchema.optional(), guardian: parentSchema.optional(),
  motivation: optStr(2000), info_source: optStr(60),
  commitments: z.object({ visi: z.boolean(), kerjasama: z.boolean(), adab: z.boolean(), data: z.boolean() }).partial().optional(),
}).partial();

const COLS = ['program_id', 'full_name', 'nickname', 'gender', 'birth_place', 'birth_date', 'nik', 'kk_number', 'child_order', 'siblings',
  'address', 'city', 'province', 'postal_code', 'previous_school', 'quran_ability', 'memorization', 'blood_type', 'height_cm', 'weight_kg',
  'allergies', 'medical_history', 'special_needs', 'motivation', 'info_source'];
const JSON_COLS = ['father', 'mother', 'guardian', 'commitments'];

export function applyUpdate(id, d) {
  const sets = [], vals = [];
  for (const k of COLS) if (k in d) { sets.push(`${k}=?`); vals.push(d[k] === '' ? null : d[k] ?? null); }
  for (const k of JSON_COLS) if (k in d) { sets.push(`${k}=?`); vals.push(JSON.stringify(d[k] || {})); }
  if (!sets.length) return;
  run(`UPDATE applications SET ${sets.join(',')}, updated_at=datetime('now') WHERE id=?`, ...vals, id);
}

r.put('/applications/:id', (req, res) => {
  const a = ownApp(req, req.params.id);
  if (!EDITABLE.includes(a.status)) throw new HttpError(400, 'Data tidak dapat diubah pada tahap ini.');
  const d = validate(appSchema, req.body);
  if (d.program_id && !one('SELECT id FROM programs WHERE id=? AND active=1', d.program_id)) throw new HttpError(400, 'Jenjang tidak tersedia.');
  applyUpdate(a.id, d);
  const out = appDetail(a.id); out.progress = completeness(out, out.documents);
  res.json(out);
});

function generateRegNumber(a) {
  const p = one('SELECT code FROM programs WHERE id=?', a.program_id);
  const w = one('SELECT academic_year FROM waves WHERE id=?', a.wave_id);
  const year = String(w?.academic_year || new Date().getFullYear()).slice(0, 4);
  const prefix = `KIG-${year}-${p.code}-`;
  const last = one('SELECT reg_number FROM applications WHERE reg_number LIKE ? ORDER BY reg_number DESC LIMIT 1', prefix + '%');
  let n = last ? parseInt(last.reg_number.slice(prefix.length), 10) + 1 : 1;
  while (one('SELECT 1 FROM applications WHERE reg_number=?', prefix + String(n).padStart(4, '0'))) n++;
  return prefix + String(n).padStart(4, '0');
}

r.post('/applications/:id/submit', (req, res) => {
  const a0 = ownApp(req, req.params.id);
  if (!EDITABLE.includes(a0.status)) throw new HttpError(400, 'Pendaftaran sudah dikirim.');
  const a = appDetail(a0.id);
  const prog = completeness(a, a.documents);
  if (!prog.complete) {
    const missing = Object.entries(prog.sections).filter(([, v]) => !v).map(([k]) => k);
    throw new HttpError(422, 'Formulir belum lengkap: ' + missing.join(', '), { sections: missing });
  }
  if (a.age && (a.age.years < a.age_min || a.age.years > a.age_max)) {
    throw new HttpError(422, `Usia ananda per 1 Juli adalah ${a.age.years} tahun ${a.age.months} bulan, belum sesuai ketentuan jenjang ${a.program_name} (${a.age_min}–${a.age_max} tahun).`);
  }
  tx(() => {
    if (!a0.reg_number) run("UPDATE applications SET reg_number=?, submitted_at=datetime('now') WHERE id=?", generateRegNumber(a0), a0.id);
    if (a0.status === 'revision') {
      changeStatus(a0.id, 'verification', 'Orang tua telah memperbaiki data dan mengirim ulang.', req.user.id);
    } else {
      const paid = one("SELECT 1 FROM payments WHERE application_id=? AND kind='registration' AND status!='rejected'", a0.id);
      const fee = a.registration_fee || 0;
      changeStatus(a0.id, fee > 0 && !paid ? 'waiting_payment' : 'verification', 'Formulir pendaftaran dikirim.', req.user.id);
    }
  });
  audit(req, 'submit_application', 'application', a0.id);
  res.json(appDetail(a0.id));
});

r.post('/applications/:id/cancel', (req, res) => {
  const a = ownApp(req, req.params.id);
  if (['enrolled', 'cancelled', 'rejected'].includes(a.status)) throw new HttpError(400, 'Pendaftaran tidak dapat dibatalkan.');
  if (a.status === 'draft') {
    for (const d of all('SELECT filename FROM documents WHERE application_id=?', a.id)) fs.rmSync(uploadPath(d.filename), { force: true });
    run('DELETE FROM applications WHERE id=?', a.id);
    audit(req, 'delete_draft', 'application', a.id);
    return res.json({ deleted: true });
  }
  changeStatus(a.id, 'cancelled', 'Dibatalkan oleh orang tua.', req.user.id);
  audit(req, 'cancel_application', 'application', a.id);
  res.json({ ok: true });
});

r.post('/applications/:id/documents/:type', upload.single('file'), (req, res) => {
  const a = ownApp(req, req.params.id);
  const type = DOC_TYPES.find((t) => t.key === req.params.type);
  const cleanup = () => req.file && fs.rmSync(req.file.path, { force: true });
  if (!type) { cleanup(); throw new HttpError(400, 'Jenis berkas tidak dikenal.'); }
  if (!req.file) throw new HttpError(400, 'Berkas belum dipilih.');
  if (!DOC_EDITABLE.includes(a.status)) { cleanup(); throw new HttpError(400, 'Berkas tidak dapat diubah pada tahap ini.'); }
  if (type.accept === 'image' && !req.file.mimetype.startsWith('image/')) { cleanup(); throw new HttpError(400, 'Pas foto harus berupa gambar (JPG/PNG/WEBP).'); }
  const old = one('SELECT * FROM documents WHERE application_id=? AND type=?', a.id, type.key);
  if (old?.status === 'valid' && a.status !== 'draft') { cleanup(); throw new HttpError(400, 'Berkas sudah diverifikasi valid dan tidak perlu diganti.'); }
  if (old) fs.rmSync(uploadPath(old.filename), { force: true });
  run(`INSERT INTO documents(application_id,type,filename,original_name,mime,size,status,note) VALUES(?,?,?,?,?,?, 'pending', NULL)
    ON CONFLICT(application_id,type) DO UPDATE SET filename=excluded.filename, original_name=excluded.original_name, mime=excluded.mime,
    size=excluded.size, status='pending', note=NULL, uploaded_at=datetime('now')`,
  a.id, type.key, req.file.filename, req.file.originalname.slice(0, 120), req.file.mimetype, req.file.size);
  audit(req, 'upload_document', 'application', a.id, { type: type.key });
  res.status(201).json(all('SELECT id,type,original_name,mime,size,status,note,uploaded_at FROM documents WHERE application_id=?', a.id));
});

r.delete('/applications/:id/documents/:type', (req, res) => {
  const a = ownApp(req, req.params.id);
  if (!EDITABLE.includes(a.status)) throw new HttpError(400, 'Berkas tidak dapat dihapus pada tahap ini.');
  const d = one('SELECT * FROM documents WHERE application_id=? AND type=?', a.id, req.params.type);
  if (d) { fs.rmSync(uploadPath(d.filename), { force: true }); run('DELETE FROM documents WHERE id=?', d.id); }
  res.json({ ok: true });
});

r.post('/applications/:id/payments', upload.single('proof'), (req, res) => {
  const cleanup = () => req.file && fs.rmSync(req.file.path, { force: true });
  try {
    const a = appDetail(ownApp(req, req.params.id).id);
    const d = validate(z.object({
      kind: z.enum(['registration', 'reregistration']),
      payer_name: z.string().trim().min(2, 'Nama pengirim wajib diisi').max(100),
      bank_name: z.string().trim().min(2, 'Bank/metode wajib diisi').max(60),
      paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal transfer wajib diisi'),
      amount: z.coerce.number().int().positive('Nominal wajib diisi'),
    }), req.body);
    if (!req.file) throw new HttpError(400, 'Unggah bukti transfer.');
    if (d.kind === 'registration') {
      const regPaid = one("SELECT 1 FROM payments WHERE application_id=? AND kind='registration' AND status IN ('pending','approved')", a.id);
      if (regPaid) throw new HttpError(400, 'Bukti pembayaran pendaftaran sudah diunggah.');
      if (!['waiting_payment', 'revision', 'verification'].includes(a.status)) throw new HttpError(400, 'Pembayaran pendaftaran tidak diperlukan pada tahap ini.');
    } else {
      if (a.status !== 'accepted') throw new HttpError(400, 'Daftar ulang hanya untuk santri yang diterima.');
      if (one("SELECT 1 FROM payments WHERE application_id=? AND kind='reregistration' AND status IN ('pending','approved')", a.id)) throw new HttpError(400, 'Bukti daftar ulang sudah diunggah.');
    }
    run('INSERT INTO payments(application_id,kind,amount,payer_name,bank_name,paid_at,proof_filename) VALUES(?,?,?,?,?,?,?)',
      a.id, d.kind, d.amount, d.payer_name, d.bank_name, d.paid_at, req.file.filename);
    if (d.kind === 'registration' && a.status === 'waiting_payment') changeStatus(a.id, 'verification', 'Bukti pembayaran pendaftaran diunggah.', req.user.id);
    if (d.kind === 'reregistration') changeStatus(a.id, 'reregistration', 'Bukti pembayaran daftar ulang diunggah.', req.user.id);
    audit(req, 'upload_payment', 'application', a.id, { kind: d.kind, amount: d.amount });
    res.status(201).json(appDetail(a.id));
  } catch (e) { cleanup(); throw e; }
});

r.get('/applications/:id/card', asyncH(async (req, res) => {
  const a = appDetail(ownApp(req, req.params.id).id);
  if (!a.reg_number) throw new HttpError(400, 'Kartu tersedia setelah formulir dikirim.');
  const base = `${req.protocol}://${req.get('host')}`;
  const qr = await QRCode.toDataURL(`${base}/verifikasi/${a.reg_number}`, { margin: 1, width: 240, color: { dark: '#0b0b0c', light: '#ffffff' } });
  const s = getSettings();
  const photo = a.documents.find((d) => d.type === 'photo');
  res.json({ application: a, qr, photo_id: photo?.id ?? null, school: { name: s.school_name, address: s.address, city: s.city, phone: s.phone, email: s.email } });
}));

r.get('/notifications', (req, res) => {
  res.json(all('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50', req.user.id));
});
r.post('/notifications/read-all', (req, res) => {
  run("UPDATE notifications SET read_at=datetime('now') WHERE user_id=? AND read_at IS NULL", req.user.id);
  res.json({ ok: true });
});
r.get('/announcements', (_req, res) => {
  res.json(all('SELECT id,title,body,audience,pinned,created_at FROM announcements WHERE published=1 ORDER BY pinned DESC, created_at DESC LIMIT 20'));
});

export default r;
