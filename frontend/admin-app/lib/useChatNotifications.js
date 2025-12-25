'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from './store';
import api from './api';

export function useChatNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const { user, token } = useAuthStore();

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!token || !user || user.role !== 'ADMIN') return;
    
    try {
      const response = await api.get('/chat/unread/count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      // Fallback: try to calculate from chats
      try {
        const chatsResponse = await api.get('/chat');
        const chats = chatsResponse.data.chats || [];
        let totalUnread = 0;
        chats.forEach(chat => {
          totalUnread += chat._count?.messages || 0;
        });
        setUnreadCount(totalUnread);
      } catch (fallbackError) {
        // Silently fail - count will remain 0
      }
    }
  }, [token, user]);

  // Setup socket connection for real-time updates
  useEffect(() => {
    if (!token || !user || user.role !== 'ADMIN') {
      setUnreadCount(0);
      return;
    }

    let socket = null;
    let interval = null;
    let mounted = true;

    // Fetch initial count (non-blocking)
    fetchUnreadCount().catch(() => {
      // Silently fail - will retry on next interval
    });

    try {
      // Setup socket connection
      socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        // WebSocket connected
      });

      socket.on('error', () => {
        // Silently handle socket errors - connection will retry automatically
      });

      // Listen for new messages
      const handleMessage = (data) => {
        if (!mounted) return;
        // Only increment if message is from a customer (not from admin)
        if (data.message?.senderRole === 'CUSTOMER') {
          setUnreadCount(prev => prev + 1);
        }
      };

      // Listen for new chats
      const handleNewChat = () => {
        if (!mounted) return;
        setUnreadCount(prev => prev + 1);
      };

      socket.on('chat:message', handleMessage);
      socket.on('chat:new', handleNewChat);

      // Refresh count periodically (less frequently to avoid rate limiting)
      interval = setInterval(() => {
        if (mounted) {
          fetchUnreadCount().catch(() => {
            // Silently fail - will retry on next interval
          });
        }
      }, 60000); // Every 60 seconds (reduced frequency)
    } catch (error) {
      // Silently fail - notifications are non-critical
    }

    return () => {
      mounted = false;
      if (socket) {
        socket.off('chat:message');
        socket.off('chat:new');
        socket.disconnect();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [token, user?.id, user?.role, fetchUnreadCount]);

  // Function to clear unread count (call when viewing chat page)
  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return { unreadCount, clearUnreadCount, refreshCount: fetchUnreadCount };
}

