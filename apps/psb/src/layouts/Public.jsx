import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { useAuth, isStaff } from '../lib/auth.jsx';

const LINKS = [
  ['#tentang', 'Tentang'], ['#visi', 'Visi'], ['#ciri-khas', 'Ciri Khas'], ['#jenjang', 'Jenjang'],
  ['#alur', 'Alur'], ['#biaya', 'Biaya'], ['#faq', 'FAQ'], ['#kontak', 'Kontak'],
];

export function PublicNav({ forceSolid }) {
  const [solid, setSolid] = useState(!!forceSolid);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const home = pathname === '/';
  useEffect(() => {
    if (forceSolid) return;
    const f = () => setSolid(window.scrollY > 40);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [forceSolid]);
  const dash = user ? (isStaff(user) ? '/admin' : '/portal') : null;
  return (
    <header className={`nav ${solid || open ? 'solid' : ''}`}>
      <div className="container">
        <Brand />
        <nav className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {LINKS.map(([h, l]) => (home ? <a key={h} href={h}>{l}</a> : <Link key={h} to={'/' + h}>{l}</Link>))}
          <Link to="/cek-status">Cek Status</Link>
          {!user && <Link to="/masuk" className="mobile-only">Masuk</Link>}
        </nav>
        <div className="nav-actions">
          {dash ? <Link to={dash} className="btn btn-gold btn-sm">Dasbor</Link> : (
            <>
              <Link to="/masuk" className="btn btn-ghost-light btn-sm">Masuk</Link>
              <Link to="/daftar" className="btn btn-gold btn-sm">Daftar</Link>
            </>
          )}
          <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ settings = {} }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="cols">
          <div>
            <Brand />
            <p className="mt" style={{ maxWidth: 380 }}>{settings.vision}</p>
          </div>
          <div>
            <h5>Tautan</h5>
            <a href="/#tentang">Apa itu Kuttab</a><a href="/#jenjang">Jenjang Pendidikan</a><a href="/#alur">Alur Pendaftaran</a>
            <Link to="/cek-status">Cek Status Pendaftaran</Link><Link to="/daftar">Buat Akun Orang Tua</Link>
          </div>
          <div>
            <h5>Hubungi Kami</h5>
            {settings.address && <p className="row" style={{ alignItems: 'flex-start', margin: '0 0 8px' }}><MapPin size={15} style={{ marginTop: 4, flex: 'none' }} />{settings.address}, {settings.city}</p>}
            {settings.phone && <p className="row" style={{ margin: '0 0 8px' }}><Phone size={15} />{settings.phone}</p>}
            {settings.email && <p className="row" style={{ margin: '0 0 8px' }}><Mail size={15} />{settings.email}</p>}
            {settings.office_hours && <p className="row" style={{ margin: 0 }}><Clock size={15} />{settings.office_hours}</p>}
          </div>
        </div>
        <div className="bottom">
          <span>© {year} {settings.school_name || 'Kuttab Imam Al-Ghazali'}. Seluruh hak dilindungi.</span>
          <span className="arabic" style={{ color: 'var(--gold)' }}>العِلْمُ بِلَا عَمَلٍ جُنُونٌ</span>
        </div>
      </div>
    </footer>
  );
}
