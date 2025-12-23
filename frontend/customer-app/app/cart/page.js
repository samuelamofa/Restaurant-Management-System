'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, MapPin, Phone, UtensilsCrossed, Package } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const { user, token, _hasHydrated, logout } = useAuthStore();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [orderType, setOrderType] = useState('ONLINE'); // Default to Delivery
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  useEffect(() => {
    setMounted(true);
    // Pre-fill contact phone from user profile if available
    if (user?.phone) {
      setContactPhone(user.phone);
    }
  }, [user]);

  const handleCheckout = async () => {
    // Wait for hydration
    if (!_hasHydrated || !mounted) {
      toast.error('Please wait...');
      return;
    }

    if (!user || !token) {
      toast.error('Please login to continue');
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate based on order type
    if (orderType === 'ONLINE') {
      // Validate delivery information for online orders
      if (!deliveryAddress || deliveryAddress.trim() === '') {
        toast.error('Please provide your delivery address');
        return;
      }

      if (!contactPhone || contactPhone.trim() === '') {
        toast.error('Please provide your contact phone number');
        return;
      }

      // Basic phone validation
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(contactPhone)) {
        toast.error('Please enter a valid phone number');
        return;
      }
    } else if (orderType === 'DINE_IN') {
      // Validate table number for dine-in orders
      if (!tableNumber || tableNumber.trim() === '') {
        toast.error('Please enter or select a table number');
        return;
      }
    } else if (orderType === 'TAKEAWAY') {
      // Takeaway orders don't require additional validation
      // But we can still validate phone if provided
      if (contactPhone && contactPhone.trim() !== '') {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(contactPhone)) {
          toast.error('Please enter a valid phone number');
          return;
        }
      }
    }

    setProcessing(true);

    try {
      // Create order
      const orderData = {
        orderType: orderType,
        items: items.map((item) => {
          const orderItem = {
            menuItemId: item.menuItemId,
            quantity: parseInt(item.quantity, 10), // Ensure quantity is an integer
            addons: item.addons || [],
          };
          // Only include variantId if it exists and is not null
          if (item.variantId) {
            orderItem.variantId = item.variantId;
          }
          // Only include notes if they exist
          if (item.notes) {
            orderItem.notes = item.notes;
          }
          return orderItem;
        }),
      };

      // Add order type specific fields
      if (orderType === 'ONLINE') {
        orderData.deliveryAddress = deliveryAddress.trim();
        orderData.contactPhone = contactPhone.trim();
      } else if (orderType === 'DINE_IN') {
        orderData.tableNumber = tableNumber.trim();
        // Optionally include contact phone for dine-in if provided
        if (contactPhone && contactPhone.trim() !== '') {
          orderData.contactPhone = contactPhone.trim();
        }
      } else if (orderType === 'TAKEAWAY') {
        // Optionally include contact phone for takeaway if provided
        if (contactPhone && contactPhone.trim() !== '') {
          orderData.contactPhone = contactPhone.trim();
        }
      }

      // Validate order data before sending
      if (!orderData.items || orderData.items.length === 0) {
        toast.error('Your cart is empty');
        setProcessing(false);
        return;
      }

      // Validate each item has required fields
      for (const item of orderData.items) {
        if (!item.menuItemId) {
          toast.error('Invalid cart item: missing menu item ID');
          setProcessing(false);
          return;
        }
        if (!item.quantity || item.quantity < 1) {
          toast.error('Invalid cart item: quantity must be at least 1');
          setProcessing(false);
          return;
        }
      }

      console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
      
      // Step 1: Create order
      let orderResponse;
      try {
        orderResponse = await api.post('/orders', orderData);
        console.log('Order created successfully:', orderResponse.data);
      } catch (orderError) {
        console.error('Order creation failed:', orderError);
        throw orderError; // Re-throw to be caught by outer catch
      }
      
      const order = orderResponse.data.order;
      if (!order || !order.id) {
        throw new Error('Order was created but no order ID was returned');
      }

      // Step 2: Initialize payment
      try {
        const paymentResponse = await api.post('/payments/initialize', {
          orderId: order.id,
        });

        // Check if test mode (Paystack not configured)
        if (paymentResponse.data.testMode) {
          toast.success('Order placed successfully! (Test Mode)');
          clearCart();
          router.push('/orders');
          return;
        }

        // Redirect to Paystack
        if (paymentResponse.data.authorizationUrl) {
          window.location.href = paymentResponse.data.authorizationUrl;
        } else {
          // Fallback: redirect to orders page
          toast.success('Order created successfully!');
          clearCart();
          router.push('/orders');
        }
      } catch (paymentError) {
        console.error('Payment initialization failed:', paymentError);
        // Order was created but payment failed - still show success and redirect
        toast.success('Order created successfully! Payment will be processed later.');
        clearCart();
        router.push('/orders');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      // Handle 401 specifically
      if (error.response?.status === 401) {
        logout();
        toast.error('Session expired. Please login again');
        router.push('/login');
        return;
      }
      
      // Handle 403 (insufficient permission or day closed)
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.error || 'Insufficient permissions. Please ensure you are logged in as a customer.';
        toast.error(errorMessage);
        if (error.response?.data?.dayClosed) {
          // Day is closed, don't redirect to login
          setProcessing(false);
          return;
        }
        router.push('/login');
        return;
      }
      
      // Handle validation errors (400)
      if (error.response?.status === 400) {
        const errors = error.response?.data?.errors;
        if (errors && Array.isArray(errors) && errors.length > 0) {
          // Show first validation error
          const firstError = errors[0];
          const errorMsg = firstError.msg || firstError.message || 'Validation error';
          console.error('Validation error:', firstError);
          toast.error(errorMsg);
        } else {
          const errorMsg = error.response?.data?.error || 'Invalid order data. Please check your cart items.';
          console.error('Error message:', errorMsg);
          toast.error(errorMsg);
        }
        setProcessing(false);
        return;
      }
      
      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
        setProcessing(false);
        return;
      }
      
      // Handle timeout errors
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Please try again.');
        setProcessing(false);
        return;
      }
      
      // Generic error - show more details
      let errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to process checkout';
      
      // If we have details in development mode, show them
      if (error.response?.data?.details) {
        errorMsg = `${errorMsg}: ${error.response.data.details}`;
      }
      
      console.error('Generic error:', errorMsg);
      console.error('Full error response:', error.response?.data);
      toast.error(errorMsg);
      setProcessing(false);
    }
  };

  const subtotal = getTotal();
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 mx-auto mb-4 text-text/30" />
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <button
            onClick={() => router.push('/menu')}
            className="btn-primary"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-accent px-4">Shopping Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="card flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{item.name || 'Menu Item'}</h3>
                    {item.variantName && (
                      <p className="text-sm text-text/60 mb-1">Size: {item.variantName}</p>
                    )}
                    <p className="text-accent font-bold">₵{item.totalPrice.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-danger hover:bg-danger/20 rounded transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

              {/* Order Summary & Delivery Info */}
              <div className="lg:col-span-1 order-1 lg:order-2">
                <div className="card sticky top-20 lg:top-24 space-y-6">
                  {/* Order Type Selection */}
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-accent">Order Type</h2>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-secondary border border-accent/20 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors">
                        <input
                          type="radio"
                          name="orderType"
                          value="ONLINE"
                          checked={orderType === 'ONLINE'}
                          onChange={(e) => setOrderType(e.target.value)}
                          className="w-4 h-4 text-accent"
                        />
                        <MapPin className="w-5 h-5 text-accent" />
                        <span className="flex-1 font-medium">Delivery</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-secondary border border-accent/20 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors">
                        <input
                          type="radio"
                          name="orderType"
                          value="DINE_IN"
                          checked={orderType === 'DINE_IN'}
                          onChange={(e) => setOrderType(e.target.value)}
                          className="w-4 h-4 text-accent"
                        />
                        <UtensilsCrossed className="w-5 h-5 text-accent" />
                        <span className="flex-1 font-medium">Dine In</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-secondary border border-accent/20 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors">
                        <input
                          type="radio"
                          name="orderType"
                          value="TAKEAWAY"
                          checked={orderType === 'TAKEAWAY'}
                          onChange={(e) => setOrderType(e.target.value)}
                          className="w-4 h-4 text-accent"
                        />
                        <Package className="w-5 h-5 text-accent" />
                        <span className="flex-1 font-medium">Takeaway</span>
                      </label>
                    </div>
                  </div>

                  {/* Conditional Fields Based on Order Type */}
                  {orderType === 'ONLINE' && (
                    <div>
                      <h2 className="text-xl font-bold mb-4 text-accent flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Delivery Information
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text/80 mb-2">
                            Delivery Address <span className="text-danger">*</span>
                          </label>
                          <textarea
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Enter your full delivery address"
                            className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg text-text placeholder:text-text/40 focus:outline-none focus:border-accent transition-colors resize-none"
                            rows={3}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text/80 mb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Contact Phone <span className="text-danger">*</span>
                          </label>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="e.g., 0551234567"
                            className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg text-text placeholder:text-text/40 focus:outline-none focus:border-accent transition-colors"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {orderType === 'DINE_IN' && (
                    <div>
                      <h2 className="text-xl font-bold mb-4 text-accent flex items-center gap-2">
                        <UtensilsCrossed className="w-5 h-5" />
                        Table Information
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text/80 mb-2">
                            Table Number <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="Enter or select table number (e.g., 1, 2, 3, A1, B2)"
                            className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg text-text placeholder:text-text/40 focus:outline-none focus:border-accent transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text/80 mb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Contact Phone <span className="text-text/40">(Optional)</span>
                          </label>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="e.g., 0551234567"
                            className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg text-text placeholder:text-text/40 focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {orderType === 'TAKEAWAY' && (
                    <div>
                      <h2 className="text-xl font-bold mb-4 text-accent flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Contact Information
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text/80 mb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Contact Phone <span className="text-text/40">(Optional)</span>
                          </label>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="e.g., 0551234567"
                            className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg text-text placeholder:text-text/40 focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="border-t border-accent/20 pt-6">
                    <h2 className="text-xl font-bold mb-4 text-accent">Order Summary</h2>
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-semibold">₵{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (5%)</span>
                        <span className="font-semibold">₵{tax.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-accent/20 pt-4 flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-accent">₵{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={
                      processing ||
                      (orderType === 'ONLINE' && (!deliveryAddress.trim() || !contactPhone.trim())) ||
                      (orderType === 'DINE_IN' && !tableNumber.trim())
                    }
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Proceed to Checkout'}
                  </button>

                  <button
                    onClick={() => router.push('/menu')}
                    className="w-full mt-4 btn-secondary"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}

