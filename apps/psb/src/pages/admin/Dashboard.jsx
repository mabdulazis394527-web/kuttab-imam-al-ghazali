import { Link } from 'react-router-dom';
import { Users, UserCheck, GraduationCap, FileSearch, CreditCard, FileWarning, CalendarPlus, ClipboardList, Gavel, MessageSquare, CalendarClock, Activity, Wallet, ChevronRight } from 'lucide-react';
import { useFetch, useTitle } from '../../lib/hooks.js';
import { rupiah, schedule, ago } from '../../lib/format.js';
import { STATUS } from '../../../shared/constants.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { PageLoader, Empty, Progress } from '../../components/ui.jsx';
import { BarChart, Donut, HBars } from '../../components/Charts.jsx';

const TONE_COLOR = { success: '#2f7d4f', warning: '#c9a227', danger: '#b4423a', info: '#2f5f8a', muted: '#a39b86' };

export default function Dashboard() {
  useTitle('Dasbor Panitia');
  const { data: d, loading } = useFetch('/admin/dashboard');
  if (loading && !d) return <PageLoader />;
  const k = d.kpi;
  const days = Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - 29 + i);
    const key = dt.toISOString().slice(0, 10);
    return { label: dt.getDate() + '/' + (dt.getMonth() + 1), full: dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }), value: d.daily.find((x) => x.d === key)?.c || 0 };
  });
  const statusData = d.byStatus.filter((s) => s.status !== 'draft').map((s) => ({ label: STATUS[s.status]?.label, value: s.c, color: TONE_COLOR[STATUS[s.status]?.tone] }))
    .sort((a, b) => b.value - a.value);
  const tasks = [
    { icon: CreditCard, label: 'Pembayaran perlu diverifikasi', n: d.pending.payments, to: '/admin/pendaftar?status=verification,reregistration' },
    { icon: FileWarning, label: 'Berkas menunggu verifikasi', n: d.pending.documents, to: '/admin/pendaftar?status=verification' },
    { icon: CalendarPlus, label: 'Siap dijadwalkan observasi', n: d.pending.toSchedule, to: '/admin/pendaftar?status=verification' },
    { icon: ClipboardList, label: 'Observasi perlu dinilai', n: d.pending.toAssess, to: '/admin/jadwal' },
    { icon: Gavel, label: 'Menunggu keputusan', n: d.pending.toDecide, to: '/admin/pendaftar?status=assessed' },
    { icon: MessageSquare, label: 'Pertanyaan belum dibalas', n: d.pending.inquiries, to: '/admin/pesan' },
  ];
  return (
    <>
      <PageTitle title="Dasbor PSB" subtitle="Ringkasan penerimaan santri baru secara real-time." />
      <div className="grid g4">
        {[
          { icon: Users, v: k.submitted, l: 'Pendaftar terkirim', s: `${k.drafts} draf · ${k.users} akun orang tua` },
          { icon: FileSearch, v: k.verifying, l: 'Dalam verifikasi', s: `${k.observing} tahap observasi` },
          { icon: UserCheck, v: k.accepted, l: 'Diterima', s: `${k.submitted ? Math.round((k.accepted / k.submitted) * 100) : 0}% dari pendaftar` },
          { icon: GraduationCap, v: k.enrolled, l: 'Resmi santri', s: 'Daftar ulang selesai' },
        ].map((x) => (
          <div className="card kpi" key={x.l}><div className="ic"><x.icon size={22} /></div><div><div className="v">{x.v}</div><div className="l">{x.l}</div><div className="s">{x.s}</div></div></div>
        ))}
      </div>

      <div className="grid mt" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18 }} data-cols>
        <div className="card">
          <div className="card-head"><h3>Pendaftar 30 Hari Terakhir</h3><span className="small muted">berdasarkan tanggal kirim</span></div>
          <div className="card-body"><BarChart data={days} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Perlu Tindakan</h3></div>
          <div className="card-body stack" style={{ gap: 8 }}>
            {tasks.map((t) => <Link to={t.to} className="task" key={t.label}><t.icon size={18} className="ic" /><span className="small">{t.label}</span><span className="n">{t.n}</span></Link>)}
          </div>
        </div>
      </div>

      <div className="grid g3 mt">
        <div className="card">
          <div className="card-head"><h3>Status Pendaftar</h3></div>
          <div className="card-body"><Donut data={statusData} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Kuota per Jenjang</h3></div>
          <div className="card-body stack" style={{ gap: 18 }}>
            {d.programs.map((p) => (
              <div key={p.id}>
                <div className="row between small"><b>{p.name}</b><span className="muted">{p.filled}/{p.quota} diterima · {p.applicants} pendaftar</span></div>
                <div style={{ marginTop: 8 }}><Progress value={p.quota ? (p.filled / p.quota) * 100 : 0} /></div>
              </div>
            ))}
            <hr className="divider" style={{ margin: '4px 0' }} />
            <div className="small muted">Jenis kelamin</div>
            <Donut size={120} data={d.byGender.map((g) => ({ label: g.gender === 'L' ? 'Putra' : g.gender === 'P' ? 'Putri' : '-', value: g.c, color: g.gender === 'L' ? '#1f1b14' : '#c9a227' }))} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Sumber Informasi</h3></div>
          <div className="card-body">
            <HBars data={d.bySource.map((x) => ({ label: x.source, value: x.c }))} />
            <div className="small muted mt">Domisili teratas</div>
            <div className="mt" style={{ marginTop: 10 }}><HBars data={d.byCity.map((x) => ({ label: x.city, value: x.c }))} /></div>
          </div>
        </div>
      </div>

      <div className="grid mt" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,.8fr)', gap: 18 }} data-cols>
        <div className="card">
          <div className="card-head"><h3 className="row"><CalendarClock size={18} color="var(--gold-deep)" /> Observasi Terdekat</h3><Link to="/admin/jadwal" className="small" style={{ color: 'var(--gold-deep)' }}>Semua</Link></div>
          <div>
            {!d.upcoming.length ? <Empty title="Belum ada jadwal" /> : d.upcoming.map((u) => (
              <Link to={`/admin/pendaftar/${u.id}`} key={u.id} className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1 }}><b className="small">{u.full_name}</b><div className="tiny muted">{schedule(u.observation_at)}</div></div>
                <span className="badge tone-gold plain">{u.program_code}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="row"><Activity size={18} color="var(--gold-deep)" /> Aktivitas Terbaru</h3></div>
          <div>
            {d.recent.map((r, i) => (
              <Link to={`/admin/pendaftar/${r.id}`} key={i} className="row" style={{ padding: '11px 20px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: TONE_COLOR[STATUS[r.status]?.tone], marginTop: 7, flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}><div className="small"><b>{r.full_name}</b> → {STATUS[r.status]?.label}</div><div className="tiny muted">{r.actor || 'Sistem'} · {ago(r.created_at)}</div></div>
                <ChevronRight size={15} color="var(--muted)" />
              </Link>
            ))}
          </div>
        </div>
        <div className="card card-dark">
          <div className="card-head" style={{ borderColor: '#3a3222' }}><h3 className="row" style={{ color: 'var(--gold-light)' }}><Wallet size={18} /> Penerimaan Dana</h3></div>
          <div className="card-body stack">
            <div><div className="small" style={{ color: '#a89f88' }}>Biaya pendaftaran</div><div style={{ fontSize: 22, color: '#fff', fontWeight: 800 }}>{rupiah(d.revenue.registration)}</div></div>
            <div><div className="small" style={{ color: '#a89f88' }}>Daftar ulang</div><div style={{ fontSize: 22, color: '#fff', fontWeight: 800 }}>{rupiah(d.revenue.reregistration)}</div></div>
            <hr className="divider" style={{ background: '#3a3222', margin: '4px 0' }} />
            <div><div className="small" style={{ color: '#a89f88' }}>Total terverifikasi</div><div className="gold-text" style={{ fontSize: 28, fontWeight: 800 }}>{rupiah(d.revenue.registration + d.revenue.reregistration)}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
