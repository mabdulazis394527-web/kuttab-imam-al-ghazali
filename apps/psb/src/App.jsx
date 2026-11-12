import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarClock, Layers, CalendarRange, Megaphone, HelpCircle, MessageSquare, Settings as Cog, UserCog, ScrollText, Home, Bell, UserRound } from 'lucide-react';
import { useAuth, isStaff } from './lib/auth.jsx';
import { PageLoader } from './components/ui.jsx';
import AppShell from './layouts/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register } from './pages/Auth.jsx';
import { StatusCheck, VerifyCard } from './pages/StatusCheck.jsx';
import NotFound from './pages/NotFound.jsx';
import { PortalHome, Notifications, Profile } from './pages/portal/Portal.jsx';
import Wizard from './pages/portal/Wizard.jsx';
import Detail from './pages/portal/Detail.jsx';
import { PrintCard, PrintLetter } from './pages/portal/Print.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Applicants from './pages/admin/Applicants.jsx';
import ApplicantDetail from './pages/admin/ApplicantDetail.jsx';
import { Waves, Programs, Announcements, Faqs, Schedule, Inquiries, Audit } from './pages/admin/Master.jsx';
import { Settings, UsersPage } from './pages/admin/Settings.jsx';

function Guard({ staff, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <PageLoader />;
  if (!user) return <Navigate to="/masuk" replace state={{ from: loc.pathname }} />;
  if (staff && !isStaff(user)) return <Navigate to="/portal" replace />;
  if (!staff && isStaff(user)) return <Navigate to="/admin" replace />;
  return children;
}

const PORTAL_NAV = [
  { to: '/portal', label: 'Beranda', icon: Home, end: true },
  { to: '/portal/notifikasi', label: 'Notifikasi', icon: Bell },
  { to: '/portal/profil', label: 'Profil Akun', icon: UserRound },
];

function adminNav(role) {
  return [
    { group: 'Utama' },
    { to: '/admin', label: 'Dasbor', icon: LayoutDashboard, end: true },
    { to: '/admin/pendaftar', label: 'Pendaftar', icon: Users },
    { to: '/admin/jadwal', label: 'Jadwal Observasi', icon: CalendarClock },
    { to: '/admin/pesan', label: 'Pesan Masuk', icon: MessageSquare },
    { group: 'Konten & Master' },
    { to: '/admin/gelombang', label: 'Gelombang', icon: CalendarRange },
    { to: '/admin/jenjang', label: 'Jenjang', icon: Layers },
    { to: '/admin/pengumuman', label: 'Pengumuman', icon: Megaphone },
    { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
    { group: 'Sistem' },
    { to: '/admin/pengaturan', label: 'Pengaturan', icon: Cog },
    ...(role === 'admin' ? [{ to: '/admin/pengguna', label: 'Pengguna', icon: UserCog }, { to: '/admin/audit', label: 'Log Audit', icon: ScrollText }] : []),
  ];
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/masuk" element={<Login />} />
      <Route path="/daftar" element={<Register />} />
      <Route path="/cek-status" element={<StatusCheck />} />
      <Route path="/verifikasi/:reg" element={<VerifyCard />} />

      <Route path="/portal" element={<Guard><AppShell nav={PORTAL_NAV} home="/portal" notifTo="/portal/notifikasi" /></Guard>}>
        <Route index element={<PortalHome />} />
        <Route path="notifikasi" element={<Notifications />} />
        <Route path="profil" element={<Profile />} />
        <Route path="pendaftaran/:id" element={<Detail />} />
        <Route path="pendaftaran/:id/formulir" element={<Wizard />} />
        <Route path="pendaftaran/:id/kartu" element={<PrintCard />} />
        <Route path="pendaftaran/:id/surat" element={<PrintLetter />} />
      </Route>

      <Route path="/admin" element={<Guard staff><AppShell nav={adminNav(user?.role)} home="/admin" /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="pendaftar" element={<Applicants />} />
        <Route path="pendaftar/:id" element={<ApplicantDetail />} />
        <Route path="jadwal" element={<Schedule />} />
        <Route path="pesan" element={<Inquiries />} />
        <Route path="gelombang" element={<Waves />} />
        <Route path="jenjang" element={<Programs />} />
        <Route path="pengumuman" element={<Announcements />} />
        <Route path="faq" element={<Faqs />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="pengguna" element={<UsersPage />} />
        <Route path="audit" element={<Audit />} />
        <Route path="profil" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
