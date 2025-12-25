'use client';

import { useEffect, useRef } from 'react';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';

export default function Receipt({ order, cart, totals, orderType, tableNumber, paymentMethod, user }) {
  const receiptRef = useRef(null);
  const { settings } = useRestaurantSettings();

  useEffect(() => {
    if (receiptRef.current) {
      // Auto-print when component mounts
      window.print();
    }
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

  return (
    <div className="hidden print:block" style={{ display: 'none' }}>
      <div
        ref={receiptRef}
        className="mx-auto p-4 bg-white text-black font-mono text-xs"
        style={{ width: '80mm', maxWidth: '80mm', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="text-center mb-4 border-b-2 border-black pb-2">
          <h1 className="text-lg font-bold uppercase">{settings.restaurantName || 'De Fusion Flame'}</h1>
          <p className="text-xs">Kitchen & Restaurant</p>
          {settings.restaurantPhone && (
            <p className="text-xs mt-1">Tel: {settings.restaurantPhone}</p>
          )}
          {settings.restaurantEmail && (
            <p className="text-xs">Email: {settings.restaurantEmail}</p>
          )}
        </div>

        {/* Order Info */}
        <div className="mb-3 border-b border-gray-400 pb-2">
          <div className="flex justify-between mb-1">
            <span>Order #:</span>
            <span className="font-bold">{order?.orderNumber || 'N/A'}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Date:</span>
            <span>{formatDate(order?.createdAt || new Date())}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Type:</span>
            <span>{orderType === 'DINE_IN' ? 'Dine In' : 'Takeaway'}</span>
          </div>
          {tableNumber && (
            <div className="flex justify-between mb-1">
              <span>Table:</span>
              <span className="font-bold">{tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between mb-1">
            <span>Cashier:</span>
            <span>{user?.firstName || user?.email || 'Staff'}</span>
          </div>
        </div>

        {/* Items */}
        <div className="mb-3 border-b border-gray-400 pb-2">
          <div className="text-center font-bold mb-2 border-b border-gray-300 pb-1">
            ITEMS
          </div>
          {cart.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="font-semibold">{item.quantity}x {item.menuItemName}</span>
                <span className="font-bold">₵{item.totalPrice.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600 pl-4">
                @ ₵{item.unitPrice.toFixed(2)} each
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mb-3 border-b-2 border-black pb-2">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>₵{totals.subtotal.toFixed(2)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between mb-1">
              <span>Discount:</span>
              <span>-₵{totals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between mb-1">
            <span>Tax (5%):</span>
            <span>₵{totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-400">
            <span>TOTAL:</span>
            <span>₵{totals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="mb-3 border-b border-gray-400 pb-2">
          <div className="flex justify-between mb-1">
            <span>Payment Method:</span>
            <span className="font-bold">{getPaymentMethodName(paymentMethod)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Amount Paid:</span>
            <span className="font-bold">₵{totals.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Change:</span>
            <span>₵0.00</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 pt-2 border-t-2 border-black">
          <p className="text-xs font-bold mb-1">Thank you for your patronage!</p>
          <p className="text-xs">Please come again</p>
          <p className="text-xs mt-2">--- End of Receipt ---</p>
        </div>
      </div>
    </div>
  );
}

