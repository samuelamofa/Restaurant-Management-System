const express = require('express');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All kitchen routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/kitchen/dashboard
 * @desc    Get kitchen staff dashboard statistics
 * @access  Private (Kitchen Staff, Admin)
 */
router.get('/dashboard', authorize('KITCHEN_STAFF', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's prepared orders - include both READY and COMPLETED
    // Use the same simplified query structure as reports
    const baseConditions = [];
    
    // Add READY orders condition
    baseConditions.push({
      status: 'READY',
      readyAt: {
        gte: today,
        lt: tomorrow,
      },
    });
    
    // Add COMPLETED orders conditions - check both completedAt and readyAt
    baseConditions.push({
      status: 'COMPLETED',
      completedAt: {
        gte: today,
        lt: tomorrow,
      },
    });
    
    baseConditions.push({
      status: 'COMPLETED',
      readyAt: {
        gte: today,
        lt: tomorrow,
      },
    });

    const whereClause = {
      AND: [
        {
          OR: baseConditions,
        },
        { preparedById: userId },
      ],
    };

    const todayPreparedOrders = await prisma.order.findMany({
      where: whereClause,
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
      orderBy: [
        {
          readyAt: 'desc',
        },
        {
          completedAt: 'desc',
        },
      ],
    });

    // Calculate statistics
    const totalPrepared = todayPreparedOrders.length;
    const totalItemsPrepared = todayPreparedOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    const totalValue = todayPreparedOrders.reduce((sum, order) => sum + order.total, 0);
    
    // Average preparation time (if we have readyAt and createdAt)
    const avgPrepTime = todayPreparedOrders.length > 0
      ? todayPreparedOrders.reduce((sum, order) => {
          if (order.readyAt && order.createdAt) {
            const prepTime = (new Date(order.readyAt) - new Date(order.createdAt)) / 1000 / 60; // minutes
            return sum + prepTime;
          }
          return sum;
        }, 0) / todayPreparedOrders.length
      : 0;

    // Get recent prepared orders (last 20)
    const recentOrders = todayPreparedOrders.slice(0, 20);

    res.json({
      stats: {
        totalPrepared,
        totalItemsPrepared,
        totalValue,
        avgPrepTime: Math.round(avgPrepTime * 10) / 10, // Round to 1 decimal
      },
      recentOrders,
    });
  } catch (error) {
    console.error('Get kitchen dashboard error:', error);
    res.status(500).json({ error: 'Failed to get kitchen dashboard data' });
  }
});

/**
 * @route   GET /api/kitchen/reports
 * @desc    Get kitchen staff reports with date filtering
 * @access  Private (Kitchen Staff, Admin)
 */
router.get('/reports', authorize('KITCHEN_STAFF', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const { startDate, endDate, staffId } = req.query;

    // Default to today if no dates provided
    let start = new Date();
    start.setHours(0, 0, 0, 0);
    let end = new Date(start);
    end.setDate(end.getDate() + 1);

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
    }

    // Build where clause - include orders that are READY or COMPLETED
    // For READY orders, check readyAt date
    // For COMPLETED orders, check completedAt date (or readyAt if available)
    const baseConditions = [];
    
    // Add READY orders condition
    baseConditions.push({
      status: 'READY',
      readyAt: {
        gte: start,
        lt: end,
      },
    });
    
    // Add COMPLETED orders conditions - check both completedAt and readyAt
    baseConditions.push({
      status: 'COMPLETED',
      completedAt: {
        gte: start,
        lt: end,
      },
    });
    
    baseConditions.push({
      status: 'COMPLETED',
      readyAt: {
        gte: start,
        lt: end,
      },
    });

    // Build complete where clause with staff filter
    const whereClause = {
      AND: [
        {
          OR: baseConditions,
        },
        // Add staff filter if needed
        ...(isAdmin && staffId 
          ? [{ preparedById: staffId }]
          : !isAdmin 
          ? [{ preparedById: userId }]
          : []
        ),
      ],
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            variant: {
              select: {
                name: true,
              },
            },
            addons: {
              include: {
                addon: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        preparedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        readyAt: 'desc',
      },
      // No limit - return ALL orders individually
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0);

    // Group by staff member (if admin)
    const staffStats = {};
    if (isAdmin) {
      orders.forEach((order) => {
        if (order.preparedBy) {
          const staffId = order.preparedBy.id;
          if (!staffStats[staffId]) {
            staffStats[staffId] = {
              staff: order.preparedBy,
              totalOrders: 0,
              totalItems: 0,
              totalValue: 0,
            };
          }
          staffStats[staffId].totalOrders++;
          staffStats[staffId].totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
          staffStats[staffId].totalValue += order.total;
        }
      });
    }

    res.json({
      period: {
        startDate: start.toISOString(),
        endDate: new Date(end.getTime() - 1).toISOString(),
      },
      stats: {
        totalOrders,
        totalItems,
        totalValue,
      },
      staffStats: Object.values(staffStats),
      orders,
    });
  } catch (error) {
    console.error('Get kitchen reports error:', error);
    res.status(500).json({ error: 'Failed to get kitchen reports' });
  }
});

module.exports = router;

