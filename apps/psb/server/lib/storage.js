/**
 * Penyimpanan berkas unggahan.
 * - Bila SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY tersedia → Supabase Storage (bucket privat).
 * - Selain itu → disk lokal (data/uploads), untuk pengembangan.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config, UPLOAD_DIR } from './config.js';
import { HttpError } from './util.js';

export const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
const remote = () => !!(config.supabaseUrl && config.supabaseKey);
const safe = (name) => path.basename(String(name));

async function sb(method, url, body, headers = {}) {
  const r = await fetch(`${config.supabaseUrl}/storage/v1${url}`, {
    method, body,
    headers: { Authorization: `Bearer ${config.supabaseKey}`, apikey: config.supabaseKey, ...headers },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('Supabase Storage', method, url, r.status, t);
    throw new HttpError(502, 'Gagal mengakses penyimpanan berkas. Coba lagi.');
  }
  return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
}

/** Buat bucket privat bila belum ada (sekali per cold start). */
let bucketReady = null;
export function ensureBucket() {
  if (!remote()) return Promise.resolve();
  bucketReady ||= (async () => {
    const r = await fetch(`${config.supabaseUrl}/storage/v1/bucket/${config.bucket}`, {
      headers: { Authorization: `Bearer ${config.supabaseKey}`, apikey: config.supabaseKey },
    });
    if (r.ok) return;
    await sb('POST', '/bucket', JSON.stringify({
      id: config.bucket, name: config.bucket, public: false, file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: Object.keys(EXT),
    }), { 'Content-Type': 'application/json' });
    console.log(`✓ Bucket Storage "${config.bucket}" dibuat`);
  })().catch((e) => { bucketReady = null; throw e; });
  return bucketReady;
}

/** Simpan buffer, kembalikan nama berkas yang disimpan di database. */
export async function saveFile(buffer, mime) {
  const name = crypto.randomBytes(16).toString('hex') + (EXT[mime] || '');
  if (remote()) {
    await ensureBucket();
    await sb('POST', `/object/${config.bucket}/${name}`, buffer, { 'Content-Type': mime, 'x-upsert': 'false', 'Cache-Control': '300' });
  } else {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  }
  return name;
}

export async function removeFile(name) {
  if (!name) return;
  if (remote()) {
    await sb('DELETE', `/object/${config.bucket}`, JSON.stringify({ prefixes: [safe(name)] }), { 'Content-Type': 'application/json' }).catch(() => {});
  } else fs.rmSync(path.join(UPLOAD_DIR, safe(name)), { force: true });
}

/** Kirim berkas ke klien (otorisasi sudah dicek pemanggil). Supabase → redirect ke URL bertanda tangan 5 menit. */
export async function sendStored(res, name, mime) {
  if (remote()) {
    const r = await sb('POST', `/object/sign/${config.bucket}/${safe(name)}`, JSON.stringify({ expiresIn: 300 }), { 'Content-Type': 'application/json' });
    const signed = r.signedURL || r.signedUrl;
    res.setHeader('Cache-Control', 'private, no-store');
    return res.redirect(302, `${config.supabaseUrl}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`);
  }
  const p = path.join(UPLOAD_DIR, safe(name));
  if (!fs.existsSync(p)) throw new HttpError(404, 'Berkas tidak ditemukan.');
  res.setHeader('Content-Type', mime || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(p);
}

/** Salin berkas lokal (dipakai seed demo). */
export async function saveLocalFile(srcPath, mime) {
  return saveFile(fs.readFileSync(srcPath), mime);
}
