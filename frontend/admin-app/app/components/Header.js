'use client';

import { Menu as MenuIcon, Bell, Search, X, ShoppingBag, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const CLEARED_NOTIFICATIONS_KEY = 'admin-cleared-notifications';

export default function Header({ onMenuClick }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearedNotifications, setClearedNotifications] = useState(new Set());
  const clearedNotificationsRef = useRef(new Set());
  const dropdownRef = useRef(null);
  const router = useRouter();
  const { token } = useAuthStore();

  // Load cleared notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLEARED_NOTIFICATIONS_KEY);
      if (stored) {
        const clearedIds = JSON.parse(stored);
        const clearedSet = new Set(clearedIds);
        setClearedNotifications(clearedSet);
        clearedNotificationsRef.current = clearedSet;
      }
    } catch (error) {
      // Silently fail - cleared notifications will default to empty
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    // Only fetch if authenticated
    if (!token) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get('/admin/notifications');
      const allNotifications = response.data.notifications || [];
      
      // Filter out cleared notifications using ref for synchronous access
      const filteredNotifications = allNotifications.filter(
        (n) => !clearedNotificationsRef.current.has(n.id)
      );
      setNotifications(filteredNotifications);
      } catch (error) {
        // Silently fail - notifications are non-critical background updates
        // 401 errors are handled by the API interceptor
      } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Only fetch notifications if authenticated
    if (!token) {
      return;
    }
    
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearNotification = (notificationId, e) => {
    e.stopPropagation(); // Prevent triggering the notification click
    const newCleared = new Set(clearedNotificationsRef.current);
    newCleared.add(notificationId);
    
    // Update both state and ref
    setClearedNotifications(newCleared);
    clearedNotificationsRef.current = newCleared;
    
    // Save to localStorage
      try {
        localStorage.setItem(CLEARED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newCleared)));
      } catch (error) {
        // Silently fail if localStorage is unavailable
      }
      
      // Remove from current notifications immediately
    setNotifications((current) => current.filter((n) => n.id !== notificationId));
    toast.success('Notification cleared');
  };

  const clearAllNotifications = () => {
    const allNotificationIds = notifications.map((n) => n.id);
    const newCleared = new Set([...clearedNotificationsRef.current, ...allNotificationIds]);
    
    // Update both state and ref
    setClearedNotifications(newCleared);
    clearedNotificationsRef.current = newCleared;
    
    // Save to localStorage
      try {
        localStorage.setItem(CLEARED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newCleared)));
      } catch (error) {
        // Silently fail if localStorage is unavailable
      }
      
      // Clear current notifications immediately
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === 'order' || notification.orderId) {
      router.push(`/orders`);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type, status) => {
    if (type === 'success' || status === 'COMPLETED') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (status === 'PENDING' || status === 'CONFIRMED') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <ShoppingBag className="w-4 h-4 text-accent" />;
  };

  const getNotificationColor = (urgent, status) => {
    if (urgent) return 'border-l-danger bg-danger/5';
    if (status === 'COMPLETED') return 'border-l-success bg-success/5';
    return 'border-l-accent bg-accent/5';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.urgent).length;

  return (
    <header className="sticky top-0 z-30 bg-secondary/80 backdrop-blur-lg border-b border-accent/20">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-accent/20 rounded-lg transition-colors"
        >
          <MenuIcon className="w-6 h-6 text-accent" />
        </button>

        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-primary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-text"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative p-2 hover:bg-accent/20 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-text/70" />
              {(unreadCount > 0 || urgentCount > 0) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full animate-pulse"></span>
              )}
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-secondary border border-accent/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-accent/20 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-accent">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="px-2 py-1 bg-danger/20 text-danger rounded-full text-xs font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="px-2 py-1 text-xs text-text/70 hover:text-text hover:bg-accent/20 rounded transition-colors"
                        title="Clear all notifications"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-accent/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-text/70" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-text/60">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-12 h-12 text-text/30 mx-auto mb-3" />
                      <p className="text-text/60 text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-accent/10">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-accent/10 transition-colors border-l-4 ${getNotificationColor(notification.urgent, notification.status)} ${
                            notification.urgent ? 'bg-danger/10' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type, notification.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 
                                  className="font-semibold text-text text-sm cursor-pointer"
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  {notification.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  {notification.urgent && (
                                    <span className="px-2 py-0.5 bg-danger/20 text-danger rounded text-xs font-bold whitespace-nowrap">
                                      URGENT
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => clearNotification(notification.id, e)}
                                    className="p-1 hover:bg-accent/20 rounded transition-colors opacity-60 hover:opacity-100"
                                    title="Clear notification"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-text/70" />
                                  </button>
                                </div>
                              </div>
                              <p 
                                className="text-text/70 text-sm mb-2 cursor-pointer"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                {notification.message}
                              </p>
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <span className="text-xs text-text/50">{formatTime(notification.createdAt)}</span>
                                {notification.orderNumber && (
                                  <span className="text-xs text-accent font-medium">#{notification.orderNumber}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-3 border-t border-accent/20 bg-primary/50">
                    <button
                      onClick={() => {
                        router.push('/orders');
                        setIsOpen(false);
                      }}
                      className="w-full text-center text-sm text-accent hover:text-accent-light font-medium transition-colors"
                    >
                      View All Orders
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

