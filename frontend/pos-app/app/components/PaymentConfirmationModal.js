'use client';

import { X, AlertCircle } from 'lucide-react';

export default function PaymentConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  paymentMethod, 
  total,
  processing 
}) {
  if (!isOpen) return null;

  const getPaymentMethodName = (method) => {
    const methods = {
      'CASH': 'Cash',
      'CARD': 'Card',
      'MOMO': 'Mobile Money',
    };
    return methods[method] || method;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-primary rounded-lg shadow-2xl max-w-md w-full mx-4 border border-accent/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-accent/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-text">Confirm Payment</h2>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-text/60 hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text/80 mb-4">
            Are you sure you want to process this payment?
          </p>
          
          <div className="bg-secondary rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-text/70">Payment Method:</span>
              <span className="font-semibold text-text">{getPaymentMethodName(paymentMethod)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text/70">Total Amount:</span>
              <span className="font-bold text-accent text-lg">₵{total.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-sm text-text/60 mb-4">
            This will process the payment and print the receipt. This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-accent/20">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-3 bg-secondary text-text rounded-lg font-semibold hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className="flex-1 px-4 py-3 bg-accent text-primary rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              'Process Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

