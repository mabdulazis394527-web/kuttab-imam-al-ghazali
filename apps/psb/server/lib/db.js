/**
 * Lapisan database PostgreSQL.
 * - Produksi (Netlify/Supabase): DATABASE_URL → node-postgres (pool kecil, SSL).
 * - Pengembangan lokal tanpa DATABASE_URL: PGlite (Postgres WASM) tersimpan di data/pglite.
 * Kueri ditulis dengan placeholder `?` dan dikonversi ke `$1, $2, ...`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { DATA_DIR } from './config.js';
import SCHEMA from './schema.js';

const als = new AsyncLocalStorage();
const INT8 = 20, NUMERIC = 1700;
let driver = null; // { query(text, params), transaction(fn) }

function toPg(sql) {
  let n = 0, out = '', q = false;
  for (const ch of sql) {
    if (ch === "'") q = !q;
    out += !q && ch === '?' ? `$${++n}` : ch;
  }
  return out;
}

async function makePg(url) {
  pg.types.setTypeParser(INT8, (v) => (v === null ? null : Number(v)));
  pg.types.setTypeParser(NUMERIC, (v) => (v === null ? null : Number(v)));
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });
  return {
    kind: 'postgres',
    query: (text, params) => pool.query(text, params),
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const r = await fn({ query: (t, p) => c.query(t, p) });
        await c.query('COMMIT');
        return r;
      } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
      finally { c.release(); }
    },
  };
}

async function makePglite() {
  const mod = '@electric-sql/pglite'; // nama dinamis agar tidak ikut dibundel ke Netlify Functions
  const { PGlite, types } = await import(mod);
  const dir = path.join(DATA_DIR, 'pglite');
  fs.mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir, { parsers: { [types.INT8]: (v) => Number(v), [types.NUMERIC]: (v) => Number(v) } });
  await db.exec(SCHEMA);
  return {
    kind: 'pglite',
    query: (text, params) => db.query(text, params),
    transaction: (fn) => db.transaction((t) => fn({ query: (x, p) => t.query(x, p) })),
  };
}

let initPromise = null;
export function initDb() {
  initPromise ||= (async () => {
    driver = process.env.DATABASE_URL ? await makePg(process.env.DATABASE_URL) : await makePglite();
    return driver;
  })();
  return initPromise;
}

async function exec(sql, params = []) {
  await initDb();
  const conn = als.getStore() || driver;
  const p = params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  return conn.query(toPg(sql), p);
}

export const one = async (sql, ...p) => (await exec(sql, p)).rows[0];
export const all = async (sql, ...p) => (await exec(sql, p)).rows;
export const run = async (sql, ...p) => { const r = await exec(sql, p); return { changes: r.rowCount ?? r.affectedRows ?? 0 }; };
/** INSERT dan kembalikan id baris baru. */
export const insert = async (sql, ...p) => (await exec(`${sql} RETURNING id`, p)).rows[0].id;

/** Jalankan fn dalam satu transaksi; semua kueri di dalamnya otomatis memakai koneksi transaksi. */
export async function tx(fn) {
  await initDb();
  if (als.getStore()) return fn(); // transaksi bersarang → pakai yang sedang berjalan
  return driver.transaction((conn) => als.run(conn, fn));
}

export async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  const out = {};
  for (const r of rows) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
  return out;
}
export async function setSetting(key, value) {
  await run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
}
