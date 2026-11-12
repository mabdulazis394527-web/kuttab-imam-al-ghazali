import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Search, BookOpen, Sparkles, HandHeart, Lightbulb, Scale, Check, Plus, Users, MessagesSquare,
  Leaf, ScrollText, HeartHandshake, MapPin, Phone, Mail, Clock, Send, Megaphone, FileText, CreditCard, ClipboardCheck,
  CalendarCheck, Award, UserPlus, School,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useReveal, useTitle } from '../lib/hooks.js';
import { rupiah, date, waLink } from '../lib/format.js';
import { PublicNav, Footer } from '../layouts/Public.jsx';
import { Field, Input, Textarea, Button, useForm, useToast, PageLoader } from '../components/ui.jsx';

function Countdown({ to }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(to + 'T23:59:59').getTime() - now);
  const parts = [['Hari', 86400000], ['Jam', 3600000], ['Menit', 60000], ['Detik', 1000]];
  let rest = diff;
  return (
    <div className="countdown" aria-label="Sisa waktu pendaftaran">
      {parts.map(([l, ms]) => { const v = Math.floor(rest / ms); rest -= v * ms; return <div key={l}><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>; })}
    </div>
  );
}

const PILLARS = [
  { icon: Sparkles, ar: 'الإيمان', title: 'Kemandirian Iman', text: 'Iman yang tumbuh dari dalam: mengenal Allah lewat ayat-ayat-Nya di Al-Qur\'an dan di alam, hingga ananda taat bukan karena diawasi, tetapi karena yakin.' },
  { icon: HandHeart, ar: 'العمل الصالح', title: 'Kemandirian Amal Shalih', text: 'Ilmu yang menjelma perbuatan. Ananda dibiasakan beribadah, menunaikan tanggung jawab, dan berkhidmah kepada sesama tanpa harus disuruh.' },
  { icon: Lightbulb, ar: 'الفكر', title: 'Kemandirian Pemikiran', text: 'Akal yang jernih dan berani bertanya. Seperti Imam Al-Ghazali yang menimbang setiap gagasan dengan cermat, ananda dilatih menalar dan berpendapat dengan adab.' },
];

const FEATURES = [
  { icon: ScrollText, title: 'Adab Sebelum Ilmu', text: 'Adab kepada Allah, guru, orang tua, teman, dan ilmu itu sendiri menjadi pelajaran pertama setiap hari.', src: 'Terinspirasi Bidayatul Hidayah' },
  { icon: HeartHandshake, title: 'Ilmu yang Diamalkan', text: 'Setiap pelajaran diakhiri dengan amal nyata yang bisa ananda lakukan di rumah, kuttab, dan lingkungan.', src: 'Terinspirasi Ayyuhal Walad' },
  { icon: MessagesSquare, title: 'Halaqah Fikr', text: 'Lingkaran dialog pekanan: ananda belajar bertanya, mendengar, menimbang alasan, dan menyampaikan pendapat dengan santun.', src: 'Ciri khas Kuttab Imam Al-Ghazali' },
  { icon: BookOpen, title: 'Al-Qur\'an sebagai Poros', text: 'Talaqqi langsung kepada guru, tilawah, tahfizh bertahap, dan tadabbur—Al-Qur\'an menjadi pusat seluruh pelajaran.', src: 'Insan Qur\'ani' },
  { icon: Leaf, title: 'Tadabbur Alam', text: 'Sains, berhitung, dan bahasa dipelajari dengan mengamati ciptaan Allah—kebun, langit, hewan, dan air—agar ilmu menumbuhkan iman.', src: 'Ayat kauniyah' },
  { icon: Users, title: 'Majelis Orang Tua', text: 'Orang tua adalah guru pertama. Majelis berkala menyelaraskan pendidikan di rumah dan di kuttab.', src: 'Kemitraan keluarga' },
];

const HISTORY = [
  { y: 'I', t: 'Masa Awal Islam', d: 'Kuttab menjadi tempat anak-anak muslim belajar membaca, menulis, dan Al-Qur\'an. Pendidikan dimulai dari iman dan adab.' },
  { y: 'II', t: 'Masa Khulafaur Rasyidin', d: 'Kuttab tumbuh di berbagai kota. Para guru dimuliakan dan anak-anak dididik menjadi generasi yang kokoh imannya.' },
  { y: 'III', t: 'Masa Keemasan Ilmu', d: 'Dari kuttab lahir para ulama besar. Imam Al-Ghazali kecil memulai belajarnya di kampung halamannya, Thus, sebelum berguru kepada Imam Al-Haramain Al-Juwaini di Naisabur.' },
  { y: 'IV', t: 'Kuttab Imam Al-Ghazali', d: 'Kami menghidupkan kembali ruh kuttab dengan ciri khas sendiri: tiga kemandirian—iman, amal shalih, dan pemikiran—menuju kehidupan yang adil dan beradab.' },
];

const DAY = [
  ['07.00', 'Penyambutan & Dzikir Pagi', 'Salam, murajaah doa, dan menata hati sebelum belajar.'],
  ['07.30', 'Halaqah Al-Qur\'an', 'Talaqqi, tilawah, dan hafalan bersama guru dalam kelompok kecil.'],
  ['09.00', 'Iman & Adab', 'Kisah para nabi dan sahabat, tadabbur ayat, praktik adab harian.'],
  ['09.45', 'Makan Bersama', 'Belajar adab makan, berbagi, dan merapikan sendiri.'],
  ['10.15', 'Ilmu & Tadabbur Alam', 'Bahasa, berhitung, dan sains melalui pengamatan ciptaan Allah.'],
  ['11.00', 'Halaqah Fikr / Proyek', 'Dialog, bercerita, dan proyek amal shalih sederhana.'],
  ['11.45', 'Shalat Berjamaah', 'Wudhu mandiri dan shalat Dzuhur berjamaah.'],
  ['12.15', 'Muhasabah & Pulang', 'Mengingat kebaikan hari ini dan doa pulang.'],
];

const FLOW = [
  { icon: UserPlus, t: 'Buat Akun', d: 'Daftarkan akun orang tua dengan email & nomor WhatsApp aktif.' },
  { icon: FileText, t: 'Isi Formulir & Berkas', d: 'Lengkapi data ananda, orang tua, kesehatan, dan unggah berkas.' },
  { icon: CreditCard, t: 'Bayar Pendaftaran', d: 'Transfer biaya pendaftaran lalu unggah bukti pembayaran.' },
  { icon: ClipboardCheck, t: 'Verifikasi', d: 'Panitia memeriksa berkas. Kartu peserta dapat dicetak.' },
  { icon: CalendarCheck, t: 'Observasi & Wawancara', d: 'Observasi kesiapan ananda dan wawancara visi bersama orang tua.' },
  { icon: Megaphone, t: 'Pengumuman', d: 'Hasil diumumkan melalui portal, notifikasi, dan cek status.' },
  { icon: School, t: 'Daftar Ulang', d: 'Selesaikan administrasi daftar ulang dan unggah buktinya.' },
  { icon: Award, t: 'Resmi Santri', d: 'Ahlan wa sahlan! Ananda resmi menjadi santri kuttab.' },
];

function ContactForm() {
  const toast = useToast();
  const f = useForm({ name: '', phone: '', email: '', message: '' });
  const send = f.submit(async (v) => {
    await api.post('/public/inquiry', v);
    toast.success('Pesan terkirim. Panitia akan segera menghubungi Anda, insya Allah.');
    f.setValues({ name: '', phone: '', email: '', message: '' });
  });
  return (
    <form className="card card-body stack" onSubmit={send} style={{ gap: 14 }}>
      <h3 className="serif" style={{ margin: 0 }}>Kirim Pertanyaan</h3>
      <div className="grid g2" style={{ gap: 14 }}>
        <Field label="Nama" required error={f.errors.name}><Input {...f.bind('name')} placeholder="Nama Bapak/Ibu" /></Field>
        <Field label="No. WhatsApp" error={f.errors.phone}><Input {...f.bind('phone')} placeholder="08xxxxxxxxxx" inputMode="tel" /></Field>
      </div>
      <Field label="Email" error={f.errors.email}><Input type="email" {...f.bind('email')} placeholder="opsional" /></Field>
      <Field label="Pesan" required error={f.errors.message}><Textarea {...f.bind('message')} placeholder="Tuliskan pertanyaan Anda" /></Field>
      <Button loading={f.busy}><Send size={16} /> Kirim Pesan</Button>
    </form>
  );
}

export default function Landing() {
  useTitle('Penerimaan Santri Baru');
  const [info, setInfo] = useState(null);
  useEffect(() => { api.get('/public/info').then(setInfo).catch(() => setInfo({ settings: {}, programs: [], waves: [], faqs: [], announcements: [] })); }, []);
  useReveal();
  useEffect(() => { // dukung tautan /#bagian dari halaman lain
    if (info && window.location.hash) setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 60);
  }, [info]);
  if (!info) return <div style={{ background: 'var(--ink)', minHeight: '100vh' }}><PageLoader /></div>;
  const { settings: s, programs, waves, currentWave: cw, faqs, announcements } = info;
  const quota = programs.reduce((a, p) => a + p.quota, 0);
  const filled = programs.reduce((a, p) => a + p.filled, 0);
  const open = s.registration_open !== false && !!cw;

  return (
    <>
      <PublicNav />

      {/* ===== HERO ===== */}
      <section className="hero pattern-bg">
        <div className="container hero-grid">
          <div className="fade-up">
            <div className="bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <div className="eyebrow mt">{open ? <><span className="dot" /> {cw.name} dibuka · TA {cw.academic_year}</> : <>Pendaftaran TA {s.academic_year} segera dibuka</>}</div>
            <h1>{s.hero_title || 'Penerimaan Santri Baru'} <span className="gold-text">{s.academic_year}</span></h1>
            <p className="lead">{s.hero_subtitle}</p>
            <div className="hero-cta">
              <Link to="/daftar" className="btn btn-gold btn-lg">Daftarkan Ananda <ArrowRight size={18} /></Link>
              <Link to="/cek-status" className="btn btn-ghost-light btn-lg"><Search size={18} /> Cek Status</Link>
            </div>
            <div className="hero-stats">
              <div><b>{programs.length}</b><span>Jenjang pendidikan</span></div>
              <div><b>{Math.max(0, quota - filled)}</b><span>Kursi tersisa dari {quota}</span></div>
              <div>{open ? <><span>Gelombang ditutup dalam</span><Countdown to={cw.end_date} /></> : <><b>—</b><span>Gelombang berikutnya</span></>}</div>
            </div>
          </div>
          <div className="hero-emblem">
            <div className="ring" /><div className="ring r2" />
            <img src="/brand/emblem.png" alt="Lambang Kuttab Imam Al-Ghazali" />
          </div>
        </div>
      </section>

      <div className="pillars-strip"><div className="container"><span>INSAN QUR'ANI</span><span>IMAN</span><span>AMAL SHALIH</span><span>PEMIKIRAN</span><span>ADIL & BERADAB</span></div></div>

      {/* ===== TENTANG KUTTAB ===== */}
      <section className="section" id="tentang">
        <div className="container about-grid">
          <div className="reveal">
            <div className="kicker">Apa itu Kuttab</div>
            <h2 className="h2">Sekolah pertama peradaban Islam</h2>
            <div className="prose">
              <p><b>Kuttab</b> (كُتَّاب) berasal dari kata <i>kataba</i>—menulis. Sejak masa awal Islam, kuttab adalah tempat anak-anak belajar membaca, menulis, Al-Qur'an, dan adab. Dari kuttab-kuttab sederhana inilah lahir generasi yang memimpin peradaban dengan ilmu dan akhlak.</p>
              <p>Ciri pendidikan kuttab adalah urutannya: <b>iman ditanam lebih dulu</b>, lalu Al-Qur'an, lalu ilmu-ilmu lainnya—sehingga ilmu menambah keyakinan, bukan sekadar pengetahuan.</p>
            </div>
            <div className="hadith">
              <div className="ar">كُنَّا مَعَ النَّبِيِّ ﷺ وَنَحْنُ فِتْيَانٌ حَزَاوِرَةٌ، فَتَعَلَّمْنَا الْإِيمَانَ قَبْلَ أَنْ نَتَعَلَّمَ الْقُرْآنَ، ثُمَّ تَعَلَّمْنَا الْقُرْآنَ فَازْدَدْنَا بِهِ إِيمَانًا</div>
              <div className="tr">"Kami bersama Nabi ﷺ saat masih remaja. Kami mempelajari iman sebelum mempelajari Al-Qur'an, kemudian kami mempelajari Al-Qur'an sehingga bertambahlah iman kami."</div>
              <div className="src">HR. Ibnu Majah, dari Jundub bin Abdillah radhiyallahu 'anhu</div>
            </div>
            <p className="muted small" style={{ margin: 0 }}>Kuttab Imam Al-Ghazali adalah lembaga mandiri yang mengambil inspirasi dari tradisi kuttab, dengan kurikulum dan ciri khas yang kami rumuskan sendiri.</p>
          </div>
          <div className="reveal">
            <div className="card card-body" style={{ padding: 30 }}>
              <h3 className="serif" style={{ fontSize: 18, marginBottom: 22 }}>Jejak Kuttab dalam Sejarah</h3>
              <div className="timeline-h">
                {HISTORY.map((h) => (
                  <div className="item" key={h.y}><div className="dot">{h.y}</div><div><h4>{h.t}</h4><p>{h.d}</p></div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VISI MISI ===== */}
      <section className="section dark pattern-bg" id="visi">
        <div className="container">
          <div className="vision reveal">
            <div className="kicker">Visi Kami</div>
            <blockquote>"{s.vision}"</blockquote>
          </div>
          <ul className="mission-list reveal">
            {(s.missions || []).map((m, i) => <li key={i}><b>{String(i + 1).padStart(2, '0')}</b>{m}</li>)}
          </ul>
        </div>
      </section>

      {/* ===== CIRI KHAS ===== */}
      <section className="section" id="ciri-khas">
        <div className="container">
          <div className="section-head reveal">
            <div className="kicker">Ciri Khas</div>
            <h2>Satu Poros, Tiga Kemandirian, Satu Tujuan</h2>
            <p>Bukan sekadar pandai membaca dan menghafal. Kami menumbuhkan anak yang mandiri dalam iman, amal, dan cara berpikirnya.</p>
          </div>
          <div className="pillar-wrap reveal">
            <div className="pillar pillar-core">
              <div className="ic" style={{ margin: '0 auto 16px', background: 'var(--gold-grad)', color: 'var(--ink)' }}><BookOpen size={26} /></div>
              <h3>Insan Qur'ani</h3>
              <p>Al-Qur'an adalah poros: dibaca, dihafal, ditadabburi, dan diamalkan. Dari poros inilah tiga kemandirian tumbuh.</p>
            </div>
            {PILLARS.map((p) => (
              <div className="pillar" key={p.title}>
                <span className="ar">{p.ar}</span>
                <div className="ic"><p.icon size={24} /></div>
                <h3>{p.title}</h3><p>{p.text}</p>
              </div>
            ))}
            <div className="pillar pillar-goal">
              <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
                <Scale size={26} color="var(--gold-deep)" />
                <h3 style={{ margin: 0 }}>Tujuan: Hidup yang Adil & Beradab</h3>
              </div>
              <p className="mt" style={{ maxWidth: 680, margin: '12px auto 0' }}>Adil—menempatkan sesuatu pada tempatnya; beradab—mengenal kedudukan Allah, manusia, dan ilmu. Inilah buah pendidikan yang kami cita-citakan.</p>
            </div>
          </div>

          <div className="feature-grid mt2 reveal">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}><f.icon className="ic" size={28} /><h4>{f.title}</h4><p>{f.text}</p><span className="src">{f.src}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="quote-band pattern-bg">
        <div className="container reveal">
          <div className="ar">العِلْمُ بِلَا عَمَلٍ جُنُونٌ، وَالعَمَلُ بِغَيْرِ عِلْمٍ لَا يَكُونُ</div>
          <div className="tr">"Ilmu tanpa amal adalah kegilaan, dan amal tanpa ilmu tidak akan terwujud."</div>
          <div className="src">Imam Al-Ghazali · Ayyuhal Walad</div>
        </div>
      </section>

      {/* ===== JENJANG ===== */}
      <section className="section alt" id="jenjang">
        <div className="container">
          <div className="section-head reveal">
            <div className="kicker">Jenjang Pendidikan</div>
            <h2>Program yang Dibuka</h2>
            <p>Usia dihitung per 1 Juli tahun ajaran {s.academic_year}. Kuota terbatas agar setiap ananda mendapat perhatian penuh.</p>
          </div>
          <div className="program-grid">
            {programs.map((p) => {
              const left = Math.max(0, p.quota - p.filled);
              return (
                <article className="program reveal" key={p.id}>
                  <div className="program-top">
                    <span className="code">{p.code}</span>
                    <span className="badge tone-gold plain">Usia {p.age_min}–{p.age_max} tahun</span>
                    <h3>{p.name}</h3><p>{p.tagline}</p>
                  </div>
                  <div className="program-body">
                    <p className="muted" style={{ margin: 0 }}>{p.description}</p>
                    <ul className="ticks">{p.highlights.map((h) => <li key={h}><Check size={16} />{h}</li>)}</ul>
                    <div className="meta">
                      <div><b>{rupiah(p.entry_fee)}</b><span>Biaya masuk (daftar ulang)</span></div>
                      <div><b>{rupiah(p.monthly_fee)}</b><span>Infaq pendidikan / bulan</span></div>
                    </div>
                    <div>
                      <div className="row between small"><span className="muted">{p.gender_policy}</span><b>{left} kursi tersisa</b></div>
                      <div className="progress mt" style={{ marginTop: 8 }}><span style={{ width: `${p.quota ? (p.filled / p.quota) * 100 : 0}%` }} /></div>
                    </div>
                    <Link to="/daftar" className="btn btn-dark btn-block">Daftar {p.name} <ArrowRight size={16} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SEHARI DI KUTTAB ===== */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <div className="kicker">Sehari di Kuttab</div>
            <h2>Ritme yang Menenangkan</h2>
            <p>Gambaran umum kegiatan harian. Jadwal rinci menyesuaikan jenjang dan kalender akademik.</p>
          </div>
          <div className="day reveal">
            {DAY.map(([t, h, p]) => <div className="day-item" key={t}><time>{t}</time><h4>{h}</h4><p>{p}</p></div>)}
          </div>
        </div>
      </section>

      {/* ===== ALUR ===== */}
      <section className="section dark pattern-bg" id="alur">
        <div className="container">
          <div className="section-head reveal">
            <div className="kicker">Alur Pendaftaran</div>
            <h2 style={{ color: '#f3e9cf' }}>Delapan Langkah Menuju Kuttab</h2>
            <p>Seluruh proses dapat dipantau dari portal orang tua—tanpa antre, tanpa berkas fisik di awal.</p>
          </div>
          <div className="flow reveal">
            {FLOW.map((f, i) => <div className="flow-step" key={f.t}><div className="n">{i + 1}</div><h4 className="row" style={{ gap: 8 }}><f.icon size={17} />{f.t}</h4><p>{f.d}</p></div>)}
          </div>
          <div className="center mt2"><Link to="/daftar" className="btn btn-gold btn-lg">Mulai Pendaftaran <ArrowRight size={18} /></Link></div>
        </div>
      </section>

      {/* ===== GELOMBANG & BIAYA ===== */}
      <section className="section" id="biaya">
        <div className="container">
          <div className="section-head reveal">
            <div className="kicker">Jadwal & Biaya</div>
            <h2>Gelombang Pendaftaran</h2>
          </div>
          <div className="table-wrap reveal">
            <table className="wave-table">
              <thead><tr><th>Gelombang</th><th>Pendaftaran</th><th>Observasi</th><th>Pengumuman</th><th>Biaya Pendaftaran</th></tr></thead>
              <tbody>
                {waves.map((w) => (
                  <tr key={w.id} className={cw?.id === w.id ? 'current' : ''}>
                    <td><b>{w.name}</b>{cw?.id === w.id && <span className="badge tone-success" style={{ marginLeft: 8 }}>Dibuka</span>}{w.notes && <div className="tiny muted">{w.notes}</div>}</td>
                    <td>{date(w.start_date)} – {date(w.end_date)}</td>
                    <td>{date(w.observation_date)}</td>
                    <td>{date(w.announcement_date)}</td>
                    <td><b>{rupiah(w.registration_fee)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid g2 mt2">
            <div className="card card-body reveal">
              <h3 className="serif" style={{ fontSize: 18 }}>Syarat Pendaftaran</h3>
              <ul className="ticks" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {(s.requirements || []).map((r) => <li key={r}><Check size={16} />{r}</li>)}
              </ul>
            </div>
            <div className="card card-dark card-body reveal">
              <h3 className="serif" style={{ fontSize: 18, color: 'var(--gold-light)' }}>Berkas yang Disiapkan</h3>
              <ul className="ticks" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {['Pas foto ananda', 'Akta kelahiran', 'Kartu Keluarga', 'KTP ayah dan ibu', 'Surat keterangan sehat (opsional)', 'Rapor/keterangan TK (opsional)'].map((r) => <li key={r}><Check size={16} color="var(--gold)" />{r}</li>)}
              </ul>
              <p className="small mt" style={{ color: '#a89f88', marginBottom: 0 }}>Format JPG, PNG, atau PDF, maksimal 5 MB per berkas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PENGUMUMAN ===== */}
      {announcements.length > 0 && (
        <section className="section alt" style={{ paddingTop: 70, paddingBottom: 70 }}>
          <div className="container">
            <div className="section-head reveal" style={{ marginBottom: 32 }}><div className="kicker">Kabar Terbaru</div><h2>Pengumuman</h2></div>
            <div className="grid g3">
              {announcements.map((a) => (
                <article className="card card-body reveal" key={a.id}>
                  <div className="row between"><Megaphone size={20} color="var(--gold-deep)" />{a.pinned ? <span className="badge tone-gold plain">Disematkan</span> : null}</div>
                  <h4 className="mt" style={{ fontSize: 16.5 }}>{a.title}</h4>
                  <p className="muted small" style={{ margin: 0 }}>{a.body}</p>
                  <div className="tiny muted mt">{date(a.created_at)}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-head reveal"><div className="kicker">Tanya Jawab</div><h2>Pertanyaan yang Sering Diajukan</h2></div>
          <div className="faq reveal">
            {faqs.map((f, i) => (
              <details key={f.id} open={i === 0}><summary>{f.question}<Plus size={20} /></summary><p>{f.answer}</p></details>
            ))}
          </div>
          <div className="container mt2">
            <div className="cta-band reveal">
              <div><h2>Siap menapaki jalan ilmu bersama?</h2><p>Buat akun orang tua dan mulai isi formulir—hanya butuh sekitar 15 menit.</p></div>
              <Link to="/daftar" className="btn btn-dark btn-lg">Daftar Sekarang <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KONTAK ===== */}
      <section className="section dark" id="kontak">
        <div className="container contact-grid">
          <div className="reveal">
            <div className="kicker">Kontak</div>
            <h2 className="h2" style={{ color: '#f3e9cf' }}>Ada yang ingin ditanyakan?</h2>
            <p style={{ color: '#a89f88' }}>Panitia PSB siap membantu Bapak/Ibu pada jam layanan.</p>
            <div className="contact-item"><MapPin size={20} /><div><b>Alamat</b>{s.address}, {s.city}{s.maps_url && <> · <a href={s.maps_url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-light)' }}>Lihat peta</a></>}</div></div>
            <div className="contact-item"><Phone size={20} /><div><b>Telepon / WhatsApp</b>{s.phone}{s.whatsapp && <> · <a href={waLink(s.whatsapp, 'Assalamualaikum, saya ingin bertanya tentang PSB Kuttab Imam Al-Ghazali.')} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-light)' }}>Chat WhatsApp</a></>}</div></div>
            <div className="contact-item"><Mail size={20} /><div><b>Email</b>{s.email}</div></div>
            <div className="contact-item" style={{ borderBottom: 0 }}><Clock size={20} /><div><b>Jam Layanan</b>{s.office_hours}</div></div>
          </div>
          <div className="reveal" style={{ color: 'var(--text)' }}><ContactForm /></div>
        </div>
      </section>
      <Footer settings={s} />
      <div className="no-print" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 40 }}>
        {s.whatsapp && <a className="btn btn-gold" href={waLink(s.whatsapp, 'Assalamualaikum, saya ingin bertanya tentang PSB.')} target="_blank" rel="noreferrer" aria-label="Hubungi via WhatsApp"><Phone size={16} /> <span className="hide-sm">Tanya Panitia</span></a>}
      </div>
    </>
  );
}
