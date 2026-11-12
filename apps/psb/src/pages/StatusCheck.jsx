import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ShieldCheck, ShieldX, CalendarCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useTitle } from '../lib/hooks.js';
import { schedule, dateTime, date } from '../lib/format.js';
import { PublicNav, Footer } from '../layouts/Public.jsx';
import { Field, Input, Button, useForm, StatusBadge, Alert, PageLoader } from '../components/ui.jsx';
import { StatusStepper } from '../components/Brand.jsx';

function Shell({ children }) {
  return (
    <>
      <PublicNav forceSolid />
      <section className="section pattern-bg" style={{ paddingTop: 130, minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: 820 }}>{children}</div>
      </section>
      <Footer />
    </>
  );
}

export function StatusCheck() {
  useTitle('Cek Status Pendaftaran');
  const [result, setResult] = useState(null);
  const f = useForm({ reg_number: '', birth_date: '' });
  const go = f.submit(async (v) => setResult(await api.post('/public/status', v)));
  return (
    <Shell>
      <div className="section-head" style={{ marginBottom: 30 }}>
        <div className="kicker">Cek Status</div>
        <h2>Pantau Proses Pendaftaran</h2>
        <p>Masukkan nomor pendaftaran (tertera di kartu peserta) dan tanggal lahir ananda.</p>
      </div>
      <form className="card card-body" onSubmit={go}>
        <div className="grid status-form">
          <Field label="Nomor Pendaftaran" error={f.errors.reg_number}><Input {...f.bind('reg_number')} placeholder="KIG-2027-KA-0001" style={{ textTransform: 'uppercase' }} /></Field>
          <Field label="Tanggal Lahir Ananda" error={f.errors.birth_date}><Input type="date" {...f.bind('birth_date')} /></Field>
          <Button loading={f.busy} style={{ height: 46 }}><Search size={16} /> Cek</Button>
        </div>
      </form>
      {result && (
        <div className="card mt fade-up">
          <div className="card-body">
            <div className="row between wrap">
              <div>
                <div className="small muted">{result.reg_number} · {result.program_name} · {result.wave_name}</div>
                <h3 className="serif" style={{ fontSize: 22, margin: '4px 0' }}>{result.full_name}</h3>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <div className="mt"><StatusStepper status={result.status} /></div>
            <Alert tone="info">{result.status_desc}</Alert>
            {result.status === 'scheduled' && result.observation_at && (
              <div className="mt"><Alert tone="success" icon={CalendarCheck}><b>Jadwal observasi:</b> {schedule(result.observation_at)} · {result.observation_place}</Alert></div>
            )}
            {result.status === 'assessed' && result.announcement_date && <div className="mt"><Alert tone="warning">Pengumuman: {date(result.announcement_date)}</Alert></div>}
            <hr className="divider" />
            <div className="small muted mb">Riwayat</div>
            <div className="history">
              {[...result.history].reverse().map((h, i) => <div className="h" key={i}><div className="t">{h.label}</div><div className="d">{dateTime(h.created_at)}</div></div>)}
            </div>
            <p className="small muted" style={{ margin: 0 }}>Detail lengkap dan tindakan lanjutan tersedia di <Link to="/masuk" style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>portal orang tua</Link>.</p>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function VerifyCard() {
  const { reg } = useParams();
  useTitle('Verifikasi Kartu');
  const [state, setState] = useState(null);
  useEffect(() => { api.get(`/public/verify/${encodeURIComponent(reg)}`).then((d) => setState({ ok: true, d })).catch((e) => setState({ ok: false, e })); }, [reg]);
  return (
    <Shell>
      {!state ? <PageLoader /> : state.ok ? (
        <div className="card card-body center fade-up" style={{ padding: 40 }}>
          <ShieldCheck size={56} color="var(--success)" style={{ margin: '0 auto' }} />
          <h2 className="serif mt">Kartu Terverifikasi</h2>
          <p className="muted">Nomor pendaftaran ini terdaftar resmi di sistem PSB Kuttab Imam Al-Ghazali.</p>
          <dl className="kv" style={{ maxWidth: 420, margin: '20px auto', textAlign: 'left' }}>
            <dt>No. Pendaftaran</dt><dd>{state.d.reg_number}</dd>
            <dt>Nama</dt><dd>{state.d.full_name}</dd>
            <dt>Jenjang</dt><dd>{state.d.program_name}</dd>
            <dt>Gelombang</dt><dd>{state.d.wave_name} · TA {state.d.academic_year}</dd>
            <dt>Status</dt><dd><StatusBadge status={state.d.status} /></dd>
          </dl>
        </div>
      ) : (
        <div className="card card-body center" style={{ padding: 40 }}>
          <ShieldX size={56} color="var(--danger)" style={{ margin: '0 auto' }} />
          <h2 className="serif mt">Tidak Terdaftar</h2>
          <p className="muted">{state.e.message}</p>
        </div>
      )}
    </Shell>
  );
}
