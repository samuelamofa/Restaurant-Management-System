const express = require('express');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All staff routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/staff/dashboard
 * @desc    Get today's sales statistics for the logged-in staff member
 * @access  Private (Receptionist, Cashier, Admin)
 */
router.get('/dashboard', authorize('RECEPTIONIST', 'CASHIER', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get today's date range (start and end of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's orders created by this staff member
    const todayOrders = await prisma.order.findMany({
      where: {
        createdById: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        paymentStatus: 'PAID',
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const totalSales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = todayOrders.length;
    const totalItems = todayOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    // Payment method breakdown
    const paymentMethods = {
      CASH: 0,
      CARD: 0,
      MOMO: 0,
    };

    todayOrders.forEach((order) => {
      if (order.paymentMethod && paymentMethods.hasOwnProperty(order.paymentMethod)) {
        paymentMethods[order.paymentMethod] += order.total;
      }
    });

    // Order type breakdown
    const orderTypes = {
      DINE_IN: 0,
      TAKEAWAY: 0,
      ONLINE: 0,
    };

    todayOrders.forEach((order) => {
      if (orderTypes.hasOwnProperty(order.orderType)) {
        orderTypes[order.orderType]++;
      }
    });

    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    res.json({
      stats: {
        totalSales,
        totalOrders,
        totalItems,
        averageOrderValue,
      },
      paymentMethods,
      orderTypes,
      recentOrders: todayOrders.slice(0, 10), // Last 10 orders
    });
  } catch (error) {
    console.error('Get staff dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

module.exports = router;

