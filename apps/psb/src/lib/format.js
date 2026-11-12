export { formatRupiah as rupiah } from '../../shared/constants.js';

const D = (v) => (v ? new Date(String(v).includes('T') || String(v).length <= 10 ? v : String(v).replace(' ', 'T') + 'Z') : null);
const localD = (v) => (v ? new Date(String(v).replace(' ', 'T')) : null); // untuk nilai lokal (jadwal)

export const date = (v, opt = { day: 'numeric', month: 'long', year: 'numeric' }) => (v ? D(v).toLocaleDateString('id-ID', opt) : '-');
export const dateShort = (v) => date(v, { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTime = (v) => (v ? D(v).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const schedule = (v) => (v ? localD(v).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const scheduleDay = (v) => (v ? localD(v).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-');
export const time = (v) => (v ? localD(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-');
export const ago = (v) => {
  if (!v) return '';
  const s = (Date.now() - D(v).getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return dateShort(v);
};
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
export const bytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
export const waLink = (phone, text = '') => {
  const p = String(phone || '').replace(/\D/g, '').replace(/^0/, '62');
  return `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
export const age = (a) => (a ? `${a.years} th ${a.months} bln` : '-');
