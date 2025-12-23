import { useState, useEffect } from 'react';
import api from './api';

export function useRestaurantSettings() {
  const [settings, setSettings] = useState({
    restaurantName: 'De Fusion Flame',
    restaurantAddress: null,
    restaurantPhone: null,
    restaurantEmail: null,
    currency: 'GHS',
    currencySymbol: '₵',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data?.settings) {
          setSettings(response.data.settings);
        }
      } catch (error) {
        console.error('Failed to fetch restaurant settings:', error);
        // Keep default settings on error
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // Listen for settings updates via custom event
    const handleSettingsUpdate = (event) => {
      if (event.detail?.settings) {
        setSettings(event.detail.settings);
      }
    };

    // Listen for localStorage changes (cross-tab communication)
    const handleStorageChange = (e) => {
      if (e.key === 'restaurantSettings' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          setSettings(newSettings);
        } catch (error) {
          console.error('Failed to parse settings from localStorage:', error);
        }
      }
    };

    // Only access window/localStorage on client side
    if (typeof window !== 'undefined') {
      window.addEventListener('settingsUpdated', handleSettingsUpdate);
      window.addEventListener('storage', handleStorageChange);
      
      // Check localStorage on mount and periodically
      const checkLocalStorage = () => {
        try {
          const stored = localStorage.getItem('restaurantSettings');
          if (stored) {
            const parsed = JSON.parse(stored);
            setSettings(parsed);
          }
        } catch (error) {
          console.error('Failed to read settings from localStorage:', error);
        }
      };
      
      checkLocalStorage();
      
      // Refresh every 60 seconds as fallback
      const interval = setInterval(() => {
        fetchSettings();
        checkLocalStorage();
      }, 60000);
      
      return () => {
        window.removeEventListener('settingsUpdated', handleSettingsUpdate);
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
    
    // If window is not available, just return a cleanup function
    return () => {};
  }, []);

  return { settings, loading };
}

