import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, Bell, LogOut, Globe } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { useAuth } from '../lib/auth.jsx';
import { initials } from '../lib/format.js';
import { ROLES } from '../../shared/constants.js';

/** Kerangka dasbor (portal orang tua & admin). nav: [{group} | {to, label, icon, count, end}] */
export default function AppShell({ nav, home, notifTo }) {
  const [open, setOpen] = useState(false);
  const { user, logout, unread } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const doLogout = async () => { await logout(); navigate('/masuk'); };
  return (
    <div className="app-shell">
      <div className={`side-back ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand to={home} />
        <nav className="side-nav">
          {nav.map((n, i) => n.group ? <div className="group" key={i}>{n.group}</div> : (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <n.icon size={18} />{n.label}{n.count ? <span className="count">{n.count}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar">{initials(user?.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="n" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div className="r">{ROLES[user?.role]}</div>
          </div>
          <button className="icon-btn" style={{ background: 'transparent', borderColor: '#2b261c', color: '#9c927a' }} onClick={doLogout} title="Keluar" aria-label="Keluar"><LogOut size={16} /></button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar no-print">
          <div className="row">
            <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu size={18} /></button>
            <span className="small muted hide-sm">Penerimaan Santri Baru · Kuttab Imam Al-Ghazali</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/" className="btn btn-ghost btn-sm hide-sm"><Globe size={16} /> Situs</Link>
            {notifTo && <Link to={notifTo} className="icon-btn bell" aria-label="Notifikasi"><Bell size={18} />{unread > 0 && <span className="dot" />}</Link>}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, crumbs, actions }) {
  return (
    <div className="page-title">
      <div>
        {crumbs && <div className="crumbs">{crumbs.map((c, i) => <span key={i} className="row" style={{ gap: 6 }}>{i > 0 && '/'}{c.to ? <Link to={c.to}>{c.label}</Link> : c.label}</span>)}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}
