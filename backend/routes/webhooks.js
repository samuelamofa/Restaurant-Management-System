const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../config/database');

// Note: Paystack webhook uses raw body, so we need to handle it differently

const router = express.Router();

// Helper function to get Paystack webhook secret (database settings take priority over env vars)
async function getPaystackWebhookSecret() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'system' },
    });
    return settings?.paystackWebhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET || '';
  } catch (error) {
    console.error('Error fetching Paystack webhook secret from settings:', error);
    return process.env.PAYSTACK_WEBHOOK_SECRET || '';
  }
}

/**
 * @route   POST /api/webhooks/paystack
 * @desc    Paystack webhook handler
 * @access  Public (verified by signature)
 */
router.post('/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // req.body is a Buffer when using express.raw(), convert to string for signature verification
    const bodyString = req.body.toString();
    
    // Get webhook secret from database settings (fallback to env var)
    const webhookSecret = await getPaystackWebhookSecret();
    
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(bodyString)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(bodyString);

    // Handle different event types
    if (event.event === 'charge.success') {
      const transaction = event.data;
      if (!transaction || !transaction.reference) {
        console.error('Invalid transaction data in webhook');
        return res.status(400).send('Invalid transaction data');
      }
      const reference = transaction.reference;

      // Find order by reference
      const order = await prisma.order.findFirst({
        where: { paystackRef: reference },
        include: { items: true },
      });

      if (order && order.paymentStatus !== 'PAID') {
        // Update order
        await prisma.order.update({
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
            amount: (transaction.amount || order.total * 100) / 100, // Fallback to order total if amount missing
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
          const updatedOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
              items: {
                include: {
                  menuItem: true,
                },
              },
              customer: true,
            },
          });

          io.to('kitchen').emit('order:new', updatedOrder);
          io.to('pos').emit('order:new', updatedOrder);
          if (order.customerId) {
            io.to(`user:${order.customerId}`).emit('order:paid', updatedOrder);
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

module.exports = router;

