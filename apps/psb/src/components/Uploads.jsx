import { useRef, useState } from 'react';
import { Upload, FileText, Eye, Trash2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { DOC_TYPES } from '../../shared/constants.js';
import { api, fileUrl } from '../lib/api.js';
import { bytes } from '../lib/format.js';
import { Button, Badge, useToast, useConfirm } from './ui.jsx';

const DOC_STATUS = {
  pending: { tone: 'info', label: 'Menunggu verifikasi', icon: Clock },
  valid: { tone: 'success', label: 'Valid', icon: CheckCircle2 },
  invalid: { tone: 'danger', label: 'Perlu diganti', icon: AlertTriangle },
};
export const DocStatus = ({ status }) => { const s = DOC_STATUS[status]; return <Badge tone={s.tone}>{s.label}</Badge>; };

/** Satu baris unggah berkas dengan drag & drop. */
function DocRow({ type, doc, appId, editable, canDelete, onChange }) {
  const input = useRef();
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const canUpload = editable && (!doc || doc.status !== 'valid' || canDelete);

  const send = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Ukuran berkas maksimal 5 MB.');
    const fd = new FormData(); fd.append('file', file);
    setBusy(true);
    try { const docs = await api.post(`/portal/applications/${appId}/documents/${type.key}`, fd); onChange?.(docs); toast.success(`${type.label.split(' (')[0]} berhasil diunggah.`); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Hapus berkas?', message: `Berkas "${type.label}" akan dihapus.`, danger: true, confirmText: 'Hapus' }))) return;
    await api.del(`/portal/applications/${appId}/documents/${type.key}`);
    onChange?.(null, type.key);
  };
  const isImg = doc?.mime?.startsWith('image/');
  return (
    <div className={`file-row ${doc ? 'has' : ''} ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { if (canUpload) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (canUpload) send(e.dataTransfer.files[0]); }}>
      <div className="thumb">{doc && isImg ? <img src={fileUrl('document', doc.id) + `?v=${doc.uploaded_at}`} alt="" /> : <FileText size={22} />}</div>
      <div className="info">
        <b>{type.label}{type.required && <span style={{ color: 'var(--danger)' }}> *</span>}</b>
        {doc ? (
          <div className="row wrap small" style={{ gap: 8, marginTop: 4 }}>
            <DocStatus status={doc.status} /><span className="muted">{doc.original_name} · {bytes(doc.size || 0)}</span>
          </div>
        ) : <span className="small muted">Seret berkas ke sini atau klik Unggah · JPG/PNG/PDF maks. 5 MB</span>}
        {doc?.status === 'invalid' && doc.note && <div className="small" style={{ color: 'var(--danger)', marginTop: 4 }}>Catatan panitia: {doc.note}</div>}
      </div>
      <div className="row" style={{ gap: 6 }}>
        {doc && <a className="icon-btn" href={fileUrl('document', doc.id)} target="_blank" rel="noreferrer" title="Lihat" aria-label="Lihat berkas"><Eye size={16} /></a>}
        {doc && canDelete && <button className="icon-btn" onClick={remove} title="Hapus" aria-label="Hapus berkas"><Trash2 size={16} /></button>}
        {canUpload && (
          <>
            <input ref={input} type="file" hidden accept={type.accept === 'image' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} onChange={(e) => send(e.target.files[0])} />
            <Button type="button" size="sm" variant={doc ? 'outline' : 'dark'} loading={busy} onClick={() => input.current.click()}><Upload size={15} />{doc ? 'Ganti' : 'Unggah'}</Button>
          </>
        )}
      </div>
    </div>
  );
}

export function DocumentUploader({ app, onDocs, editable = true, canDelete = false }) {
  const docs = app.documents || [];
  const update = (list, removedKey) => {
    if (list) onDocs(list);
    else onDocs(docs.filter((d) => d.type !== removedKey));
  };
  return (
    <div className="stack">
      {DOC_TYPES.map((t) => (
        <DocRow key={t.key} type={t} doc={docs.find((d) => d.type === t.key)} appId={app.id} editable={editable} canDelete={canDelete} onChange={update} />
      ))}
    </div>
  );
}
