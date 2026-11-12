import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, UserPlus, Power, KeyRound } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch, useTitle } from '../../lib/hooks.js';
import { useAuth } from '../../lib/auth.jsx';
import { dateTime } from '../../lib/format.js';
import { ROLES } from '../../../shared/constants.js';
import { PageTitle } from '../../layouts/AppShell.jsx';
import { Button, Field, Input, Select, Textarea, Modal, PageLoader, Badge, Alert, useToast, useForm, useConfirm } from '../../components/ui.jsx';

export function Settings() {
  useTitle('Pengaturan');
  const { user } = useAuth();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/admin/settings').then(setS); }, []);
  if (!s) return <PageLoader />;
  const ro = user.role !== 'admin';
  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const list = (k) => ({ value: (s[k] || []).join('\n'), onChange: (e) => setS({ ...s, [k]: e.target.value.split('\n') }) });
  const banks = s.bank_accounts || [];
  const setBank = (i, k, v) => setS({ ...s, bank_accounts: banks.map((b, j) => (j === i ? { ...b, [k]: v } : b)) });
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...s, missions: (s.missions || []).map((x) => x.trim()).filter(Boolean), requirements: (s.requirements || []).map((x) => x.trim()).filter(Boolean), bank_accounts: banks.filter((b) => b.number) };
      setS(await api.put('/admin/settings', body)); toast.success('Pengaturan disimpan.');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle title="Pengaturan" subtitle="Identitas lembaga, kontak, rekening, dan konten landing page." actions={!ro && <Button loading={busy} onClick={save}><Save size={16} /> Simpan Perubahan</Button>} />
      {ro && <div className="mb"><Alert tone="warning">Hanya administrator yang dapat mengubah pengaturan.</Alert></div>}
      <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="grid g2">
          <div className="card"><div className="card-head"><h3>Status Pendaftaran</h3></div><div className="card-body stack">
            <label className="check"><input type="checkbox" checked={s.registration_open !== false} onChange={set('registration_open')} />Pendaftaran dibuka (orang tua dapat membuat formulir baru)</label>
            <Field label="Tahun Ajaran Berjalan"><Input value={s.academic_year || ''} onChange={set('academic_year')} /></Field>
          </div></div>
          <div className="card"><div className="card-head"><h3>Identitas</h3></div><div className="card-body stack">
            <Field label="Nama Lembaga"><Input value={s.school_name || ''} onChange={set('school_name')} /></Field>
            <Field label="Tagline"><Input value={s.tagline || ''} onChange={set('tagline')} /></Field>
          </div></div>
          <div className="card span2"><div className="card-head"><h3>Konten Landing Page</h3></div><div className="card-body grid g2">
            <Field label="Judul Hero"><Input value={s.hero_title || ''} onChange={set('hero_title')} /></Field>
            <Field label="Subjudul Hero"><Input value={s.hero_subtitle || ''} onChange={set('hero_subtitle')} /></Field>
            <Field label="Visi" className="span2"><Textarea rows={2} value={s.vision || ''} onChange={set('vision')} /></Field>
            <Field label="Misi (satu per baris)"><Textarea rows={7} {...list('missions')} /></Field>
            <Field label="Syarat Pendaftaran (satu per baris)"><Textarea rows={7} {...list('requirements')} /></Field>
          </div></div>
          <div className="card"><div className="card-head"><h3>Kontak</h3></div><div className="card-body grid g2">
            <Field label="Alamat" className="span2"><Textarea rows={2} value={s.address || ''} onChange={set('address')} /></Field>
            <Field label="Kota"><Input value={s.city || ''} onChange={set('city')} /></Field>
            <Field label="Telepon"><Input value={s.phone || ''} onChange={set('phone')} /></Field>
            <Field label="WhatsApp" hint="Format 62812xxxx"><Input value={s.whatsapp || ''} onChange={set('whatsapp')} /></Field>
            <Field label="Email"><Input value={s.email || ''} onChange={set('email')} /></Field>
            <Field label="Instagram"><Input value={s.instagram || ''} onChange={set('instagram')} /></Field>
            <Field label="Jam Layanan"><Input value={s.office_hours || ''} onChange={set('office_hours')} /></Field>
            <Field label="Tautan Google Maps" className="span2"><Input value={s.maps_url || ''} onChange={set('maps_url')} placeholder="https://maps.app.goo.gl/..." /></Field>
          </div></div>
          <div className="card"><div className="card-head"><h3>Rekening Pembayaran</h3>{!ro && <Button size="sm" variant="outline" onClick={() => setS({ ...s, bank_accounts: [...banks, { bank: '', number: '', holder: '' }] })}><Plus size={14} /> Tambah</Button>}</div>
            <div className="card-body stack">
              {banks.map((b, i) => (
                <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                  <Field label="Bank"><Input value={b.bank} onChange={(e) => setBank(i, 'bank', e.target.value)} /></Field>
                  <Field label="No. Rekening"><Input value={b.number} onChange={(e) => setBank(i, 'number', e.target.value)} /></Field>
                  <button className="icon-btn" style={{ marginBottom: 5 }} onClick={() => setS({ ...s, bank_accounts: banks.filter((_, j) => j !== i) })} aria-label="Hapus rekening"><Trash2 size={15} /></button>
                  <Field label="Atas Nama" className="span2" ><Input value={b.holder} onChange={(e) => setBank(i, 'holder', e.target.value)} /></Field>
                </div>
              ))}
            </div>
          </div>
        </div>
      </fieldset>
    </>
  );
}

export function UsersPage() {
  useTitle('Pengguna');
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const { data, reload } = useFetch(`/admin/users?role=${role}&q=${encodeURIComponent(q)}`);
  const [open, setOpen] = useState(false);
  const f = useForm({ name: '', email: '', phone: '', role: 'panitia', password: '' });
  const create = f.submit(async (v) => { await api.post('/admin/users', v); toast.success('Pengguna dibuat.'); setOpen(false); f.setValues({ name: '', email: '', phone: '', role: 'panitia', password: '' }); reload(); });
  const toggle = async (u) => {
    if (!(await confirm({ title: u.active ? 'Nonaktifkan akun?' : 'Aktifkan akun?', message: `${u.name} (${u.email})`, danger: !!u.active }))) return;
    try { await api.put(`/admin/users/${u.id}`, { active: !u.active }); reload(); } catch (e) { toast.error(e.message); }
  };
  const reset = async (u) => {
    const pw = window.prompt(`Kata sandi baru untuk ${u.name} (min. 8 karakter):`);
    if (!pw) return;
    try { await api.put(`/admin/users/${u.id}`, { password: pw }); toast.success('Kata sandi diperbarui.'); } catch (e) { toast.error(e.message); }
  };
  const changeRole = async (u, r) => { try { await api.put(`/admin/users/${u.id}`, { role: r }); toast.success('Peran diperbarui.'); reload(); } catch (e) { toast.error(e.message); } };
  return (
    <>
      <PageTitle title="Pengguna" subtitle="Kelola akun panitia, administrator, dan orang tua." actions={<Button size="sm" onClick={() => setOpen(true)}><UserPlus size={15} /> Tambah Pengguna</Button>} />
      <div className="card">
        <div className="row wrap" style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
          <Input placeholder="Cari nama atau email" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 240px', width: 'auto' }} />
          <Select value={role} onChange={(e) => setRole(e.target.value)} placeholder="Semua peran" options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))} style={{ width: 'auto' }} />
        </div>
        {!data ? <PageLoader /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Nama</th><th>Peran</th><th className="hide-sm">Pendaftaran</th><th className="hide-sm">Login Terakhir</th><th>Status</th><th /></tr></thead>
            <tbody>{data.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name}</b><div className="tiny muted">{u.email} · {u.phone}</div></td>
                <td><Select value={u.role} disabled={u.id === me.id} onChange={(e) => changeRole(u, e.target.value)} options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))} style={{ padding: '6px 30px 6px 10px', fontSize: 13, width: 'auto' }} /></td>
                <td className="hide-sm">{u.apps}</td>
                <td className="hide-sm small">{u.last_login_at ? dateTime(u.last_login_at) : '-'}</td>
                <td>{u.active ? <Badge tone="success">Aktif</Badge> : <Badge tone="muted">Nonaktif</Badge>}</td>
                <td><div className="row" style={{ gap: 6 }}>
                  <button className="icon-btn" onClick={() => reset(u)} title="Atur ulang kata sandi" aria-label="Atur ulang kata sandi"><KeyRound size={15} /></button>
                  {u.id !== me.id && <button className="icon-btn" onClick={() => toggle(u)} title={u.active ? 'Nonaktifkan' : 'Aktifkan'} aria-label="Ubah status akun"><Power size={15} /></button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Pengguna" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button loading={f.busy} onClick={create}>Simpan</Button></>}>
        <div className="stack">
          <Field label="Nama" error={f.errors.name}><Input {...f.bind('name')} /></Field>
          <Field label="Email" error={f.errors.email}><Input type="email" {...f.bind('email')} /></Field>
          <Field label="No. HP"><Input {...f.bind('phone')} /></Field>
          <Field label="Peran"><Select {...f.bind('role')} options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))} /></Field>
          <Field label="Kata Sandi Awal" error={f.errors.password} hint="Minimal 8 karakter"><Input type="text" {...f.bind('password')} /></Field>
        </div>
      </Modal>
    </>
  );
}
