import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { one } from './db.js';

const COOKIE = 'psb_token';

export function issueToken(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 7 * 24 * 3600 * 1000, path: '/',
  });
  return token;
}
export function clearToken(res) { res.clearCookie(COOKIE, { path: '/' }); }

export async function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE] || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token) {
    let p = null;
    try { p = jwt.verify(token, config.jwtSecret); } catch { /* token tidak valid: abaikan */ }
    if (p) {
      try {
        const u = await one('SELECT id,name,email,phone,role,active FROM users WHERE id=?', p.sub);
        if (u && u.active) req.user = u;
      } catch (e) { return next(e); }
    }
  }
  next();
}

export const requireAuth = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Anda tidak memiliki akses.' });
  next();
};
