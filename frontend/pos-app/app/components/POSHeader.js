'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu as MenuIcon, Clock, Lock, Unlock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';

export default function POSHeader({ onMenuClick, cartCount }) {
  const [dayClosed, setDayClosed] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const { user, token } = useAuthStore();
  const { settings } = useRestaurantSettings();
  const socketRef = useRef(null);
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const checkDayStatus = async () => {
    try {
      const response = await api.get('/day-session/status');
      setDayClosed(response.data.daySession?.isClosed || false);
    } catch (error) {
      console.error('Failed to check day status:', error);
    }
  };

  // Check day session status
  useEffect(() => {
    checkDayStatus();
    // Check every 30 seconds
    const interval = setInterval(checkDayStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Setup socket.io for real-time day status updates
  useEffect(() => {
    if (!user || !token || typeof window === 'undefined') return;

    // Dynamically import socket.io-client only on client side
    let socket = null;
    import('socket.io-client').then(({ io }) => {
      try {
        socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join:pos');
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
      } catch (error) {
        console.error('Failed to setup socket for day status:', error);
      }
    }).catch((error) => {
      console.error('Failed to load socket.io-client:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, token]);

  const handleCloseDay = async () => {
    if (!confirm('Are you sure you want to close the day? This will prevent new orders from being created.')) {
      return;
    }

    setClosingDay(true);
    try {
      // Get summary first
      const summaryRes = await api.get('/day-session/summary');
      const summary = summaryRes.data.summary;

      // Show summary in confirmation
      const summaryText = `
Day Summary:
- Total Orders: ${summary.totalOrders}
- Total Revenue: ₵${summary.totalRevenue.toFixed(2)}
- Cash: ₵${summary.totalCash.toFixed(2)}
- Card: ₵${summary.totalCard.toFixed(2)}
- Mobile Money: ₵${summary.totalMomo.toFixed(2)}
- Paystack: ₵${summary.totalPaystack.toFixed(2)}

Do you want to proceed with closing the day?`;

      if (!confirm(summaryText)) {
        setClosingDay(false);
        return;
      }

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

  return (
    <header className="sticky top-0 z-30 bg-secondary/80 backdrop-blur-lg border-b border-accent/20">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-accent/20 rounded-lg transition-colors"
        >
          <MenuIcon className="w-6 h-6 text-accent" />
        </button>

        <div className="flex-1 flex items-center justify-between mx-4">
          <div>
            <h2 className="text-xl font-bold text-accent">Point of Sale</h2>
            <p className="text-xs text-text/60">{settings.restaurantName || 'De Fusion Flame Kitchen'}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Day Status Indicator */}
            {dayClosed ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-danger/20 border border-danger/30 rounded-lg">
                <Lock className="w-4 h-4 text-danger" />
                <span className="text-danger font-semibold text-sm">Day Closed</span>
              </div>
            ) : (
              <button
                onClick={handleCloseDay}
                disabled={closingDay}
                className="flex items-center gap-2 px-3 py-1.5 bg-warning/20 hover:bg-warning/30 border border-warning/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            <div className="flex items-center gap-2 text-sm text-text/70">
              <Clock className="w-4 h-4" />
              <span>{currentTime}</span>
            </div>
            {cartCount > 0 && (
              <div className="px-3 py-1 bg-accent/20 rounded-lg">
                <span className="text-accent font-semibold">{cartCount} items in cart</span>
              </div>
            )}
          </div>
        </div>
        </div>
        
        {/* Day Closed Warning Banner */}
        {dayClosed && (
          <div className="px-6 pb-3">
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">
                <strong>Day is closed.</strong> No new orders can be created until the day is reopened by an administrator.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

