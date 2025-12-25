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
        console.error('Error reading token from store:', error);
      }
    }
    
    // Fallback to reading from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pos-auth-storage');
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
          localStorage.removeItem('pos-auth-storage');
          // Also clear any legacy storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch (e) {
          console.error('Error clearing storage:', e);
        }
        // Use router instead of window.location to avoid full page reload
        // The component will handle the redirect
      }
    }
    return Promise.reject(error);
  }
);

export default api;

