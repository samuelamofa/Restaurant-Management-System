'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu as MenuIcon, Clock, Bell, Search, X, Lock, Unlock, AlertCircle, CheckCircle, ShoppingBag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import { io } from 'socket.io-client';

const CLEARED_NOTIFICATIONS_KEY = 'kds-cleared-notifications';

export default function KDSHeader({ onMenuClick, orderCounts, onSearchChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dayClosed, setDayClosed] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [daySummary, setDaySummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearedNotifications, setClearedNotifications] = useState(new Set());
  const clearedNotificationsRef = useRef(new Set());
  const notificationDropdownRef = useRef(null);
  const { user, token } = useAuthStore();
  const { settings } = useRestaurantSettings();
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const totalOrders = (orderCounts?.PENDING || 0) + (orderCounts?.CONFIRMED || 0) + (orderCounts?.PREPARING || 0);

  const socketRef = useRef(null);

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
      console.error('Failed to load cleared notifications:', error);
    }
  }, []);

  // Check day session status
  useEffect(() => {
    checkDayStatus();
    // Check every 30 seconds
    const interval = setInterval(checkDayStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Setup socket.io for real-time day status updates
  useEffect(() => {
    if (!user || !token) return;

    try {
      const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join:kitchen');
      });

      socket.on('day:closed', (data) => {
        setDayClosed(true);
        toast.info('Day has been closed', { duration: 5000 });
        checkDayStatus(); // Refresh status
      });

      socket.on('day:opened', (data) => {
        setDayClosed(false);
        toast.success('Day has been reopened', { duration: 5000 });
        checkDayStatus(); // Refresh status
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to setup socket for day status:', error);
    }
  }, [user, token]);

  const checkDayStatus = async () => {
    try {
      const response = await api.get('/day-session/status');
      setDayClosed(response.data.daySession?.isClosed || false);
    } catch (error) {
      console.error('Failed to check day status:', error);
    }
  };

  const handleCloseDay = async () => {
    if (!confirm('Are you sure you want to close the day? This will prevent new orders from being created.')) {
      return;
    }

    setClosingDay(true);
    try {
      // Get summary first
      const summaryRes = await api.get('/day-session/summary');
      setDaySummary(summaryRes.data.summary);

      // Close the day
      await api.post('/day-session/close');
      setDayClosed(true);
      toast.success('Day closed successfully');
    } catch (error) {
      console.error('Failed to close day:', error);
      toast.error(error.response?.data?.error || 'Failed to close day');
    } finally {
      setClosingDay(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch recent orders (will be filtered by status on client side)
      const response = await api.get('/orders?limit=20');
      const allOrders = response.data.orders || [];
      
      // Filter for PENDING and CONFIRMED orders only
      const relevantOrders = allOrders.filter(
        (order) => order.status === 'PENDING' || order.status === 'CONFIRMED'
      );
      
      const notificationList = [];
      
      relevantOrders.forEach((order) => {
        const timeDiff = new Date() - new Date(order.createdAt);
        const minutes = Math.floor(timeDiff / 60000);
        const isUrgent = minutes > 15;
        
        notificationList.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `New Order #${order.orderNumber}`,
          message: `${order.orderType.replace('_', ' ')} order - ${order.status}`,
          status: order.status,
          orderId: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          urgent: isUrgent,
        });
      });
      
      // Filter out cleared notifications
      const filteredNotifications = notificationList.filter(
        (n) => !clearedNotificationsRef.current.has(n.id)
      );
      
      // Sort by creation date (most recent first) and limit to 10
      filteredNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const limitedNotifications = filteredNotifications.slice(0, 10);
      
      setNotifications(limitedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchNotifications]);

  const clearNotification = (notificationId, e) => {
    e.stopPropagation();
    const newCleared = new Set(clearedNotificationsRef.current);
    newCleared.add(notificationId);
    
    setClearedNotifications(newCleared);
    clearedNotificationsRef.current = newCleared;
    
    try {
      localStorage.setItem(CLEARED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newCleared)));
    } catch (error) {
      console.error('Failed to save cleared notifications:', error);
    }
    
    setNotifications((current) => current.filter((n) => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    const allNotificationIds = notifications.map((n) => n.id);
    const newCleared = new Set([...clearedNotificationsRef.current, ...allNotificationIds]);
    
    setClearedNotifications(newCleared);
    clearedNotificationsRef.current = newCleared;
    
    try {
      localStorage.setItem(CLEARED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newCleared)));
    } catch (error) {
      console.error('Failed to save cleared notifications:', error);
    }
    
    setNotifications([]);
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
    <header className="sticky top-0 z-30 bg-secondary/95 backdrop-blur-lg border-b border-accent/20 shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Menu Button and Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2.5 hover:bg-accent/20 rounded-xl transition-colors"
            >
              <MenuIcon className="w-6 h-6 text-accent" />
            </button>

            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-accent truncate">Kitchen Display System</h2>
              <p className="text-sm text-text/60 hidden sm:block">{settings?.restaurantName || 'De Fusion Flame Kitchen'}</p>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50" />
              <input
                type="text"
                placeholder="Search by order number..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-12 pr-12 py-3 bg-primary border border-accent/20 rounded-xl focus:outline-none focus:border-accent text-text placeholder:text-text/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent/20 rounded-lg transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-text/70" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Time and Stats */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Day Status Indicator */}
            {dayClosed ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-danger/20 border border-danger/30 rounded-xl">
                <Lock className="w-4 h-4 text-danger" />
                <span className="text-danger font-semibold text-sm">Day Closed</span>
              </div>
            ) : (
              <button
                onClick={handleCloseDay}
                disabled={closingDay}
                className="flex items-center gap-2 px-3 py-2 bg-warning/20 hover:bg-warning/30 border border-warning/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Close Day"
              >
                {closingDay ? (
                  <>
                    <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-warning font-semibold text-sm">Closing...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-warning" />
                    <span className="text-warning font-semibold text-sm">Close Day</span>
                  </>
                )}
              </button>
            )}
            
            <div className="hidden sm:flex items-center gap-2 text-sm text-text/70 bg-secondary/50 px-4 py-2 rounded-xl">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{currentTime}</span>
            </div>
            {totalOrders > 0 && (
              <div className="px-4 py-2 bg-accent/20 rounded-xl border border-accent/30">
                <span className="text-accent font-bold text-sm">{totalOrders} active</span>
              </div>
            )}
            <div className="relative" ref={notificationDropdownRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2.5 hover:bg-accent/20 rounded-xl transition-colors"
              >
                <Bell className="w-6 h-6 text-text/70" />
                {(unreadCount > 0 || urgentCount > 0) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full animate-pulse"></span>
                )}
              </button>

              {isNotificationOpen && (
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
                        onClick={() => setIsNotificationOpen(false)}
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
                            className={`p-4 hover:bg-accent/10 transition-colors border-l-4 ${
                              notification.urgent 
                                ? 'border-l-danger bg-danger/5' 
                                : notification.status === 'COMPLETED' 
                                ? 'border-l-success bg-success/5'
                                : 'border-l-accent bg-accent/5'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {notification.status === 'COMPLETED' ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 text-accent" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="font-semibold text-text text-sm">{notification.title}</h4>
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
                                      <X className="w-3 h-3 text-text/70" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-text/70 text-sm mb-2">{notification.message}</p>
                                <div className="flex items-center justify-between">
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Day Closed Warning Banner */}
        {dayClosed && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-sm text-danger">
              <strong>Day is closed.</strong> No new orders can be created until the day is reopened by an administrator.
            </p>
          </div>
        )}

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-12 py-3 bg-primary border border-accent/20 rounded-xl focus:outline-none focus:border-accent text-text placeholder:text-text/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent/20 rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-text/70" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

