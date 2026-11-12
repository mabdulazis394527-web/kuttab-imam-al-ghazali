import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS } from '../../shared/constants.js';
import { initials } from '../lib/format.js';
import { fileUrl } from '../lib/api.js';

/* ---------- Toast ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random();
    setItems((x) => [...x, { id, message, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  const api = useCallback(Object.assign((m, t) => push(m, t), {
    success: (m) => push(m, 'success'), error: (m) => push(m, 'error'), info: (m) => push(m, 'info'),
  }), [push]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={18} color="#59b07c" /> : t.type === 'error' ? <AlertCircle size={18} color="#e2685e" /> : <Info size={18} color="#d9b64f" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Form ---------- */
export function Field({ label, required, hint, error, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
export const Input = ({ invalid, className = '', ...p }) => <input className={`input ${invalid ? 'invalid' : ''} ${className}`} {...p} />;
export const Textarea = ({ invalid, className = '', ...p }) => <textarea className={`textarea ${invalid ? 'invalid' : ''} ${className}`} {...p} />;
export function Select({ invalid, options = [], placeholder, className = '', ...p }) {
  return (
    <select className={`select ${invalid ? 'invalid' : ''} ${className}`} {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function Button({ loading, children, variant = 'gold', size, block, className = '', ...p }) {
  return (
    <button className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${block ? 'btn-block' : ''} ${className}`} disabled={loading || p.disabled} {...p}>
      {loading && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
      {children}
    </button>
  );
}

/* ---------- Tampilan ---------- */
export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: 'muted' };
  return <span className={`badge tone-${s.tone}`}>{s.label}</span>;
}
export const Badge = ({ tone = 'muted', children, plain }) => <span className={`badge tone-${tone} ${plain ? 'plain' : ''}`}>{children}</span>;

export function Alert({ tone = 'info', children, icon }) {
  const Ic = icon || (tone === 'success' ? CheckCircle2 : tone === 'danger' || tone === 'warning' ? AlertCircle : Info);
  return <div className={`alert tone-${tone}`}><Ic size={18} /><div style={{ flex: 1 }}>{children}</div></div>;
}

export const Spinner = () => <div className="spinner" />;
export const PageLoader = () => <div className="page-loader"><Spinner /></div>;

export function Empty({ icon: Ic = Inbox, title = 'Belum ada data', children }) {
  return <div className="empty"><Ic size={38} /><div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>{children && <div className="small mt">{children}</div>}</div>;
}

export function Avatar({ name, photoId, size }) {
  return <div className={`avatar ${size || ''}`}>{photoId ? <img src={fileUrl('document', photoId)} alt={name} loading="lazy" /> : initials(name)}</div>;
}

export function Progress({ value }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, value)}%` }} /></div>;
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

const ConfirmCtx = createContext(null);
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title || 'Konfirmasi'}
        footer={<><Button variant="outline" onClick={() => close(false)}>Batal</Button>
          <Button variant={state?.danger ? 'danger' : 'gold'} onClick={() => close(true)}>{state?.confirmText || 'Ya, lanjutkan'}</Button></>}>
        <p style={{ margin: 0 }}>{state?.message}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

/* ---------- Pagination ---------- */
export function Pagination({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  return (
    <div className="row between" style={{ padding: '14px 18px', borderTop: '1px solid var(--line)' }}>
      <span className="small muted">Menampilkan {(page - 1) * size + 1}–{Math.min(page * size, total)} dari {total}</span>
      <div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
        <span className="small" style={{ minWidth: 60, textAlign: 'center' }}>{page} / {pages}</span>
        <button className="icon-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Berikutnya"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/** Hook kecil untuk form: nilai, error per-field, dan submit dengan penanganan error API. */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => { setValues((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const bind = (k) => ({ value: values[k] ?? '', onChange: (e) => set(k, e.target.value), invalid: !!errors[k] });
  const submit = (fn) => async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try { return await fn(values); }
    catch (err) { setErrors(err.fields || {}); toast.error(err.message); }
    finally { setBusy(false); }
  };
  return { values, setValues, set, bind, errors, setErrors, busy, submit };
}
