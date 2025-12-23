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
        const stored = localStorage.getItem('admin-auth-storage');
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
    // Log error details in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
      });
    }

    if (error.response?.status === 401) {
      // Clear Zustand persisted storage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('admin-auth-storage');
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

