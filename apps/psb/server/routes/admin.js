import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { all, one, run, tx, getSettings, setSetting } from '../lib/db.js';
import { requireRole } from '../lib/auth.js';
import { validate, HttpError, audit, changeStatus, notify, csvEscape, parseJSON, hydrateApp } from '../lib/util.js';
import { STATUS, ASSESSMENT_ASPECTS, DOC_TYPES, RECOMMENDATIONS, ageAt, academicRefDate } from '../../shared/constants.js';
import { appDetail, applyUpdate, completeness } from './portal.js';
import { programsWithFill } from './public.js';

const r = Router();
r.use(requireRole('admin', 'panitia'));
const adminOnly = requireRole('admin');
const id = (v) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'ID tidak valid.'); return n; };

/* ------------------------------ Dashboard ------------------------------ */
r.get('/dashboard', (_req, res) => {
  const byStatus = all(`SELECT status, COUNT(*) c FROM applications GROUP BY status`);
  const kpi = one(`SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('draft','cancelled')) AS submitted,
      COUNT(*) FILTER (WHERE status='draft') AS drafts,
      COUNT(*) FILTER (WHERE status IN ('accepted','reregistration','enrolled')) AS accepted,
      COUNT(*) FILTER (WHERE status='enrolled') AS enrolled,
      COUNT(*) FILTER (WHERE status IN ('verification','revision')) AS verifying,
      COUNT(*) FILTER (WHERE status IN ('scheduled','assessed')) AS observing
    FROM applications`);
  const users = one("SELECT COUNT(*) c FROM users WHERE role='parent'").c;
  const pending = {
    payments: one("SELECT COUNT(*) c FROM payments WHERE status='pending'").c,
    documents: one(`SELECT COUNT(*) c FROM documents d JOIN applications a ON a.id=d.application_id
      WHERE d.status='pending' AND a.status NOT IN ('draft','cancelled')`).c,
    toSchedule: one(`SELECT COUNT(*) c FROM applications a WHERE a.status='verification'
      AND EXISTS (SELECT 1 FROM payments p WHERE p.application_id=a.id AND p.kind='registration' AND p.status='approved')`).c,
    toAssess: one("SELECT COUNT(*) c FROM applications WHERE status='scheduled' AND observation_at <= datetime('now','+1 day')").c,
    toDecide: one("SELECT COUNT(*) c FROM applications WHERE status='assessed'").c,
    inquiries: one('SELECT COUNT(*) c FROM inquiries WHERE handled=0').c,
  };
  const revenue = one(`SELECT
      COALESCE(SUM(amount) FILTER (WHERE kind='registration' AND status='approved'),0) AS registration,
      COALESCE(SUM(amount) FILTER (WHERE kind='reregistration' AND status='approved'),0) AS reregistration
    FROM payments`);
  const daily = all(`SELECT date(submitted_at) d, COUNT(*) c FROM applications
    WHERE submitted_at >= date('now','-29 day') GROUP BY d ORDER BY d`);
  const byGender = all(`SELECT gender, COUNT(*) c FROM applications WHERE status NOT IN ('draft','cancelled') GROUP BY gender`);
  const byCity = all(`SELECT COALESCE(city,'-') city, COUNT(*) c FROM applications WHERE status NOT IN ('draft','cancelled') GROUP BY city ORDER BY c DESC LIMIT 6`);
  const bySource = all(`SELECT COALESCE(info_source,'Lainnya') source, COUNT(*) c FROM applications WHERE status NOT IN ('draft','cancelled') GROUP BY source ORDER BY c DESC`);
  const upcoming = all(`SELECT a.id,a.reg_number,a.full_name,a.observation_at,a.observation_place,p.code AS program_code
    FROM applications a LEFT JOIN programs p ON p.id=a.program_id WHERE a.status='scheduled' AND a.observation_at >= datetime('now','-1 day')
    ORDER BY a.observation_at LIMIT 8`);
  const recent = all(`SELECT h.created_at,h.status,h.note,a.id,a.full_name,a.reg_number,u.name actor FROM status_history h
    JOIN applications a ON a.id=h.application_id LEFT JOIN users u ON u.id=h.actor_id ORDER BY h.id DESC LIMIT 10`);
  res.json({ kpi: { ...kpi, users }, byStatus, programs: programsWithFill(), pending, revenue, daily, byGender, byCity, bySource, upcoming, recent });
});

/* ------------------------------ Pendaftar ------------------------------ */
function buildFilter(q) {
  const where = ['1=1'], p = [];
  if (q.q) { where.push('(a.full_name LIKE ? OR a.reg_number LIKE ? OR a.nickname LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)'); const s = `%${q.q}%`; p.push(s, s, s, s, s); }
  if (q.status) {
    const st = String(q.status).split(',').filter((x) => STATUS[x]);
    if (st.length) { where.push(`a.status IN (${st.map(() => '?').join(',')})`); p.push(...st); }
  } else where.push("a.status <> 'draft'");
  if (q.program) { where.push('a.program_id=?'); p.push(Number(q.program)); }
  if (q.wave) { where.push('a.wave_id=?'); p.push(Number(q.wave)); }
  if (q.gender) { where.push('a.gender=?'); p.push(q.gender); }
  return { where: where.join(' AND '), params: p };
}

const SORTS = { newest: 'a.id DESC', oldest: 'a.id ASC', name: 'a.full_name COLLATE NOCASE ASC', score: 'a.score_total DESC NULLS LAST', observation: 'a.observation_at ASC NULLS LAST' };

r.get('/applications', (req, res) => {
  const { where, params } = buildFilter(req.query);
  const page = Math.max(1, Number(req.query.page) || 1), size = Math.min(100, Number(req.query.size) || 15);
  const total = one(`SELECT COUNT(*) c FROM applications a JOIN users u ON u.id=a.user_id WHERE ${where}`, ...params).c;
  const rows = all(`SELECT a.id,a.reg_number,a.full_name,a.nickname,a.gender,a.birth_date,a.city,a.status,a.submitted_at,a.created_at,
      a.observation_at,a.score_total,p.code program_code,p.name program_name,w.name wave_name,w.academic_year,u.name parent_name,u.phone parent_phone,
      (SELECT COUNT(*) FROM documents d WHERE d.application_id=a.id AND d.status='pending') docs_pending,
      (SELECT COUNT(*) FROM payments y WHERE y.application_id=a.id AND y.status='pending') pay_pending,
      (SELECT id FROM documents d WHERE d.application_id=a.id AND d.type='photo') photo_id
    FROM applications a JOIN users u ON u.id=a.user_id LEFT JOIN programs p ON p.id=a.program_id LEFT JOIN waves w ON w.id=a.wave_id
    WHERE ${where} ORDER BY ${SORTS[req.query.sort] || SORTS.newest} LIMIT ? OFFSET ?`, ...params, size, (page - 1) * size);
  const counts = all(`SELECT a.status, COUNT(*) c FROM applications a GROUP BY a.status`);
  res.json({ rows: rows.map((x) => ({ ...x, status_label: STATUS[x.status]?.label, age: x.birth_date && x.academic_year ? ageAt(x.birth_date, academicRefDate(x.academic_year)) : null })), total, page, size, counts });
});

r.get('/applications/export.csv', (req, res) => {
  const { where, params } = buildFilter(req.query);
  const rows = all(`SELECT a.*, p.name program_name, w.name wave_name, w.academic_year, u.name account_name, u.email account_email, u.phone account_phone
    FROM applications a JOIN users u ON u.id=a.user_id LEFT JOIN programs p ON p.id=a.program_id LEFT JOIN waves w ON w.id=a.wave_id
    WHERE ${where} ORDER BY a.reg_number`, ...params).map(hydrateApp);
  const cols = [
    ['No. Pendaftaran', (a) => a.reg_number], ['Nama Lengkap', (a) => a.full_name], ['Panggilan', (a) => a.nickname],
    ['L/P', (a) => a.gender], ['Tempat Lahir', (a) => a.birth_place], ['Tanggal Lahir', (a) => a.birth_date],
    ['Usia (1 Juli)', (a) => { const g = a.birth_date && ageAt(a.birth_date, academicRefDate(a.academic_year)); return g ? `${g.years} th ${g.months} bl` : ''; }],
    ['NIK', (a) => a.nik], ['Jenjang', (a) => a.program_name], ['Gelombang', (a) => a.wave_name], ['Status', (a) => STATUS[a.status]?.label],
    ['Alamat', (a) => a.address], ['Kota', (a) => a.city], ['Nama Ayah', (a) => a.father.name], ['HP Ayah', (a) => a.father.phone],
    ['Pekerjaan Ayah', (a) => a.father.occupation], ['Nama Ibu', (a) => a.mother.name], ['HP Ibu', (a) => a.mother.phone],
    ['Pekerjaan Ibu', (a) => a.mother.occupation], ['Email Akun', (a) => a.account_email], ['Jadwal Observasi', (a) => a.observation_at],
    ['Nilai', (a) => a.score_total], ['Sumber Info', (a) => a.info_source], ['Tgl Kirim', (a) => a.submitted_at],
  ];
  const lines = [cols.map((c) => c[0]).join(';'), ...rows.map((a) => cols.map((c) => csvEscape(c[1](a))).join(';'))];
  audit(req, 'export_csv', 'application', null, { count: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pendaftar-psb-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
});

r.get('/applications/:id', (req, res) => {
  const a = appDetail(id(req.params.id));
  if (!a) throw new HttpError(404, 'Data tidak ditemukan.');
  a.account = one('SELECT id,name,email,phone,created_at,last_login_at FROM users WHERE id=?', a.user_id);
  const asm = one('SELECT * FROM assessments WHERE application_id=?', a.id);
  a.assessment = asm ? { ...asm, scores: parseJSON(asm.scores), assessor: one('SELECT name FROM users WHERE id=?', asm.assessor_id)?.name } : null;
  a.progress = completeness(a, a.documents);
  a.siblings_apps = all('SELECT id,full_name,reg_number,status FROM applications WHERE user_id=? AND id<>?', a.user_id, a.id);
  res.json(a);
});

r.put('/applications/:id', adminOnly, (req, res) => {
  const appId = id(req.params.id);
  if (!one('SELECT id FROM applications WHERE id=?', appId)) throw new HttpError(404, 'Data tidak ditemukan.');
  applyUpdate(appId, req.body || {});
  audit(req, 'edit_application', 'application', appId);
  res.json(appDetail(appId));
});

r.post('/applications/:id/status', (req, res) => {
  const appId = id(req.params.id);
  const d = validate(z.object({ status: z.enum(Object.keys(STATUS)), note: z.string().trim().max(1000).optional() }), req.body);
  if (!one('SELECT id FROM applications WHERE id=?', appId)) throw new HttpError(404, 'Data tidak ditemukan.');
  changeStatus(appId, d.status, d.note || null, req.user.id);
  audit(req, 'change_status', 'application', appId, d);
  res.json(appDetail(appId));
});

r.put('/documents/:id', (req, res) => {
  const docId = id(req.params.id);
  const d = validate(z.object({ status: z.enum(['pending', 'valid', 'invalid']), note: z.string().trim().max(500).optional().nullable() }), req.body);
  const doc = one('SELECT * FROM documents WHERE id=?', docId);
  if (!doc) throw new HttpError(404, 'Berkas tidak ditemukan.');
  run('UPDATE documents SET status=?, note=? WHERE id=?', d.status, d.note || null, docId);
  if (d.status === 'invalid') {
    const a = one('SELECT user_id, full_name FROM applications WHERE id=?', doc.application_id);
    const label = DOC_TYPES.find((t) => t.key === doc.type)?.label || doc.type;
    notify(a.user_id, `Berkas perlu diganti: ${label}`, d.note || 'Mohon unggah ulang berkas yang sesuai.', `/portal/pendaftaran/${doc.application_id}`);
  }
  audit(req, 'verify_document', 'document', docId, d);
  res.json(appDetail(doc.application_id));
});

r.put('/payments/:id', (req, res) => {
  const payId = id(req.params.id);
  const d = validate(z.object({ status: z.enum(['approved', 'rejected']), note: z.string().trim().max(500).optional().nullable() }), req.body);
  const p = one('SELECT * FROM payments WHERE id=?', payId);
  if (!p) throw new HttpError(404, 'Pembayaran tidak ditemukan.');
  tx(() => {
    run("UPDATE payments SET status=?, note=?, verified_by=?, verified_at=datetime('now') WHERE id=?", d.status, d.note || null, req.user.id, payId);
    const a = one('SELECT * FROM applications WHERE id=?', p.application_id);
    if (p.kind === 'registration') {
      if (d.status === 'rejected') changeStatus(a.id, 'waiting_payment', `Bukti pembayaran ditolak: ${d.note || 'mohon unggah ulang bukti yang valid.'}`, req.user.id);
      else notify(a.user_id, 'Pembayaran pendaftaran terverifikasi', 'Jazakumullahu khairan. Pembayaran pendaftaran telah kami terima.', `/portal/pendaftaran/${a.id}`);
    } else {
      if (d.status === 'approved') changeStatus(a.id, 'enrolled', 'Daftar ulang terverifikasi. Selamat bergabung!', req.user.id);
      else changeStatus(a.id, 'accepted', `Bukti daftar ulang ditolak: ${d.note || 'mohon unggah ulang.'}`, req.user.id);
    }
  });
  audit(req, 'verify_payment', 'payment', payId, d);
  res.json(appDetail(p.application_id));
});

const scheduleSchema = z.object({
  observation_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Tanggal & jam wajib diisi'),
  observation_place: z.string().trim().min(2, 'Tempat wajib diisi').max(200),
  observer: z.string().trim().max(100).optional().nullable(),
  observation_note: z.string().trim().max(1000).optional().nullable(),
});
function schedule(appId, d, actor) {
  run('UPDATE applications SET observation_at=?, observation_place=?, observer=?, observation_note=? WHERE id=?',
    d.observation_at.slice(0, 16).replace('T', ' '), d.observation_place, d.observer || null, d.observation_note || null, appId);
  const when = new Date(d.observation_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
  changeStatus(appId, 'scheduled', `Observasi ananda & wawancara orang tua: ${when} di ${d.observation_place}.`, actor);
}
r.post('/applications/:id/schedule', (req, res) => {
  const appId = id(req.params.id);
  const d = validate(scheduleSchema, req.body);
  schedule(appId, d, req.user.id);
  audit(req, 'schedule', 'application', appId, d);
  res.json(appDetail(appId));
});
r.post('/bulk/schedule', (req, res) => {
  const d = validate(scheduleSchema.extend({ ids: z.array(z.number().int()).min(1, 'Pilih minimal satu pendaftar'),
    interval_minutes: z.coerce.number().int().min(0).max(240).default(0) }), req.body);
  tx(() => d.ids.forEach((appId, i) => {
    const t = new Date(new Date(d.observation_at).getTime() + i * d.interval_minutes * 60000);
    const local = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    schedule(appId, { ...d, observation_at: d.interval_minutes ? local : d.observation_at }, req.user.id);
  }));
  audit(req, 'bulk_schedule', 'application', null, { ids: d.ids });
  res.json({ ok: true, count: d.ids.length });
});

r.put('/applications/:id/assessment', (req, res) => {
  const appId = id(req.params.id);
  const shape = Object.fromEntries(ASSESSMENT_ASPECTS.map((x) => [x.key, z.coerce.number().min(1).max(5)]));
  const d = validate(z.object({
    scores: z.object(shape, { error: 'Lengkapi semua aspek penilaian' }),
    recommendation: z.enum(Object.keys(RECOMMENDATIONS), { error: 'Pilih rekomendasi' }),
    note: z.string().trim().max(2000).optional().nullable(),
  }), req.body);
  const vals = Object.values(d.scores);
  const total = Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length * 5)) * 1000) / 10; // skala 0–100
  const a = one('SELECT status FROM applications WHERE id=?', appId);
  if (!a) throw new HttpError(404, 'Data tidak ditemukan.');
  tx(() => {
    run(`INSERT INTO assessments(application_id,scores,total,recommendation,note,assessor_id) VALUES(?,?,?,?,?,?)
      ON CONFLICT(application_id) DO UPDATE SET scores=excluded.scores,total=excluded.total,recommendation=excluded.recommendation,
      note=excluded.note,assessor_id=excluded.assessor_id,updated_at=datetime('now')`,
    appId, JSON.stringify(d.scores), total, d.recommendation, d.note || null, req.user.id);
    run('UPDATE applications SET score_total=? WHERE id=?', total, appId);
    if (['scheduled', 'verification'].includes(a.status)) changeStatus(appId, 'assessed', 'Observasi & wawancara telah dilaksanakan.', req.user.id);
  });
  audit(req, 'assess', 'application', appId, { total });
  res.json(appDetail(appId));
});

const decisionSchema = z.object({ decision: z.enum(['accepted', 'reserve', 'rejected']), note: z.string().trim().max(1000).optional().nullable() });
function decide(appId, d, actor) {
  run("UPDATE applications SET decision_note=?, decided_at=datetime('now') WHERE id=?", d.note || null, appId);
  changeStatus(appId, d.decision, d.note || null, actor);
}
r.post('/applications/:id/decision', (req, res) => {
  const appId = id(req.params.id);
  const d = validate(decisionSchema, req.body);
  decide(appId, d, req.user.id);
  audit(req, 'decision', 'application', appId, d);
  res.json(appDetail(appId));
});
r.post('/bulk/decision', (req, res) => {
  const d = validate(decisionSchema.extend({ ids: z.array(z.number().int()).min(1, 'Pilih minimal satu pendaftar') }), req.body);
  tx(() => d.ids.forEach((appId) => decide(appId, d, req.user.id)));
  audit(req, 'bulk_decision', 'application', null, d);
  res.json({ ok: true, count: d.ids.length });
});

/* ------------------------------ Master data ------------------------------ */
function crud(path, table, schema, { map = (x) => x, order = 'id', guard = adminOnly } = {}) {
  r.get(`/${path}`, (_req, res) => res.json(all(`SELECT * FROM ${table} ORDER BY ${order}`).map(map)));
  r.post(`/${path}`, guard, (req, res) => {
    const d = validate(schema, req.body);
    const keys = Object.keys(d);
    const { lastInsertRowid } = run(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map((k) => d[k]));
    audit(req, `create_${table}`, table, Number(lastInsertRowid), d);
    res.status(201).json(map(one(`SELECT * FROM ${table} WHERE id=?`, lastInsertRowid)));
  });
  r.put(`/${path}/:id`, guard, (req, res) => {
    const d = validate(schema.partial(), req.body); const rid = id(req.params.id);
    const keys = Object.keys(d);
    if (keys.length) run(`UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, ...keys.map((k) => d[k]), rid);
    audit(req, `update_${table}`, table, rid, d);
    res.json(map(one(`SELECT * FROM ${table} WHERE id=?`, rid)));
  });
  r.delete(`/${path}/:id`, guard, (req, res) => {
    const rid = id(req.params.id);
    try { run(`DELETE FROM ${table} WHERE id=?`, rid); }
    catch { throw new HttpError(400, 'Data masih digunakan dan tidak dapat dihapus. Nonaktifkan saja.'); }
    audit(req, `delete_${table}`, table, rid);
    res.json({ ok: true });
  });
}

const bool = z.union([z.boolean(), z.number()]).transform((v) => (v ? 1 : 0));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD');
crud('waves', 'waves', z.object({
  name: z.string().trim().min(2).max(80), academic_year: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Format 2027/2028'),
  start_date: date, end_date: date, observation_date: date.optional().nullable(), announcement_date: date.optional().nullable(),
  registration_fee: z.coerce.number().int().min(0), quota: z.coerce.number().int().min(0), active: bool, notes: z.string().max(500).optional().nullable(),
}), { order: 'start_date' });

crud('programs', 'programs', z.object({
  code: z.string().trim().min(1).max(6).transform((s) => s.toUpperCase()), name: z.string().trim().min(2).max(80),
  tagline: z.string().max(160).optional().nullable(), description: z.string().max(2000).optional().nullable(),
  age_min: z.coerce.number().int().min(3).max(15), age_max: z.coerce.number().int().min(3).max(15), quota: z.coerce.number().int().min(0),
  gender_policy: z.string().max(40).optional(), highlights: z.array(z.string().max(160)).transform((a) => JSON.stringify(a)).optional(),
  monthly_fee: z.coerce.number().int().min(0), entry_fee: z.coerce.number().int().min(0), active: bool, sort: z.coerce.number().int().optional(),
}), { order: 'sort, id', map: (p) => p && ({ ...p, highlights: parseJSON(p.highlights, []) }) });

crud('announcements', 'announcements', z.object({
  title: z.string().trim().min(3).max(160), body: z.string().trim().min(3).max(5000),
  audience: z.enum(['public', 'applicants']), pinned: bool, published: bool,
}), { order: 'pinned DESC, created_at DESC', guard: (_q, _s, n) => n() });

crud('faqs', 'faqs', z.object({
  question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(3000), sort: z.coerce.number().int(), published: bool,
}), { order: 'sort, id' });

r.get('/inquiries', (_req, res) => res.json(all('SELECT * FROM inquiries ORDER BY handled, id DESC LIMIT 200')));
r.put('/inquiries/:id', (req, res) => { run('UPDATE inquiries SET handled=? WHERE id=?', req.body.handled ? 1 : 0, id(req.params.id)); res.json({ ok: true }); });

/* ------------------------------ Pengaturan ------------------------------ */
r.get('/settings', (_req, res) => res.json(getSettings()));
r.put('/settings', adminOnly, (req, res) => {
  const allowed = ['school_name', 'tagline', 'vision', 'missions', 'address', 'city', 'phone', 'whatsapp', 'email', 'instagram', 'youtube',
    'maps_url', 'academic_year', 'bank_accounts', 'hero_title', 'hero_subtitle', 'registration_open', 'office_hours', 'requirements'];
  for (const [k, v] of Object.entries(req.body || {})) if (allowed.includes(k)) setSetting(k, v);
  audit(req, 'update_settings', 'settings', null, Object.keys(req.body || {}));
  res.json(getSettings());
});

/* ------------------------------ Pengguna ------------------------------ */
r.get('/users', adminOnly, (req, res) => {
  const role = req.query.role;
  const q = `%${req.query.q || ''}%`;
  res.json(all(`SELECT u.id,u.name,u.email,u.phone,u.role,u.active,u.created_at,u.last_login_at,
      (SELECT COUNT(*) FROM applications a WHERE a.user_id=u.id) apps
    FROM users u WHERE (? IS NULL OR u.role=?) AND (u.name LIKE ? OR u.email LIKE ?) ORDER BY u.role<>'admin', u.role<>'panitia', u.id DESC LIMIT 300`,
  role || null, role || null, q, q));
});
r.post('/users', adminOnly, (req, res) => {
  const d = validate(z.object({ name: z.string().trim().min(3), email: z.email('Email tidak valid'), phone: z.string().trim().optional().nullable(),
    role: z.enum(['parent', 'panitia', 'admin']), password: z.string().min(8, 'Minimal 8 karakter') }), req.body);
  if (one('SELECT id FROM users WHERE email=?', d.email.toLowerCase())) throw new HttpError(409, 'Email sudah digunakan.', { email: 'Email sudah digunakan' });
  const { lastInsertRowid } = run('INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)', d.name, d.email.toLowerCase(), d.phone || null, d.role, bcrypt.hashSync(d.password, 10));
  audit(req, 'create_user', 'user', Number(lastInsertRowid), { role: d.role });
  res.status(201).json({ id: Number(lastInsertRowid) });
});
r.put('/users/:id', adminOnly, (req, res) => {
  const uid = id(req.params.id);
  const d = validate(z.object({ name: z.string().trim().min(3).optional(), phone: z.string().trim().optional().nullable(),
    role: z.enum(['parent', 'panitia', 'admin']).optional(), active: bool.optional(), password: z.string().min(8).optional() }), req.body);
  if (uid === req.user.id && (d.active === 0 || (d.role && d.role !== 'admin'))) throw new HttpError(400, 'Tidak dapat menonaktifkan/menurunkan akun sendiri.');
  const { password, ...rest } = d;
  const keys = Object.keys(rest);
  if (keys.length) run(`UPDATE users SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, ...keys.map((k) => rest[k]), uid);
  if (password) run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(password, 10), uid);
  audit(req, 'update_user', 'user', uid, { ...rest, password: password ? '***' : undefined });
  res.json({ ok: true });
});

r.get('/audit', adminOnly, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json(all(`SELECT l.*, u.name user_name, u.role user_role FROM audit_logs l LEFT JOIN users u ON u.id=l.user_id
    ORDER BY l.id DESC LIMIT 50 OFFSET ?`, (page - 1) * 50));
});

export default r;
