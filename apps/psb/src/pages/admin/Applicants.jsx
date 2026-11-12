import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, CalendarPlus, Gavel, X, FileWarning, CreditCard } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch, useDebounce, useTitle } from '../../lib/hooks.js';
import { dateShort, schedule, age as fmtAge } from '../../lib/format.js';
import { STATUS } from '../../../shared/constants.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Input, Select, Button, StatusBadge, Avatar, Empty, Pagination, Modal, Field, Textarea, useToast, PageLoader } from '../../components/ui.jsx';

const GROUPS = [
  { key: '', label: 'Semua' },
  { key: 'waiting_payment', label: 'Menunggu Bayar' },
  { key: 'verification,revision', label: 'Verifikasi' },
  { key: 'scheduled', label: 'Terjadwal' },
  { key: 'assessed', label: 'Perlu Keputusan' },
  { key: 'accepted,reregistration', label: 'Diterima' },
  { key: 'enrolled', label: 'Resmi Santri' },
  { key: 'reserve', label: 'Cadangan' },
  { key: 'rejected,cancelled', label: 'Tidak Lanjut' },
  { key: 'draft', label: 'Draf' },
];

export function BulkSchedule({ ids, open, onClose, onDone }) {
  const toast = useToast();
  const [v, setV] = useState({ observation_at: '', observation_place: 'Aula Kuttab Imam Al-Ghazali', observer: '', observation_note: '', interval_minutes: 30 });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { const r = await api.post('/admin/bulk/schedule', { ...v, ids }); toast.success(`${r.count} pendaftar dijadwalkan.`); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title={`Jadwalkan Observasi (${ids.length} pendaftar)`}
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button loading={busy} onClick={go}><CalendarPlus size={16} /> Jadwalkan & Beri Tahu</Button></>}>
      <div className="stack">
        <div className="grid g2" style={{ gap: 12 }}>
          <Field label="Mulai (tanggal & jam)" required><Input type="datetime-local" value={v.observation_at} onChange={s('observation_at')} /></Field>
          <Field label="Jeda antar pendaftar (menit)" hint="0 = semua di jam yang sama"><Input type="number" min="0" value={v.interval_minutes} onChange={s('interval_minutes')} /></Field>
        </div>
        <Field label="Tempat" required><Input value={v.observation_place} onChange={s('observation_place')} /></Field>
        <Field label="Pengamat / Pewawancara"><Input value={v.observer} onChange={s('observer')} /></Field>
        <Field label="Catatan untuk orang tua"><Textarea rows={2} value={v.observation_note} onChange={s('observation_note')} /></Field>
      </div>
    </Modal>
  );
}

export function BulkDecision({ ids, open, onClose, onDone }) {
  const toast = useToast();
  const [v, setV] = useState({ decision: 'accepted', note: '' });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { const r = await api.post('/admin/bulk/decision', { ...v, ids }); toast.success(`Keputusan untuk ${r.count} pendaftar disimpan.`); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Keputusan Seleksi (${ids.length} pendaftar)`}
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button loading={busy} onClick={go}><Gavel size={16} /> Simpan Keputusan</Button></>}>
      <div className="stack">
        <div className="radio-cards">
          {[['accepted', 'Diterima', 'success'], ['reserve', 'Cadangan', 'warning'], ['rejected', 'Belum Diterima', 'danger']].map(([k, l, t]) => (
            <label key={k} className={`radio-card ${v.decision === k ? 'active' : ''}`}><input type="radio" checked={v.decision === k} onChange={() => setV({ ...v, decision: k })} /><span className={`badge tone-${t}`}>{l}</span></label>
          ))}
        </div>
        <Field label="Catatan untuk orang tua (opsional)"><Textarea rows={3} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export default function Applicants() {
  useTitle('Data Pendaftar');
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [q, setQ] = useState(params.get('q') || '');
  const dq = useDebounce(q);
  const [sel, setSel] = useState([]);
  const [modal, setModal] = useState(null);
  const status = params.get('status') || '';
  const program = params.get('program') || '';
  const gender = params.get('gender') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);
  const setP = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); if (k !== 'page') p.delete('page'); setParams(p, { replace: true }); setSel([]); };
  useEffect(() => { if (dq !== (params.get('q') || '')) setP('q', dq); }, [dq]); // eslint-disable-line
  const qs = useMemo(() => new URLSearchParams({ q: dq, status, program, gender, sort, page, size: 15 }).toString(), [dq, status, program, gender, sort, page]);
  const { data, loading, reload } = useFetch(`/admin/applications?${qs}`);
  const { data: programs } = useFetch('/admin/programs');
  const counts = useMemo(() => Object.fromEntries((data?.counts || []).map((c) => [c.status, c.c])), [data]);
  const groupCount = (key) => key ? key.split(',').reduce((s, k) => s + (counts[k] || 0), 0) : Object.entries(counts).filter(([k]) => k !== 'draft').reduce((s, [, v]) => s + v, 0);
  const rows = data?.rows || [];
  const allSel = rows.length && rows.every((r) => sel.includes(r.id));
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const exportUrl = `/api/admin/applications/export.csv?${new URLSearchParams({ q: dq, status, program, gender })}`;

  return (
    <>
      <PageTitle title="Data Pendaftar" subtitle="Cari, saring, dan proses pendaftar."
        actions={<a href={exportUrl} className="btn btn-outline btn-sm"><Download size={15} /> Ekspor CSV</a>} />

      <div className="pills mb">
        {GROUPS.map((g) => (
          <button key={g.key} className={`pill ${status === g.key ? 'active' : ''}`} onClick={() => setP('status', g.key)}>{g.label}<span className="count">{groupCount(g.key)}</span></button>
        ))}
      </div>

      <div className="card">
        <div className="row wrap" style={{ padding: 16, borderBottom: '1px solid var(--line)', gap: 10 }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={16} style={{ position: 'absolute', left: 13, top: 14, color: 'var(--muted)' }} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, no. pendaftaran, orang tua, no. HP" style={{ paddingLeft: 38 }} />
          </div>
          <Select value={program} onChange={(e) => setP('program', e.target.value)} placeholder="Semua jenjang" options={(programs || []).map((p) => ({ value: p.id, label: p.name }))} style={{ width: 'auto', flex: '0 1 180px' }} />
          <Select value={gender} onChange={(e) => setP('gender', e.target.value)} placeholder="Putra & putri" options={[{ value: 'L', label: 'Putra' }, { value: 'P', label: 'Putri' }]} style={{ width: 'auto', flex: '0 1 150px' }} />
          <Select value={sort} onChange={(e) => setP('sort', e.target.value)} options={[{ value: 'newest', label: 'Terbaru' }, { value: 'oldest', label: 'Terlama' }, { value: 'name', label: 'Nama A–Z' }, { value: 'score', label: 'Nilai tertinggi' }, { value: 'observation', label: 'Jadwal observasi' }]} style={{ width: 'auto', flex: '0 1 170px' }} />
        </div>

        {sel.length > 0 && (
          <div className="row wrap" style={{ padding: '10px 16px', background: 'var(--ink)', color: 'var(--gold-light)', gap: 10 }}>
            <b className="small">{sel.length} dipilih</b>
            <Button size="sm" onClick={() => setModal('schedule')}><CalendarPlus size={15} /> Jadwalkan Observasi</Button>
            <Button size="sm" onClick={() => setModal('decision')}><Gavel size={15} /> Keputusan</Button>
            <button className="btn btn-ghost-light btn-sm" onClick={() => setSel([])}><X size={15} /> Batal</button>
          </div>
        )}

        {loading && !data ? <PageLoader /> : !rows.length ? <Empty title="Tidak ada pendaftar">Coba ubah filter atau kata kunci.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={!!allSel} onChange={() => setSel(allSel ? [] : rows.map((r) => r.id))} aria-label="Pilih semua" /></th>
                <th>Calon Santri</th><th>Jenjang</th><th className="hide-sm">Usia</th><th className="hide-sm">Orang Tua</th><th>Status</th><th className="hide-sm">Info</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => nav(`/admin/pendaftar/${r.id}`)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Pilih ${r.full_name}`} /></td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar name={r.full_name || '?'} photoId={r.photo_id} />
                        <div><Link to={`/admin/pendaftar/${r.id}`} onClick={(e) => e.stopPropagation()}><b>{r.full_name || '(belum diisi)'}</b></Link>
                          <div className="tiny muted">{r.reg_number || 'Draf'} · {r.gender === 'L' ? 'Putra' : r.gender === 'P' ? 'Putri' : '-'} · {r.city || '-'}</div></div>
                      </div>
                    </td>
                    <td><span className="badge tone-gold plain">{r.program_code}</span></td>
                    <td className="hide-sm small">{fmtAge(r.age)}</td>
                    <td className="hide-sm small">{r.parent_name}<div className="tiny muted">{r.parent_phone}</div></td>
                    <td><StatusBadge status={r.status} />{r.status === 'scheduled' && <div className="tiny muted" style={{ marginTop: 4 }}>{schedule(r.observation_at)}</div>}</td>
                    <td className="hide-sm">
                      <div className="row" style={{ gap: 6 }}>
                        {r.pay_pending > 0 && <span className="badge tone-warning" title="Pembayaran perlu verifikasi"><CreditCard size={12} /></span>}
                        {r.docs_pending > 0 && r.status !== 'draft' && <span className="badge tone-info" title="Berkas perlu verifikasi"><FileWarning size={12} /> {r.docs_pending}</span>}
                        {r.score_total != null && <span className="badge tone-muted plain">{r.score_total}</span>}
                        <span className="tiny muted">{dateShort(r.submitted_at || r.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} size={data.size} total={data.total} onPage={(p) => setP('page', String(p))} />}
      </div>
      <BulkSchedule ids={sel} open={modal === 'schedule'} onClose={() => setModal(null)} onDone={() => { setModal(null); setSel([]); reload(); }} />
      <BulkDecision ids={sel} open={modal === 'decision'} onClose={() => setModal(null)} onDone={() => { setModal(null); setSel([]); reload(); }} />
    </>
  );
}

export const STATUS_OPTIONS = Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }));
