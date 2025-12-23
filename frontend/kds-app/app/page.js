'use client';

import { useState, useEffect, useContext, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, CheckCircle, XCircle, AlertCircle, Utensils, CheckCircle2, Printer, User, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import { OrderCountsContext, SearchContext } from './components/KDSLayout';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

function KDSPageContent() {
  const [orders, setOrders] = useState({ PENDING: [], CONFIRMED: [], PREPARING: [], READY: [], COMPLETED: [] });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Load printed orders from localStorage on mount
  const [printedOrders, setPrintedOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('kds-printed-orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          return new Set(parsed);
        }
      } catch (error) {
        console.error('Error loading printed orders from localStorage:', error);
      }
    }
    return new Set();
  });
  
  // Save printed orders to localStorage whenever it changes
  const updatePrintedOrders = (newSet) => {
    setPrintedOrders(newSet);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kds-printed-orders', JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error('Error saving printed orders to localStorage:', error);
      }
    }
  };
  
  const { user, token, _hasHydrated } = useAuthStore();
  const { settings } = useRestaurantSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = searchParams?.get('status') || 'all';
  const activeOrderType = searchParams?.get('type') || 'all'; // 'all', 'online', 'in-restaurant'
  
  // Get context - must be called unconditionally
  const contextValue = useContext(OrderCountsContext);
  const setOrderCounts = contextValue?.setOrderCounts;
  const searchContext = useContext(SearchContext);
  const searchQuery = searchContext?.searchQuery || '';
  const socketRef = useRef(null);

  // Handle case where context is not available
  if (!contextValue) {
    console.warn('OrderCountsContext is not available');
  }

  // Audio context ref for beep sounds
  const audioContextRef = useRef(null);
  const audioInitializedRef = useRef(false);

  // Initialize audio context on user interaction (required by browser autoplay policies)
  const initializeAudio = useCallback(() => {
    if (audioInitializedRef.current || typeof window === 'undefined') {
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('AudioContext not supported');
        return;
      }

      audioContextRef.current = new AudioContext();
      audioInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, []);

  // Initialize audio on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initAudio = () => {
      initializeAudio();
      // Remove listeners after first interaction
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };

    // Try to initialize on any user interaction
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, [initializeAudio]);

  // Function to play beep sound notification
  const playBeepSound = useCallback(async () => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('AudioContext not supported');
        return;
      }

      // Create or reuse audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        audioInitializedRef.current = true;
      }

      const audioContext = audioContextRef.current;
      
      // Resume audio context if suspended (required by browser autoplay policies)
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (error) {
          console.warn('Could not resume audio context:', error);
          return;
        }
      }

      // Wait for audio context to be ready
      if (audioContext.state !== 'running') {
        console.warn('Audio context not running, state:', audioContext.state);
        return;
      }

      // Function to play a single beep
      const playBeep = (frequency, delay = 0) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            try {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = frequency;
              oscillator.type = 'sine';
              
              const now = audioContext.currentTime;
              gainNode.gain.setValueAtTime(0, now);
              gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
              gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
              
              oscillator.start(now);
              oscillator.stop(now + 0.25);
              
              setTimeout(resolve, 250);
            } catch (error) {
              console.error('Error playing beep:', error);
              resolve();
            }
          }, delay);
        });
      };

      // Play two beeps (two-tone alert)
      await playBeep(800, 0);   // First beep at 800 Hz
      await playBeep(1000, 50); // Second beep at 1000 Hz after 50ms delay
      
    } catch (error) {
      console.error('Error playing beep sound:', error);
    }
  }, []);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure hydration happens - Zustand persist should handle this, but add fallback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        const state = useAuthStore.getState();
        if (!state._hasHydrated) {
          useAuthStore.setState({ _hasHydrated: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!setOrderCounts) {
      console.warn('Cannot fetch orders: setOrderCounts is not available');
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get('/orders');
      
      if (!response.data || !response.data.orders) {
        console.error('Invalid response format:', response.data);
        toast.error('Invalid response from server');
        setOrders({ PENDING: [], CONFIRMED: [], PREPARING: [], READY: [], COMPLETED: [] });
        return;
      }

      // Filter and group orders by status and type
      const filtered = response.data.orders.filter(
        (order) => order && ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status)
      );
      
      const grouped = {
        PENDING: [],
        CONFIRMED: [],
        PREPARING: [],
        READY: [],
        COMPLETED: [],
      };
      
      // Separate orders by type
      const onlineOrders = { PENDING: [], CONFIRMED: [], PREPARING: [], READY: [], COMPLETED: [] };
      const inRestaurantOrders = { PENDING: [], CONFIRMED: [], PREPARING: [], READY: [], COMPLETED: [] };
      
      filtered.forEach((order) => {
        if (order && order.status) {
          grouped[order.status].push(order);
          
          // Separate by order type
          if (order.orderType === 'ONLINE') {
            if (onlineOrders[order.status]) {
              onlineOrders[order.status].push(order);
            }
          } else {
            // DINE_IN or TAKEAWAY
            if (inRestaurantOrders[order.status]) {
              inRestaurantOrders[order.status].push(order);
            }
          }
        }
      });
      
      setOrders(grouped);
      
      // Update order counts separated by type
      if (setOrderCounts) {
        setOrderCounts({
          ONLINE: {
            PENDING: onlineOrders.PENDING?.length || 0,
            CONFIRMED: onlineOrders.CONFIRMED?.length || 0,
            PREPARING: onlineOrders.PREPARING?.length || 0,
            READY: onlineOrders.READY?.length || 0,
            COMPLETED: onlineOrders.COMPLETED?.length || 0,
          },
          IN_RESTAURANT: {
            PENDING: inRestaurantOrders.PENDING?.length || 0,
            CONFIRMED: inRestaurantOrders.CONFIRMED?.length || 0,
            PREPARING: inRestaurantOrders.PREPARING?.length || 0,
            READY: inRestaurantOrders.READY?.length || 0,
            COMPLETED: inRestaurantOrders.COMPLETED?.length || 0,
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load orders';
      
      // More specific error messages
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Cannot connect to backend server. Please ensure the backend is running on http://localhost:5000');
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
        router.push('/login');
      } else {
        toast.error(errorMessage);
      }
      
      setOrders({ PENDING: [], CONFIRMED: [], PREPARING: [], READY: [], COMPLETED: [] });
      try {
        if (setOrderCounts) {
          setOrderCounts({ 
            ONLINE: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 },
            IN_RESTAURANT: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 }
          });
        }
      } catch (error) {
        console.warn('Could not update order counts:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [setOrderCounts]);

  const setupWebSocket = useCallback(() => {
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

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

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        // Don't show error toast, just log it
      });

      socket.on('order:new', (order) => {
        if (order && order.orderNumber) {
          // Play beep sound notification
          playBeepSound().catch((error) => {
            console.error('Failed to play beep sound:', error);
          });
          toast.success(`New order: #${order.orderNumber}`);
          fetchOrders();
        }
      });

      socket.on('order:status-updated', (data) => {
        fetchOrders();
      });

      socket.on('disconnect', () => {
        // Socket disconnected
      });
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      // Continue without WebSocket - orders will still load on page load
    }
  }, [token, fetchOrders, playBeepSound]);

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage before checking auth
    if (!_hasHydrated) {
      return;
    }

    // Check authentication only after hydration
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    // Verify user has kitchen access (KITCHEN_STAFF or ADMIN)
    const allowedRoles = ['KITCHEN_STAFF', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      toast.error('Access denied. Kitchen staff access required.');
      router.push('/login');
      return;
    }
    
    // Only fetch if context is available
    if (!setOrderCounts) {
      console.warn('Cannot fetch orders: context not ready');
      return;
    }
    
    // Fetch orders
    fetchOrders();
    
    // Setup WebSocket after a short delay to ensure token is available
    const wsTimeout = setTimeout(() => {
      setupWebSocket();
    }, 500);

    return () => {
      clearTimeout(wsTimeout);
      // Cleanup WebSocket on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, token, router, _hasHydrated, fetchOrders, setupWebSocket, setOrderCounts]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getTimeElapsed = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.floor((now - created) / 1000 / 60); // minutes
    return diff;
  };

  const printReceipt = (order) => {
    try {
      // Mark order as printed and persist to localStorage
      updatePrintedOrders(new Set(printedOrders).add(order.id));
      
      // Create a hidden iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
      
      const customerName = order.customer 
        ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() 
        : 'Customer';
      
      const isOnlineOrder = order.orderType === 'ONLINE';
      
      // Build items HTML
      let itemsHTML = '<p>No items</p>';
      if (order.items && order.items.length > 0) {
        itemsHTML = order.items.map(item => {
          const itemName = (item.menuItem?.name || 'Unknown Item').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const quantity = item.quantity || 1;
          const totalPrice = (item.totalPrice || 0).toFixed(2);
          const unitPrice = (item.unitPrice || 0).toFixed(2);
          
          let variantHTML = '';
          if (item.variant) {
            const variantName = item.variant.name || '';
            const variantPrice = item.variant.price || 0;
            const basePrice = item.menuItem?.basePrice || 0;
            const priceDiff = (variantPrice - basePrice).toFixed(2);
            variantHTML = `<div class="item-details">Size: ${variantName} (+₵${priceDiff})</div>`;
          }
          
          let addonsHTML = '';
          if (item.addons && item.addons.length > 0) {
            const addonsList = item.addons.map(a => {
              const addonName = (a.addon?.name || 'Addon').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const addonPrice = (a.price || 0).toFixed(2);
              return `${addonName} (+₵${addonPrice})`;
            }).join(', ');
            addonsHTML = `<div class="item-details">Add-ons: ${addonsList}</div>`;
          }
          
          let notesHTML = '';
          if (item.notes) {
            const safeNotes = item.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            notesHTML = `<div class="item-details" style="color: #d32f2f; font-style: italic;">Note: ${safeNotes}</div>`;
          }
          
          return `
            <div class="item">
              <div class="item-header">
                <span>${quantity}x ${itemName}</span>
                <span>₵${totalPrice}</span>
              </div>
              ${variantHTML}
              ${addonsHTML}
              ${notesHTML}
              <div class="item-details">Unit Price: ₵${unitPrice}</div>
            </div>
          `;
        }).join('');
      }
      
      const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${order.orderNumber}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body {
              font-family: 'Courier New', monospace;
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .restaurant-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .order-info {
              margin: 15px 0;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .order-info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 14px;
            }
            .items {
              margin: 20px 0;
            }
            .item {
              margin: 10px 0;
              padding-bottom: 10px;
              border-bottom: 1px dashed #ccc;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .item-details {
              font-size: 12px;
              color: #666;
              margin-left: 20px;
            }
            .totals {
              margin-top: 20px;
              border-top: 2px solid #000;
              padding-top: 15px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 16px;
            }
            .total-final {
              font-weight: bold;
              font-size: 18px;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #000;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              font-size: 12px;
              color: #666;
            }
            .delivery-info {
              background: #e8f4f8;
              padding: 10px;
              margin: 15px 0;
              border-radius: 5px;
              border-left: 4px solid #2196F3;
            }
            .delivery-info h4 {
              margin: 0 0 8px 0;
              font-size: 14px;
              color: #1976D2;
            }
            .delivery-info p {
              margin: 4px 0;
              font-size: 12px;
            }
            button {
              background: #2196F3;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
              margin: 10px 5px;
            }
            button:hover {
              background: #1976D2;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">${settings?.restaurantName?.toUpperCase() || 'DE FUSION FLAME'}</div>
            <div style="font-size: 12px; margin-top: 5px;">Restaurant & Kitchen</div>
          </div>
          
          <div class="order-info">
            <div class="order-info-row">
              <strong>Order Number:</strong>
              <strong>#${order.orderNumber}</strong>
            </div>
            <div class="order-info-row">
              <span>Date:</span>
              <span>${new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div class="order-info-row">
              <span>Order Type:</span>
              <span>${order.orderType.replace('_', ' ')}</span>
            </div>
            <div class="order-info-row">
              <span>Status:</span>
              <span>${order.status}</span>
            </div>
          </div>

          ${isOnlineOrder ? `
            <div class="delivery-info">
              <h4>Customer Information</h4>
              <p><strong>Name:</strong> ${customerName}</p>
              ${order.contactPhone ? `<p><strong>Phone:</strong> ${order.contactPhone}</p>` : ''}
              ${order.deliveryAddress ? `<p><strong>Delivery Address:</strong><br>${order.deliveryAddress}</p>` : ''}
            </div>
          ` : ''}

          <div class="items">
            <h3 style="margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 5px;">Items</h3>
            ${itemsHTML}
          </div>

          ${order.notes ? `
            <div style="margin: 15px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
              <strong>Special Instructions:</strong>
              <p style="margin: 5px 0 0 0;">${(order.notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          ` : ''}

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₵${order.subtotal.toFixed(2)}</span>
            </div>
            ${order.discount > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-₵${order.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Tax (5%):</span>
              <span>₵${order.tax.toFixed(2)}</span>
            </div>
            <div class="total-row total-final">
              <span>TOTAL:</span>
              <span>₵${order.total.toFixed(2)}</span>
            </div>
          </div>

          ${order.paymentMethod ? `
            <div style="margin-top: 15px; padding: 10px; background: #e8f5e9; border-radius: 5px; text-align: center;">
              <strong>Payment Method:</strong> ${order.paymentMethod}
              <br>
              <strong>Payment Status:</strong> ${order.paymentStatus}
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your order!</p>
            <p>For inquiries, please contact us.</p>
            <p style="margin-top: 10px; font-size: 10px;">Printed: ${new Date().toLocaleString()}</p>
          </div>

        </body>
      </html>
    `;
    
      // Write content to iframe
      const iframeDoc = printFrame.contentDocument || printFrame.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(receiptContent);
      iframeDoc.close();
      
      // Wait for iframe to load, then print
      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            toast.success('Receipt printed successfully');
            
            // Remove iframe after printing (with a delay to ensure print dialog opens)
            setTimeout(() => {
              document.body.removeChild(printFrame);
            }, 1000);
          } catch (error) {
            console.error('Print error:', error);
            toast.error('Failed to print receipt');
            document.body.removeChild(printFrame);
            // Remove from printed set on error
            const newSet = new Set(printedOrders);
            newSet.delete(order.id);
            updatePrintedOrders(newSet);
          }
        }, 250);
      };
      
      // Fallback: if onload doesn't fire, try printing anyway
      setTimeout(() => {
        if (printFrame.parentNode) {
          try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            toast.success('Receipt printed successfully');
            setTimeout(() => {
              if (printFrame.parentNode) {
                document.body.removeChild(printFrame);
              }
            }, 1000);
          } catch (error) {
            // Error handled above
          }
        }
      }, 500);
    } catch (error) {
      console.error('Print receipt error:', error);
      toast.error('Failed to print receipt');
      // Remove from printed set on error
      const newSet = new Set(printedOrders);
      newSet.delete(order.id);
      updatePrintedOrders(newSet);
    }
  };

  const OrderCard = ({ order }) => {
    const timeElapsed = getTimeElapsed(order.createdAt);
    const isUrgent = timeElapsed > 15; // Urgent if more than 15 minutes
    const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const customerName = order.customer 
      ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() 
      : null;
    const isOnlineOrder = order.orderType === 'ONLINE';

    // Get status color and icon
    const getStatusConfig = (status) => {
      switch (status) {
        case 'PENDING':
          return { 
            color: 'text-yellow-500', 
            bg: 'bg-yellow-500/10', 
            border: 'border-yellow-500/30', 
            badge: 'bg-yellow-500/20 text-yellow-400',
            icon: AlertCircle 
          };
        case 'CONFIRMED':
          return { 
            color: 'text-blue-500', 
            bg: 'bg-blue-500/10', 
            border: 'border-blue-500/30', 
            badge: 'bg-blue-500/20 text-blue-400',
            icon: CheckCircle 
          };
        case 'PREPARING':
          return { 
            color: 'text-orange-500', 
            bg: 'bg-orange-500/10', 
            border: 'border-orange-500/30', 
            badge: 'bg-orange-500/20 text-orange-400',
            icon: Utensils 
          };
        case 'READY':
          return { 
            color: 'text-green-500', 
            bg: 'bg-green-500/10', 
            border: 'border-green-500/30', 
            badge: 'bg-green-500/20 text-green-400',
            icon: CheckCircle2 
          };
        case 'COMPLETED':
          return { 
            color: 'text-success', 
            bg: 'bg-success/10', 
            border: 'border-success/30', 
            badge: 'bg-success/20 text-success',
            icon: CheckCircle2 
          };
        default:
          return { 
            color: 'text-accent', 
            bg: 'bg-accent/10', 
            border: 'border-accent/30', 
            badge: 'bg-accent/20 text-accent',
            icon: Clock 
          };
      }
    };

    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;

    // Get quick action button
    const getQuickActionButton = () => {
      if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, 'PREPARING');
            }}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-primary rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
          >
            <Utensils className="w-4 h-4" />
            Start
          </button>
        );
      } else if (order.status === 'PREPARING') {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, 'READY');
            }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Ready
          </button>
        );
      } else if (order.status === 'READY') {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, 'COMPLETED');
            }}
            className="px-4 py-2 bg-success hover:bg-success/90 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete
          </button>
        );
      }
      return null;
    };

    return (
      <>
        <div 
          className={`bg-secondary rounded-xl p-4 border-2 ${statusConfig.border} hover:shadow-xl transition-all duration-200 cursor-pointer ${isUrgent && order.status !== 'READY' && order.status !== 'COMPLETED' ? 'ring-2 ring-danger/50' : ''}`}
          onClick={() => setSelectedOrder(order)}
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-lg ${statusConfig.bg} flex-shrink-0`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-accent">#{order.orderNumber}</h3>
                  {isUrgent && order.status !== 'READY' && order.status !== 'COMPLETED' && (
                    <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusConfig.badge}`}>
                  {order.status}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-xl font-bold text-accent">₵{order.total.toFixed(2)}</p>
              <p className="text-xs text-text/60">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center gap-3 text-text/70">
              <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-danger font-semibold' : ''}`}>
                <Clock className={`w-4 h-4 ${isUrgent ? 'text-danger' : 'text-text/60'}`} />
                <span>{timeElapsed} {timeElapsed === 1 ? 'min' : 'mins'}</span>
              </div>
              <span className="text-text/40">•</span>
              <span>{order.orderType.replace('_', ' ')}</span>
              {order.tableNumber && (
                <>
                  <span className="text-text/40">•</span>
                  <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs font-semibold">
                    Table {order.tableNumber}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Customer Name Preview (if online) */}
          {isOnlineOrder && customerName && (
            <div className="mb-3 text-sm">
              <div className="flex items-center gap-2 text-text/70">
                <User className="w-4 h-4 text-accent" />
                <span className="truncate">{customerName}</span>
              </div>
            </div>
          )}

          {/* Items Preview - Show first 2 items */}
          <div className="mb-3 space-y-1">
            {order.items && order.items.length > 0 ? (
              <>
                {order.items.slice(0, 2).map((item, index) => (
                  <div key={index} className="text-sm text-text/80 flex items-center gap-2">
                    <span className="font-semibold text-accent">{item.quantity}x</span>
                    <span className="truncate">{item.menuItem?.name || 'Unknown Item'}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div className="text-xs text-text/60 italic">
                    +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-text/60">No items</p>
            )}
            {order.notes && (
              <div className="text-xs text-accent font-medium mt-1">📝 Has notes</div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-accent/10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(order);
              }}
              className="flex-1 px-3 py-2 bg-secondary border border-accent/20 hover:bg-accent/10 text-text rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
            {getQuickActionButton()}
          </div>
        </div>
      </>
    );
  };

  // Order Details Modal Component
  const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const timeElapsed = getTimeElapsed(order.createdAt);
    const isUrgent = timeElapsed > 15;
    const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const customerName = order.customer 
      ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() 
      : null;
    const isOnlineOrder = order.orderType === 'ONLINE';

    const getStatusConfig = (status) => {
      switch (status) {
        case 'PENDING':
          return { 
            color: 'text-yellow-500', 
            bg: 'bg-yellow-500/10', 
            border: 'border-yellow-500/30', 
            badge: 'bg-yellow-500/20 text-yellow-400',
            icon: AlertCircle 
          };
        case 'CONFIRMED':
          return { 
            color: 'text-blue-500', 
            bg: 'bg-blue-500/10', 
            border: 'border-blue-500/30', 
            badge: 'bg-blue-500/20 text-blue-400',
            icon: CheckCircle 
          };
        case 'PREPARING':
          return { 
            color: 'text-orange-500', 
            bg: 'bg-orange-500/10', 
            border: 'border-orange-500/30', 
            badge: 'bg-orange-500/20 text-orange-400',
            icon: Utensils 
          };
        case 'READY':
          return { 
            color: 'text-green-500', 
            bg: 'bg-green-500/10', 
            border: 'border-green-500/30', 
            badge: 'bg-green-500/20 text-green-400',
            icon: CheckCircle2 
          };
        case 'COMPLETED':
          return { 
            color: 'text-success', 
            bg: 'bg-success/10', 
            border: 'border-success/30', 
            badge: 'bg-success/20 text-success',
            icon: CheckCircle2 
          };
        default:
          return { 
            color: 'text-accent', 
            bg: 'bg-accent/10', 
            border: 'border-accent/30', 
            badge: 'bg-accent/20 text-accent',
            icon: Clock 
          };
      }
    };

    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
          className={`bg-secondary rounded-2xl border-2 ${statusConfig.border} max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-secondary/95 backdrop-blur-lg border-b border-accent/20 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${statusConfig.bg}`}>
                <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-accent">Order #{order.orderNumber}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${statusConfig.badge}`}>
                    {order.status}
                  </span>
                  {isUrgent && order.status !== 'READY' && order.status !== 'COMPLETED' && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-danger/30 text-danger flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      URGENT
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-text" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Order Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text/60 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-accent">₵{order.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-text/60 mb-1">Items</p>
                <p className="text-xl font-semibold text-text">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
              </div>
            </div>

            {/* Order Info */}
            <div className="pb-4 border-b border-accent/10">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className={`flex items-center gap-2 ${isUrgent ? 'text-danger' : 'text-text/70'}`}>
                  <Clock className={`w-5 h-5 ${isUrgent ? 'text-danger' : 'text-text/60'}`} />
                  <span className={`font-semibold ${isUrgent ? 'font-bold' : ''}`}>
                    {timeElapsed} {timeElapsed === 1 ? 'min' : 'mins'}
                  </span>
                </div>
                <span className="text-text/40">|</span>
                <span className="text-text/70 font-medium">{order.orderType.replace('_', ' ')}</span>
                {order.tableNumber && (
                  <>
                    <span className="text-text/40">|</span>
                    <span className="px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-semibold">
                      Table {order.tableNumber}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Customer Info for Online Orders */}
            {isOnlineOrder && customerName && (
              <div className="p-4 bg-accent/10 rounded-xl border-l-4 border-accent">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-sm font-bold text-accent">Customer Information</span>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-base font-semibold text-text">{customerName}</p>
                  {order.contactPhone && (
                    <p className="text-sm text-text/70">📞 {order.contactPhone}</p>
                  )}
                  {order.deliveryAddress && (
                    <p className="text-sm text-text/70">📍 {order.deliveryAddress}</p>
                  )}
                </div>
              </div>
            )}

            {/* Items List */}
            <div>
              <h3 className="text-lg font-bold text-accent mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={index} className="bg-primary/40 p-4 rounded-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-accent text-xl">{item.quantity}x</span>
                            <span className="font-semibold text-base text-text">{item.menuItem?.name || 'Unknown Item'}</span>
                          </div>
                          {(item.variant || (item.addons && item.addons.length > 0)) && (
                            <div className="ml-8 mt-2 text-sm text-text/60 space-y-1">
                              {item.variant && <div>Size: <span className="font-medium">{item.variant.name}</span></div>}
                              {item.addons && item.addons.length > 0 && (
                                <div>Add-ons: <span className="font-medium">{item.addons.map(a => a.addon?.name || 'Addon').join(', ')}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-accent">₵{(item.totalPrice || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text/60 text-center py-4">No items</p>
                )}
              </div>
            </div>

            {/* Special Notes */}
            {order.notes && (
              <div className="p-4 bg-accent/10 rounded-xl border-l-4 border-accent">
                <p className="text-sm font-bold text-accent mb-2">📝 Special Instructions</p>
                <p className="text-sm text-text/90 font-medium break-words">{order.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-accent/10 space-y-3">
              {/* Print Receipt Button - Only for Online Orders */}
              {isOnlineOrder && (
                <button
                  onClick={() => printReceipt(order)}
                  disabled={printedOrders.has(order.id)}
                  className={`w-full text-base py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-lg ${
                    printedOrders.has(order.id)
                      ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-xl'
                  }`}
                >
                  <Printer className="w-5 h-5" />
                  {printedOrders.has(order.id) ? 'Receipt Printed' : 'Print Receipt'}
                </button>
              )}
              
              {/* Status Action Button */}
              {order.status === 'PENDING' && (
                <button
                  onClick={() => {
                    updateOrderStatus(order.id, 'PREPARING');
                    onClose();
                  }}
                  className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-3 font-bold hover:shadow-xl"
                >
                  <Utensils className="w-5 h-5" />
                  Start Preparing
                </button>
              )}
              {order.status === 'CONFIRMED' && (
                <button
                  onClick={() => {
                    updateOrderStatus(order.id, 'PREPARING');
                    onClose();
                  }}
                  className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-3 font-bold hover:shadow-xl"
                >
                  <Utensils className="w-5 h-5" />
                  Start Preparing
                </button>
              )}
              {order.status === 'PREPARING' && (
                <button
                  onClick={() => {
                    updateOrderStatus(order.id, 'READY');
                    onClose();
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white text-lg py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Ready
                </button>
              )}
              {order.status === 'READY' && (
                <button
                  onClick={() => {
                    updateOrderStatus(order.id, 'COMPLETED');
                    onClose();
                  }}
                  className="w-full bg-success hover:bg-success/90 text-white text-lg py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Completed
                </button>
              )}
              {order.status === 'COMPLETED' && (
                <div className="text-center py-3">
                  <span className="text-success font-semibold text-base flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Completed
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading Kitchen Display System...</div>
          <p className="text-text/60 mt-2">KDS - Port 3002</p>
        </div>
      </div>
    );
  }

  // Wait for client-side mount
  if (!mounted) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Initializing Kitchen Display System...</div>
          <p className="text-text/60 mt-2">KDS - Port 3002</p>
        </div>
      </div>
    );
  }

  // Wait for hydration before checking auth
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading authentication...</div>
          <p className="text-text/60 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // If no user/token, show nothing (will redirect)
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  // If context is not available, show loading
  if (!setOrderCounts) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading system...</div>
        </div>
      </div>
    );
  }

  // Get order counts from context
  const contextOrderCounts = contextValue?.orderCounts || { 
    ONLINE: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 },
    IN_RESTAURANT: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 }
  };

  // Helper function to check if order matches search query (focuses on order number)
  const orderMatchesSearch = (order, query) => {
    if (!query || query.trim() === '') return true;
    
    const searchLower = query.toLowerCase().trim();
    const searchUpper = query.toUpperCase().trim();
    const searchOriginal = query.trim();
    
    // Primary search: Order number (exact or partial match)
    // Check if order number contains the search query (case-insensitive)
    if (order.orderNumber) {
      const orderNumLower = order.orderNumber.toLowerCase();
      const orderNumUpper = order.orderNumber.toUpperCase();
      const orderNumOriginal = order.orderNumber;
      
      // Match if search query is found in order number
      if (orderNumLower.includes(searchLower) || 
          orderNumUpper.includes(searchUpper) || 
          orderNumOriginal.includes(searchOriginal)) {
        return true;
      }
    }
    
    // Also allow searching by partial order number (e.g., "001" matches "ORD-001")
    // Remove common prefixes and separators for flexible matching
    const normalizeOrderNumber = (num) => {
      if (!num) return '';
      return num.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
    };
    
    const normalizedOrderNum = normalizeOrderNumber(order.orderNumber);
    const normalizedSearch = normalizeOrderNumber(searchOriginal);
    
    if (normalizedOrderNum.includes(normalizedSearch) && normalizedSearch.length > 0) {
      return true;
    }
    
    return false;
  };

  // Filter orders based on active tab, order type, and search query
  const getFilteredOrders = () => {
    // First filter by order type
    let typeFiltered = [];
    if (activeOrderType === 'online') {
      // Only ONLINE orders
      typeFiltered = [
        ...(orders.PENDING || []),
        ...(orders.CONFIRMED || []),
        ...(orders.PREPARING || []),
        ...(orders.READY || []),
        ...(orders.COMPLETED || []),
      ].filter(order => order.orderType === 'ONLINE');
    } else if (activeOrderType === 'in-restaurant') {
      // Only DINE_IN and TAKEAWAY orders
      typeFiltered = [
        ...(orders.PENDING || []),
        ...(orders.CONFIRMED || []),
        ...(orders.PREPARING || []),
        ...(orders.READY || []),
        ...(orders.COMPLETED || []),
      ].filter(order => order.orderType === 'DINE_IN' || order.orderType === 'TAKEAWAY');
    } else {
      // All orders
      typeFiltered = [
        ...(orders.PENDING || []),
        ...(orders.CONFIRMED || []),
        ...(orders.PREPARING || []),
        ...(orders.READY || []),
        ...(orders.COMPLETED || []),
      ];
    }

    // Then filter by status
    let statusFiltered = [];
    switch (activeStatus.toLowerCase()) {
      case 'pending':
        statusFiltered = typeFiltered.filter(order => order.status === 'PENDING');
        break;
      case 'confirmed':
        statusFiltered = typeFiltered.filter(order => order.status === 'CONFIRMED');
        break;
      case 'preparing':
        statusFiltered = typeFiltered.filter(order => order.status === 'PREPARING');
        break;
      case 'ready':
        statusFiltered = typeFiltered.filter(order => order.status === 'READY');
        break;
      case 'completed':
        statusFiltered = typeFiltered.filter(order => order.status === 'COMPLETED');
        break;
      case 'all':
      default:
        statusFiltered = typeFiltered;
    }

    // Finally filter by search query
    if (searchQuery && searchQuery.trim() !== '') {
      return statusFiltered.filter(order => orderMatchesSearch(order, searchQuery));
    }
    
    return statusFiltered;
  };

  const filteredOrders = getFilteredOrders().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  // Calculate order counts based on active type filter
  const getOrderCounts = () => {
    if (activeOrderType === 'online') {
      return contextOrderCounts.ONLINE || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
    } else if (activeOrderType === 'in-restaurant') {
      return contextOrderCounts.IN_RESTAURANT || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
    } else {
      // Combined counts
      const online = contextOrderCounts.ONLINE || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
      const inRestaurant = contextOrderCounts.IN_RESTAURANT || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
      return {
        PENDING: online.PENDING + inRestaurant.PENDING,
        CONFIRMED: online.CONFIRMED + inRestaurant.CONFIRMED,
        PREPARING: online.PREPARING + inRestaurant.PREPARING,
        READY: online.READY + inRestaurant.READY,
        COMPLETED: online.COMPLETED + inRestaurant.COMPLETED,
      };
    }
  };

  const orderCounts = getOrderCounts();
  
  const getStatusTitle = () => {
    const typeLabel = activeOrderType === 'online' ? 'Online ' : activeOrderType === 'in-restaurant' ? 'In-Restaurant ' : '';
    switch (activeStatus.toLowerCase()) {
      case 'pending':
        return `${typeLabel}Pending Orders`;
      case 'confirmed':
        return `${typeLabel}Confirmed Orders`;
      case 'preparing':
        return `${typeLabel}Orders in Preparation`;
      case 'ready':
        return `${typeLabel}Ready Orders`;
      case 'completed':
        return `${typeLabel}Completed Orders`;
      case 'all':
      default:
        return `${typeLabel}All Orders`;
    }
  };

  const getStatusCount = () => {
    switch (activeStatus.toLowerCase()) {
      case 'pending':
        return orderCounts.PENDING;
      case 'confirmed':
        return orderCounts.CONFIRMED;
      case 'preparing':
        return orderCounts.PREPARING;
      case 'ready':
        return orderCounts.READY;
      case 'completed':
        return orderCounts.COMPLETED;
      case 'all':
      default:
        return orderCounts.PENDING + orderCounts.CONFIRMED + orderCounts.PREPARING + orderCounts.READY + orderCounts.COMPLETED;
    }
  };

  return (
    <>
      {/* Header Section - Cleaner and More Spacious */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-accent">{getStatusTitle()}</h1>
          <p className="text-text/70 text-base">
            {getStatusCount()} {getStatusCount() === 1 ? 'order' : 'orders'} in this category
          </p>
        </div>
        
        {/* Order Type Filter Tabs - Larger and More Spacious */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => router.push(`/?status=${activeStatus}&type=all`)}
            className={`px-6 py-3 rounded-xl text-base font-semibold transition-all ${
              activeOrderType === 'all'
                ? 'bg-accent text-primary shadow-lg'
                : 'bg-secondary text-text/70 hover:bg-accent/10 hover:text-accent border border-accent/20'
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => router.push(`/?status=${activeStatus}&type=online`)}
            className={`px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center gap-2 ${
              activeOrderType === 'online'
                ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30 shadow-lg'
                : 'bg-secondary text-text/70 hover:bg-blue-500/10 hover:text-blue-400 border border-accent/20'
            }`}
          >
            <User className="w-5 h-5" />
            Online Orders
            {activeOrderType === 'online' && (
              <span className="px-2.5 py-1 bg-blue-500 text-white rounded-full text-xs font-bold">
                {contextOrderCounts.ONLINE?.PENDING + contextOrderCounts.ONLINE?.CONFIRMED + contextOrderCounts.ONLINE?.PREPARING + contextOrderCounts.ONLINE?.READY + contextOrderCounts.ONLINE?.COMPLETED || 0}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push(`/?status=${activeStatus}&type=in-restaurant`)}
            className={`px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center gap-2 ${
              activeOrderType === 'in-restaurant'
                ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30 shadow-lg'
                : 'bg-secondary text-text/70 hover:bg-orange-500/10 hover:text-orange-400 border border-accent/20'
            }`}
          >
            <Utensils className="w-5 h-5" />
            In-Restaurant
            {activeOrderType === 'in-restaurant' && (
              <span className="px-2.5 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                {contextOrderCounts.IN_RESTAURANT?.PENDING + contextOrderCounts.IN_RESTAURANT?.CONFIRMED + contextOrderCounts.IN_RESTAURANT?.PREPARING + contextOrderCounts.IN_RESTAURANT?.READY + contextOrderCounts.IN_RESTAURANT?.COMPLETED || 0}
              </span>
            )}
          </button>
        </div>
        
        {/* Quick Stats Bar - Cleaner Design */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all ${
            activeStatus === 'all' || activeStatus === 'pending' 
              ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' 
              : 'bg-secondary/50 text-text/60 border border-accent/10'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold text-base">{orderCounts.PENDING}</span>
            <span className="text-xs">Pending</span>
          </div>
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all ${
            activeStatus === 'confirmed'
              ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30' 
              : 'bg-secondary/50 text-text/60 border border-accent/10'
          }`}>
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-base">{orderCounts.CONFIRMED}</span>
            <span className="text-xs">Confirmed</span>
          </div>
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all ${
            activeStatus === 'preparing'
              ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30' 
              : 'bg-secondary/50 text-text/60 border border-accent/10'
          }`}>
            <Utensils className="w-5 h-5" />
            <span className="font-bold text-base">{orderCounts.PREPARING}</span>
            <span className="text-xs">Cooking</span>
          </div>
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all ${
            activeStatus === 'ready'
              ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30' 
              : 'bg-secondary/50 text-text/60 border border-accent/10'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-base">{orderCounts.READY}</span>
            <span className="text-xs">Ready</span>
          </div>
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all ${
            activeStatus === 'completed'
              ? 'bg-success/20 text-success border-2 border-success/30' 
              : 'bg-secondary/50 text-text/60 border border-accent/10'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-base">{orderCounts.COMPLETED}</span>
            <span className="text-xs">Done</span>
          </div>
        </div>
      </div>

      {/* Orders List - Compact Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Utensils className="w-16 h-16 text-accent/50 mx-auto mb-4" />
          <p className="text-xl font-semibold text-accent mb-2">No Orders Found</p>
          <p className="text-text/60 text-base">
            {activeStatus === 'all' 
              ? 'No orders available at the moment.' 
              : `No ${activeStatus} orders at the moment.`}
          </p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </>
  );
}

export default function KDSPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading...</div>
        </div>
      </div>
    }>
      <KDSPageContent />
    </Suspense>
  );
}

