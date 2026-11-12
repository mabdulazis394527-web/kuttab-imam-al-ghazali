import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, Megaphone, Bell, CheckCheck, Sparkles, KeyRound, UserRound } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch, useTitle } from '../../lib/hooks.js';
import { useAuth } from '../../lib/auth.jsx';
import { date, ago, rupiah } from '../../lib/format.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Button, Modal, PageLoader, StatusBadge, Avatar, Progress, Empty, Alert, useToast, Field, Input, useForm } from '../../components/ui.jsx';
import { StatusStepper, statusDesc } from '../../components/Brand.jsx';

export function NewApplicationModal({ open, onClose }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(null);
  const nav = useNavigate();
  const toast = useToast();
  useEffect(() => { if (open && !info) api.get('/public/info').then(setInfo); }, [open, info]);
  const create = async (pid) => {
    setBusy(pid);
    try { const a = await api.post('/portal/applications', { program_id: pid }); nav(`/portal/pendaftaran/${a.id}/formulir`); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(null); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Daftarkan Ananda" wide>
      {!info ? <PageLoader /> : !info.currentWave ? <Alert tone="warning">Belum ada gelombang pendaftaran yang dibuka saat ini.</Alert> : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{info.currentWave.name} · TA {info.currentWave.academic_year} · Biaya pendaftaran {rupiah(info.currentWave.registration_fee)}. Pilih jenjang sesuai usia ananda per 1 Juli.</p>
          <div className="grid g2">
            {info.programs.map((p) => (
              <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
                <div className="program-top" style={{ padding: 20 }}>
                  <span className="code" style={{ fontSize: 70, bottom: -16 }}>{p.code}</span>
                  <span className="badge tone-gold plain">Usia {p.age_min}–{p.age_max} tahun</span>
                  <h3 style={{ fontSize: 20 }}>{p.name}</h3><p className="small">{p.tagline}</p>
                </div>
                <div className="card-body">
                  <div className="row between small mb"><span className="muted">Kursi tersisa</span><b>{Math.max(0, p.quota - p.filled)} / {p.quota}</b></div>
                  <Button block variant="dark" loading={busy === p.id} onClick={() => create(p.id)}>Pilih {p.name} <ArrowRight size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

export function PortalHome() {
  useTitle('Portal Orang Tua');
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [modal, setModal] = useState(params.get('baru') === '1');
  const { data: apps, loading } = useFetch('/portal/applications');
  const { data: anns } = useFetch('/portal/announcements');
  if (loading && !apps) return <PageLoader />;
  return (
    <>
      <PageTitle title={`Assalamu'alaikum, ${user?.name?.split(' ')[0]}`} subtitle="Pantau dan kelola pendaftaran ananda di sini."
        actions={<Button onClick={() => setModal(true)}><Plus size={16} /> Daftarkan Ananda</Button>} />

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr)', gap: 22 }}>
        {apps?.length === 0 && (
          <div className="card card-dark pattern-bg" style={{ padding: 36, textAlign: 'center' }}>
            <Sparkles size={36} color="var(--gold)" style={{ margin: '0 auto 12px' }} />
            <h2 className="serif" style={{ color: 'var(--gold-light)' }}>Mulai Pendaftaran Ananda</h2>
            <p style={{ color: '#b3a98f', maxWidth: 520, margin: '0 auto 22px' }}>Pilih jenjang, lengkapi formulir dan berkas, lalu kirim. Progres tersimpan otomatis sehingga dapat dilanjutkan kapan saja.</p>
            <Button size="lg" onClick={() => setModal(true)}><Plus size={18} /> Daftarkan Ananda</Button>
          </div>
        )}
        {apps?.map((a) => (
          <Link to={a.status === 'draft' ? `/portal/pendaftaran/${a.id}/formulir` : `/portal/pendaftaran/${a.id}`} key={a.id} className="card fade-up" style={{ display: 'block' }}>
            <div className="card-body">
              <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
                <div className="row" style={{ gap: 14 }}>
                  <Avatar name={a.full_name || '?'} photoId={a.photo_id} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{a.full_name || 'Calon santri (belum diisi)'}</h3>
                    <div className="small muted">{a.reg_number || 'Belum ada nomor pendaftaran'} · {a.program_name} · {a.wave_name} TA {a.academic_year}</div>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              {a.status === 'draft' ? (
                <div className="mt">
                  <div className="row between small"><span className="muted">Kelengkapan formulir</span><b>{a.progress.percent}%</b></div>
                  <div style={{ marginTop: 8 }}><Progress value={a.progress.percent} /></div>
                  <div className="row mt small" style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>Lanjutkan pengisian <ArrowRight size={15} /></div>
                </div>
              ) : (
                <div className="mt">
                  <StatusStepper status={a.status} />
                  <p className="small muted" style={{ margin: '8px 0 0' }}>{statusDesc(a.status)}</p>
                </div>
              )}
            </div>
          </Link>
        ))}

        <div className="card">
          <div className="card-head"><h3 className="row"><Megaphone size={18} color="var(--gold-deep)" /> Pengumuman</h3></div>
          <div className="card-body stack" style={{ gap: 16 }}>
            {!anns?.length ? <Empty title="Belum ada pengumuman" /> : anns.map((n) => (
              <div key={n.id} style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14 }}>
                <div className="row between"><b>{n.title}</b><span className="tiny muted">{date(n.created_at)}</span></div>
                <p className="small muted" style={{ margin: '4px 0 0' }}>{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NewApplicationModal open={modal} onClose={() => setModal(false)} />
    </>
  );
}

export function Notifications() {
  useTitle('Notifikasi');
  const { setUnread } = useAuth();
  const { data, loading, reload } = useFetch('/portal/notifications');
  const readAll = async () => { await api.post('/portal/notifications/read-all'); setUnread(0); reload(); };
  useEffect(() => { if (data?.some((n) => !n.read_at)) { const t = setTimeout(readAll, 2500); return () => clearTimeout(t); } }, [data]); // eslint-disable-line
  if (loading && !data) return <PageLoader />;
  return (
    <>
      <PageTitle title="Notifikasi" subtitle="Kabar terbaru tentang proses pendaftaran." actions={<Button variant="outline" size="sm" onClick={readAll}><CheckCheck size={15} /> Tandai semua dibaca</Button>} />
      <div className="card">
        {!data?.length ? <Empty icon={Bell} title="Belum ada notifikasi" /> : data.map((n) => (
          <Link to={n.link || '/portal'} key={n.id} className="row" style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start', background: n.read_at ? 'transparent' : '#fffaf0' }}>
            <div className="avatar" style={{ width: 38, height: 38, borderRadius: 10 }}><Bell size={16} /></div>
            <div style={{ flex: 1 }}>
              <div className="row between"><b style={{ fontSize: 14.5 }}>{n.title}</b><span className="tiny muted">{ago(n.created_at)}</span></div>
              {n.body && <div className="small muted">{n.body}</div>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function Profile() {
  useTitle('Profil');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const p = useForm({ name: user?.name || '', phone: user?.phone || '' });
  const pw = useForm({ current: '', password: '', confirm: '' });
  const saveP = p.submit(async (v) => { const r = await api.put('/auth/profile', v); setUser(r.user); toast.success('Profil diperbarui.'); });
  const savePw = pw.submit(async (v) => {
    if (v.password !== v.confirm) return pw.setErrors({ confirm: 'Konfirmasi tidak sama' });
    await api.put('/auth/password', { current: v.current, password: v.password });
    pw.setValues({ current: '', password: '', confirm: '' }); toast.success('Kata sandi diperbarui.');
  });
  return (
    <>
      <PageTitle title="Profil Akun" subtitle={user?.email} />
      <div className="grid g2">
        <form className="card" onSubmit={saveP}>
          <div className="card-head"><h3 className="row"><UserRound size={18} /> Data Akun</h3></div>
          <div className="card-body stack">
            <Field label="Email"><Input value={user?.email} disabled /></Field>
            <Field label="Nama" error={p.errors.name}><Input {...p.bind('name')} /></Field>
            <Field label="No. WhatsApp" error={p.errors.phone}><Input {...p.bind('phone')} /></Field>
            <div><Button loading={p.busy}>Simpan</Button></div>
          </div>
        </form>
        <form className="card" onSubmit={savePw}>
          <div className="card-head"><h3 className="row"><KeyRound size={18} /> Ubah Kata Sandi</h3></div>
          <div className="card-body stack">
            <Field label="Kata Sandi Lama" error={pw.errors.current}><Input type="password" {...pw.bind('current')} autoComplete="current-password" /></Field>
            <Field label="Kata Sandi Baru" error={pw.errors.password} hint="Minimal 8 karakter"><Input type="password" {...pw.bind('password')} autoComplete="new-password" /></Field>
            <Field label="Ulangi Kata Sandi Baru" error={pw.errors.confirm}><Input type="password" {...pw.bind('confirm')} autoComplete="new-password" /></Field>
            <div><Button loading={pw.busy}>Perbarui</Button></div>
          </div>
        </form>
      </div>
    </>
  );
}

