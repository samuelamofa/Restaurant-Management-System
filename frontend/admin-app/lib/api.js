import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Store reference to get token from Zustand store
let getTokenFromStore = null;

// Function to set the token getter (called from components)
export const setTokenGetter = (getter) => {
  getTokenFromStore = getter;
};

api.interceptors.request.use(
  (config) => {
    // Try to get token from Zustand store first (more reliable)
    if (typeof window !== 'undefined' && getTokenFromStore) {
      try {
        const token = getTokenFromStore();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        }
      } catch (error) {
        // Silently fail and fall back to localStorage
      }
    }
    
    // Fallback to reading from localStorage
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
        // Silently fail if localStorage read fails
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('admin-auth-storage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch (e) {
          // Silently fail if localStorage is unavailable
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

