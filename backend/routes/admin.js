const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;

    const dateFilter = {};
    
    // Default to today if no date filter is provided and period is not 'all'
    if (!startDate && !endDate && period !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      dateFilter.createdAt = {
        gte: today,
        lt: tomorrow,
      };
    } else if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }

    // Total sales
    const totalSales = await prisma.payment.aggregate({
      where: { ...dateFilter, status: 'PAID' },
      _sum: { amount: true },
    });

    // Total orders
    const totalOrders = await prisma.order.count({
      where: dateFilter,
    });

    // Completed orders
    const completedOrders = await prisma.order.count({
      where: { ...dateFilter, status: 'COMPLETED' },
    });

    // Payment method breakdown
    const paymentBreakdown = await prisma.payment.groupBy({
      by: ['method'],
      where: { ...dateFilter, status: 'PAID' },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Best selling items
    const bestSellingItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          ...dateFilter,
          status: { in: ['COMPLETED', 'READY'] },
        },
      },
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    // Get menu item details for best sellers
    const bestSellersWithDetails = await Promise.all(
      bestSellingItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { id: true, name: true, image: true },
        });
        return {
          ...item,
          menuItem,
        };
      })
    );

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { id: true },
    });

    // Orders by type
    const ordersByType = await prisma.order.groupBy({
      by: ['orderType'],
      where: dateFilter,
      _count: { id: true },
    });

    res.json({
      stats: {
        totalSales: totalSales._sum.amount || 0,
        totalOrders,
        completedOrders,
        averageOrderValue: totalOrders > 0 ? (totalSales._sum.amount || 0) / totalOrders : 0,
      },
      paymentBreakdown,
      bestSellingItems: bestSellersWithDetails,
      ordersByStatus,
      ordersByType,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/users', async (req, res) => {
  try {
    const { role, isActive, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.user.count({ where });

    res.json({ users, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create new user (staff)
 * @access  Private (Admin)
 */
router.post(
  '/users',
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isMobilePhone(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('role').isIn(['RECEPTIONIST', 'CASHIER', 'KITCHEN_STAFF', 'ADMIN']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, phone, password, firstName, lastName, role } = req.body;

      if (!email && !phone) {
        return res.status(400).json({ error: 'Email or phone number is required' });
      }

      // Normalize email and phone for consistent storage and lookup
      const normalizedEmail = email ? email.toLowerCase().trim() : null;
      const normalizedPhone = phone ? phone.trim() : null;

      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            normalizedEmail ? { email: normalizedEmail } : {},
            normalizedPhone ? { phone: normalizedPhone } : {},
          ],
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          firstName,
          lastName,
          role,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
router.put('/users/:id', async (req, res) => {
  try {
      const { firstName, lastName, email, phone, role, isActive } = req.body;
      const updateData = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email.toLowerCase().trim();
      if (phone !== undefined) updateData.phone = phone.trim();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @route   GET /api/admin/notifications
 * @desc    Get notifications for admin dashboard
 * @access  Private (Admin)
 */
router.get('/notifications', async (req, res) => {
  try {
    const notifications = [];

    // Get pending orders (urgent)
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    pendingOrders.forEach((order) => {
      const timeDiff = new Date() - new Date(order.createdAt);
      const minutes = Math.floor(timeDiff / 60000);
      
      notifications.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `New Order #${order.orderNumber}`,
        message: `${order.orderType.replace('_', ' ')} order from ${order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest'}`,
        status: order.status,
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        urgent: minutes > 15,
      });
    });

    // Get recent completed orders (for tracking)
    const recentCompleted = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - 3600000), // Last hour
        },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
    });

    recentCompleted.forEach((order) => {
      notifications.push({
        id: `completed-${order.id}`,
        type: 'success',
        title: `Order #${order.orderNumber} Completed`,
        message: `Order completed successfully`,
        status: 'COMPLETED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.completedAt,
        urgent: false,
      });
    });

    // Sort by creation date (most recent first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit to 10 most recent
    const limitedNotifications = notifications.slice(0, 10);

    res.json({
      notifications: limitedNotifications,
      unreadCount: limitedNotifications.filter(n => !n.read).length,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (Admin)
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { userId, action, startDate, endDate, limit = 100, offset = 0 } = req.query;

    const where = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.auditLog.count({ where });

    res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;

