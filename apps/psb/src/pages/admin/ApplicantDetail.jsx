import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MessageCircle, Check, X, Eye, CalendarPlus, ClipboardCheck, Gavel, History, FileText, Receipt, User, HeartPulse, Users, Target, Settings2, Mail, Phone,
} from 'lucide-react';
import { api, fileUrl } from '../../lib/api.js';
import { useTitle } from '../../lib/hooks.js';
import { rupiah, date, dateTime, schedule, waLink, age as fmtAge, bytes } from '../../lib/format.js';
import { STATUS, DOC_TYPES, ASSESSMENT_ASPECTS, RECOMMENDATIONS } from '../../../shared/constants.js';
import { useAuth } from '../../lib/auth.jsx';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Button, Field, Input, Select, Textarea, Alert, PageLoader, StatusBadge, Avatar, Badge, Modal, useToast, useConfirm } from '../../components/ui.jsx';
import { StatusStepper } from '../../components/Brand.jsx';
import { DocStatus } from '../../components/Uploads.jsx';
import { PayBadge } from '../portal/Detail.jsx';
import { STATUS_OPTIONS } from './Applicants.jsx';

function Preview({ src, mime, title, onClose }) {
  return (
    <Modal open={!!src} onClose={onClose} title={title} wide>
      {mime?.startsWith('image/')
        ? <img src={src} alt={title} style={{ maxHeight: '70vh', margin: '0 auto', borderRadius: 10 }} />
        : <object data={src} width="100%" style={{ height: '70vh', borderRadius: 10 }}><a href={src} target="_blank" rel="noreferrer">Buka berkas</a></object>}
      <div className="center mt"><a href={src} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Buka di tab baru</a></div>
    </Modal>
  );
}

function ParentKV({ p = {} }) {
  return (
    <dl className="kv">
      <dt>Nama</dt><dd>{p.name || '-'}</dd><dt>NIK</dt><dd>{p.nik || '-'}</dd>
      <dt>TTL</dt><dd>{p.birth_place || '-'}{p.birth_date ? `, ${date(p.birth_date)}` : ''}</dd>
      <dt>Pendidikan</dt><dd>{p.education || '-'}</dd><dt>Pekerjaan</dt><dd>{p.occupation || '-'}</dd>
      <dt>Penghasilan</dt><dd>{p.income || '-'}</dd>
      <dt>WhatsApp</dt><dd>{p.phone ? <a href={waLink(p.phone)} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-deep)' }}>{p.phone}</a> : '-'}</dd>
      <dt>Email</dt><dd>{p.email || '-'}</dd><dt>Bacaan Qur'an</dt><dd>{p.quran_level || '-'}</dd><dt>Kajian</dt><dd>{p.religious_study || '-'}</dd>
    </dl>
  );
}

function DocVerify({ doc, type, onSave, onPreview }) {
  const [note, setNote] = useState(doc?.note || '');
  const [busy, setBusy] = useState(null);
  const set = async (status) => { setBusy(status); await onSave(doc.id, status, status === 'invalid' ? note : null); setBusy(null); };
  if (!doc) return (
    <div className="file-row"><div className="thumb"><FileText size={20} /></div><div className="info"><b>{type.label}</b><span className="small muted">Belum diunggah</span></div></div>
  );
  const isImg = doc.mime?.startsWith('image/');
  return (
    <div className="file-row has" style={{ alignItems: 'flex-start' }}>
      <button className="thumb" style={{ cursor: 'pointer', padding: 0 }} onClick={() => onPreview(doc)} aria-label="Pratinjau">{isImg ? <img src={fileUrl('document', doc.id)} alt="" /> : <FileText size={22} />}</button>
      <div className="info">
        <b>{type.label}</b>
        <div className="row wrap small" style={{ gap: 8, marginTop: 4 }}><DocStatus status={doc.status} /><span className="muted">{bytes(doc.size || 0)} · {dateTime(doc.uploaded_at)}</span></div>
        {doc.status !== 'valid' && <Input className="mt" style={{ marginTop: 8, padding: '8px 12px', fontSize: 13 }} placeholder="Catatan bila tidak valid (dikirim ke orang tua)" value={note} onChange={(e) => setNote(e.target.value)} />}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" onClick={() => onPreview(doc)} title="Lihat" aria-label="Lihat"><Eye size={16} /></button>
        {doc.status !== 'valid' && <Button size="sm" variant="success" loading={busy === 'valid'} onClick={() => set('valid')}><Check size={14} /> Valid</Button>}
        {doc.status !== 'invalid' && <Button size="sm" variant="outline" loading={busy === 'invalid'} onClick={() => set('invalid')}><X size={14} /> Tolak</Button>}
      </div>
    </div>
  );
}

function AssessmentForm({ app, onSaved }) {
  const toast = useToast();
  const [scores, setScores] = useState(app.assessment?.scores || {});
  const [rec, setRec] = useState(app.assessment?.recommendation || '');
  const [note, setNote] = useState(app.assessment?.note || '');
  const [busy, setBusy] = useState(false);
  const vals = ASSESSMENT_ASPECTS.map((a) => scores[a.key]).filter(Boolean);
  const total = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / (ASSESSMENT_ASPECTS.length * 5)) * 1000) / 10 : 0;
  const save = async () => {
    setBusy(true);
    try { onSaved(await api.put(`/admin/applications/${app.id}/assessment`, { scores, recommendation: rec, note })); toast.success('Penilaian disimpan.'); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      {ASSESSMENT_ASPECTS.map((a) => (
        <div className="score-row" key={a.key}>
          <div><b className="small">{a.label}</b><div className="tiny muted">{a.hint}</div></div>
          <div className="dots">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={scores[a.key] === n ? 'on' : ''} onClick={() => setScores({ ...scores, [a.key]: n })} aria-label={`${a.label} nilai ${n}`}>{n}</button>)}</div>
        </div>
      ))}
      <div className="row between mt"><span className="small muted">Skala 1 (perlu banyak pendampingan) – 5 (sangat siap)</span><span>Nilai: <b className="serif" style={{ fontSize: 22 }}>{total}</b><span className="muted">/100</span></span></div>
      <div className="grid g2 mt">
        <Field label="Rekomendasi Pengamat" required><Select value={rec} onChange={(e) => setRec(e.target.value)} placeholder="Pilih" options={Object.entries(RECOMMENDATIONS).map(([value, label]) => ({ value, label }))} /></Field>
        <div />
        <Field label="Catatan Observasi & Wawancara" className="span2"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      <div className="row mt"><Button loading={busy} onClick={save} disabled={vals.length < ASSESSMENT_ASPECTS.length || !rec}><ClipboardCheck size={16} /> Simpan Penilaian</Button>
        {app.assessment && <span className="small muted">Terakhir oleh {app.assessment.assessor} · {dateTime(app.assessment.updated_at)}</span>}</div>
    </>
  );
}

const TABS = [
  ['data', 'Data', User], ['berkas', 'Berkas', FileText], ['bayar', 'Pembayaran', Receipt], ['seleksi', 'Observasi & Penilaian', ClipboardCheck], ['riwayat', 'Riwayat', History],
];

export default function ApplicantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [a, setA] = useState(null);
  const [tab, setTab] = useState('data');
  const [preview, setPreview] = useState(null);
  const [sched, setSched] = useState(null);
  const [decision, setDecision] = useState({ decision: '', note: '' });
  const [manual, setManual] = useState(null);
  const [payNote, setPayNote] = useState({});
  const load = () => api.get(`/admin/applications/${id}`).then(setA).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line
  useTitle(a?.full_name || 'Detail Pendaftar');
  if (!a) return <PageLoader />;
  const refresh = (x) => { setA((cur) => ({ ...cur, ...x })); load(); };
  const act = async (fn, msg) => { try { refresh(await fn()); if (msg) toast.success(msg); } catch (e) { toast.error(e.message); } };

  const photo = a.documents.find((d) => d.type === 'photo');
  const regPay = a.payments.find((p) => p.kind === 'registration' && p.status === 'approved');
  const docsValid = DOC_TYPES.filter((t) => t.required).every((t) => a.documents.find((d) => d.type === t.key)?.status === 'valid');
  const canSchedule = ['verification', 'scheduled', 'revision'].includes(a.status);
  const phone = a.father?.phone || a.mother?.phone || a.account?.phone;
  const waText = `Assalamu'alaikum Bapak/Ibu, kami panitia PSB Kuttab Imam Al-Ghazali terkait pendaftaran ananda ${a.full_name} (${a.reg_number}).`;

  const saveDoc = (docId, status, note) => act(() => api.put(`/admin/documents/${docId}`, { status, note }), status === 'valid' ? 'Berkas ditandai valid.' : 'Berkas ditolak, orang tua diberi tahu.');
  const savePay = async (p, status) => {
    if (status === 'rejected' && !payNote[p.id]) return toast.error('Isi alasan penolakan.');
    if (!(await confirm({ title: status === 'approved' ? 'Verifikasi pembayaran?' : 'Tolak pembayaran?', message: `${p.kind === 'registration' ? 'Pembayaran pendaftaran' : 'Daftar ulang'} ${rupiah(p.amount)} dari ${p.payer_name}.`, danger: status === 'rejected' }))) return;
    act(() => api.put(`/admin/payments/${p.id}`, { status, note: payNote[p.id] }), 'Pembayaran diperbarui.');
  };
  const requestRevision = async () => {
    const note = window.prompt('Catatan perbaikan untuk orang tua:', a.documents.filter((d) => d.status === 'invalid').map((d) => `${DOC_TYPES.find((t) => t.key === d.type)?.label}: ${d.note || 'mohon diganti'}`).join('; '));
    if (note === null) return;
    act(() => api.post(`/admin/applications/${a.id}/status`, { status: 'revision', note }), 'Permintaan perbaikan dikirim.');
  };
  const saveSched = () => act(async () => { const r = await api.post(`/admin/applications/${a.id}/schedule`, sched); setSched(null); return r; }, 'Jadwal disimpan & orang tua diberi tahu.');
  const saveDecision = async () => {
    if (!decision.decision) return toast.error('Pilih keputusan.');
    if (!(await confirm({ title: 'Simpan keputusan?', message: `${a.full_name} akan dinyatakan "${STATUS[decision.decision].label}". Orang tua akan menerima notifikasi.` }))) return;
    act(() => api.post(`/admin/applications/${a.id}/decision`, decision), 'Keputusan disimpan.');
  };

  return (
    <>
      <PageTitle crumbs={[{ label: 'Pendaftar', to: '/admin/pendaftar' }, { label: a.reg_number || 'Draf' }]}
        title={a.full_name || '(belum diisi)'} subtitle={`${a.program_name} · ${a.wave_name} TA ${a.academic_year} · dikirim ${dateTime(a.submitted_at)}`}
        actions={<>
          {phone && <a className="btn btn-success btn-sm" href={waLink(phone, waText)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
          {user.role === 'admin' && <Button size="sm" variant="outline" onClick={() => setManual({ status: a.status, note: '' })}><Settings2 size={15} /> Ubah Status</Button>}
        </>} />

      <div className="card card-body mb">
        <div className="row wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
          <button onClick={() => photo && setPreview({ src: fileUrl('document', photo.id), title: 'Pas Foto', mime: photo.mime })} style={{ border: 0, padding: 0, background: 'none', cursor: photo ? 'zoom-in' : 'default' }}>
            <Avatar name={a.full_name} photoId={photo?.id} size="lg" /></button>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="row wrap" style={{ gap: 8 }}><StatusBadge status={a.status} />{a.score_total != null && <Badge tone="gold" plain>Nilai {a.score_total}</Badge>}
              {a.assessment && <Badge tone={a.assessment.recommendation === 'recommended' ? 'success' : a.assessment.recommendation === 'consider' ? 'warning' : 'danger'} plain>{RECOMMENDATIONS[a.assessment.recommendation]}</Badge>}</div>
            <div className="grid g3 mt small" style={{ gap: 8 }}>
              <div><span className="muted">Usia per 1 Juli</span><br /><b>{fmtAge(a.age)}</b>{a.age && (a.age.years < a.age_min || a.age.years > a.age_max) && <Badge tone="danger">di luar ketentuan</Badge>}</div>
              <div><span className="muted">Akun</span><br /><b>{a.account?.name}</b><div className="tiny muted row" style={{ gap: 4 }}><Mail size={11} />{a.account?.email}</div></div>
              <div><span className="muted">Kontak</span><br /><b className="row" style={{ gap: 4 }}><Phone size={13} />{phone || '-'}</b></div>
            </div>
            {a.siblings_apps.length > 0 && <div className="small mt">Saudara terdaftar: {a.siblings_apps.map((s) => <Link key={s.id} to={`/admin/pendaftar/${s.id}`} style={{ color: 'var(--gold-deep)', marginRight: 10 }}>{s.full_name}</Link>)}</div>}
          </div>
        </div>
        <div className="mt"><StatusStepper status={a.status} /></div>
      </div>

      {/* Panel tindakan cepat sesuai tahap */}
      {['verification', 'revision'].includes(a.status) && (
        <div className="mb"><Alert tone={docsValid && (regPay || !a.registration_fee) ? 'success' : 'info'}>
          <div className="row between wrap">
            <span>Berkas wajib valid: <b>{docsValid ? 'Ya' : 'Belum'}</b> · Pembayaran pendaftaran: <b>{regPay ? 'Terverifikasi' : a.registration_fee ? 'Belum' : 'Gratis'}</b></span>
            <div className="row">
              <Button size="sm" variant="outline" onClick={requestRevision}>Minta Perbaikan</Button>
              <Button size="sm" disabled={!docsValid || (!regPay && a.registration_fee > 0)} onClick={() => setSched({ observation_at: '', observation_place: 'Aula Kuttab Imam Al-Ghazali', observer: '', observation_note: '' })}><CalendarPlus size={15} /> Jadwalkan Observasi</Button>
            </div>
          </div>
        </Alert></div>
      )}

      <div className="card">
        <div className="tabs" style={{ padding: '0 12px' }}>
          {TABS.map(([k, l, Ic]) => {
            const n = k === 'berkas' ? a.documents.filter((d) => d.status === 'pending').length : k === 'bayar' ? a.payments.filter((p) => p.status === 'pending').length : 0;
            return <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}><Ic size={16} />{l}{n > 0 && <span className="count">{n}</span>}</button>;
          })}
        </div>
        <div className="card-body">
          {tab === 'data' && (
            <div className="grid g2" style={{ gap: 28 }}>
              <div>
                <div className="form-sub-title" style={{ marginTop: 0 }}><User size={15} /> Ananda</div>
                <dl className="kv">
                  <dt>Nama lengkap</dt><dd>{a.full_name}</dd><dt>Panggilan</dt><dd>{a.nickname || '-'}</dd>
                  <dt>Jenis kelamin</dt><dd>{a.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</dd>
                  <dt>TTL</dt><dd>{a.birth_place}, {date(a.birth_date)}</dd><dt>NIK</dt><dd>{a.nik || '-'}</dd><dt>No. KK</dt><dd>{a.kk_number || '-'}</dd>
                  <dt>Anak ke / saudara</dt><dd>{a.child_order || '-'} dari {a.siblings != null ? a.siblings + 1 : '-'}</dd>
                  <dt>Alamat</dt><dd>{a.address}, {a.city}{a.province ? `, ${a.province}` : ''} {a.postal_code}</dd>
                  <dt>Asal sekolah</dt><dd>{a.previous_school || '-'}</dd><dt>Bacaan Qur'an</dt><dd>{a.quran_ability || '-'}</dd><dt>Hafalan</dt><dd>{a.memorization || '-'}</dd>
                </dl>
                <div className="form-sub-title"><HeartPulse size={15} /> Kesehatan</div>
                <dl className="kv">
                  <dt>Gol. darah</dt><dd>{a.blood_type || '-'}</dd><dt>TB / BB</dt><dd>{a.height_cm} cm / {a.weight_kg} kg</dd>
                  <dt>Alergi</dt><dd>{a.allergies || '-'}</dd><dt>Riwayat penyakit</dt><dd>{a.medical_history || '-'}</dd><dt>Kebutuhan khusus</dt><dd>{a.special_needs || '-'}</dd>
                </dl>
              </div>
              <div>
                <div className="form-sub-title" style={{ marginTop: 0 }}><Users size={15} /> Ayah</div><ParentKV p={a.father} />
                <div className="form-sub-title"><Users size={15} /> Ibu</div><ParentKV p={a.mother} />
                {a.guardian?.name && <><div className="form-sub-title"><Users size={15} /> Wali</div><ParentKV p={a.guardian} /></>}
                <div className="form-sub-title"><Target size={15} /> Motivasi</div>
                <p style={{ background: '#faf5e8', padding: 14, borderRadius: 10, fontSize: 14 }}>{a.motivation || '-'}</p>
                <div className="small muted">Sumber informasi: {a.info_source || '-'}</div>
                <div className="row wrap mt" style={{ gap: 6 }}>{['visi', 'kerjasama', 'adab', 'data'].map((k) => <Badge key={k} tone={a.commitments?.[k] ? 'success' : 'danger'}>{k}</Badge>)}</div>
              </div>
            </div>
          )}

          {tab === 'berkas' && (
            <div className="stack">
              {DOC_TYPES.map((t) => <DocVerify key={t.key + (a.documents.find((d) => d.type === t.key)?.uploaded_at || '')} type={t} doc={a.documents.find((d) => d.type === t.key)} onSave={saveDoc}
                onPreview={(d) => setPreview({ src: fileUrl('document', d.id), mime: d.mime, title: t.label })} />)}
            </div>
          )}

          {tab === 'bayar' && (
            <div className="stack">
              {!a.payments.length && <Alert>Belum ada bukti pembayaran. Biaya pendaftaran gelombang ini {rupiah(a.registration_fee)}.</Alert>}
              {a.payments.map((p) => (
                <div key={p.id} className="file-row has" style={{ alignItems: 'flex-start' }}>
                  <button className="thumb" style={{ cursor: 'pointer', padding: 0 }} onClick={() => setPreview({ src: fileUrl('payment', p.id), mime: p.proof_mime, title: 'Bukti Transfer' })}><Receipt size={22} /></button>
                  <div className="info">
                    <div className="row wrap" style={{ gap: 8 }}><b>{p.kind === 'registration' ? 'Biaya Pendaftaran' : 'Daftar Ulang'}</b><PayBadge s={p.status} /></div>
                    <div className="small">{rupiah(p.amount)} · {p.payer_name} · {p.bank_name} · transfer {date(p.paid_at)}</div>
                    <div className="tiny muted">Diunggah {dateTime(p.created_at)}{p.verified_at && ` · diverifikasi ${dateTime(p.verified_at)}`}</div>
                    {p.note && <div className="small">Catatan: {p.note}</div>}
                    {p.status === 'pending' && <Input style={{ marginTop: 8, padding: '8px 12px', fontSize: 13 }} placeholder="Alasan bila ditolak" value={payNote[p.id] || ''} onChange={(e) => setPayNote({ ...payNote, [p.id]: e.target.value })} />}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="icon-btn" onClick={() => setPreview({ src: fileUrl('payment', p.id), mime: p.proof_mime, title: 'Bukti Transfer' })} aria-label="Lihat bukti"><Eye size={16} /></button>
                    {p.status === 'pending' && <><Button size="sm" variant="success" onClick={() => savePay(p, 'approved')}><Check size={14} /> Verifikasi</Button><Button size="sm" variant="outline" onClick={() => savePay(p, 'rejected')}><X size={14} /> Tolak</Button></>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'seleksi' && (
            <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 28 }} data-cols>
              <div>
                <div className="form-sub-title" style={{ marginTop: 0 }}>Penilaian Observasi</div>
                {['scheduled', 'assessed', 'accepted', 'reserve', 'rejected', 'reregistration', 'enrolled', 'verification'].includes(a.status)
                  ? <AssessmentForm app={a} onSaved={refresh} /> : <Alert>Penilaian tersedia setelah berkas diverifikasi.</Alert>}
              </div>
              <div className="stack" style={{ gap: 18 }}>
                <div>
                  <div className="form-sub-title" style={{ marginTop: 0 }}>Jadwal</div>
                  {a.observation_at ? (
                    <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}><dt>Waktu</dt><dd>{schedule(a.observation_at)}</dd><dt>Tempat</dt><dd>{a.observation_place}</dd><dt>Pengamat</dt><dd>{a.observer || '-'}</dd></dl>
                  ) : <p className="small muted">Belum dijadwalkan.</p>}
                  {canSchedule && <Button size="sm" variant="outline" className="mt" onClick={() => setSched({ observation_at: a.observation_at?.replace(' ', 'T') || '', observation_place: a.observation_place || 'Aula Kuttab Imam Al-Ghazali', observer: a.observer || '', observation_note: a.observation_note || '' })}><CalendarPlus size={15} /> {a.observation_at ? 'Ubah Jadwal' : 'Atur Jadwal'}</Button>}
                </div>
                <div className="card card-body" style={{ background: '#fbf8f0' }}>
                  <div className="form-sub-title" style={{ marginTop: 0 }}><Gavel size={15} /> Keputusan</div>
                  {['assessed', 'reserve', 'accepted', 'rejected'].includes(a.status) ? (
                    <div className="stack">
                      <div className="radio-cards" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                        {[['accepted', 'Terima', 'success'], ['reserve', 'Cadangan', 'warning'], ['rejected', 'Tolak', 'danger']].map(([k, l, t]) => (
                          <label key={k} className={`radio-card ${decision.decision === k ? 'active' : ''}`} style={{ padding: 10, textAlign: 'center' }}><input type="radio" checked={decision.decision === k} onChange={() => setDecision({ ...decision, decision: k })} /><span className={`badge tone-${t}`}>{l}</span></label>
                        ))}
                      </div>
                      <Textarea rows={2} placeholder="Catatan untuk orang tua (opsional)" value={decision.note} onChange={(e) => setDecision({ ...decision, note: e.target.value })} />
                      <Button onClick={saveDecision}><Gavel size={15} /> Simpan Keputusan</Button>
                    </div>
                  ) : <p className="small muted" style={{ margin: 0 }}>{['reregistration', 'enrolled'].includes(a.status) ? `Diputuskan ${dateTime(a.decided_at)}.` : 'Keputusan dapat diberikan setelah penilaian observasi.'}</p>}
                </div>
              </div>
            </div>
          )}

          {tab === 'riwayat' && (
            <div className="history">
              {[...a.history].reverse().map((h, i) => (
                <div className="h" key={i}><div className="t">{STATUS[h.status]?.label}</div><div className="d">{dateTime(h.created_at)} · {h.actor || 'Sistem'}</div>{h.note && <div className="note">{h.note}</div>}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Preview src={preview?.src} mime={preview?.mime} title={preview?.title} onClose={() => setPreview(null)} />

      <Modal open={!!sched} onClose={() => setSched(null)} title="Jadwal Observasi & Wawancara"
        footer={<><Button variant="outline" onClick={() => setSched(null)}>Batal</Button><Button onClick={saveSched}><CalendarPlus size={15} /> Simpan & Beri Tahu</Button></>}>
        {sched && <div className="stack">
          <Field label="Tanggal & Jam" required><Input type="datetime-local" value={sched.observation_at} onChange={(e) => setSched({ ...sched, observation_at: e.target.value })} /></Field>
          <Field label="Tempat" required><Input value={sched.observation_place} onChange={(e) => setSched({ ...sched, observation_place: e.target.value })} /></Field>
          <Field label="Pengamat / Pewawancara"><Input value={sched.observer} onChange={(e) => setSched({ ...sched, observer: e.target.value })} /></Field>
          <Field label="Catatan untuk orang tua"><Textarea rows={2} value={sched.observation_note} onChange={(e) => setSched({ ...sched, observation_note: e.target.value })} /></Field>
        </div>}
      </Modal>

      <Modal open={!!manual} onClose={() => setManual(null)} title="Ubah Status Manual"
        footer={<><Button variant="outline" onClick={() => setManual(null)}>Batal</Button><Button onClick={() => act(async () => { const r = await api.post(`/admin/applications/${a.id}/status`, manual); setManual(null); return r; }, 'Status diperbarui.')}>Simpan</Button></>}>
        {manual && <div className="stack">
          <Alert tone="warning">Gunakan hanya untuk koreksi. Perubahan dicatat di log audit dan orang tua menerima notifikasi.</Alert>
          <Field label="Status"><Select value={manual.status} onChange={(e) => setManual({ ...manual, status: e.target.value })} options={STATUS_OPTIONS} /></Field>
          <Field label="Catatan"><Textarea rows={2} value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} /></Field>
        </div>}
      </Modal>
    </>
  );
}
