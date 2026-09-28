import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem('facefind-user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem('facefind-user');
      }
    }
    setLoading(false);
  }, []);

  const persist = (token, userData) => {
    window.localStorage.setItem('facefind-token', token);
    window.localStorage.setItem('facefind-user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (payload) => {
    const data = await api.login(payload);
    persist(data.token, data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    persist(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    window.localStorage.removeItem('facefind-token');
    window.localStorage.removeItem('facefind-user');
    setUser(null);
  };

  // Used by the Google OAuth callback page, which already has a valid
  // token + user details handed back by the backend after it verified the
  // Google sign-in — no extra API call needed here.
  const setSession = (token, userData) => {
    persist(token, userData);
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem('facefind-user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setSession, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
