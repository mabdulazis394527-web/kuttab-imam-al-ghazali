import { run, one } from './db.js';
import { STATUS } from '../../shared/constants.js';

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

/** Express 5 sudah meneruskan error async; pembungkus ini dipertahankan untuk kejelasan. */
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Validasi body dengan skema zod, lempar 422 dengan pesan per-field. */
export function validate(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  const fields = {};
  for (const i of r.error.issues) fields[i.path.join('.') || '_'] ??= i.message;
  throw new HttpError(422, 'Data belum valid. Periksa kembali isian Anda.', fields);
}

export async function audit(req, action, entity, entityId, detail) {
  await run('INSERT INTO audit_logs(user_id,action,entity,entity_id,detail,ip) VALUES(?,?,?,?,?,?)',
    req.user?.id ?? null, action, entity ?? null, entityId ?? null,
    detail ? JSON.stringify(detail) : null, req.ip ?? null);
}

export async function notify(userId, title, body, link = '/portal') {
  await run('INSERT INTO notifications(user_id,title,body,link) VALUES(?,?,?,?)', userId, title, body ?? null, link);
}

/** Ubah status pendaftaran + catat riwayat + kirim notifikasi ke orang tua. */
export async function changeStatus(appId, status, note, actorId) {
  if (!STATUS[status]) throw new HttpError(400, 'Status tidak dikenal.');
  await run('UPDATE applications SET status=?, updated_at=now_txt() WHERE id=?', status, appId);
  await run('INSERT INTO status_history(application_id,status,note,actor_id) VALUES(?,?,?,?)', appId, status, note ?? null, actorId ?? null);
  const a = await one('SELECT user_id, full_name, reg_number FROM applications WHERE id=?', appId);
  if (a) await notify(a.user_id, `Status ${a.full_name || 'pendaftaran'}: ${STATUS[status].label}`,
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
