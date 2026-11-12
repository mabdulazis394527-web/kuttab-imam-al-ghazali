import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Send, Save, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useTitle } from '../../lib/hooks.js';
import { rupiah, date } from '../../lib/format.js';
import { ageAt, academicRefDate, DOC_TYPES } from '../../../shared/constants.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Field, Input, Select, Textarea, Button, Alert, PageLoader, useToast, Progress, useConfirm } from '../../components/ui.jsx';
import { DocumentUploader } from '../../components/Uploads.jsx';

const STEPS = [
  { key: 'program', label: 'Jenjang' },
  { key: 'santri', label: 'Data Ananda' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'orangtua', label: 'Orang Tua' },
  { key: 'berkas', label: 'Berkas' },
  { key: 'komitmen', label: 'Komitmen' },
  { key: 'tinjau', label: 'Tinjau & Kirim' },
];
const EDU = ['SD', 'SMP', 'SMA/SMK', 'D3', 'S1', 'S2', 'S3', 'Pesantren', 'Lainnya'];
const INCOME = ['< 3 juta', '3–5 juta', '5–10 juta', '10–20 juta', '> 20 juta', 'Tidak berpenghasilan'];
const QURAN = ['Belum mengenal huruf', 'Mengenal sebagian huruf', 'Iqra/Jilid 1–3', 'Iqra/Jilid 4–6', 'Lancar membaca'];
const SOURCES = ['Instagram', 'WhatsApp', 'Website', 'Teman/Kerabat', 'Majelis Taklim', 'Spanduk/Brosur', 'Lainnya'];

function ParentFields({ who, value = {}, onChange, errors = {}, required }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const v = (k) => value[k] ?? '';
  const er = (k) => errors[`${who}.${k}`];
  return (
    <div className="grid g2">
      <Field label="Nama Lengkap" required={required} error={er('name')}><Input value={v('name')} onChange={set('name')} /></Field>
      <Field label="NIK" error={er('nik')}><Input value={v('nik')} onChange={set('nik')} inputMode="numeric" maxLength={16} /></Field>
      <Field label="Tempat Lahir"><Input value={v('birth_place')} onChange={set('birth_place')} /></Field>
      <Field label="Tanggal Lahir"><Input type="date" value={v('birth_date')} onChange={set('birth_date')} /></Field>
      <Field label="Pendidikan Terakhir"><Select value={v('education')} onChange={set('education')} options={EDU} placeholder="Pilih" /></Field>
      <Field label="Pekerjaan" required={required} error={er('occupation')}><Input value={v('occupation')} onChange={set('occupation')} /></Field>
      <Field label="Penghasilan / Bulan"><Select value={v('income')} onChange={set('income')} options={INCOME} placeholder="Pilih" /></Field>
      <Field label="No. WhatsApp" required={required} error={er('phone')}><Input value={v('phone')} onChange={set('phone')} inputMode="tel" placeholder="08xxxxxxxxxx" /></Field>
      <Field label="Email"><Input type="email" value={v('email')} onChange={set('email')} /></Field>
      <Field label="Kemampuan Membaca Al-Qur'an"><Select value={v('quran_level')} onChange={set('quran_level')} options={['Belum lancar', 'Cukup lancar', 'Lancar', 'Lancar & bertajwid', 'Hafizh/Hafizhah']} placeholder="Pilih" /></Field>
      <Field label="Kajian / Majelis Ilmu yang Diikuti" className="span2"><Input value={v('religious_study')} onChange={set('religious_study')} placeholder="Opsional" /></Field>
    </div>
  );
}

export default function Wizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [app, setApp] = useState(null);
  const [form, setForm] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showGuardian, setShowGuardian] = useState(false);
  useTitle('Formulir Pendaftaran');

  useEffect(() => {
    Promise.all([api.get(`/portal/applications/${id}`), api.get('/public/info')]).then(([a, info]) => {
      setApp(a); setForm(a); setPrograms(info.programs);
      setShowGuardian(!!a.guardian?.name);
      // lanjutkan dari bagian pertama yang belum lengkap
      const first = STEPS.findIndex((s) => a.progress.sections[s.key] === false);
      if (first > 0) setStep(first);
    }).catch((e) => toast.error(e.message));
  }, [id, toast]);

  const program = useMemo(() => programs.find((p) => p.id === Number(form?.program_id)), [programs, form?.program_id]);
  const age = form?.birth_date && app?.academic_year ? ageAt(form.birth_date, academicRefDate(app.academic_year)) : null;
  const ageOk = !age || !program || (age.years >= program.age_min && age.years <= program.age_max);

  if (!app || !form) return <PageLoader />;
  if (!['draft', 'revision'].includes(app.status)) return <Navigate to={`/portal/pendaftaran/${id}`} replace />;

  const set = (k) => (e) => { const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e; setForm((f) => ({ ...f, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const bind = (k) => ({ value: form[k] ?? '', onChange: set(k), invalid: !!errors[k] });
  const sections = app.progress.sections;

  const payload = () => {
    const pick = ['program_id', 'full_name', 'nickname', 'gender', 'birth_place', 'birth_date', 'nik', 'kk_number', 'child_order', 'siblings', 'address', 'city', 'province',
      'postal_code', 'previous_school', 'quran_ability', 'memorization', 'blood_type', 'height_cm', 'weight_kg', 'allergies', 'medical_history', 'special_needs',
      'father', 'mother', 'guardian', 'motivation', 'info_source', 'commitments'];
    const out = {};
    for (const k of pick) { const v = form[k]; out[k] = v === '' ? null : v; }
    if (!showGuardian) out.guardian = {};
    return out;
  };

  const save = async (goto) => {
    setBusy(true);
    try {
      const a = await api.put(`/portal/applications/${id}`, payload());
      setApp(a); setErrors({});
      if (goto !== undefined) { setStep(goto); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else toast.success('Tersimpan.');
      return a;
    } catch (e) { setErrors(e.fields || {}); toast.error(e.message); return null; }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!(await confirm({ title: 'Kirim pendaftaran?', message: 'Pastikan seluruh data sudah benar. Setelah dikirim, data hanya dapat diubah bila panitia meminta perbaikan.', confirmText: 'Kirim Pendaftaran' }))) return;
    setBusy(true);
    try {
      const saved = await api.put(`/portal/applications/${id}`, payload());
      setApp(saved);
      await api.post(`/portal/applications/${id}/submit`);
      toast.success('Pendaftaran berhasil dikirim. Jazakumullahu khairan!');
      nav(`/portal/pendaftaran/${id}`);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const cur = STEPS[step].key;
  const totalPct = app.progress.percent;

  return (
    <>
      <PageTitle title={app.status === 'revision' ? 'Perbaiki Data Pendaftaran' : 'Formulir Pendaftaran'}
        subtitle={`${form.full_name || 'Calon santri'} · ${app.program_name} · ${app.wave_name} TA ${app.academic_year}`}
        crumbs={[{ label: 'Portal', to: '/portal' }, { label: 'Formulir' }]}
        actions={<Link to={`/portal/pendaftaran/${id}`} className="btn btn-outline btn-sm">Lihat Ringkasan</Link>} />
      {app.status === 'revision' && <div className="mb"><Alert tone="danger">Panitia meminta perbaikan: <b>{[...app.history].reverse().find((h) => h.status === 'revision')?.note || 'periksa kembali data dan berkas.'}</b></Alert></div>}

      <div className="wizard">
        <div className="card wizard-nav">
          <div className="hide-sm" style={{ padding: '8px 12px 14px' }}>
            <div className="row between small"><span className="muted">Kelengkapan</span><b>{totalPct}%</b></div>
            <div style={{ marginTop: 8 }}><Progress value={totalPct} /></div>
          </div>
          {STEPS.map((s, i) => (
            <button key={s.key} className={i === step ? 'active' : ''} onClick={() => save(i)} type="button">
              <span className={`n ${sections[s.key] ? 'ok' : ''}`}>{sections[s.key] ? <Check size={14} /> : i + 1}</span>{s.label}
            </button>
          ))}
        </div>

        <div className="card card-body form-section fade-up" key={cur}>
          {cur === 'program' && (
            <>
              <h3>Pilih Jenjang</h3><p className="sub">Jenjang ditentukan berdasarkan usia ananda per 1 Juli {String(app.academic_year).slice(0, 4)}.</p>
              <div className="radio-cards">
                {programs.map((p) => (
                  <label key={p.id} className={`radio-card ${Number(form.program_id) === p.id ? 'active' : ''}`}>
                    <input type="radio" name="program" checked={Number(form.program_id) === p.id} onChange={() => set('program_id')(p.id)} />
                    <div className="row between"><b className="serif">{p.name}</b><span className="badge tone-gold plain">{p.code}</span></div>
                    <div className="small muted" style={{ marginTop: 6 }}>Usia {p.age_min}–{p.age_max} tahun · {Math.max(0, p.quota - p.filled)} kursi</div>
                    <div className="small" style={{ marginTop: 8 }}>{p.tagline}</div>
                  </label>
                ))}
              </div>
              <div className="form-sub-title">Gelombang</div>
              <dl className="kv">
                <dt>Gelombang</dt><dd>{app.wave_name} · TA {app.academic_year}</dd>
                <dt>Biaya pendaftaran</dt><dd>{rupiah(app.registration_fee)}</dd>
                <dt>Perkiraan observasi</dt><dd>{date(app.observation_date)}</dd>
                <dt>Pengumuman</dt><dd>{date(app.announcement_date)}</dd>
              </dl>
            </>
          )}

          {cur === 'santri' && (
            <>
              <h3>Data Ananda</h3><p className="sub">Isi sesuai akta kelahiran dan Kartu Keluarga.</p>
              <div className="grid g2">
                <Field label="Nama Lengkap" required error={errors.full_name} className="span2"><Input {...bind('full_name')} placeholder="Sesuai akta kelahiran" /></Field>
                <Field label="Nama Panggilan" error={errors.nickname}><Input {...bind('nickname')} /></Field>
                <Field label="Jenis Kelamin" required error={errors.gender}>
                  <div className="row">
                    {[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([v, l]) => (
                      <label key={v} className="check" style={{ flex: 1 }}><input type="radio" name="gender" checked={form.gender === v} onChange={() => set('gender')(v)} />{l}</label>
                    ))}
                  </div>
                </Field>
                <Field label="Tempat Lahir" required error={errors.birth_place}><Input {...bind('birth_place')} /></Field>
                <Field label="Tanggal Lahir" required error={errors.birth_date}
                  hint={age ? `Usia per 1 Juli: ${age.years} tahun ${age.months} bulan` : undefined}><Input type="date" {...bind('birth_date')} /></Field>
                {!ageOk && <div className="span2"><Alert tone="warning">Usia ananda ({age.years} th {age.months} bln) di luar ketentuan {program.name} ({program.age_min}–{program.age_max} tahun). Silakan pilih jenjang yang sesuai.</Alert></div>}
                <Field label="NIK Ananda" error={errors.nik} hint="16 digit, lihat Kartu Keluarga"><Input {...bind('nik')} inputMode="numeric" maxLength={16} /></Field>
                <Field label="Nomor Kartu Keluarga" error={errors.kk_number}><Input {...bind('kk_number')} inputMode="numeric" maxLength={16} /></Field>
                <Field label="Anak ke-" error={errors.child_order}><Input type="number" min="1" {...bind('child_order')} /></Field>
                <Field label="Jumlah Saudara Kandung" error={errors.siblings}><Input type="number" min="0" {...bind('siblings')} /></Field>
              </div>
              <div className="form-sub-title">Alamat Tempat Tinggal</div>
              <div className="grid g2">
                <Field label="Alamat Lengkap" required error={errors.address} className="span2"><Textarea {...bind('address')} rows={2} placeholder="Jalan, nomor, RT/RW, kelurahan, kecamatan" /></Field>
                <Field label="Kota/Kabupaten" required error={errors.city}><Input {...bind('city')} /></Field>
                <Field label="Provinsi" error={errors.province}><Input {...bind('province')} /></Field>
                <Field label="Kode Pos" error={errors.postal_code}><Input {...bind('postal_code')} inputMode="numeric" /></Field>
              </div>
              <div className="form-sub-title">Pendidikan & Al-Qur'an</div>
              <div className="grid g2">
                <Field label="Asal Sekolah / TK"><Input {...bind('previous_school')} placeholder="Kosongkan bila belum sekolah" /></Field>
                <Field label="Kemampuan Membaca Al-Qur'an"><Select {...bind('quran_ability')} options={QURAN} placeholder="Pilih" /></Field>
                <Field label="Hafalan yang Dimiliki" className="span2"><Input {...bind('memorization')} placeholder="Contoh: Al-Fatihah, An-Nas s.d. Al-Ikhlas" /></Field>
              </div>
            </>
          )}

          {cur === 'kesehatan' && (
            <>
              <h3>Kesehatan & Perkembangan</h3><p className="sub">Informasi ini membantu guru mendampingi ananda dengan tepat. Dijaga kerahasiaannya.</p>
              <div className="grid g3">
                <Field label="Golongan Darah" required error={errors.blood_type}><Select {...bind('blood_type')} options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'AB', label: 'AB' }, { value: 'O', label: 'O' }, { value: '-', label: 'Belum tahu' }]} placeholder="Pilih" /></Field>
                <Field label="Tinggi Badan (cm)" required error={errors.height_cm}><Input type="number" {...bind('height_cm')} /></Field>
                <Field label="Berat Badan (kg)" required error={errors.weight_kg}><Input type="number" {...bind('weight_kg')} /></Field>
              </div>
              <div className="grid mt">
                <Field label="Alergi (makanan/obat/lainnya)"><Input {...bind('allergies')} placeholder="Kosongkan bila tidak ada" /></Field>
                <Field label="Riwayat Penyakit / Perawatan"><Textarea {...bind('medical_history')} rows={2} /></Field>
                <Field label="Kebutuhan Khusus / Catatan Tumbuh Kembang" hint="Misal: terapi wicara, sensori, dll. Kejujuran Bapak/Ibu membantu kami mempersiapkan pendampingan."><Textarea {...bind('special_needs')} rows={2} /></Field>
              </div>
            </>
          )}

          {cur === 'orangtua' && (
            <>
              <h3>Data Orang Tua</h3><p className="sub">Orang tua adalah mitra utama kuttab dalam mendidik ananda.</p>
              <div className="form-sub-title">Ayah</div>
              <ParentFields who="father" required value={form.father} onChange={set('father')} errors={errors} />
              <div className="form-sub-title">Ibu</div>
              <ParentFields who="mother" required value={form.mother} onChange={set('mother')} errors={errors} />
              <div className="form-sub-title">Wali</div>
              <label className="check"><input type="checkbox" checked={showGuardian} onChange={(e) => setShowGuardian(e.target.checked)} />Ananda tinggal bersama wali (bukan ayah/ibu kandung)</label>
              {showGuardian && <div className="mt"><ParentFields who="guardian" value={form.guardian} onChange={set('guardian')} errors={errors} /></div>}
            </>
          )}

          {cur === 'berkas' && (
            <>
              <h3>Unggah Berkas</h3><p className="sub">Berkas bertanda * wajib. Pastikan tulisan terbaca jelas.</p>
              <DocumentUploader app={app} canDelete onDocs={(documents) => setApp((a) => ({ ...a, documents, progress: { ...a.progress, sections: { ...a.progress.sections, berkas: DOC_TYPES.filter((d) => d.required).every((d) => documents.some((x) => x.type === d.key)) } } }))} />
            </>
          )}

          {cur === 'komitmen' && (
            <>
              <h3>Motivasi & Komitmen</h3><p className="sub">Kami ingin mengenal harapan keluarga terhadap pendidikan ananda.</p>
              <div className="grid">
                <Field label="Mengapa memilih Kuttab Imam Al-Ghazali?" required error={errors.motivation}><Textarea {...bind('motivation')} rows={4} placeholder="Ceritakan harapan Bapak/Ibu untuk ananda" /></Field>
                <Field label="Dari mana mengetahui Kuttab Imam Al-Ghazali?"><Select {...bind('info_source')} options={SOURCES} placeholder="Pilih" /></Field>
              </div>
              <div className="form-sub-title">Pernyataan Orang Tua</div>
              <div className="stack">
                {[
                  ['visi', "Kami memahami dan mendukung visi kuttab: mewujudkan insan Qur'ani dengan kemandirian iman, amal shalih, dan pemikiran."],
                  ['kerjasama', 'Kami bersedia mengikuti majelis orang tua dan bekerja sama melanjutkan pembiasaan kuttab di rumah.'],
                  ['adab', 'Kami bersedia menaati tata tertib serta menjaga adab terhadap guru, sesama orang tua, dan lingkungan kuttab.'],
                  ['data', 'Data yang kami isi adalah benar, dan kami bersedia menerima keputusan panitia.'],
                ].map(([k, l]) => (
                  <label className="check" key={k}><input type="checkbox" checked={!!form.commitments?.[k]} onChange={(e) => set('commitments')({ ...form.commitments, [k]: e.target.checked })} />{l}</label>
                ))}
              </div>
            </>
          )}

          {cur === 'tinjau' && (
            <>
              <h3>Tinjau & Kirim</h3><p className="sub">Periksa kembali kelengkapan sebelum mengirim.</p>
              <div className="stack">
                {STEPS.slice(0, -1).map((s, i) => (
                  <div key={s.key} className="row between" style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: '#fff' }}>
                    <span className="row">{sections[s.key] ? <Check size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--warning)" />}{s.label}</span>
                    {sections[s.key] ? <span className="badge tone-success">Lengkap</span> : <button className="btn btn-outline btn-sm" onClick={() => setStep(i)}>Lengkapi</button>}
                  </div>
                ))}
              </div>
              <dl className="kv mt2">
                <dt>Nama</dt><dd>{form.full_name || '-'}</dd>
                <dt>Jenjang</dt><dd>{program?.name}</dd>
                <dt>Tanggal lahir</dt><dd>{date(form.birth_date)} {age && `(${age.years} th ${age.months} bln)`}</dd>
                <dt>Ayah / Ibu</dt><dd>{form.father?.name || '-'} / {form.mother?.name || '-'}</dd>
                <dt>Biaya pendaftaran</dt><dd>{rupiah(app.registration_fee)}</dd>
              </dl>
              {!ageOk && <div className="mt"><Alert tone="warning">Usia ananda belum sesuai ketentuan jenjang yang dipilih.</Alert></div>}
            </>
          )}

          <hr className="divider" />
          <div className="row between wrap">
            <Button variant="outline" disabled={step === 0 || busy} onClick={() => save(step - 1)} type="button"><ChevronLeft size={16} /> Sebelumnya</Button>
            <div className="row">
              {cur !== 'tinjau' && cur !== 'berkas' && <Button variant="ghost" onClick={() => save()} loading={busy} type="button"><Save size={16} /> Simpan</Button>}
              {cur === 'tinjau'
                ? <Button onClick={submit} loading={busy} disabled={!app.progress.complete || !ageOk}><Send size={16} /> {app.status === 'revision' ? 'Kirim Ulang' : 'Kirim Pendaftaran'}</Button>
                : <Button onClick={() => save(step + 1)} loading={busy} type="button">Simpan & Lanjut <ChevronRight size={16} /></Button>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
