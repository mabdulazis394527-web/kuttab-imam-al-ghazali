import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..', '..');
export const SERVERLESS = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
export const DATA_DIR = process.env.DATA_DIR || (SERVERLESS ? '/tmp/psb-data' : path.join(ROOT, 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

// Secret JWT: wajib dari env di produksi; lokal dibuat sekali dan disimpan di data/.secret
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (SERVERLESS) throw new Error('JWT_SECRET belum diatur di environment variables.');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const f = path.join(DATA_DIR, '.secret');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const s = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  get jwtSecret() { return (this._s ||= loadSecret()); },
  isProd: process.env.NODE_ENV === 'production' || SERVERLESS,
  // Batas Netlify Functions ±4,5 MB untuk body biner; gambar juga dikompres di browser.
  maxUploadMB: 4,
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  bucket: process.env.SUPABASE_BUCKET || 'psb-files',
};
