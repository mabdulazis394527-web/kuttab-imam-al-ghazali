import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, CalendarClock, MessageSquare, Check, Pin, MessageCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch, useTitle } from '../../lib/hooks.js';
import { useAuth } from '../../lib/auth.jsx';
import { rupiah, date, dateTime, scheduleDay, time, waLink, ago } from '../../lib/format.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Button, Field, Input, Select, Textarea, Modal, PageLoader, Empty, Badge, StatusBadge, useToast, useConfirm } from '../../components/ui.jsx';

/**
 * Halaman CRUD generik.
 * fields: [{ key, label, type: text|number|date|textarea|select|bool|list, options, span, hint, required }]
 */
function CrudPage({ title, subtitle, endpoint, fields, columns, empty, defaults, adminOnly = true, toForm = (x) => x }) {
  useTitle(title);
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useFetch(endpoint);
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const can = !adminOnly || user.role === 'admin';

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...edit };
      for (const f of fields) {
        if (f.type === 'list') body[f.key] = String(body[f.key] || '').split('\n').map((s) => s.trim()).filter(Boolean);
        if (f.type === 'date' && !body[f.key]) body[f.key] = null;
      }
      delete body.id;
      if (edit.id) await api.put(`${endpoint}/${edit.id}`, body); else await api.post(endpoint, body);
      toast.success('Tersimpan.'); setEdit(null); reload();
    } catch (e) { setErrors(e.fields || {}); toast.error(e.message); } finally { setBusy(false); }
  };
  const del = async (row) => {
    if (!(await confirm({ title: 'Hapus data?', message: 'Data yang dihapus tidak dapat dikembalikan.', danger: true, confirmText: 'Hapus' }))) return;
    try { await api.del(`${endpoint}/${row.id}`); toast.success('Dihapus.'); reload(); } catch (e) { toast.error(e.message); }
  };
  const open = (row) => {
    setErrors({});
    const base = row ? toForm(row) : { ...defaults };
    for (const f of fields) if (f.type === 'list' && Array.isArray(base[f.key])) base[f.key] = base[f.key].join('\n');
    setEdit(base);
  };
  const input = (f) => {
    const v = edit[f.key] ?? '';
    const on = (e) => setEdit({ ...edit, [f.key]: f.type === 'bool' ? (e.target.checked ? 1 : 0) : e.target.value });
    if (f.type === 'textarea' || f.type === 'list') return <Textarea rows={f.rows || 3} value={v} onChange={on} invalid={!!errors[f.key]} />;
    if (f.type === 'select') return <Select value={v} onChange={on} options={f.options} invalid={!!errors[f.key]} />;
    if (f.type === 'bool') return <label className="check"><input type="checkbox" checked={!!edit[f.key]} onChange={on} />{f.checkLabel || 'Aktif'}</label>;
    return <Input type={f.type || 'text'} value={v} onChange={on} invalid={!!errors[f.key]} />;
  };

  return (
    <>
      <PageTitle title={title} subtitle={subtitle} actions={can && <Button size="sm" onClick={() => open(null)}><Plus size={15} /> Tambah</Button>} />
      <div className="card">
        {loading && !data ? <PageLoader /> : !data?.length ? <Empty title={empty} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>{columns.map((c) => <th key={c.label} className={c.className}>{c.label}</th>)}{can && <th style={{ width: 90 }} />}</tr></thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    {columns.map((c) => <td key={c.label} className={c.className}>{c.render(r)}</td>)}
                    {can && <td><div className="row" style={{ gap: 6 }}>
                      <button className="icon-btn" onClick={() => open(r)} aria-label="Ubah"><Pencil size={15} /></button>
                      <button className="icon-btn" onClick={() => del(r)} aria-label="Hapus"><Trash2 size={15} /></button>
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Ubah ${title}` : `Tambah ${title}`} wide={fields.length > 6}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Batal</Button><Button loading={busy} onClick={save}>Simpan</Button></>}>
        {edit && <div className="grid g2">
          {fields.map((f) => <Field key={f.key} label={f.type === 'bool' ? undefined : f.label} required={f.required} hint={f.hint} error={errors[f.key]} className={f.span ? 'span2' : ''}>{input(f)}</Field>)}
        </div>}
      </Modal>
    </>
  );
}

const yes = (v) => (v ? <Badge tone="success">Aktif</Badge> : <Badge tone="muted">Nonaktif</Badge>);

export const Waves = () => (
  <CrudPage title="Gelombang" subtitle="Atur periode, biaya, dan jadwal setiap gelombang pendaftaran." endpoint="/admin/waves" empty="Belum ada gelombang"
    defaults={{ academic_year: '2027/2028', registration_fee: 350000, quota: 30, active: 1 }}
    fields={[
      { key: 'name', label: 'Nama Gelombang', required: true }, { key: 'academic_year', label: 'Tahun Ajaran', required: true, hint: 'Format 2027/2028' },
      { key: 'start_date', label: 'Mulai Pendaftaran', type: 'date', required: true }, { key: 'end_date', label: 'Akhir Pendaftaran', type: 'date', required: true },
      { key: 'observation_date', label: 'Perkiraan Observasi', type: 'date' }, { key: 'announcement_date', label: 'Pengumuman', type: 'date' },
      { key: 'registration_fee', label: 'Biaya Pendaftaran (Rp)', type: 'number', required: true }, { key: 'quota', label: 'Kuota Gelombang', type: 'number' },
      { key: 'notes', label: 'Catatan', type: 'textarea', span: true, rows: 2 }, { key: 'active', label: 'Aktif', type: 'bool' },
    ]}
    columns={[
      { label: 'Gelombang', render: (r) => <><b>{r.name}</b><div className="tiny muted">TA {r.academic_year}</div></> },
      { label: 'Periode', render: (r) => `${date(r.start_date)} – ${date(r.end_date)}` },
      { label: 'Observasi', className: 'hide-sm', render: (r) => date(r.observation_date) },
      { label: 'Pengumuman', className: 'hide-sm', render: (r) => date(r.announcement_date) },
      { label: 'Biaya', render: (r) => rupiah(r.registration_fee) },
      { label: 'Status', render: (r) => yes(r.active) },
    ]} />
);

export const Programs = () => (
  <CrudPage title="Jenjang" subtitle="Jenjang pendidikan yang dibuka beserta ketentuan usia, kuota, dan biaya." endpoint="/admin/programs" empty="Belum ada jenjang"
    defaults={{ active: 1, quota: 20, age_min: 5, age_max: 6, monthly_fee: 0, entry_fee: 0, sort: 1, gender_policy: 'Kelas terpisah putra & putri' }}
    fields={[
      { key: 'code', label: 'Kode', required: true, hint: 'Maks. 6 huruf, dipakai di nomor pendaftaran' }, { key: 'name', label: 'Nama Jenjang', required: true },
      { key: 'tagline', label: 'Tagline', span: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', span: true },
      { key: 'age_min', label: 'Usia Minimal', type: 'number' }, { key: 'age_max', label: 'Usia Maksimal', type: 'number' },
      { key: 'quota', label: 'Kuota', type: 'number' }, { key: 'gender_policy', label: 'Ketentuan Kelas' },
      { key: 'entry_fee', label: 'Biaya Masuk / Daftar Ulang (Rp)', type: 'number' }, { key: 'monthly_fee', label: 'Infaq Bulanan (Rp)', type: 'number' },
      { key: 'highlights', label: 'Keunggulan (satu per baris)', type: 'list', span: true, rows: 4 },
      { key: 'sort', label: 'Urutan', type: 'number' }, { key: 'active', label: 'Aktif', type: 'bool' },
    ]}
    columns={[
      { label: 'Jenjang', render: (r) => <><Badge tone="gold" plain>{r.code}</Badge> <b>{r.name}</b><div className="tiny muted">{r.tagline}</div></> },
      { label: 'Usia', render: (r) => `${r.age_min}–${r.age_max} th` },
      { label: 'Kuota', render: (r) => r.quota },
      { label: 'Biaya Masuk', className: 'hide-sm', render: (r) => rupiah(r.entry_fee) },
      { label: 'Bulanan', className: 'hide-sm', render: (r) => rupiah(r.monthly_fee) },
      { label: 'Status', render: (r) => yes(r.active) },
    ]} />
);

export const Announcements = () => (
  <CrudPage title="Pengumuman" subtitle="Publikasikan informasi untuk publik (landing page) atau khusus pendaftar (portal)." endpoint="/admin/announcements" adminOnly={false}
    empty="Belum ada pengumuman" defaults={{ audience: 'public', pinned: 0, published: 1 }}
    fields={[
      { key: 'title', label: 'Judul', required: true, span: true }, { key: 'body', label: 'Isi', type: 'textarea', required: true, span: true, rows: 5 },
      { key: 'audience', label: 'Ditujukan untuk', type: 'select', options: [{ value: 'public', label: 'Publik (landing page & portal)' }, { value: 'applicants', label: 'Khusus pendaftar (portal)' }] },
      { key: 'pinned', label: 'Sematkan', type: 'bool', checkLabel: 'Sematkan di atas' }, { key: 'published', label: 'Terbit', type: 'bool', checkLabel: 'Terbitkan' },
    ]}
    columns={[
      { label: 'Judul', render: (r) => <><b>{r.pinned ? <Pin size={13} color="var(--gold-deep)" /> : null} {r.title}</b><div className="tiny muted" style={{ maxWidth: 480 }}>{r.body.slice(0, 120)}{r.body.length > 120 && '…'}</div></> },
      { label: 'Untuk', render: (r) => <Badge tone={r.audience === 'public' ? 'info' : 'gold'} plain>{r.audience === 'public' ? 'Publik' : 'Pendaftar'}</Badge> },
      { label: 'Tanggal', className: 'hide-sm', render: (r) => date(r.created_at) },
      { label: 'Status', render: (r) => (r.published ? <Badge tone="success">Terbit</Badge> : <Badge tone="muted">Draf</Badge>) },
    ]} />
);

export const Faqs = () => (
  <CrudPage title="FAQ" subtitle="Pertanyaan yang tampil di landing page." endpoint="/admin/faqs" empty="Belum ada FAQ" defaults={{ sort: 1, published: 1 }}
    fields={[
      { key: 'question', label: 'Pertanyaan', required: true, span: true }, { key: 'answer', label: 'Jawaban', type: 'textarea', required: true, span: true, rows: 5 },
      { key: 'sort', label: 'Urutan', type: 'number' }, { key: 'published', label: 'Tampil', type: 'bool', checkLabel: 'Tampilkan' },
    ]}
    columns={[
      { label: '#', render: (r) => r.sort },
      { label: 'Pertanyaan', render: (r) => <><b>{r.question}</b><div className="tiny muted" style={{ maxWidth: 560 }}>{r.answer.slice(0, 140)}…</div></> },
      { label: 'Status', render: (r) => (r.published ? <Badge tone="success">Tampil</Badge> : <Badge tone="muted">Disembunyikan</Badge>) },
    ]} />
);

export function Schedule() {
  useTitle('Jadwal Observasi');
  const { data, loading } = useFetch('/admin/applications?status=scheduled,assessed&sort=observation&size=100');
  if (loading && !data) return <PageLoader />;
  const groups = {};
  for (const r of data.rows.filter((x) => x.observation_at)) (groups[r.observation_at.slice(0, 10)] ||= []).push(r);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageTitle title="Jadwal Observasi" subtitle="Agenda observasi ananda dan wawancara orang tua." actions={<Link to="/admin/pendaftar?status=verification,revision" className="btn btn-outline btn-sm">Jadwalkan pendaftar baru</Link>} />
      {!Object.keys(groups).length ? <div className="card"><Empty icon={CalendarClock} title="Belum ada jadwal observasi" /></div> : Object.entries(groups).map(([day, rows]) => (
        <div className="card mb" key={day}>
          <div className="card-head"><h3 className="row"><CalendarClock size={18} color="var(--gold-deep)" /> {scheduleDay(day)}</h3>{day === today ? <Badge tone="success">Hari ini</Badge> : day < today ? <Badge tone="muted">Lewat</Badge> : null}</div>
          <div className="table-wrap"><table className="table"><tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ width: 80 }}><b className="serif">{time(r.observation_at)}</b></td>
                <td><Link to={`/admin/pendaftar/${r.id}`}><b>{r.full_name}</b></Link><div className="tiny muted">{r.reg_number} · {r.parent_name}</div></td>
                <td><Badge tone="gold" plain>{r.program_code}</Badge></td>
                <td><StatusBadge status={r.status} /></td>
                <td className="hide-sm"><a href={waLink(r.parent_phone, `Assalamu'alaikum, mengingatkan jadwal observasi ananda ${r.full_name} pada ${scheduleDay(r.observation_at)} pukul ${time(r.observation_at)}. Jazakumullahu khairan.`)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MessageCircle size={14} /> Ingatkan</a></td>
                <td>{r.status === 'scheduled' ? <Link to={`/admin/pendaftar/${r.id}`} className="btn btn-dark btn-sm">Nilai</Link> : <span className="small muted">Nilai {r.score_total}</span>}</td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      ))}
    </>
  );
}

export function Inquiries() {
  useTitle('Pesan Masuk');
  const { data, loading, reload } = useFetch('/admin/inquiries');
  const mark = async (r) => { await api.put(`/admin/inquiries/${r.id}`, { handled: !r.handled }); reload(); };
  if (loading && !data) return <PageLoader />;
  return (
    <>
      <PageTitle title="Pesan Masuk" subtitle="Pertanyaan dari formulir kontak landing page." />
      <div className="card">
        {!data.length ? <Empty icon={MessageSquare} title="Belum ada pesan" /> : data.map((r) => (
          <div key={r.id} className="row" style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start', opacity: r.handled ? 0.6 : 1 }}>
            <div style={{ flex: 1 }}>
              <div className="row wrap" style={{ gap: 8 }}><b>{r.name}</b><span className="small muted">{r.phone} {r.email}</span><span className="tiny muted">· {ago(r.created_at)}</span>{r.handled ? <Badge tone="success">Selesai</Badge> : <Badge tone="warning">Baru</Badge>}</div>
              <p className="small" style={{ margin: '6px 0 0' }}>{r.message}</p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {r.phone && <a className="btn btn-outline btn-sm" href={waLink(r.phone, `Wa'alaikumussalam ${r.name}, terima kasih telah menghubungi PSB Kuttab Imam Al-Ghazali.`)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Balas</a>}
              <button className="icon-btn" onClick={() => mark(r)} title="Tandai selesai" aria-label="Tandai selesai"><Check size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function Audit() {
  useTitle('Log Audit');
  const [page, setPage] = useState(1);
  const { data, loading } = useFetch(`/admin/audit?page=${page}`);
  if (loading && !data) return <PageLoader />;
  return (
    <>
      <PageTitle title="Log Audit" subtitle="Jejak seluruh aktivitas penting di sistem." />
      <div className="card"><div className="table-wrap"><table className="table">
        <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th className="hide-sm">Detail</th><th className="hide-sm">IP</th></tr></thead>
        <tbody>{data.map((l) => (
          <tr key={l.id}><td className="small">{dateTime(l.created_at)}</td><td className="small">{l.user_name || '-'}<div className="tiny muted">{l.user_role}</div></td>
            <td><Badge tone="muted" plain>{l.action}</Badge></td><td className="small">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
            <td className="hide-sm tiny muted" style={{ maxWidth: 320, wordBreak: 'break-all' }}>{l.detail}</td><td className="hide-sm tiny muted">{l.ip}</td></tr>
        ))}</tbody>
      </table></div>
        <div className="row between" style={{ padding: 14 }}>
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
          <span className="small muted">Halaman {page}</span>
          <Button size="sm" variant="outline" disabled={data.length < 50} onClick={() => setPage(page + 1)}>Berikutnya</Button>
        </div>
      </div>
    </>
  );
}
