import { Link } from 'react-router-dom';
import { PublicNav } from '../layouts/Public.jsx';

export default function NotFound() {
  return (
    <>
      <PublicNav forceSolid />
      <section className="hero pattern-bg" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div className="container">
          <img src="/brand/emblem.png" alt="" style={{ width: 90, margin: '0 auto 20px', opacity: 0.9 }} />
          <h1 style={{ margin: '0 0 10px' }}>404</h1>
          <p className="lead" style={{ margin: '0 auto 26px' }}>Halaman yang Anda cari tidak ditemukan.</p>
          <Link to="/" className="btn btn-gold">Kembali ke Beranda</Link>
        </div>
      </section>
    </>
  );
}
