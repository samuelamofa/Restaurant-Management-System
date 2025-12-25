const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

// Helper function to get Paystack keys (database settings take priority over env vars)
async function getPaystackKeys() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'system' },
    });
    
    return {
      secretKey: settings?.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY || null,
      publicKey: settings?.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || null,
      webhookSecret: settings?.paystackWebhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET || null,
    };
  } catch (error) {
    console.error('Error fetching Paystack keys from settings:', error);
    // Fallback to environment variables
    return {
      secretKey: process.env.PAYSTACK_SECRET_KEY || null,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || null,
    };
  }
}

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize Paystack payment for online order
 * @access  Private (Customer)
 */
router.post(
  '/initialize',
  authenticate,
  authorize('CUSTOMER'),
  [body('orderId').notEmpty().withMessage('Order ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { orderId } = req.body;

      // Get order
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          customerId: req.user.id,
          orderType: 'ONLINE',
          paymentStatus: 'PENDING',
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found or already paid' });
      }

      // Get Paystack keys (database settings take priority)
      let paystackKeys = await getPaystackKeys();
      
      // Check if Paystack is configured
      if (!paystackKeys.secretKey || 
          paystackKeys.secretKey === 'your-paystack-secret-key' ||
          paystackKeys.secretKey === 'sk_test_your_test_key') {
        // Test mode: Mark order as paid without Paystack
        // Paystack not configured - Using test mode
        
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'PAYSTACK', // Online orders should always use PAYSTACK, even in test mode
            status: 'CONFIRMED',
          },
        });

        // Create payment record
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.total,
            method: 'PAYSTACK', // Online orders should always use PAYSTACK
            status: 'PAID',
          },
        });

        await createAuditLog({
          userId: req.user.id,
          action: 'INITIALIZE_PAYMENT',
          entity: 'Payment',
          entityId: orderId,
          details: { testMode: true, amount: order.total },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        // Return success with order confirmation URL
        return res.json({
          message: 'Order created successfully (Test Mode - Paystack not configured)',
          testMode: true,
          order: await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { menuItem: true } } },
          }),
          redirectUrl: `${process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:3000'}/orders`,
        });
      }

      // Initialize Paystack payment
      const paymentData = {
        email: req.user.email || req.user.phone + '@defusionflame.com',
        amount: Math.round(order.total * 100), // Convert to kobo/pesewas
        reference: `DF-${order.orderNumber}-${Date.now()}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: req.user.id,
        },
        callback_url: `${process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:3000'}/order-confirmation?orderId=${order.id}`,
      };

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${paystackKeys.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        return res.status(400).json({ error: 'Failed to initialize payment', details: response.data.message });
      }

      // Store payment reference
      await prisma.order.update({
        where: { id: orderId },
        data: { paystackRef: paymentData.reference },
      });

      await createAuditLog({
        userId: req.user.id,
        action: 'INITIALIZE_PAYMENT',
        entity: 'Payment',
        entityId: orderId,
        details: { reference: paymentData.reference, amount: order.total },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        message: 'Payment initialized successfully',
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: paymentData.reference,
      });
    } catch (error) {
      console.error('Initialize payment error:', error);
      
      // Get Paystack keys to check configuration
      let paystackKeys;
      try {
        paystackKeys = await getPaystackKeys();
      } catch (keysError) {
        // If we can't get keys, use fallback
        paystackKeys = {
          secretKey: process.env.PAYSTACK_SECRET_KEY || null,
          publicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
        };
      }
      
      // Check if Paystack secret key is missing
      if (!paystackKeys.secretKey || paystackKeys.secretKey === 'sk_test_your_test_key') {
        return res.status(500).json({ 
          error: 'Payment gateway not configured. Please configure Paystack API keys in Settings',
          details: 'Paystack Secret Key is missing or not set properly. Go to Admin Dashboard > Settings > Payment Gateway to configure.'
        });
      }
      
      // Check if it's an axios error (Paystack API error)
      if (error.response) {
        return res.status(error.response.status || 500).json({ 
          error: 'Failed to initialize payment with Paystack',
          details: error.response.data?.message || error.message
        });
      }
      
      // Network or other errors
      res.status(500).json({ 
        error: 'Failed to initialize payment',
        details: error.message || 'Unknown error occurred'
      });
    }
  }
);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Paystack payment
 * @access  Private (Customer)
 */
router.post(
  '/verify',
  authenticate,
  authorize('CUSTOMER'),
  [body('reference').notEmpty().withMessage('Payment reference is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { reference } = req.body;

      // Get Paystack keys (database settings take priority)
      const paystackKeys = await getPaystackKeys();

      // Verify payment with Paystack
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackKeys.secretKey}`,
          },
        }
      );

      if (!response.data.status || response.data.data.status !== 'success') {
        return res.status(400).json({ error: 'Payment verification failed', details: response.data.message });
      }

      const transaction = response.data.data;

      // Find order by reference
      const order = await prisma.order.findFirst({
        where: { paystackRef: reference },
        include: { items: true },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.paymentStatus === 'PAID') {
        return res.json({ message: 'Payment already verified', order });
      }

      // Update order payment status
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: 'PAYSTACK',
          status: 'CONFIRMED',
        },
      });

      // Create or update payment record
      await prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          amount: transaction.amount / 100, // Convert from kobo/pesewas
          method: 'PAYSTACK',
          status: 'PAID',
          paystackRef: reference,
          paystackData: JSON.stringify(transaction),
        },
        update: {
          status: 'PAID',
          paystackData: JSON.stringify(transaction),
        },
      });

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to('kitchen').emit('order:new', updatedOrder);
        io.to('pos').emit('order:new', updatedOrder);
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'VERIFY_PAYMENT',
        entity: 'Payment',
        entityId: order.id,
        details: { reference, amount: transaction.amount / 100 },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ message: 'Payment verified successfully', order: updatedOrder });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  }
);

/**
 * @route   POST /api/payments/pos
 * @desc    Process POS payment (Cash, Card, MOMO)
 * @access  Private (Receptionist, Cashier, Admin)
 */
router.post(
  '/pos',
  authenticate,
  authorize('RECEPTIONIST', 'CASHIER', 'ADMIN'),
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('method').isIn(['CASH', 'CARD', 'MOMO']).withMessage('Invalid payment method'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { orderId, method, amount } = req.body;

      // Get order
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          paymentStatus: 'PENDING',
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found or already paid' });
      }

      if (Math.abs(amount - order.total) > 0.01) {
        return res.status(400).json({ error: 'Payment amount does not match order total' });
      }

      // Update order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: method,
          status: 'CONFIRMED',
        },
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount,
          method,
          status: 'PAID',
        },
      });

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to('kitchen').emit('order:new', updatedOrder);
        io.to('pos').emit('order:paid', updatedOrder);
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'PROCESS_POS_PAYMENT',
        entity: 'Payment',
        entityId: order.id,
        details: { method, amount, orderNumber: order.orderNumber },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ message: 'Payment processed successfully', order: updatedOrder });
    } catch (error) {
      console.error('Process POS payment error:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  }
);

/**
 * @route   GET /api/payments/transactions
 * @desc    Get payment transactions (Admin only)
 * @access  Private (Admin)
 */
router.get('/transactions', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { method, status, startDate, endDate, limit = 100, offset = 0 } = req.query;

    const where = {};

    if (method) where.method = method;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.payment.count({ where });
    const totalAmount = await prisma.payment.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { amount: true },
    });

    res.json({
      payments,
      total,
      totalAmount: totalAmount._sum.amount || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;

