'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, ArrowRight, UtensilsCrossed, Package, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function OrderConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, _hasHydrated } = useAuthStore();
  const { settings } = useRestaurantSettings();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', 'pending'
  const [error, setError] = useState(null);

  const orderId = searchParams?.get('orderId');
  const reference = searchParams?.get('reference') || searchParams?.get('trxref');

  useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (!orderId) {
      setError('Order ID is missing');
      setLoading(false);
      return;
    }

    // Fetch order and verify payment
    fetchOrderAndVerify();
  }, [orderId, reference, user, token, _hasHydrated, router]);

  const fetchOrderAndVerify = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, fetch the order
      const orderResponse = await api.get(`/orders/${orderId}`);
      const fetchedOrder = orderResponse.data.order;
      setOrder(fetchedOrder);

      // Check if payment is already verified
      if (fetchedOrder.paymentStatus === 'PAID') {
        setPaymentStatus('success');
        setLoading(false);
        toast.success('Payment verified successfully!');
        return;
      }

      // If we have a reference, verify the payment
      if (reference) {
        setVerifying(true);
        try {
          const verifyResponse = await api.post('/payments/verify', {
            reference: reference,
          });
          
          if (verifyResponse.data.order) {
            setOrder(verifyResponse.data.order);
            setPaymentStatus('success');
            toast.success('Payment verified successfully!');
          } else {
            setPaymentStatus('pending');
          }
        } catch (verifyError) {
          console.error('Payment verification error:', verifyError);
          // Payment might not be verified yet, but order exists
          setPaymentStatus('pending');
          toast.error(verifyError.response?.data?.error || 'Payment verification failed');
        } finally {
          setVerifying(false);
        }
      } else {
        // No reference, check order status
        if (fetchedOrder.paymentStatus === 'PENDING') {
          setPaymentStatus('pending');
        } else if (fetchedOrder.paymentStatus === 'PAID') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('failed');
        }
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error || 'Failed to load order details');
      setPaymentStatus('failed');
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-500/20 text-yellow-500',
      CONFIRMED: 'bg-blue-500/20 text-blue-500',
      PREPARING: 'bg-orange-500/20 text-orange-500',
      READY: 'bg-green-500/20 text-green-500',
      COMPLETED: 'bg-success/20 text-success',
      CANCELLED: 'bg-danger/20 text-danger',
    };
    return colors[status] || 'bg-secondary text-text';
  };

  const getPaymentMethodName = (method) => {
    const methods = {
      'CASH': 'Cash',
      'CARD': 'Card',
      'MOMO': 'Mobile Money',
      'PAYSTACK': 'Paystack',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <div className="text-accent text-xl">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">Error</h1>
          <p className="text-text/60 mb-6">{error}</p>
          <Link href="/orders" className="btn-primary inline-flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Go to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-accent/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-accent group-hover:text-accent-light transition-colors">
                  {settings.restaurantName}
                </div>
                <div className="text-xs text-text/60">Kitchen & Restaurant</div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Payment Status */}
        <div className="card mb-6">
          <div className="text-center">
            {paymentStatus === 'success' ? (
              <>
                <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-success mb-2">Payment Successful!</h1>
                <p className="text-text/60">Your order has been confirmed and payment received.</p>
              </>
            ) : paymentStatus === 'failed' ? (
              <>
                <XCircle className="w-20 h-20 text-danger mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-danger mb-2">Payment Failed</h1>
                <p className="text-text/60">There was an issue processing your payment.</p>
              </>
            ) : verifying ? (
              <>
                <Loader2 className="w-20 h-20 text-accent mx-auto mb-4 animate-spin" />
                <h1 className="text-3xl font-bold text-accent mb-2">Verifying Payment...</h1>
                <p className="text-text/60">Please wait while we verify your payment.</p>
              </>
            ) : (
              <>
                <Clock className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-yellow-500 mb-2">Payment Pending</h1>
                <p className="text-text/60">Your payment is being processed. Please check back later.</p>
              </>
            )}
          </div>
        </div>

        {/* Order Details */}
        {order && (
          <div className="card mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold text-accent">Order Details</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-accent/20">
                <span className="text-text/60">Order Number:</span>
                <span className="font-bold text-accent">{order.orderNumber}</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-accent/20">
                <span className="text-text/60">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-accent/20">
                <span className="text-text/60">Payment Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.paymentStatus === 'PAID' 
                    ? 'bg-success/20 text-success' 
                    : order.paymentStatus === 'PENDING'
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : 'bg-danger/20 text-danger'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>

              {order.paymentMethod && (
                <div className="flex justify-between items-center pb-4 border-b border-accent/20">
                  <span className="text-text/60">Payment Method:</span>
                  <span className="font-medium">{getPaymentMethodName(order.paymentMethod)}</span>
                </div>
              )}

              {order.deliveryAddress && (
                <div className="pb-4 border-b border-accent/20">
                  <span className="text-text/60 block mb-1">Delivery Address:</span>
                  <span className="font-medium">{order.deliveryAddress}</span>
                </div>
              )}

              {order.items && order.items.length > 0 && (
                <div>
                  <span className="text-text/60 block mb-2">Items:</span>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.menuItem?.name || 'Item'}</div>
                          {item.variant && (
                            <div className="text-sm text-text/60">Variant: {item.variant.name}</div>
                          )}
                          {item.addons && item.addons.length > 0 && (
                            <div className="text-sm text-text/60">
                              Addons: {item.addons.map(a => a.addon?.name || 'Addon').join(', ')}
                            </div>
                          )}
                          <div className="text-sm text-text/60">Qty: {item.quantity}</div>
                        </div>
                        <div className="font-medium">
                          {settings.currencySymbol}{item.totalPrice?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-accent/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-text/60">Subtotal:</span>
                  <span className="font-medium">{settings.currencySymbol}{order.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-text/60">Tax:</span>
                    <span className="font-medium">{settings.currencySymbol}{order.tax?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-text/60">Discount:</span>
                    <span className="font-medium text-success">-{settings.currencySymbol}{order.discount?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-accent/20">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-lg font-bold text-accent">{settings.currencySymbol}{order.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/orders" className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Package className="w-4 h-4" />
            View All Orders
          </Link>
          <Link href="/menu" className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <div className="text-accent text-xl">Loading order details...</div>
        </div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}
