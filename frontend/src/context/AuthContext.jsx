// context/AuthContext.jsx
// Holds the authenticated user + JWT token, exposes login/register/logout.

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from sessionStorage token and verify with backend
  useEffect(() => {
    const bootstrap = async () => {
      const token = sessionStorage.getItem('giveaway_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
      } catch (err) {
        sessionStorage.removeItem('giveaway_token');
        sessionStorage.removeItem('giveaway_user');
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('giveaway_token', data.data.token);
    setUser(data.data);
    return data.data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    sessionStorage.setItem('giveaway_token', data.data.token);
    setUser(data.data);
    return data.data;
  };

  const logout = () => {
    sessionStorage.removeItem('giveaway_token');
    sessionStorage.removeItem('giveaway_user');
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser((prev) => ({ ...prev, ...data.data.user }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
