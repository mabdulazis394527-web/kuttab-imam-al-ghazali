// Konstanta bersama untuk server & client

export const STATUS = {
  draft:           { label: 'Draf',                 tone: 'muted',   step: 0, desc: 'Formulir belum dikirim. Lengkapi data dan kirim pendaftaran.' },
  waiting_payment: { label: 'Menunggu Pembayaran',  tone: 'warning', step: 1, desc: 'Silakan transfer biaya pendaftaran lalu unggah bukti pembayaran.' },
  verification:    { label: 'Verifikasi Berkas',    tone: 'info',    step: 2, desc: 'Panitia sedang memeriksa berkas dan bukti pembayaran Anda.' },
  revision:        { label: 'Perlu Perbaikan',      tone: 'danger',  step: 2, desc: 'Ada berkas/data yang perlu diperbaiki. Lihat catatan panitia.' },
  scheduled:       { label: 'Jadwal Observasi',     tone: 'info',    step: 3, desc: 'Observasi ananda dan wawancara orang tua telah dijadwalkan.' },
  assessed:        { label: 'Menunggu Pengumuman',  tone: 'info',    step: 4, desc: 'Observasi selesai. Hasil akan diumumkan sesuai jadwal.' },
  accepted:        { label: 'Diterima',             tone: 'success', step: 5, desc: 'Alhamdulillah, ananda diterima. Silakan lakukan daftar ulang.' },
  reserve:         { label: 'Cadangan',             tone: 'warning', step: 5, desc: 'Ananda masuk daftar cadangan. Panitia akan menghubungi bila ada kuota.' },
  rejected:        { label: 'Belum Diterima',       tone: 'danger',  step: 5, desc: 'Mohon maaf, ananda belum dapat diterima pada periode ini.' },
  reregistration:  { label: 'Verifikasi Daftar Ulang', tone: 'info', step: 6, desc: 'Bukti daftar ulang sedang diverifikasi panitia.' },
  enrolled:        { label: 'Resmi Santri',         tone: 'success', step: 7, desc: 'Barakallahu fiikum. Ananda resmi menjadi santri Kuttab Imam Al-Ghazali.' },
  cancelled:       { label: 'Dibatalkan',           tone: 'muted',   step: 0, desc: 'Pendaftaran dibatalkan.' },
};

export const STEPS = [
  { key: 'form',        label: 'Isi Formulir' },
  { key: 'payment',     label: 'Bayar Pendaftaran' },
  { key: 'verify',      label: 'Verifikasi Berkas' },
  { key: 'observation', label: 'Observasi & Wawancara' },
  { key: 'assessment',  label: 'Penilaian' },
  { key: 'result',      label: 'Pengumuman' },
  { key: 'reregister',  label: 'Daftar Ulang' },
  { key: 'enrolled',    label: 'Resmi Santri' },
];

export const DOC_TYPES = [
  { key: 'photo',      label: 'Pas Foto Ananda (3x4, latar bebas)', required: true,  accept: 'image' },
  { key: 'birth_cert', label: 'Akta Kelahiran',                     required: true,  accept: 'any' },
  { key: 'family_card',label: 'Kartu Keluarga',                     required: true,  accept: 'any' },
  { key: 'father_id',  label: 'KTP Ayah',                           required: true,  accept: 'any' },
  { key: 'mother_id',  label: 'KTP Ibu',                            required: true,  accept: 'any' },
  { key: 'health',     label: 'Surat Keterangan Sehat (opsional)',  required: false, accept: 'any' },
  { key: 'report',     label: 'Rapor / Keterangan TK (opsional)',   required: false, accept: 'any' },
];

// Aspek observasi — disesuaikan dengan visi: insan Qur'ani, iman, amal shalih, pemikiran, adab
export const ASSESSMENT_ASPECTS = [
  { key: 'quran',      label: "Interaksi dengan Al-Qur'an",  hint: 'Kemampuan mengenal huruf, membaca, dan hafalan sesuai usia' },
  { key: 'iman',       label: 'Fitrah Keimanan',             hint: 'Kedekatan pada Allah, pengenalan kisah dan doa harian' },
  { key: 'adab',       label: 'Adab & Akhlak',               hint: 'Salam, sopan santun, adab kepada guru dan teman' },
  { key: 'mandiri',    label: 'Kemandirian & Amal',          hint: 'Toilet training, merapikan barang, tanggung jawab sederhana' },
  { key: 'fikr',       label: 'Daya Pikir & Rasa Ingin Tahu',hint: 'Kemampuan bertanya, bercerita, dan menalar sederhana' },
  { key: 'sosial',     label: 'Kematangan Sosial-Emosi',     hint: 'Berpisah dengan orang tua, bermain bersama, mengelola emosi' },
  { key: 'motorik',    label: 'Kesiapan Motorik',            hint: 'Memegang alat tulis, koordinasi gerak' },
  { key: 'parent',     label: 'Komitmen Orang Tua',          hint: 'Keselarasan visi pendidikan keluarga dengan kuttab (wawancara)' },
];

export const RECOMMENDATIONS = {
  recommended: 'Direkomendasikan',
  consider: 'Dipertimbangkan',
  not_recommended: 'Belum Direkomendasikan',
};

export const ROLES = { parent: 'Orang Tua', panitia: 'Panitia', admin: 'Administrator' };

export const formatRupiah = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

// Usia dalam tahun & bulan pada tanggal acuan (default: 1 Juli tahun ajaran)
export function ageAt(birthDate, refDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate); const r = new Date(refDate);
  let months = (r.getFullYear() - b.getFullYear()) * 12 + (r.getMonth() - b.getMonth());
  if (r.getDate() < b.getDate()) months--;
  return { years: Math.floor(months / 12), months: months % 12, totalMonths: months };
}

export function academicRefDate(academicYear) {
  const y = parseInt(String(academicYear || '').slice(0, 4), 10) || new Date().getFullYear();
  return `${y}-07-01`;
}
