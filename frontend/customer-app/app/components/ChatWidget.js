'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentChatRef = useRef(null);
  const { user, token, _hasHydrated } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch unread count function
  const fetchUnreadCount = async () => {
    if (!token || !user) return;
    try {
      const response = await api.get('/chat/unread/count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Setup WebSocket connection
  useEffect(() => {
    if (!_hasHydrated) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Join user room if authenticated
      if (user?.id) {
        socket.emit('join:user', user.id);
      }
    });

    const handleMessage = (data) => {
      // Only add message if it's for the current chat and not already in messages
      const currentChatId = currentChatRef.current?.id;
      if (data.chatId === currentChatId) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();
      } else {
        // New message in another chat - update unread count
        fetchUnreadCount();
      }
    };

    const handleStatusUpdate = (data) => {
      const currentChatId = currentChatRef.current?.id;
      if (data.chatId === currentChatId) {
        setCurrentChat(prev => prev ? { ...prev, status: data.status } : null);
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:status-updated', handleStatusUpdate);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:status-updated', handleStatusUpdate);
      socket.disconnect();
    };
  }, [token, _hasHydrated, user?.id]);

  // Fetch or create chat when opening
  useEffect(() => {
    if (isOpen && !currentChat && _hasHydrated) {
      fetchOrCreateChat();
    }
  }, [isOpen, _hasHydrated, user]);

  // Fetch unread count periodically (only for authenticated users)
  useEffect(() => {
    if (!_hasHydrated || !token || !user) return;

    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount().catch(err => {
        // Only log if it's not a rate limit error
        if (err.response?.status !== 429) {
          console.error('Error fetching unread count:', err);
        }
      });
    }, 60000); // Check every 60 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [token, _hasHydrated, user, fetchUnreadCount]);

  const fetchOrCreateChat = async () => {
    setLoading(true);
    try {
      // Try to get existing active chat (only if user is authenticated)
      if (user && token) {
        try {
          const response = await api.get('/chat?status=ACTIVE');
          const chats = response.data.chats || [];

          if (chats.length > 0) {
            // Use existing chat
            const chat = chats[0];
            setCurrentChat(chat);
            currentChatRef.current = chat;
            await fetchMessages(chat.id);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Failed to fetch existing chats:', error);
          // Continue to create new chat
        }
      }

      // Create new chat (works for both authenticated and guest users)
      try {
        const createResponse = await api.post('/chat', {
          customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer' : 'Guest',
          customerEmail: user?.email || undefined,
        });
        const newChat = createResponse.data.chat;
        setCurrentChat(newChat);
        currentChatRef.current = newChat;
        setMessages(newChat.messages || []);
      } catch (error) {
        console.error('Failed to create chat:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to start chat';
        toast.error(errorMessage);
        // Don't set a temp chat - let the user try again or login
      }
    } catch (error) {
      console.error('Failed to fetch/create chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}`);
      setMessages(response.data.chat.messages || []);
      setCurrentChat(response.data.chat);
      currentChatRef.current = response.data.chat;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    // For unauthenticated users, they need to be logged in to send messages
    if (!user || !token) {
      toast.error('Please login to send messages');
      return;
    }

    // Ensure we have a valid chat
    if (!currentChat || currentChat.id === 'temp') {
      // Try to create/fetch chat again
      await fetchOrCreateChat();
      if (!currentChat || currentChat.id === 'temp') {
        toast.error('Chat is not ready. Please try again.');
        return;
      }
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add message
    const tempMessage = {
      id: `temp-${Date.now()}`,
      chatId: currentChat.id,
      senderId: user?.id,
      senderRole: 'CUSTOMER',
      senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest',
      message: messageText,
      isRead: false,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.post(`/chat/${currentChat.id}/messages`, {
        message: messageText,
      });

      // Replace temp message with real one, but check if socket already added it
      setMessages(prev => {
        const realMessage = response.data.message;
        // Check if real message already exists (from socket event)
        const alreadyExists = prev.some(msg => msg.id === realMessage.id);
        if (alreadyExists) {
          // Remove temp message if real one already exists
          return prev.filter(msg => msg.id !== tempMessage.id);
        }
        // Replace temp with real
        return prev.map(msg =>
          msg.id === tempMessage.id ? realMessage : msg
        );
      });
      
      // Update currentChat if it was updated (e.g., customerId was linked)
      if (response.data.chat) {
        setCurrentChat(response.data.chat);
        currentChatRef.current = response.data.chat;
      }
    } catch (error) {
      let errorMessage = 'Failed to send message';
      
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please login to send messages';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You don\'t have permission to send messages in this chat.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Chat not found. Refreshing chat...';
        // Try to refresh the chat
        await fetchOrCreateChat();
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Invalid message. Please check your message and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsMinimized(!isMinimized);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  if (!_hasHydrated) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent text-primary rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-primary border border-accent/20 rounded-lg shadow-2xl flex flex-col transition-all ${
            isMinimized
              ? 'w-80 h-16'
              : 'w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="bg-accent text-primary px-4 py-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Chat</span>
              {unreadCount > 0 && !isMinimized && (
                <span className="bg-danger text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-accent-dark rounded transition-colors"
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-accent-dark rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-text/60">Loading chat...</div>
                  </div>
                ) : !currentChat || currentChat.id === 'temp' ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-text/60">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Setting up chat...</p>
                      {(!user || !token) && (
                        <p className="text-xs mt-2 text-text/40">Please login to send messages</p>
                      )}
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-text/60">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                      {(!user || !token) && (
                        <p className="text-xs mt-2 text-text/40">Please login to send messages</p>
                      )}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderRole === 'CUSTOMER' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.senderRole === 'CUSTOMER'
                            ? 'bg-accent text-primary'
                            : 'bg-secondary text-text'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1 opacity-80">
                          {message.senderName}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {message.message}
                        </div>
                        <div className="text-xs opacity-60 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="border-t border-accent/20 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={!user || !token ? "Please login to send messages..." : "Type your message..."}
                    className="flex-1 px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-text disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={sending || !user || !token}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && newMessage.trim() && !sending && user && token) {
                        sendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || !user || !token || (!currentChat && loading)}
                    className="px-4 py-2 bg-accent text-primary rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={!user || !token ? "Please login to send messages" : (!currentChat && loading) ? "Chat is loading..." : "Send message"}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

