import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, one, run, all, setSetting, tx } from './lib/db.js';
import { ROOT, UPLOAD_DIR } from './lib/config.js';
import { ASSESSMENT_ASPECTS, DOC_TYPES } from '../shared/constants.js';

export function seedBase() {
  tx(() => {
    const S = {
      school_name: 'Kuttab Imam Al-Ghazali',
      tagline: "Mewujudkan Insan Qur'ani yang Adil dan Beradab",
      vision: "Mewujudkan insan Qur'ani dengan kemandirian iman, amal shalih, dan pemikiran sehingga mampu menjalani kehidupan yang adil dan beradab.",
      missions: [
        'Menanamkan iman yang kokoh melalui pengenalan kepada Allah, Rasul-Nya, dan tadabbur ayat-ayat kauniyah di alam sekitar.',
        "Menjadikan Al-Qur'an sebagai poros pembelajaran: talaqqi, tilawah, tahfizh, dan tadabbur sesuai tahapan usia.",
        'Membiasakan amal shalih dan adab harian hingga santri mandiri, bertanggung jawab, dan gemar berkhidmah.',
        'Menumbuhkan kemandirian berpikir melalui tradisi bertanya, berdialog, dan menalar sebagaimana teladan para ulama.',
        'Membangun kemitraan erat bersama orang tua dalam mendidik generasi yang adil dan beradab.',
      ],
      hero_title: 'Penerimaan Santri Baru',
      hero_subtitle: "Bersama menumbuhkan generasi Qur'ani yang mandiri dalam iman, amal shalih, dan pemikiran — dalam tradisi adab para ulama.",
      address: 'Jl. Contoh Raya No. 1 (ubah di menu Pengaturan)',
      city: 'Kota Anda',
      phone: '0812-0000-0000',
      whatsapp: '6281200000000',
      email: 'psb@kuttabimamalghazali.sch.id',
      instagram: 'kuttabimamalghazali',
      youtube: '',
      maps_url: '',
      academic_year: '2027/2028',
      office_hours: 'Senin–Jumat, 08.00–14.00 WIB',
      registration_open: true,
      bank_accounts: [
        { bank: 'Bank Syariah Indonesia (BSI)', number: '7000000000', holder: 'Yayasan Kuttab Imam Al-Ghazali' },
      ],
      requirements: [
        'Usia ananda sesuai ketentuan jenjang per 1 Juli tahun ajaran baru.',
        'Orang tua bersedia mengikuti wawancara dan program parenting kuttab.',
        'Mengisi formulir daring dan mengunggah berkas (pas foto, akta, KK, KTP ayah & ibu).',
        'Membayar biaya pendaftaran sesuai gelombang.',
        'Ananda mengikuti observasi kesiapan belajar (bukan tes calistung).',
      ],
    };
    for (const [k, v] of Object.entries(S)) setSetting(k, v);

    const programs = [
      ['KA', 'Kuttab Awal', 'Menyemai iman, adab, dan cinta Al-Qur\'an', 'Jenjang fondasi bagi ananda usia 5–6 tahun. Fokus pada penanaman iman lewat kisah dan alam, adab harian, pengenalan huruf hijaiyah dengan talaqqi, serta kesiapan belajar melalui bermain yang terarah.', 5, 6, 24, 'Kelas terpisah putra & putri',
        ['Talaqqi huruf hijaiyah & tilawah dasar', 'Pengenalan iman lewat kisah & tadabbur alam', 'Pembiasaan adab harian & kemandirian diri', 'Bahasa ibu, motorik, dan pra-menulis'], 650000, 5500000, 1],
      ['KQ', 'Kuttab Qonuni', 'Menguatkan hafalan, bahasa, dan nalar', 'Jenjang lanjutan bagi ananda usia 7–9 tahun. Melanjutkan hafalan Al-Qur\'an bertahap, bahasa Arab, menulis, berhitung, sains melalui tadabbur, sirah, serta Halaqah Fikr untuk melatih kemandirian berpikir.', 7, 9, 20, 'Kelas terpisah putra & putri',
        ["Tahfizh & tadabbur Al-Qur'an bertahap", 'Bahasa Arab, Bahasa Indonesia & khat', 'Berhitung & sains berbasis ayat kauniyah', 'Halaqah Fikr: bertanya, berdialog, menalar'], 750000, 6500000, 2],
    ];
    for (const p of programs) run(`INSERT INTO programs(code,name,tagline,description,age_min,age_max,quota,gender_policy,highlights,monthly_fee,entry_fee,sort)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], JSON.stringify(p[8]), p[9], p[10], p[11]);

    run(`INSERT INTO waves(name,academic_year,start_date,end_date,observation_date,announcement_date,registration_fee,quota,notes)
      VALUES('Gelombang 1','2027/2028','2026-10-01','2026-12-31','2027-01-10','2027-01-24',350000,30,'Prioritas bagi saudara kandung santri aktif.')`);
    run(`INSERT INTO waves(name,academic_year,start_date,end_date,observation_date,announcement_date,registration_fee,quota,notes)
      VALUES('Gelombang 2','2027/2028','2027-01-25','2027-03-31','2027-04-11','2027-04-25',400000,14,'Dibuka bila kuota masih tersedia.')`);

    const faqs = [
      ['Apa itu kuttab?', "Kuttab adalah lembaga pendidikan dasar dalam sejarah Islam—tempat anak-anak belajar membaca, menulis, Al-Qur'an, dan adab sejak masa awal Islam. Kuttab Imam Al-Ghazali menghidupkan kembali semangat itu dengan pendekatan yang sesuai zaman."],
      ['Apa yang membedakan Kuttab Imam Al-Ghazali?', "Kami berpijak pada visi insan Qur'ani dengan tiga kemandirian: iman, amal shalih, dan pemikiran. Terinspirasi Imam Al-Ghazali, kami menekankan adab sebelum ilmu, ilmu yang diamalkan, serta tradisi bertanya dan menalar (Halaqah Fikr) agar santri tumbuh adil dan beradab. Kami lembaga mandiri dan tidak berada di bawah jaringan kuttab mana pun."],
      ['Apakah ada tes calistung?', 'Tidak. Kami melakukan observasi kesiapan belajar ananda (adab, kemandirian, sosial-emosi, dan interaksi dengan Al-Qur\'an) serta wawancara orang tua untuk menyelaraskan visi pendidikan.'],
      ['Berapa usia yang dapat mendaftar?', 'Kuttab Awal untuk usia 5–6 tahun dan Kuttab Qonuni untuk usia 7–9 tahun, dihitung per 1 Juli tahun ajaran baru.'],
      ['Mengapa orang tua juga diwawancarai?', 'Pendidikan adalah kerja bersama. Wawancara memastikan keluarga dan kuttab berjalan seiring, termasuk kesediaan mengikuti majelis orang tua (parenting) secara berkala.'],
      ['Bagaimana jika berkas saya ditolak?', 'Panitia akan memberi catatan pada berkas tersebut. Anda cukup mengunggah ulang berkas yang diminta melalui portal orang tua.'],
      ['Apakah biaya pendaftaran dapat dikembalikan?', 'Biaya pendaftaran digunakan untuk proses seleksi dan tidak dapat dikembalikan.'],
    ];
    faqs.forEach((f, i) => run('INSERT INTO faqs(question,answer,sort) VALUES(?,?,?)', f[0], f[1], i + 1));

    run(`INSERT INTO announcements(title,body,audience,pinned) VALUES(?,?,?,1)`, 'PSB Gelombang 1 TA 2027/2028 telah dibuka',
      'Pendaftaran Gelombang 1 dibuka 1 Oktober – 31 Desember 2026. Kuota terbatas. Silakan buat akun dan isi formulir secara daring.', 'public');
    run(`INSERT INTO announcements(title,body,audience,pinned) VALUES(?,?,?,0)`, 'Majelis Orang Tua Calon Santri',
      'Insya Allah akan diadakan pertemuan perkenalan visi kuttab bagi orang tua calon santri. Jadwal akan dikirim melalui portal & WhatsApp.', 'applicants');

    const hash = (p) => bcrypt.hashSync(p, 10);
    run('INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)', 'Administrator PSB', 'admin@psb.local', '081200000001', 'admin', hash('AdminPSB#2027'));
    run('INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)', 'Ustadzah Panitia', 'panitia@psb.local', '081200000002', 'panitia', hash('PanitiaPSB#2027'));
  });
  console.log('✓ Data dasar dibuat (admin@psb.local / AdminPSB#2027)');
}

/* ------------------------------ Data demo ------------------------------ */
function seedDemo() {
  const assets = path.join(ROOT, 'server', 'assets');
  const copyFile = (kind = 'doc') => { const n = crypto.randomBytes(16).toString('hex') + '.png'; fs.copyFileSync(path.join(assets, `demo-${kind}.png`), path.join(UPLOAD_DIR, n)); return n; };
  const pick = (a, i) => a[i % a.length];
  const boys = ['Muhammad Al-Fatih', 'Ahmad Zaid', 'Umar Abdullah', 'Hasan Ibrahim', 'Ali Ridha', 'Yusuf Hanif', 'Abdurrahman Faqih', 'Bilal Haidar', 'Salman Hakim', 'Khalid Aqil', 'Hamzah Nashir', 'Utsman Rafif', 'Ismail Fawwaz', 'Zubair Arkan'];
  const girls = ['Aisyah Humaira', 'Fatimah Azzahra', 'Khadijah Nur', 'Maryam Shafiyyah', 'Hafshah Aulia', 'Sumayyah Rania', 'Zainab Syifa', 'Ruqayyah Nadia', 'Asma Kamila', 'Ummu Kultsum Hana', 'Safiyyah Labibah', 'Nusaibah Alya', 'Rabiah Azka'];
  const fathers = ['Abdul Malik', 'Rahmat Hidayat', 'Fajar Nugraha', 'Iqbal Maulana', 'Rizky Pratama', 'Dimas Saputra', 'Hendra Kurniawan', 'Taufik Hidayat', 'Agus Setiawan', 'Yoga Prasetyo'];
  const mothers = ['Siti Nurhaliza', 'Dewi Lestari', 'Anisa Rahma', 'Rina Marlina', 'Fitri Handayani', 'Laila Sari', 'Nurul Aini', 'Wulan Sari', 'Mila Karmila'];
  const jobs = ['Wiraswasta', 'Guru', 'Karyawan Swasta', 'Dokter', 'PNS', 'Dosen', 'Ibu Rumah Tangga', 'Pedagang', 'Insinyur'];
  const cities = ['Bandung', 'Cimahi', 'Bandung Barat', 'Sumedang', 'Bandung', 'Bandung'];
  const sources = ['Instagram', 'Teman/Kerabat', 'Majelis Taklim', 'WhatsApp', 'Website', 'Instagram'];
  const flow = ['draft', 'waiting_payment', 'verification', 'verification', 'revision', 'scheduled', 'scheduled', 'assessed', 'assessed', 'accepted', 'accepted', 'reserve', 'rejected', 'reregistration', 'enrolled', 'enrolled', 'verification', 'scheduled', 'waiting_payment', 'accepted', 'assessed', 'enrolled', 'verification', 'scheduled', 'accepted', 'cancelled', 'waiting_payment'];
  const order = ['draft', 'waiting_payment', 'verification', 'scheduled', 'assessed', 'accepted', 'reregistration', 'enrolled'];
  const programs = all('SELECT * FROM programs');
  const wave = one('SELECT * FROM waves ORDER BY start_date LIMIT 1');
  const admin = one("SELECT id FROM users WHERE role='admin'").id;
  const hash = bcrypt.hashSync('OrangTua#2027', 10);
  const yearRef = 2027;

  tx(() => {
    flow.forEach((status, i) => {
      const email = [0, 5, 9].includes(i) ? 'orangtua@contoh.id' : `wali${i}@contoh.id`;
      const fname = pick(fathers, i), mname = pick(mothers, i + 3);
      let uid = one('SELECT id FROM users WHERE email=?', email)?.id;
      if (!uid) uid = Number(run('INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)', i % 3 ? fname : mname, email, `08122${String(100000 + i * 731).slice(0, 6)}`, 'parent', hash).lastInsertRowid);
      const gender = i % 2 ? 'P' : 'L';
      const name = gender === 'L' ? pick(boys, i) : pick(girls, i);
      const prog = programs[i % 3 === 0 ? 1 : 0];
      const age = prog.code === 'KA' ? 5 + (i % 2) : 7 + (i % 3);
      const birth = `${yearRef - age}-${String((i % 12) + 1).padStart(2, '0')}-${String((i * 7) % 27 + 1).padStart(2, '0')}`;
      const daysAgo = 40 - i;
      const created = `datetime('now','-${daysAgo} day')`;
      const { lastInsertRowid } = run(`INSERT INTO applications(user_id,wave_id,program_id,status,full_name,nickname,gender,birth_place,birth_date,nik,kk_number,child_order,siblings,
        address,city,province,quran_ability,memorization,blood_type,height_cm,weight_kg,father,mother,motivation,info_source,commitments,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${created},${created})`,
      uid, wave.id, prog.id, 'draft', name, name.split(' ')[0], gender, pick(cities, i + 1), birth,
      `3273${String(1000000000000 + i * 7919).slice(0, 12)}`, `3273${String(2000000000000 + i * 104729).slice(0, 12)}`, (i % 3) + 1, (i % 4) + 1,
      `Jl. Melati No. ${i + 3}, RT 0${(i % 9) + 1}/RW 0${(i % 5) + 1}`, pick(cities, i), 'Jawa Barat', pick(['Belum mengenal huruf', 'Mengenal sebagian huruf', 'Iqra/Jilid 1–3', 'Lancar membaca'], i),
      pick(['An-Nas, Al-Falaq, Al-Ikhlas', 'Juz 30 sebagian', 'Al-Fatihah', 'Belum ada'], i), pick(['A', 'B', 'O', 'AB'], i), 105 + (i % 20), 17 + (i % 10),
      JSON.stringify({ name: fname, occupation: pick(jobs, i), phone: `08131${String(200000 + i * 113).slice(0, 6)}`, education: pick(['S1', 'S2', 'SMA', 'D3'], i), income: pick(['5–10 juta', '10–20 juta', '3–5 juta'], i) }),
      JSON.stringify({ name: mname, occupation: pick(jobs, i + 4), phone: `08571${String(300000 + i * 97).slice(0, 6)}`, education: pick(['S1', 'SMA', 'S2'], i) }),
      'Kami ingin ananda tumbuh dekat dengan Al-Qur\'an dan beradab sejak kecil, dalam lingkungan yang menanamkan iman sebelum ilmu.',
      pick(sources, i), JSON.stringify({ visi: true, kerjasama: true, adab: true, data: true }));
      const appId = Number(lastInsertRowid);
      run(`INSERT INTO status_history(application_id,status,note,actor_id,created_at) VALUES(?,?,?,?,${created})`, appId, 'draft', 'Formulir dibuat', uid);
      if (status === 'draft') return;

      const reg = `KIG-2027-${prog.code}-${String(appId).padStart(4, '0')}`;
      run(`UPDATE applications SET reg_number=?, submitted_at=datetime('now','-${daysAgo - 1} day') WHERE id=?`, reg, appId);
      for (const d of DOC_TYPES.filter((x) => x.required)) {
        const st = ['draft', 'waiting_payment', 'verification'].includes(status) ? 'pending' : status === 'revision' && d.key === 'family_card' ? 'invalid' : 'valid';
        run('INSERT INTO documents(application_id,type,filename,original_name,mime,size,status,note) VALUES(?,?,?,?,?,?,?,?)',
          appId, d.key, copyFile(d.key === 'photo' ? 'photo' : 'doc'), `${d.key}.png`, 'image/png', 45000, st, st === 'invalid' ? 'Foto KK buram, mohon unggah ulang yang lebih jelas.' : null);
      }
      const target = status === 'cancelled' ? 'waiting_payment' : status === 'revision' ? 'verification' : ['reserve', 'rejected'].includes(status) ? 'accepted' : status;
      const steps = order.slice(1, order.indexOf(target) + 1).filter((s) => !(['accepted'].includes(s) && ['reserve', 'rejected'].includes(status)));
      let t = daysAgo - 1;
      for (const s of steps) {
        if (s !== 'waiting_payment' && s !== 'reregistration' && !one("SELECT 1 FROM payments WHERE application_id=? AND kind='registration'", appId) && order.indexOf(s) >= 2) {
          run(`INSERT INTO payments(application_id,kind,amount,payer_name,bank_name,paid_at,proof_filename,status,verified_by,verified_at) VALUES(?,?,?,?,?,date('now','-${t} day'),?,?,?,datetime('now','-${t} day'))`,
            appId, 'registration', wave.registration_fee, fname, 'BSI', copyFile(), s === 'verification' && status === 'verification' && i % 2 ? 'pending' : 'approved', admin);
        }
        if (s === 'scheduled') {
          const off = status === 'scheduled' ? `+${(i % 6) + 1} day` : `-${Math.max(t - 2, 1)} day`;
          run(`UPDATE applications SET observation_at=strftime('%Y-%m-%d ', datetime('now','${off}')) || '${String(8 + (i % 3)).padStart(2, '0')}:${i % 2 ? '30' : '00'}', observation_place='Aula Kuttab Imam Al-Ghazali', observer='Ust. Hafizh & Ustdz. Aminah' WHERE id=?`, appId);
        }
        if (s === 'assessed') {
          const scores = Object.fromEntries(ASSESSMENT_ASPECTS.map((a, k) => [a.key, 3 + ((i + k) % 3)]));
          const v = Object.values(scores); const total = Math.round((v.reduce((x, y) => x + y, 0) / (v.length * 5)) * 1000) / 10;
          run('INSERT INTO assessments(application_id,scores,total,recommendation,note,assessor_id) VALUES(?,?,?,?,?,?)', appId, JSON.stringify(scores), total,
            status === 'rejected' ? 'not_recommended' : status === 'reserve' ? 'consider' : 'recommended', 'Ananda tampak antusias dan mudah beradaptasi.', admin);
          run('UPDATE applications SET score_total=? WHERE id=?', total, appId);
        }
        if (s === 'reregistration') run(`INSERT INTO payments(application_id,kind,amount,payer_name,bank_name,paid_at,proof_filename,status,verified_by,verified_at) VALUES(?,?,?,?,?,date('now','-1 day'),?,?,?,?)`,
          appId, 'reregistration', prog.entry_fee, fname, 'BSI', copyFile(), status === 'enrolled' ? 'approved' : 'pending', status === 'enrolled' ? admin : null, status === 'enrolled' ? new Date().toISOString() : null);
        run(`INSERT INTO status_history(application_id,status,note,actor_id,created_at) VALUES(?,?,?,?,datetime('now','-${Math.max(t, 0)} day'))`, appId, s, null, s === 'waiting_payment' ? uid : admin);
        t = Math.max(t - 3, 0);
      }
      if (['reserve', 'rejected', 'revision', 'cancelled'].includes(status)) {
        const note = status === 'revision' ? 'Mohon unggah ulang Kartu Keluarga yang lebih jelas.' : null;
        run('INSERT INTO status_history(application_id,status,note,actor_id) VALUES(?,?,?,?)', appId, status, note, admin);
      }
      run('UPDATE applications SET status=? WHERE id=?', status, appId);
      if (['accepted', 'reserve', 'rejected', 'reregistration', 'enrolled'].includes(status)) run("UPDATE applications SET decided_at=datetime('now','-2 day') WHERE id=?", appId);
    });
    run("INSERT INTO inquiries(name,phone,message) VALUES('Ibu Rahma','081234567890','Assalamualaikum, apakah ada program antar-jemput untuk santri Kuttab Awal?')");
    run("INSERT INTO inquiries(name,phone,message) VALUES('Bapak Ilham','085712345678','Apakah bisa mendaftar untuk dua anak sekaligus dengan satu akun?')");
  });
  console.log(`✓ Data demo dibuat (${flow.length} pendaftar). Akun orang tua: orangtua@contoh.id / OrangTua#2027`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!one('SELECT id FROM users LIMIT 1')) seedBase(); else console.log('• Data dasar sudah ada, dilewati.');
  if (process.argv.includes('--demo')) {
    if (one("SELECT id FROM users WHERE email='orangtua@contoh.id'")) console.log('• Data demo sudah ada, dilewati.');
    else seedDemo();
  }
  db.close();
}
