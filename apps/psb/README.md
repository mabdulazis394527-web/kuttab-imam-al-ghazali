# PSB Kuttab Imam Al-Ghazali

Aplikasi web Penerimaan Santri Baru (PSB) lengkap: landing page, portal orang tua, dan panel panitia/admin.

> Visi: *Mewujudkan insan Qur'ani dengan kemandirian iman, amal shalih, dan pemikiran sehingga mampu menjalani kehidupan yang adil dan beradab.*

## Teknologi
| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, React Router 7, Vite, CSS kustom (tema hitam–emas), ikon Lucide |
| Backend | Node.js ≥ 22.13, Express 5, SQLite bawaan Node (`node:sqlite`), Zod |
| Keamanan | JWT di cookie httpOnly, bcrypt, Helmet + CSP, rate-limit login/cek status, validasi tipe & ukuran berkas, berkas privat (hanya pemilik & panitia), log audit |

Tidak perlu server database terpisah — data tersimpan di `data/psb.sqlite`, unggahan di `data/uploads/`.

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
| `PORT` | `3000` | Port server |
| `JWT_SECRET` | dibuat otomatis di `data/.secret` | Rahasia token |
| `DATA_DIR` | `./data` | Lokasi database & unggahan |
| `NODE_ENV` | – | `production` → cookie `secure` (wajib HTTPS) |

## Fitur

**Landing page** — hero dengan hitung mundur gelombang & sisa kuota, *Apa itu Kuttab* (sejarah + hadits Jundub), visi & misi, ciri khas (Insan Qur'ani → kemandirian iman, amal shalih, pemikiran → adil & beradab; Adab sebelum Ilmu, Halaqah Fikr, Tadabbur Alam, Majelis Orang Tua), jenjang (dari database), sehari di kuttab, alur 8 langkah, tabel gelombang & biaya, syarat, pengumuman, FAQ, formulir kontak, tombol WhatsApp.

**Portal orang tua** — satu akun untuk beberapa anak; formulir 7 langkah tersimpan bertahap (jenjang, data ananda, kesehatan, ayah/ibu/wali, unggah berkas drag-and-drop, komitmen, tinjau); validasi usia per 1 Juli; nomor pendaftaran otomatis (`KIG-2027-KA-0001`); unggah bukti bayar; status dengan stepper 8 tahap & riwayat; jadwal observasi; kartu peserta ber-QR (dicetak/PDF); surat keterangan diterima; daftar ulang; notifikasi; profil & ganti kata sandi.

**Panel panitia/admin** — dasbor (KPI, grafik harian, status, kuota per jenjang, gender, sumber info, domisili, dana masuk, tugas tertunda, agenda observasi, aktivitas); daftar pendaftar (tab status, pencarian, filter, urutan, paginasi, aksi massal jadwal/keputusan, ekspor CSV untuk Excel); detail pendaftar (verifikasi berkas per item dengan catatan, verifikasi/tolak pembayaran, jadwal observasi, penilaian 8 aspek skala 1–5 → nilai 0–100 + rekomendasi, keputusan terima/cadangan/tolak, ubah status manual, WhatsApp satu klik); jadwal observasi per hari dengan pengingat WA; CRUD gelombang, jenjang, pengumuman, FAQ; pesan masuk; pengaturan (identitas, kontak, rekening, konten landing, buka/tutup pendaftaran); manajemen pengguna & peran; log audit.

**Verifikasi publik** — `/cek-status` (no. pendaftaran + tanggal lahir) dan `/verifikasi/:nomor` (tujuan QR kartu).

## Alur status
`draft → waiting_payment → verification (↔ revision) → scheduled → assessed → accepted | reserve | rejected → reregistration → enrolled` (+ `cancelled`)

## Struktur
```
server/            API Express
  index.js         bootstrap, keamanan, penyajian frontend
  seed.js          data dasar & demo
  lib/             db (skema), auth, upload, util
  routes/          public, auth, portal, admin, files
shared/constants.js  status, jenis berkas, aspek penilaian (dipakai server & client)
src/               React (pages/portal, pages/admin, components, layouts)
public/brand/      logo & emblem
```

## Menyesuaikan
Alamat, telepon, WhatsApp, rekening, biaya, kuota, tanggal gelombang, misi, dan FAQ di data awal adalah **contoh** — ubah dari menu **Pengaturan**, **Gelombang**, **Jenjang**, dan **FAQ** di panel admin. Aspek penilaian observasi dan jenis berkas ada di `shared/constants.js`.

## Produksi
Jalankan di belakang reverse proxy HTTPS (Nginx/Caddy) dengan `NODE_ENV=production`, gunakan process manager (pm2/systemd), dan cadangkan folder `data/` secara berkala.
