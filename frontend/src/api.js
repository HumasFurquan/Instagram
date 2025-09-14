// src/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach token automatically to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, err => Promise.reject(err));

// Optional: global 401 handler — auto-logout / reload so UI returns to login
api.interceptors.response.use(
  resp => resp,
  err => {
    if (err?.response?.status === 401) {
      // token expired / invalid — clear local auth and reload to show login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // small delay so devtools shows error before reload
      setTimeout(() => window.location.reload(), 150);
    }
    return Promise.reject(err);
  }
);

export default api;
