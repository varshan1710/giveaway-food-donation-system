// services/api.js
// Centralized Axios instance. Attaches JWT to every request and
// redirects to /login on 401 responses.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('[api.js] VITE_API_URL is not set. Create frontend/.env and add: VITE_API_URL=https://your-backend.onrender.com/api');
}

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('giveaway_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('giveaway_token');
      sessionStorage.removeItem('giveaway_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
