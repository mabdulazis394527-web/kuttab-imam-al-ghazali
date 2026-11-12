import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { api, fileUrl } from '../../lib/api.js';
import { useTitle } from '../../lib/hooks.js';
import { date, schedule, initials, age as fmtAge } from '../../lib/format.js';
import { STATUS } from '../../../shared/constants.js';
import { PageLoader, Alert, Button } from '../../components/ui.jsx';

function Toolbar({ id }) {
  return (
    <div className="row between no-print" style={{ maxWidth: 794, margin: '0 auto 18px' }}>
      <Link to={`/portal/pendaftaran/${id}`} className="btn btn-outline btn-sm"><ArrowLeft size={15} /> Kembali</Link>
      <Button size="sm" onClick={() => window.print()}><Printer size={15} /> Cetak / Simpan PDF</Button>
    </div>
  );
}

function useCard(id) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api.get(`/portal/applications/${id}/card`).then(setD).catch(setErr); }, [id]);
  return { d, err };
}

export function PrintCard() {
  const { id } = useParams();
  const { d, err } = useCard(id);
  useTitle('Kartu Peserta');
  if (err) return <Alert tone="danger">{err.message}</Alert>;
  if (!d) return <PageLoader />;
  const a = d.application;
  return (
    <>
      <Toolbar id={id} />
      <div className="idcard printable">
        <div className="idcard-head pattern-bg">
          <img src="/brand/emblem.png" alt="" />
          <div className="t"><b>KUTTAB IMAM AL-GHAZALI</b><span>PENERIMAAN SANTRI BARU</span></div>
          <div className="label">Kartu Peserta<b>TA {a.academic_year}</b></div>
        </div>
        <div className="idcard-body">
          <div className="photo">{d.photo_id ? <img src={fileUrl('document', d.photo_id)} alt="Pas foto" /> : initials(a.full_name)}</div>
          <div>
            <div className="small muted">Nomor Pendaftaran</div>
            <div className="reg">{a.reg_number}</div>
            <dl className="kv" style={{ gridTemplateColumns: '120px 1fr', fontSize: 13.5 }}>
              <dt>Nama</dt><dd>{a.full_name}</dd>
              <dt>Panggilan</dt><dd>{a.nickname || '-'}</dd>
              <dt>Jenis Kelamin</dt><dd>{a.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</dd>
              <dt>TTL</dt><dd>{a.birth_place}, {date(a.birth_date)}</dd>
              <dt>Usia (1 Juli)</dt><dd>{fmtAge(a.age)}</dd>
              <dt>Jenjang</dt><dd>{a.program_name}</dd>
              <dt>Gelombang</dt><dd>{a.wave_name}</dd>
              <dt>Orang Tua</dt><dd>{a.father?.name} & {a.mother?.name}</dd>
              {a.observation_at && <><dt>Observasi</dt><dd>{schedule(a.observation_at)}<br /><span className="muted">{a.observation_place}</span></dd></>}
            </dl>
          </div>
          <div className="qr"><img src={d.qr} alt="QR verifikasi" /><div style={{ marginTop: 6 }}>Pindai untuk verifikasi keaslian kartu</div>
            <div className="badge tone-gold plain" style={{ marginTop: 10 }}>{STATUS[a.status]?.label}</div></div>
        </div>
        <div className="idcard-foot">
          <span>Bawa kartu ini saat observasi & wawancara.</span>
          <span>{d.school.address}{d.school.city ? `, ${d.school.city}` : ''} · {d.school.phone}</span>
        </div>
      </div>
    </>
  );
}

export function PrintLetter() {
  const { id } = useParams();
  const { d, err } = useCard(id);
  useTitle('Surat Keterangan Diterima');
  if (err) return <Alert tone="danger">{err.message}</Alert>;
  if (!d) return <PageLoader />;
  const a = d.application;
  if (!['accepted', 'reregistration', 'enrolled'].includes(a.status)) return <Alert tone="warning">Surat tersedia setelah ananda dinyatakan diterima.</Alert>;
  const decided = a.history.slice().reverse().find((h) => h.status === 'accepted')?.created_at;
  return (
    <>
      <Toolbar id={id} />
      <div className="letter printable">
        <div className="letter-head">
          <img src="/brand/logo-full.png" alt="Kuttab Imam Al-Ghazali" style={{ height: 76 }} />
          <div style={{ marginLeft: 'auto', textAlign: 'right' }} className="small muted">{d.school.address}<br />{d.school.city} · {d.school.phone}<br />{d.school.email}</div>
        </div>
        <h2>SURAT KETERANGAN DITERIMA</h2>
        <p className="center small muted" style={{ marginTop: -6 }}>Nomor: {a.reg_number}/PSB/{String(a.academic_year).replace('/', '-')}</p>
        <p className="arabic" style={{ textAlign: 'right', fontSize: 20 }}>السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ</p>
        <p>Dengan memohon rahmat Allah ﷻ, Panitia Penerimaan Santri Baru Kuttab Imam Al-Ghazali Tahun Ajaran {a.academic_year} menerangkan bahwa:</p>
        <dl className="kv" style={{ margin: '18px 0 18px 24px', gridTemplateColumns: '170px 1fr' }}>
          <dt>Nama</dt><dd>{a.full_name}</dd>
          <dt>Nomor Pendaftaran</dt><dd>{a.reg_number}</dd>
          <dt>Tempat, Tanggal Lahir</dt><dd>{a.birth_place}, {date(a.birth_date)}</dd>
          <dt>Nama Orang Tua</dt><dd>{a.father?.name} & {a.mother?.name}</dd>
          <dt>Jenjang</dt><dd>{a.program_name}</dd>
        </dl>
        <p>dinyatakan <b>DITERIMA</b> sebagai santri Kuttab Imam Al-Ghazali pada jenjang <b>{a.program_name}</b> Tahun Ajaran {a.academic_year}{a.status === 'enrolled' ? ', dan telah menyelesaikan proses daftar ulang.' : '. Orang tua/wali dimohon menyelesaikan daftar ulang sesuai ketentuan yang berlaku.'}</p>
        <p>Semoga Allah ﷻ menjadikan ananda insan Qur'ani yang mandiri dalam iman, amal shalih, dan pemikiran, serta menjalani kehidupan yang adil dan beradab. Aamiin.</p>
        <p className="arabic" style={{ textAlign: 'right', fontSize: 20 }}>وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ</p>
        <div className="row between" style={{ marginTop: 40, alignItems: 'flex-end' }}>
          <img src={d.qr} alt="QR verifikasi" style={{ width: 96 }} />
          <div className="center">
            <div>{d.school.city}, {date(decided)}</div>
            <div>Ketua Panitia PSB</div>
            <div style={{ height: 70 }} />
            <div style={{ borderTop: '1px solid var(--text)', paddingTop: 4, minWidth: 200 }}>(...................................)</div>
          </div>
        </div>
      </div>
    </>
  );
}
