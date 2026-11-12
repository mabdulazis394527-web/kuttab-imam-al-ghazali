import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Printer, Edit3, XCircle, CreditCard, CalendarCheck, PartyPopper, Copy, Upload, MapPin, UserRound, Clock, FileText, History,
  Receipt, ScrollText, Hourglass, Info,
} from 'lucide-react';
import { api, fileUrl } from '../../lib/api.js';
import { useTitle } from '../../lib/hooks.js';
import { rupiah, date, dateTime, schedule, age as fmtAge } from '../../lib/format.js';
import { STATUS } from '../../../shared/constants.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Button, Field, Input, Alert, PageLoader, StatusBadge, Avatar, Badge, useToast, useConfirm, useForm, Progress } from '../../components/ui.jsx';
import { StatusStepper } from '../../components/Brand.jsx';
import { DocumentUploader } from '../../components/Uploads.jsx';

const PAY_STATUS = { pending: ['info', 'Menunggu verifikasi'], approved: ['success', 'Terverifikasi'], rejected: ['danger', 'Ditolak'] };
export const PayBadge = ({ s }) => <Badge tone={PAY_STATUS[s][0]}>{PAY_STATUS[s][1]}</Badge>;

function PaymentPanel({ app, kind, amount, onDone }) {
  const toast = useToast();
  const file = useRef();
  const [fname, setFname] = useState('');
  const f = useForm({ payer_name: '', bank_name: '', paid_at: new Date().toISOString().slice(0, 10), amount: String(amount || '') });
  const go = f.submit(async (v) => {
    const fd = new FormData();
    Object.entries({ ...v, kind }).forEach(([k, x]) => fd.append(k, x));
    if (!file.current.files[0]) throw Object.assign(new Error('Pilih berkas bukti transfer.'), { fields: {} });
    fd.append('proof', file.current.files[0]);
    const a = await api.post(`/portal/applications/${app.id}/payments`, fd);
    toast.success('Bukti pembayaran terkirim. Panitia akan memverifikasi, insya Allah.');
    onDone(a);
  });
  const copy = (t) => { navigator.clipboard?.writeText(t); toast.info('Disalin.'); };
  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card card-dark card-body">
        <div className="small" style={{ color: '#a89f88' }}>{kind === 'registration' ? 'Biaya pendaftaran' : 'Biaya daftar ulang'}</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--gold-light)', margin: '4px 0 18px' }}>{rupiah(amount)}</div>
        {(app.bank_accounts || []).map((b) => (
          <div key={b.number} style={{ border: '1px solid #3a3222', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div className="small" style={{ color: '#a89f88' }}>{b.bank}</div>
            <div className="row between"><b style={{ fontSize: 19, letterSpacing: '.06em', color: '#fff' }}>{b.number}</b>
              <button type="button" className="icon-btn" style={{ background: 'transparent', borderColor: '#3a3222', color: 'var(--gold-light)' }} onClick={() => copy(b.number)} aria-label="Salin nomor rekening"><Copy size={15} /></button></div>
            <div className="small" style={{ color: '#d8cfb7' }}>a.n. {b.holder}</div>
          </div>
        ))}
        <p className="small" style={{ color: '#a89f88', margin: 0 }}>Cantumkan berita transfer: <b style={{ color: 'var(--gold-light)' }}>{app.reg_number}</b></p>
      </div>
      <form className="stack" onSubmit={go}>
        <Field label="Nama Pengirim (sesuai rekening)" required error={f.errors.payer_name}><Input {...f.bind('payer_name')} /></Field>
        <div className="grid g2" style={{ gap: 12 }}>
          <Field label="Bank / Metode" required error={f.errors.bank_name}><Input {...f.bind('bank_name')} placeholder="BSI, BCA, QRIS..." /></Field>
          <Field label="Tanggal Transfer" required error={f.errors.paid_at}><Input type="date" {...f.bind('paid_at')} /></Field>
        </div>
        <Field label="Nominal (Rp)" required error={f.errors.amount}><Input type="number" {...f.bind('amount')} /></Field>
        <Field label="Bukti Transfer" required hint="JPG/PNG/PDF maks. 5 MB">
          <label className="file-row" style={{ cursor: 'pointer' }}>
            <div className="thumb"><Receipt size={22} /></div>
            <div className="info"><b>{fname || 'Pilih berkas bukti'}</b><span className="small muted">Klik untuk memilih</span></div>
            <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFname(e.target.files[0]?.name || '')} />
          </label>
        </Field>
        <Button loading={f.busy}><Upload size={16} /> Kirim Bukti Pembayaran</Button>
      </form>
    </div>
  );
}

function ActionCard({ app, setApp, reload }) {
  const s = app.status;
  const lastNote = [...app.history].reverse().find((h) => h.status === s)?.note;
  const regPay = app.payments.find((p) => p.kind === 'registration' && p.status !== 'rejected');
  const rereg = app.payments.find((p) => p.kind === 'reregistration' && p.status !== 'rejected');

  if (s === 'draft') return (
    <div className="card card-body">
      <h3 className="serif">Lanjutkan Pengisian Formulir</h3>
      <div className="row between small"><span className="muted">Kelengkapan</span><b>{app.progress.percent}%</b></div>
      <div className="mt" style={{ marginTop: 8 }}><Progress value={app.progress.percent} /></div>
      <Link to="formulir" className="btn btn-gold mt"><Edit3 size={16} /> Lanjutkan</Link>
    </div>
  );
  if (s === 'waiting_payment' || (s === 'verification' && !regPay && app.registration_fee > 0)) return (
    <div className="card">
      <div className="card-head"><h3 className="row"><CreditCard size={18} color="var(--gold-deep)" /> Pembayaran Biaya Pendaftaran</h3></div>
      <div className="card-body">
        {lastNote && s === 'waiting_payment' && lastNote.startsWith('Bukti') && <div className="mb"><Alert tone="danger">{lastNote}</Alert></div>}
        <PaymentPanel app={app} kind="registration" amount={app.registration_fee} onDone={setApp} />
      </div>
    </div>
  );
  if (s === 'revision') return (
    <div className="card card-body">
      <Alert tone="danger"><b>Panitia meminta perbaikan.</b><br />{lastNote || 'Periksa catatan pada berkas dan data Anda.'}</Alert>
      <div className="row wrap mt">
        <Link to="formulir" className="btn btn-gold"><Edit3 size={16} /> Perbaiki Data & Kirim Ulang</Link>
      </div>
    </div>
  );
  if (s === 'verification') return (
    <div className="card card-body row" style={{ gap: 18, alignItems: 'flex-start' }}>
      <div className="avatar" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><Hourglass size={20} /></div>
      <div><h3 className="serif" style={{ margin: '0 0 4px' }}>Berkas sedang diverifikasi</h3>
        <p className="muted" style={{ margin: 0 }}>Panitia memeriksa berkas{regPay ? ' dan bukti pembayaran' : ''}. Bila semua sesuai, jadwal observasi akan dikirimkan melalui notifikasi dan WhatsApp.</p></div>
    </div>
  );
  if (s === 'scheduled') return (
    <div className="card card-dark card-body pattern-bg">
      <div className="row" style={{ gap: 10, color: 'var(--gold-light)' }}><CalendarCheck size={22} /><h3 className="serif" style={{ margin: 0 }}>Jadwal Observasi & Wawancara</h3></div>
      <div className="grid g3 mt">
        <div><div className="small" style={{ color: '#a89f88' }}><Clock size={13} /> Waktu</div><b style={{ color: '#fff' }}>{schedule(app.observation_at)}</b></div>
        <div><div className="small" style={{ color: '#a89f88' }}><MapPin size={13} /> Tempat</div><b style={{ color: '#fff' }}>{app.observation_place}</b></div>
        <div><div className="small" style={{ color: '#a89f88' }}><UserRound size={13} /> Pengamat</div><b style={{ color: '#fff' }}>{app.observer || 'Tim Panitia'}</b></div>
      </div>
      {app.observation_note && <p className="small mt" style={{ color: '#d8cfb7', marginBottom: 0 }}>Catatan: {app.observation_note}</p>}
      <hr className="divider" style={{ background: '#3a3222' }} />
      <div className="small" style={{ color: '#d8cfb7' }}>
        <b style={{ color: 'var(--gold-light)' }}>Persiapan:</b> Hadir 15 menit lebih awal bersama ayah & ibu · Bawa kartu peserta (cetak/ponsel) · Ananda cukup istirahat dan sarapan · Observasi berlangsung santai, bukan ujian.
      </div>
    </div>
  );
  if (s === 'assessed') return (
    <div className="card card-body"><Alert tone="info">Observasi telah dilaksanakan. Pengumuman hasil insya Allah pada <b>{date(app.announcement_date)}</b>.</Alert></div>
  );
  if (s === 'accepted') return (
    <div className="card">
      <div className="card-body pattern-bg" style={{ background: 'linear-gradient(135deg,#fff9ea,#f7edcf)', borderRadius: '14px 14px 0 0' }}>
        <div className="row" style={{ gap: 14 }}><PartyPopper size={34} color="var(--gold-deep)" />
          <div><h3 className="serif" style={{ margin: 0 }}>Alhamdulillah, ananda diterima!</h3>
            <p className="muted" style={{ margin: 0 }}>Barakallahu fiikum. Silakan selesaikan daftar ulang untuk mengamankan kursi ananda.</p></div></div>
        {lastNote && <p className="small mt" style={{ marginBottom: 0 }}>Catatan panitia: {lastNote}</p>}
        <Link to="surat" className="btn btn-dark btn-sm mt"><ScrollText size={15} /> Surat Keterangan Diterima</Link>
      </div>
      {!rereg && <div className="card-body"><h4>Daftar Ulang</h4><PaymentPanel app={app} kind="reregistration" amount={app.reregistration_fee} onDone={setApp} /></div>}
    </div>
  );
  if (s === 'reregistration') return <div className="card card-body"><Alert tone="info">Bukti daftar ulang telah diterima dan sedang diverifikasi panitia.</Alert></div>;
  if (s === 'enrolled') return (
    <div className="card card-dark card-body pattern-bg center" style={{ padding: 36 }}>
      <img src="/brand/emblem.png" alt="" style={{ width: 70, margin: '0 auto 14px' }} />
      <h2 className="serif" style={{ color: 'var(--gold-light)' }}>Ahlan wa Sahlan, {app.nickname || app.full_name}!</h2>
      <p style={{ color: '#d8cfb7', maxWidth: 520, margin: '0 auto 18px' }}>Ananda resmi menjadi santri {app.program_name} Kuttab Imam Al-Ghazali TA {app.academic_year}. Informasi masa ta'aruf akan disampaikan melalui portal dan WhatsApp.</p>
      <Link to="surat" className="btn btn-gold"><ScrollText size={16} /> Unduh Surat Penerimaan</Link>
    </div>
  );
  if (['reserve', 'rejected', 'cancelled'].includes(s)) return (
    <div className="card card-body"><Alert tone={s === 'reserve' ? 'warning' : 'danger'}>{STATUS[s].desc}{lastNote && <><br />Catatan: {lastNote}</>}</Alert></div>
  );
  return null;
}

export default function Detail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [app, setApp] = useState(null);
  const load = () => api.get(`/portal/applications/${id}`).then(setApp).catch((e) => { toast.error(e.message); nav('/portal'); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line
  useTitle(app?.full_name || 'Detail Pendaftaran');
  if (!app) return <PageLoader />;
  const setMerged = (a) => setApp((x) => ({ ...x, ...a }));
  const photo = app.documents.find((d) => d.type === 'photo');
  const docEditable = ['draft', 'revision', 'waiting_payment', 'verification'].includes(app.status);
  const cancel = async () => {
    if (!(await confirm({ title: app.status === 'draft' ? 'Hapus draf?' : 'Batalkan pendaftaran?', message: 'Tindakan ini tidak dapat dibatalkan.', danger: true, confirmText: 'Ya, batalkan' }))) return;
    try { await api.post(`/portal/applications/${id}/cancel`); toast.success('Pendaftaran dibatalkan.'); nav('/portal'); } catch (e) { toast.error(e.message); }
  };
  return (
    <>
      <PageTitle crumbs={[{ label: 'Portal', to: '/portal' }, { label: 'Pendaftaran' }]} title={app.full_name || 'Calon Santri'}
        subtitle={`${app.reg_number || 'Belum dikirim'} · ${app.program_name} · ${app.wave_name} TA ${app.academic_year}`}
        actions={<>
          {app.reg_number && <Link to="kartu" className="btn btn-outline btn-sm"><Printer size={15} /> Kartu Peserta</Link>}
          {['draft', 'revision'].includes(app.status) && <Link to="formulir" className="btn btn-dark btn-sm"><Edit3 size={15} /> Ubah Data</Link>}
          {!['enrolled', 'cancelled', 'rejected'].includes(app.status) && <Button variant="ghost" size="sm" onClick={cancel}><XCircle size={15} /> {app.status === 'draft' ? 'Hapus Draf' : 'Batalkan'}</Button>}
        </>} />

      <div className="card card-body mb">
        <div className="row between wrap" style={{ marginBottom: 14 }}>
          <div className="row"><Avatar name={app.full_name} photoId={photo?.id} /><div><b>Status saat ini</b><div className="small muted">{STATUS[app.status]?.desc}</div></div></div>
          <StatusBadge status={app.status} />
        </div>
        <StatusStepper status={app.status} />
      </div>

      <div className="stack" style={{ gap: 22 }}>
        <ActionCard app={app} setApp={setMerged} reload={load} />

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 22 }} data-cols>
          <div className="stack" style={{ gap: 22 }}>
            <div className="card">
              <div className="card-head"><h3 className="row"><FileText size={18} color="var(--gold-deep)" /> Berkas</h3></div>
              <div className="card-body"><DocumentUploader app={app} editable={docEditable} canDelete={['draft', 'revision'].includes(app.status)} onDocs={(documents) => setMerged({ documents })} /></div>
            </div>
            <div className="card">
              <div className="card-head"><h3 className="row"><Info size={18} color="var(--gold-deep)" /> Ringkasan Data</h3></div>
              <div className="card-body">
                <dl className="kv">
                  <dt>Nama lengkap</dt><dd>{app.full_name || '-'}</dd>
                  <dt>Jenis kelamin</dt><dd>{app.gender === 'L' ? 'Laki-laki' : app.gender === 'P' ? 'Perempuan' : '-'}</dd>
                  <dt>TTL</dt><dd>{app.birth_place || '-'}, {date(app.birth_date)}</dd>
                  <dt>Usia per 1 Juli</dt><dd>{fmtAge(app.age)}</dd>
                  <dt>Alamat</dt><dd>{app.address}{app.city ? `, ${app.city}` : ''}</dd>
                  <dt>Ayah</dt><dd>{app.father?.name || '-'} · {app.father?.phone}</dd>
                  <dt>Ibu</dt><dd>{app.mother?.name || '-'} · {app.mother?.phone}</dd>
                  <dt>Kemampuan Qur'an</dt><dd>{app.quran_ability || '-'}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="stack" style={{ gap: 22 }}>
            <div className="card">
              <div className="card-head"><h3 className="row"><Receipt size={18} color="var(--gold-deep)" /> Pembayaran</h3></div>
              <div className="card-body stack">
                {!app.payments.length ? <span className="small muted">Belum ada pembayaran.</span> : app.payments.map((p) => (
                  <div key={p.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
                    <div className="row between"><b>{p.kind === 'registration' ? 'Pendaftaran' : 'Daftar Ulang'}</b><PayBadge s={p.status} /></div>
                    <div className="small muted">{rupiah(p.amount)} · {p.bank_name} · {date(p.paid_at)}</div>
                    {p.note && <div className="small" style={{ color: p.status === 'rejected' ? 'var(--danger)' : 'inherit' }}>Catatan: {p.note}</div>}
                    <a href={fileUrl('payment', p.id)} target="_blank" rel="noreferrer" className="small" style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>Lihat bukti</a>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3 className="row"><History size={18} color="var(--gold-deep)" /> Riwayat</h3></div>
              <div className="card-body">
                <div className="history">
                  {[...app.history].reverse().map((h, i) => (
                    <div className="h" key={i}><div className="t">{STATUS[h.status]?.label}</div><div className="d">{dateTime(h.created_at)}</div>{h.note && <div className="note">{h.note}</div>}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
