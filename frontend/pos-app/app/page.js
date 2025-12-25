'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Smartphone } from 'lucide-react';
import api, { setTokenGetter } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CartContext } from './components/POSLayout';
import Receipt from './components/Receipt';
import PaymentConfirmationModal from './components/PaymentConfirmationModal';
import toast from 'react-hot-toast';

// Hook to use cart context
export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    // Return default values if context is not available
    return { cartCount: 0, setCartCount: () => {} };
  }
  return context;
};

export default function POSPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  
  const router = useRouter();
  const { user, token, _hasHydrated } = useAuthStore();
  const { setCartCount } = useCartContext();

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
    // Set up token getter for API interceptor
    setTokenGetter(() => useAuthStore.getState().token);
  }, []);

  // Force hydration after a delay if it hasn't happened
  useEffect(() => {
    if (!_hasHydrated && isMounted) {
      const timer = setTimeout(() => {
        useAuthStore.getState().setHasHydrated(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [_hasHydrated, isMounted]);

  useEffect(() => {
    // Wait for component to mount and Zustand to hydrate from localStorage before checking auth
    if (!isMounted || !_hasHydrated) {
      return;
    }

    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    // Verify user has POS access (RECEPTIONIST, CASHIER, or ADMIN)
    const allowedRoles = ['RECEPTIONIST', 'CASHIER', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      toast.error('Access denied. POS access required.');
      router.push('/login');
      return;
    }
    
    fetchMenu();
  }, [isMounted, user, token, _hasHydrated, router]);

  // Update cart count in header
  useEffect(() => {
    setCartCount(cart.length);
  }, [cart, setCartCount]);

  const fetchMenu = async () => {
    setMenuLoading(true);
    try {
      // Fetch categories
      const categoriesRes = await api.get('/menu/categories');
      setCategories(categoriesRes.data.categories || []);
      
      // Fetch all menu items
      const allItemsRes = await api.get('/menu/items');
      const items = allItemsRes.data.items || [];
      
      setAllMenuItems(items);
      setMenuItems(items);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load menu';
      toast.error(errorMessage);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when changing category
    
    try {
      if (categoryId === 'all') {
        // Show all items
        setMenuItems(allMenuItems);
      } else {
        // Fetch items for specific category
        const response = await api.get(`/menu/items?categoryId=${categoryId}`);
        setMenuItems(response.data.items);
      }
    } catch (error) {
      toast.error('Failed to load menu items');
    }
  };

  // Filter menu items based on search query
  // If searching, search through all items regardless of category
  // Otherwise, use the current category's items
  const itemsToFilter = searchQuery ? allMenuItems : menuItems;
  const filteredMenuItems = itemsToFilter.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) ||
           item.description?.toLowerCase().includes(query);
  });

  const addToCart = (item) => {
    if (!item.isAvailable) {
      toast.error('Item is out of stock');
      return;
    }

    const cartItem = {
      menuItemId: item.id,
      menuItemName: item.name,
      variantId: null,
      quantity: 1,
      unitPrice: item.basePrice,
      totalPrice: item.basePrice,
    };

    setCart([...cart, cartItem]);
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (index, quantity) => {
    const updated = [...cart];
    if (quantity <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = quantity;
      updated[index].totalPrice = updated[index].unitPrice * quantity;
    }
    setCart(updated);
  };

  const removeFromCart = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = (subtotal - discount) * 0.05;
    return {
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
    };
  };

  const handlePaymentClick = (method) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (orderType === 'DINE_IN' && !tableNumber) {
      toast.error('Please enter table number');
      return;
    }

    // Check if day is closed
    api.get('/day-session/status')
      .then((dayStatusRes) => {
        if (dayStatusRes.data.daySession?.isClosed) {
          toast.error('Day is closed. Cannot create new orders. Please contact an administrator.');
          return;
        }
        // Show confirmation modal
        setSelectedPaymentMethod(method);
        setShowPaymentModal(true);
      })
      .catch((error) => {
        console.error('Failed to check day status:', error);
        // Continue anyway - backend will also check
        setSelectedPaymentMethod(method);
        setShowPaymentModal(true);
      });
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return;

    const method = selectedPaymentMethod;
    setProcessing(true);

    try {
      const totals = calculateTotal();

      // Create order
      const orderData = {
        orderType,
        tableNumber: orderType === 'DINE_IN' ? tableNumber : null,
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          quantity: item.quantity,
          addons: item.addons || [],
        })),
        discount,
        notes,
      };

      const orderResponse = await api.post('/orders', orderData);
      const order = orderResponse.data.order;

      // Process payment
      await api.post('/payments/pos', {
        orderId: order.id,
        method,
        amount: totals.total,
      });

      toast.success(`Order #${order.orderNumber} created and paid successfully`);
      
      // Set receipt data for printing
      setReceiptData({
        order,
        cart: [...cart],
        totals,
        orderType,
        tableNumber,
        paymentMethod: method,
        user,
      });
      setShowReceipt(true);
      
      // Close modal
      setShowPaymentModal(false);
      setSelectedPaymentMethod(null);
      
      // Clear cart and reset form
      setCart([]);
      setTableNumber('');
      setDiscount(0);
      setNotes('');
      
      // Auto-print receipt after a short delay
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setShowReceipt(false);
          setReceiptData(null);
        }, 1000);
      }, 500);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod(null);
  };

  const totals = calculateTotal();

  // Show loading state until mounted and hydrated
  if (!isMounted || !_hasHydrated) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Get placeholder image for items
  const getItemImage = (item) => {
    if (item.image) {
      // If image is a relative path (uploaded file), prepend backend URL
      if (item.image.startsWith('/uploads/')) {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        return `${API_BASE}${item.image}`;
      }
      return item.image;
    }
    const category = item.category?.name?.toLowerCase() || 'food';
    const foodImages = {
      'starters': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop&q=80',
      'mains': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop&q=80',
      'drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop&q=80',
      'desserts': 'https://images.unsplash.com/photo-1551024506-0bcced828b94?w=300&h=200&fit=crop&q=80',
    };
    return foodImages[category] || foodImages['mains'];
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Menu Section */}
        <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
          <div className="card mb-6">
            {/* Order Type Selection */}
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setOrderType('DINE_IN')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  orderType === 'DINE_IN'
                    ? 'bg-accent text-primary shadow-lg'
                    : 'bg-secondary text-text hover:bg-accent/20'
                }`}
              >
                Dine In
              </button>
              <button
                onClick={() => setOrderType('TAKEAWAY')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-accent text-primary shadow-lg'
                    : 'bg-secondary text-text hover:bg-accent/20'
                }`}
              >
                Takeaway
              </button>
            </div>

            {orderType === 'DINE_IN' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Table Number</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-primary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-lg"
                  placeholder="Enter table number"
                />
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-primary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-lg"
                  placeholder="Search menu items..."
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text/50 hover:text-text transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-accent text-primary shadow-lg'
                    : 'bg-secondary text-text hover:bg-accent/20'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedCategory === category.id
                      ? 'bg-accent text-primary shadow-lg'
                      : 'bg-secondary text-text hover:bg-accent/20'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1 pb-4">
            {menuLoading ? (
              <div className="col-span-full card text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                <p className="text-text/60 text-lg">Loading menu...</p>
              </div>
            ) : (() => {
              const availableItems = filteredMenuItems.filter((item) => item.isAvailable);
              const totalItems = filteredMenuItems.length;
              
              if (totalItems === 0) {
                return (
                  <div className="col-span-full card text-center py-12">
                    <p className="text-text/60 text-lg">
                      {searchQuery 
                        ? 'No items found matching your search' 
                        : allMenuItems.length === 0
                          ? 'No menu items in database. Please add items via Admin panel.'
                          : 'No items match the current filter'}
                    </p>
                    {allMenuItems.length > 0 && allMenuItems.filter(item => !item.isAvailable).length > 0 && (
                      <p className="text-text/40 text-sm mt-2">
                        {allMenuItems.filter(item => !item.isAvailable).length} item(s) are currently unavailable
                      </p>
                    )}
                  </div>
                );
              }
              
              if (availableItems.length === 0 && totalItems > 0) {
                return (
                  <div className="col-span-full card text-center py-12">
                    <p className="text-text/60 text-lg">No available items</p>
                    <p className="text-text/40 text-sm mt-2">
                      {totalItems} item(s) found but all are currently unavailable
                    </p>
                  </div>
                );
              }
              
              return availableItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="card text-left hover:scale-105 transition-all cursor-pointer group"
                >
                  <img
                    src={getItemImage(item)}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      e.target.src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop&q=80`;
                    }}
                  />
                  <h3 className="font-bold text-base mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-accent font-bold text-lg">₵{item.basePrice.toFixed(2)}</p>
                </button>
              ));
            })()}
          </div>
        </div>

        {/* Cart & Payment Section */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <div className="card flex flex-col h-full min-h-0">
            <h2 className="text-2xl font-bold mb-4 text-accent flex items-center gap-2 flex-shrink-0">
              <ShoppingCart className="w-6 h-6" />
              Cart ({cart.length})
            </h2>

            {/* Cart Items */}
            <div className="space-y-2 mb-4 overflow-y-auto flex-1 min-h-0">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-text/60">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Add items to get started</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="bg-secondary p-3 rounded-lg border border-accent/10 hover:border-accent/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs line-clamp-1 flex-1 mr-2">{item.menuItemName}</span>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-danger hover:bg-danger/20 p-1 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-1.5 bg-primary rounded-lg hover:bg-accent/20 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-base w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-1.5 bg-primary rounded-lg hover:bg-accent/20 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-bold text-accent text-base">₵{item.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes */}
            <div className="mb-3 flex-shrink-0">
              <label className="block text-sm font-medium mb-2">Order Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 bg-primary border border-accent/20 rounded-lg focus:outline-none focus:border-accent resize-none"
                rows="2"
                placeholder="Add special instructions..."
              />
            </div>

            {/* Totals */}
            <div className="border-t border-accent/20 pt-3 mb-3 space-y-2 flex-shrink-0">
              <div className="flex justify-between text-sm">
                <span className="text-text/70">Subtotal</span>
                <span className="font-semibold">₵{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-text/70">Discount:</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-primary border border-accent/20 rounded text-sm focus:outline-none focus:border-accent"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-danger">
                  <span>Discount Applied</span>
                  <span className="font-semibold">-₵{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text/70">Tax (5%)</span>
                <span className="font-semibold">₵{totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold border-t border-accent/20 pt-2 mt-2">
                <span>Total</span>
                <span className="text-accent">₵{totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Buttons & Clear Cart in Grid */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              <button
                onClick={() => handlePaymentClick('CASH')}
                disabled={processing || cart.length === 0}
                className="btn-primary flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2.5"
              >
                <DollarSign className="w-4 h-4" />
                Cash
              </button>
              <button
                onClick={() => handlePaymentClick('MOMO')}
                disabled={processing || cart.length === 0}
                className="btn-secondary flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2.5"
              >
                <Smartphone className="w-4 h-4" />
                Momo
              </button>
              <button
                onClick={() => handlePaymentClick('CARD')}
                disabled={processing || cart.length === 0}
                className="btn-secondary flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2.5"
              >
                <CreditCard className="w-4 h-4" />
                Card
              </button>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="btn-danger py-2.5 text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        paymentMethod={selectedPaymentMethod}
        total={totals.total}
        processing={processing}
      />

      {/* Receipt Print Component */}
      {showReceipt && receiptData && (
        <Receipt
          order={receiptData.order}
          cart={receiptData.cart}
          totals={receiptData.totals}
          orderType={receiptData.orderType}
          tableNumber={receiptData.tableNumber}
          paymentMethod={receiptData.paymentMethod}
          user={receiptData.user}
        />
      )}
    </div>
  );
}

