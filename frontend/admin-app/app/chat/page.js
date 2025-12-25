'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, CheckCircle, XCircle, Clock, Search, X } from 'lucide-react';
import api, { setTokenGetter } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useChatNotifications } from '@/lib/useChatNotifications';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function ChatManagement() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const { user, token } = useAuthStore();
  const { clearUnreadCount } = useChatNotifications();
  const router = useRouter();

  useEffect(() => {
    setTokenGetter(() => useAuthStore.getState().token);
    
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      toast.error('Access denied. Admin access required.');
      router.push('/login');
      return;
    }
    
    fetchChats();
  }, [user, token, router]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // WebSocket connected
    });

    socket.on('chat:new', (chat) => {
      setChats(prev => [chat, ...prev]);
      toast.success(`New chat from ${chat.customerName || 'Customer'}`);
    });

    socket.on('chat:message', (data) => {
      if (data.chatId === selectedChat?.id) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates from optimistic updates)
          const exists = prev.some(msg => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();
      }
      // Update unread count only if not from current user
      if (data.message.senderId !== user?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.chatId]: (prev[data.chatId] || 0) + 1,
        }));
      }
      // Refresh chats to update last message
      fetchChats();
    });

    socket.on('chat:status-updated', (data) => {
      if (data.chatId === selectedChat?.id) {
        setSelectedChat(prev => prev ? { ...prev, status: data.status } : null);
      }
      setChats(prev => prev.map(chat =>
        chat.id === data.chatId ? { ...chat, status: data.status } : chat
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedChat?.id]);

  // Fetch messages when chat is selected
  const lastFetchedChatId = useRef(null);
  useEffect(() => {
    if (selectedChat && selectedChat.id !== lastFetchedChatId.current) {
      lastFetchedChatId.current = selectedChat.id;
      fetchMessages(selectedChat.id);
      // Clear unread count when viewing chat page
      clearUnreadCount();
    }
  }, [selectedChat?.id, clearUnreadCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat');
      const fetchedChats = response.data.chats || [];
      setChats(fetchedChats);
      
      // Calculate unread counts
      const counts = {};
      fetchedChats.forEach(chat => {
        counts[chat.id] = chat._count?.messages || 0;
      });
      setUnreadCounts(counts);
    } catch (error) {
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchingRef = useRef(false);
  const fetchMessages = async (chatId) => {
    // Prevent duplicate requests
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      const response = await api.get(`/chat/${chatId}`);
      setMessages(response.data.chat.messages || []);
      setSelectedChat(response.data.chat);
      
      // Clear unread count for this chat
      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - silently skip, will retry on next attempt
        return;
      }
      toast.error('Failed to load messages');
    } finally {
      fetchingRef.current = false;
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add message
    const tempMessage = {
      id: `temp-${Date.now()}`,
      chatId: selectedChat.id,
      senderId: user.id,
      senderRole: 'ADMIN',
      senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
      message: messageText,
      isRead: false,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.post(`/chat/${selectedChat.id}/messages`, {
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
    } catch (error) {
      let errorMessage = 'Failed to send message';
      
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please refresh the page.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You don\'t have permission to send messages.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Chat not found. Please refresh the page.';
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
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const updateChatStatus = async (chatId, status) => {
    try {
      await api.put(`/chat/${chatId}/status`, { status });
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, status } : chat
      ));
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, status } : null);
      }
      toast.success(`Chat ${status.toLowerCase()}`);
    } catch (error) {
      toast.error('Failed to update chat status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'bg-success/20 text-success',
      RESOLVED: 'bg-blue-500/20 text-blue-500',
      CLOSED: 'bg-text/20 text-text/60',
    };
    return colors[status] || 'bg-secondary text-text';
  };

  const filteredChats = chats.filter(chat =>
    chat.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && chats.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading chats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex gap-4">
      {/* Chat List */}
      <div className="w-1/3 flex flex-col border-r border-accent/20 pr-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-4 text-accent">Customer Support</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text/50 hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 text-text/60">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No chats found</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedChat?.id === chat.id
                    ? 'bg-accent/20 border-accent'
                    : 'bg-secondary border-accent/10 hover:border-accent/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-accent mb-1">
                      {chat.customerName || 'Guest'}
                    </div>
                    {chat.customerEmail && (
                      <div className="text-sm text-text/60 mb-2">{chat.customerEmail}</div>
                    )}
                    {chat.messages?.[0] && (
                      <div className="text-sm text-text/70 line-clamp-2">
                        {chat.messages[0].message}
                      </div>
                    )}
                  </div>
                  {unreadCounts[chat.id] > 0 && (
                    <span className="bg-danger text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                      {unreadCounts[chat.id] > 9 ? '9+' : unreadCounts[chat.id]}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(chat.status)}`}>
                    {chat.status}
                  </span>
                  {chat.lastMessageAt && (
                    <span className="text-xs text-text/50">
                      {new Date(chat.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-secondary border border-accent/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-accent mb-1">
                    {selectedChat.customerName || 'Guest'}
                  </h2>
                  {selectedChat.customerEmail && (
                    <p className="text-sm text-text/60">{selectedChat.customerEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedChat.status)}`}>
                    {selectedChat.status}
                  </span>
                  {selectedChat.status === 'ACTIVE' && (
                    <button
                      onClick={() => updateChatStatus(selectedChat.id, 'RESOLVED')}
                      className="px-3 py-1 bg-success/20 text-success rounded-lg hover:bg-success/30 text-sm font-semibold"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {selectedChat.status === 'RESOLVED' && (
                    <button
                      onClick={() => updateChatStatus(selectedChat.id, 'ACTIVE')}
                      className="px-3 py-1 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 text-sm font-semibold"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => updateChatStatus(selectedChat.id, 'CLOSED')}
                    className="px-3 py-1 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-secondary rounded-lg p-4 mb-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-text/60">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.senderRole === 'ADMIN'
                          ? 'bg-accent text-primary'
                          : 'bg-primary border border-accent/20 text-text'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1 opacity-80">
                        {message.senderName}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-text"
                disabled={sending || selectedChat.status === 'CLOSED'}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || selectedChat.status === 'CLOSED'}
                className="px-6 py-2 bg-accent text-primary rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-secondary rounded-lg">
            <div className="text-center text-text/60">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

