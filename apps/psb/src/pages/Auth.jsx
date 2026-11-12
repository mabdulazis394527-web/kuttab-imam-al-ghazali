import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth, isStaff } from '../lib/auth.jsx';
import { useTitle } from '../lib/hooks.js';
import { Field, Input, Button, useForm, useToast, PageLoader } from '../components/ui.jsx';
import { Brand } from '../components/Brand.jsx';

function AuthLayout({ children, quote }) {
  return (
    <div className="auth">
      <div className="auth-side pattern-bg">
        <Brand />
        <div>
          <img className="big" src="/brand/emblem.png" alt="" />
          <blockquote>{quote}</blockquote>
          <div className="small mt" style={{ color: 'var(--gold)', letterSpacing: '.2em' }}>— IMAM AL-GHAZALI</div>
        </div>
        <div className="small" style={{ color: '#7d745f' }}>Penerimaan Santri Baru · Kuttab Imam Al-Ghazali</div>
      </div>
      <div className="auth-main">
        <div className="auth-card fade-up">
          <Link to="/" className="small muted row" style={{ gap: 6, marginBottom: 26 }}><ArrowLeft size={15} /> Kembali ke beranda</Link>
          {children}
        </div>
      </div>
    </div>
  );
}

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Input type={show ? 'text' : 'password'} {...props} style={{ paddingRight: 44 }} />
      <button type="button" onClick={() => setShow(!show)} className="btn-ghost" style={{ position: 'absolute', right: 6, top: 6, border: 0, background: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 6 }} aria-label="Tampilkan kata sandi">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const redirectFor = (u, from) => from || (isStaff(u) ? '/admin' : '/portal');

export function Login() {
  useTitle('Masuk');
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const f = useForm({ email: '', password: '' });
  if (user === undefined) return <PageLoader />;
  if (user) return <Navigate to={redirectFor(user, loc.state?.from)} replace />;
  const go = f.submit(async (v) => {
    const u = await login(v.email, v.password);
    toast.success(`Assalamu'alaikum, ${u.name}!`);
    nav(redirectFor(u, loc.state?.from), { replace: true });
  });
  return (
    <AuthLayout quote="“Ilmu tanpa amal adalah kegilaan, dan amal tanpa ilmu tidak akan terwujud.” (Ayyuhal Walad)">
      <h1>Masuk</h1>
      <p className="muted">Masuk ke portal orang tua atau panel panitia.</p>
      <form className="stack mt" style={{ gap: 16 }} onSubmit={go}>
        <Field label="Email" error={f.errors.email}><Input type="email" autoComplete="email" {...f.bind('email')} placeholder="nama@email.com" autoFocus /></Field>
        <Field label="Kata Sandi" error={f.errors.password}><PasswordInput autoComplete="current-password" {...f.bind('password')} /></Field>
        <Button size="lg" block loading={f.busy}>Masuk</Button>
      </form>
      <p className="center mt2 small">Belum punya akun? <Link to="/daftar" style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>Daftar sebagai orang tua</Link></p>
    </AuthLayout>
  );
}

export function Register() {
  useTitle('Buat Akun');
  const { user, register } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const f = useForm({ name: '', email: '', phone: '', password: '', confirm: '' });
  if (user === undefined) return <PageLoader />;
  if (user) return <Navigate to={redirectFor(user)} replace />;
  const go = f.submit(async (v) => {
    if (v.password !== v.confirm) { f.setErrors({ confirm: 'Konfirmasi kata sandi tidak sama' }); return; }
    await register({ name: v.name, email: v.email, phone: v.phone, password: v.password });
    toast.success('Akun berhasil dibuat. Ahlan wa sahlan!');
    nav('/portal?baru=1', { replace: true });
  });
  return (
    <AuthLayout quote="“Wahai anakku, nasihat itu mudah; yang sulit adalah menerimanya.” (Ayyuhal Walad)">
      <h1>Buat Akun Orang Tua</h1>
      <p className="muted">Satu akun dapat digunakan untuk mendaftarkan lebih dari satu ananda.</p>
      <form className="stack mt" style={{ gap: 14 }} onSubmit={go}>
        <Field label="Nama Lengkap Orang Tua/Wali" required error={f.errors.name}><Input autoComplete="name" {...f.bind('name')} placeholder="Nama sesuai KTP" /></Field>
        <Field label="Email" required error={f.errors.email}><Input type="email" autoComplete="email" {...f.bind('email')} placeholder="nama@email.com" /></Field>
        <Field label="Nomor WhatsApp" required error={f.errors.phone} hint="Informasi seleksi akan dikirim ke nomor ini"><Input inputMode="tel" autoComplete="tel" {...f.bind('phone')} placeholder="08xxxxxxxxxx" /></Field>
        <div className="grid g2" style={{ gap: 14 }}>
          <Field label="Kata Sandi" required error={f.errors.password} hint="Minimal 8 karakter"><PasswordInput autoComplete="new-password" {...f.bind('password')} /></Field>
          <Field label="Ulangi Kata Sandi" required error={f.errors.confirm}><PasswordInput autoComplete="new-password" {...f.bind('confirm')} /></Field>
        </div>
        <Button size="lg" block loading={f.busy}>Buat Akun</Button>
      </form>
      <p className="center mt2 small">Sudah punya akun? <Link to="/masuk" style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>Masuk</Link></p>
    </AuthLayout>
  );
}
