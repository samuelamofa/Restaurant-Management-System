import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

api.interceptors.request.use(
  (config) => {
    // Get token from Zustand persisted storage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('kds-auth-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          const token = parsed?.state?.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Error reading token from storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear Zustand persisted storage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('kds-auth-storage');
          // Also clear any legacy storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch (e) {
          console.error('Error clearing storage:', e);
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

