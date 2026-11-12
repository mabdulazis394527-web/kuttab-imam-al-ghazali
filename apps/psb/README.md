# PSB Kuttab Imam Al-Ghazali

Aplikasi web Penerimaan Santri Baru (PSB) lengkap: landing page, portal orang tua, dan panel panitia/admin.

> Visi: *Mewujudkan insan Qur'ani dengan kemandirian iman, amal shalih, dan pemikiran sehingga mampu menjalani kehidupan yang adil dan beradab.*

## Teknologi
| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, React Router 7, Vite, CSS kustom (tema hitam–emas), ikon Lucide |
| Backend | Node.js ≥ 20, Express 5, PostgreSQL (Supabase; PGlite untuk lokal), Zod |
| Hosting | Netlify (frontend + Netlify Functions), Supabase (database + Storage) |
| Keamanan | JWT di cookie httpOnly, bcrypt, Helmet + CSP, rate-limit login/cek status, validasi tipe & ukuran berkas, berkas privat (hanya pemilik & panitia), log audit |

- **Lokal:** tanpa `DATABASE_URL`, aplikasi memakai PGlite (Postgres yang berjalan di Node) di `data/pglite/` dan unggahan di `data/uploads/`. Tidak perlu memasang database.
- **Produksi:** database Supabase Postgres + berkas di Supabase Storage (bucket privat `psb-files`), API berjalan sebagai Netlify Function `/api/*`.

## Menjalankan

```bash
npm install
npm run build        # build frontend ke dist/
npm run seed:demo    # opsional: data dasar + 27 pendaftar contoh
npm start            # http://localhost:3000
```

Mode pengembangan (hot reload API + frontend di http://localhost:5173):

```bash
npm run dev
```

Tanpa `seed:demo`, server otomatis membuat data dasar (pengaturan, jenjang, gelombang, FAQ, akun admin) saat pertama dijalankan.

### Akun awal (WAJIB diganti setelah login)
| Peran | Email | Kata sandi |
|---|---|---|
| Administrator | `admin@psb.local` | `AdminPSB#2027` |
| Panitia | `panitia@psb.local` | `PanitiaPSB#2027` |
| Orang tua (demo) | `orangtua@contoh.id` | `OrangTua#2027` |

### Variabel lingkungan
| Nama | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | – (pakai PGlite lokal) | Connection string Postgres Supabase (pooler, port 6543) — **rahasia** |
| `SUPABASE_URL` | – | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | – (simpan berkas di disk) | Kunci service role / secret key Supabase — **rahasia** |
| `SUPABASE_BUCKET` | `psb-files` | Nama bucket Storage |
| `JWT_SECRET` | dibuat otomatis di `data/.secret` (lokal) | Rahasia token login — **wajib** di Netlify |
| `PORT` | `3000` | Port server lokal |
| `DATA_DIR` | `./data` | Lokasi database & unggahan lokal |

## Fitur

**Landing page** — hero dengan hitung mundur gelombang & sisa kuota, *Apa itu Kuttab* (sejarah + hadits Jundub), visi & misi, ciri khas (Insan Qur'ani → kemandirian iman, amal shalih, pemikiran → adil & beradab; Adab sebelum Ilmu, Halaqah Fikr, Tadabbur Alam, Majelis Orang Tua), jenjang (dari database), sehari di kuttab, alur 8 langkah, tabel gelombang & biaya, syarat, pengumuman, FAQ, formulir kontak, tombol WhatsApp.

**Portal orang tua** — satu akun untuk beberapa anak; formulir 7 langkah tersimpan bertahap (jenjang, data ananda, kesehatan, ayah/ibu/wali, unggah berkas drag-and-drop, komitmen, tinjau); validasi usia per 1 Juli; nomor pendaftaran otomatis (`KIG-2027-KA-0001`); unggah bukti bayar; status dengan stepper 8 tahap & riwayat; jadwal observasi; kartu peserta ber-QR (dicetak/PDF); surat keterangan diterima; daftar ulang; notifikasi; profil & ganti kata sandi.

**Panel panitia/admin** — dasbor (KPI, grafik harian, status, kuota per jenjang, gender, sumber info, domisili, dana masuk, tugas tertunda, agenda observasi, aktivitas); daftar pendaftar (tab status, pencarian, filter, urutan, paginasi, aksi massal jadwal/keputusan, ekspor CSV untuk Excel); detail pendaftar (verifikasi berkas per item dengan catatan, verifikasi/tolak pembayaran, jadwal observasi, penilaian 8 aspek skala 1–5 → nilai 0–100 + rekomendasi, keputusan terima/cadangan/tolak, ubah status manual, WhatsApp satu klik); jadwal observasi per hari dengan pengingat WA; CRUD gelombang, jenjang, pengumuman, FAQ; pesan masuk; pengaturan (identitas, kontak, rekening, konten landing, buka/tutup pendaftaran); manajemen pengguna & peran; log audit.

**Verifikasi publik** — `/cek-status` (no. pendaftaran + tanggal lahir) dan `/verifikasi/:nomor` (tujuan QR kartu).

## Alur status
`draft → waiting_payment → verification (↔ revision) → scheduled → assessed → accepted | reserve | rejected → reregistration → enrolled` (+ `cancelled`)

## Struktur
```
netlify/functions/api.mjs   API sebagai Netlify Function (/api/*)
server/            API Express
  app.js           aplikasi Express (dipakai lokal & Netlify)
  index.js         server lokal + penyajian frontend
  schema.sql       skema PostgreSQL (+ RLS untuk Supabase)
  seed.js          data dasar & demo
  lib/             db (Postgres/PGlite), storage (Supabase/disk), auth, upload, util
  routes/          public, auth, portal, admin, files
shared/constants.js  status, jenis berkas, aspek penilaian (dipakai server & client)
src/               React (pages/portal, pages/admin, components, layouts)
public/brand/      logo & emblem
```

## Menyesuaikan
Alamat, telepon, WhatsApp, rekening, biaya, kuota, tanggal gelombang, misi, dan FAQ di data awal adalah **contoh** — ubah dari menu **Pengaturan**, **Gelombang**, **Jenjang**, dan **FAQ** di panel admin. Aspek penilaian observasi dan jenis berkas ada di `shared/constants.js`.

## Deploy: Netlify + Supabase
1. **Supabase** — jalankan `server/schema.sql` (tabel + RLS) di SQL Editor, lalu buat bucket privat `psb-files`
   (batas 4 MB; tipe `image/jpeg, image/png, image/webp, application/pdf`).
2. **Netlify** — buat situs dari repositori ini dengan *Base directory* `apps/psb` (build & publish dibaca dari `apps/psb/netlify.toml`).
3. **Environment variables** di Netlify (scope *Functions*): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`.
4. Deploy. Permintaan pertama otomatis mengisi data dasar (pengaturan, jenjang, gelombang, FAQ, akun admin).
   **Segera ganti kata sandi akun admin & panitia.**

Batas Netlify Functions: body permintaan ±4,5 MB biner → unggahan dibatasi 4 MB dan foto otomatis dikecilkan di browser.
Berkas dibuka lewat URL bertanda tangan Supabase yang berlaku 5 menit, setelah otorisasi dicek server.

## Alternatif: VPS / server sendiri
`npm run build && npm start` dengan `DATABASE_URL` (Postgres apa pun) di belakang reverse proxy HTTPS. Tanpa variabel Supabase, berkas disimpan di `data/uploads/`.
