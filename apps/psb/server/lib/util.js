import { run, one } from './db.js';
import { STATUS } from '../../shared/constants.js';

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Validasi body dengan skema zod, lempar 422 dengan pesan per-field. */
export function validate(schema, data) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields = {};
  for (const i of r.error.issues) fields[i.path.join('.') || '_'] ??= i.message;
  throw new HttpError(422, 'Data belum valid. Periksa kembali isian Anda.', fields);
}

export function audit(req, action, entity, entityId, detail) {
  run('INSERT INTO audit_logs(user_id,action,entity,entity_id,detail,ip) VALUES(?,?,?,?,?,?)',
    req.user?.id ?? null, action, entity ?? null, entityId ?? null,
    detail ? JSON.stringify(detail) : null, req.ip ?? null);
}

export function notify(userId, title, body, link = '/portal') {
  run('INSERT INTO notifications(user_id,title,body,link) VALUES(?,?,?,?)', userId, title, body ?? null, link);
}

/** Ubah status pendaftaran + catat riwayat + kirim notifikasi ke orang tua. */
export function changeStatus(appId, status, note, actorId) {
  if (!STATUS[status]) throw new HttpError(400, 'Status tidak dikenal.');
  run("UPDATE applications SET status=?, updated_at=datetime('now') WHERE id=?", status, appId);
  run('INSERT INTO status_history(application_id,status,note,actor_id) VALUES(?,?,?,?)', appId, status, note ?? null, actorId ?? null);
  const a = one('SELECT user_id, full_name, reg_number FROM applications WHERE id=?', appId);
  if (a) notify(a.user_id, `Status ${a.full_name || 'pendaftaran'}: ${STATUS[status].label}`,
    note || STATUS[status].desc, `/portal/pendaftaran/${appId}`);
}

export function parseJSON(v, fallback = {}) { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } }

export function hydrateApp(a) {
  if (!a) return a;
  return { ...a, father: parseJSON(a.father), mother: parseJSON(a.mother), guardian: parseJSON(a.guardian), commitments: parseJSON(a.commitments) };
}

export function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
