import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = memuat
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try { const r = await api.get('/auth/me'); setUser(r.user); setUnread(r.unread || 0); }
    catch { setUser(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => { const r = await api.post('/auth/login', { email, password }); setUser(r.user); refresh(); return r.user; };
  const register = async (data) => { const r = await api.post('/auth/register', data); setUser(r.user); refresh(); return r.user; };
  const logout = async () => { await api.post('/auth/logout'); setUser(null); };

  return <AuthCtx.Provider value={{ user, setUser, unread, setUnread, refresh, login, register, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
export const isStaff = (u) => u && ['admin', 'panitia'].includes(u.role);
