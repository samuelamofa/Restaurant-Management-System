const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

/**
 * @route   GET /api/day-session/status
 * @desc    Get current day session status
 * @access  Private (All authenticated users)
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let daySession = await prisma.daySession.findUnique({
      where: { date: today },
      include: {
        closedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If no session exists for today, create an open one
    if (!daySession) {
      daySession = await prisma.daySession.create({
        data: {
          date: today,
          isClosed: false,
        },
        include: {
          closedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    }

    res.json({ daySession });
  } catch (error) {
    console.error('Get day session status error:', error);
    res.status(500).json({ error: 'Failed to get day session status' });
  }
});

/**
 * @route   GET /api/day-session/summary
 * @desc    Get summary for current day (orders, revenue, etc.)
 * @access  Private (KITCHEN_STAFF, CASHIER, RECEPTIONIST, ADMIN)
 */
router.get('/summary', authenticate, authorize('KITCHEN_STAFF', 'CASHIER', 'RECEPTIONIST', 'ADMIN'), async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all orders for today
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        payment: true,
        items: true,
      },
    });

    // Calculate summary
    const summary = {
      totalOrders: orders.length,
      totalRevenue: 0,
      totalCash: 0,
      totalCard: 0,
      totalMomo: 0,
      totalPaystack: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      preparingOrders: 0,
      readyOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      ordersByType: {
        DINE_IN: 0,
        TAKEAWAY: 0,
        ONLINE: 0,
      },
    };

    orders.forEach((order) => {
      // Revenue
      if (order.paymentStatus === 'PAID') {
        summary.totalRevenue += order.total;
        summary.paidOrders += 1;

        // Payment method breakdown
        if (order.paymentMethod === 'CASH') {
          summary.totalCash += order.total;
        } else if (order.paymentMethod === 'CARD') {
          summary.totalCard += order.total;
        } else if (order.paymentMethod === 'MOMO') {
          summary.totalMomo += order.total;
        } else if (order.paymentMethod === 'PAYSTACK') {
          summary.totalPaystack += order.total;
        }
      } else {
        summary.unpaidOrders += 1;
      }

      // Order status breakdown
      if (order.status === 'PENDING') summary.pendingOrders += 1;
      else if (order.status === 'CONFIRMED') summary.confirmedOrders += 1;
      else if (order.status === 'PREPARING') summary.preparingOrders += 1;
      else if (order.status === 'READY') summary.readyOrders += 1;
      else if (order.status === 'COMPLETED') summary.completedOrders += 1;
      else if (order.status === 'CANCELLED') summary.cancelledOrders += 1;

      // Order type breakdown
      if (order.orderType === 'DINE_IN') summary.ordersByType.DINE_IN += 1;
      else if (order.orderType === 'TAKEAWAY') summary.ordersByType.TAKEAWAY += 1;
      else if (order.orderType === 'ONLINE') summary.ordersByType.ONLINE += 1;
    });

    res.json({ summary });
  } catch (error) {
    console.error('Get day session summary error:', error);
    res.status(500).json({ error: 'Failed to get day session summary' });
  }
});

/**
 * @route   POST /api/day-session/close
 * @desc    Close the day (end of day)
 * @access  Private (KITCHEN_STAFF, CASHIER, RECEPTIONIST, ADMIN)
 */
router.post(
  '/close',
  authenticate,
  authorize('KITCHEN_STAFF', 'CASHIER', 'RECEPTIONIST', 'ADMIN'),
  [
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

      // Check if day is already closed
      let daySession = await prisma.daySession.findUnique({
        where: { date: today },
      });

      if (daySession && daySession.isClosed) {
        return res.status(400).json({ error: 'Day is already closed' });
      }

      // Get all orders for today
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          payment: true,
        },
      });

      // Calculate totals
      let totalOrders = orders.length;
      let totalRevenue = 0;
      let totalCash = 0;
      let totalCard = 0;
      let totalMomo = 0;
      let totalPaystack = 0;

      orders.forEach((order) => {
        if (order.paymentStatus === 'PAID') {
          totalRevenue += order.total;

          if (order.paymentMethod === 'CASH') {
            totalCash += order.total;
          } else if (order.paymentMethod === 'CARD') {
            totalCard += order.total;
          } else if (order.paymentMethod === 'MOMO') {
            totalMomo += order.total;
          } else if (order.paymentMethod === 'PAYSTACK') {
            totalPaystack += order.total;
          }
        }
      });

      // Create or update day session
      if (daySession) {
        daySession = await prisma.daySession.update({
          where: { id: daySession.id },
          data: {
            isClosed: true,
            closedAt: new Date(),
            closedById: req.user.id,
            totalOrders,
            totalRevenue,
            totalCash,
            totalCard,
            totalMomo,
            totalPaystack,
            notes: req.body.notes || null,
          },
          include: {
            closedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
      } else {
        daySession = await prisma.daySession.create({
          data: {
            date: today,
            isClosed: true,
            closedAt: new Date(),
            closedById: req.user.id,
            totalOrders,
            totalRevenue,
            totalCash,
            totalCard,
            totalMomo,
            totalPaystack,
            notes: req.body.notes || null,
          },
          include: {
            closedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
      }

      // Create audit log
      await createAuditLog({
        userId: req.user.id,
        action: 'CLOSE_DAY',
        entity: 'DaySession',
        entityId: daySession.id,
        details: {
          date: today,
          totalOrders,
          totalRevenue,
          notes: req.body.notes,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Emit socket event to notify all clients
      const io = req.app.get('io');
      if (io) {
        io.emit('day:closed', {
          date: today,
          closedBy: {
            id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
        });
      }

      res.json({
        message: 'Day closed successfully',
        daySession,
      });
    } catch (error) {
      console.error('Close day error:', error);
      res.status(500).json({ error: 'Failed to close day' });
    }
  }
);

/**
 * @route   POST /api/day-session/open
 * @desc    Reopen the day (admin only)
 * @access  Private (ADMIN)
 */
router.post(
  '/open',
  authenticate,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      let daySession = await prisma.daySession.findUnique({
        where: { date: today },
      });

      if (!daySession) {
        daySession = await prisma.daySession.create({
          data: {
            date: today,
            isClosed: false,
          },
        });
      } else if (!daySession.isClosed) {
        return res.status(400).json({ error: 'Day is already open' });
      } else {
        daySession = await prisma.daySession.update({
          where: { id: daySession.id },
          data: {
            isClosed: false,
            closedAt: null,
            closedById: null,
            notes: null,
          },
        });
      }

      // Create audit log
      await createAuditLog({
        userId: req.user.id,
        action: 'OPEN_DAY',
        entity: 'DaySession',
        entityId: daySession.id,
        details: { date: today },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('day:opened', {
          date: today,
          openedBy: {
            id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
        });
      }

      res.json({
        message: 'Day opened successfully',
        daySession,
      });
    } catch (error) {
      console.error('Open day error:', error);
      res.status(500).json({ error: 'Failed to open day' });
    }
  }
);

/**
 * @route   GET /api/day-session/history
 * @desc    Get day session history
 * @access  Private (ADMIN)
 */
router.get(
  '/history',
  authenticate,
  authorize('ADMIN'),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const limit = parseInt(req.query.limit) || 30;
      const offset = parseInt(req.query.offset) || 0;

      const daySessions = await prisma.daySession.findMany({
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
        include: {
          closedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      const total = await prisma.daySession.count();

      res.json({
        daySessions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      console.error('Get day session history error:', error);
      res.status(500).json({ error: 'Failed to get day session history' });
    }
  }
);

module.exports = router;

