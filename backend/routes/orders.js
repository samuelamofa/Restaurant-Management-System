const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog } = require('../utils/auditLog');
const generateOrderNumber = require('../utils/generateOrderNumber');

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private (Customer, Receptionist, Cashier)
 */
router.post(
  '/',
  authenticate,
  [
    body('orderType').isIn(['DINE_IN', 'TAKEAWAY', 'ONLINE']).withMessage('Invalid order type'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').notEmpty().withMessage('Menu item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('tableNumber').optional().trim(),
    body('notes').optional().trim(),
    body('discount').optional().isFloat({ min: 0 }),
    body('deliveryAddress').optional().trim(),
    body('contactPhone').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if day is closed
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const daySession = await prisma.daySession.findUnique({
          where: { date: today },
        });

        if (daySession && daySession.isClosed) {
          return res.status(403).json({ 
            error: 'Day is closed. Cannot create new orders.',
            dayClosed: true,
          });
        }
      } catch (daySessionError) {
        // If DaySession table doesn't exist or query fails, log and continue
        // This allows orders to be created even if DaySession hasn't been set up yet
        console.warn('DaySession check failed (table may not exist yet):', daySessionError.message);
        // Continue with order creation - treat as open day
      }

      const { orderType, items, tableNumber, notes, discount = 0, deliveryAddress, contactPhone } = req.body;

      // Validate order type specific requirements
      if (orderType === 'ONLINE') {
        if (!deliveryAddress || deliveryAddress.trim() === '') {
          return res.status(400).json({ error: 'Delivery address is required for online orders' });
        }
        if (!contactPhone || contactPhone.trim() === '') {
          return res.status(400).json({ error: 'Contact phone is required for online orders' });
        }
      } else if (orderType === 'DINE_IN') {
        if (!tableNumber || tableNumber.trim() === '') {
          return res.status(400).json({ error: 'Table number is required for dine-in orders' });
        }
      }

      // Validate items and calculate totals
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        // Validate item structure
        if (!item.menuItemId) {
          return res.status(400).json({ error: 'Menu item ID is required for all items' });
        }
        if (!item.quantity || item.quantity < 1) {
          return res.status(400).json({ error: 'Quantity must be at least 1 for all items' });
        }

        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { variants: true, addons: true },
        });

        if (!menuItem) {
          return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
        }
        if (!menuItem.isAvailable) {
          return res.status(400).json({ error: `Menu item "${menuItem.name}" is currently unavailable` });
        }

        // Determine price
        let unitPrice = menuItem.basePrice;
        let variantId = null;

        if (item.variantId) {
          const variant = menuItem.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            return res.status(400).json({ error: `Variant ${item.variantId} not found` });
          }
          unitPrice = variant.price;
          variantId = variant.id;
        }

        // Calculate addon prices
        let addonPrice = 0;
        const addonsData = [];
        if (item.addons && item.addons.length > 0) {
          for (const addonId of item.addons) {
            const addon = menuItem.addons.find((a) => a.id === addonId);
            if (addon) {
              addonPrice += addon.price;
              addonsData.push({ addonId, price: addon.price });
            }
          }
        }

        const totalItemPrice = (unitPrice + addonPrice) * item.quantity;
        subtotal += totalItemPrice;

        orderItemsData.push({
          menuItemId: item.menuItemId,
          variantId,
          quantity: item.quantity,
          unitPrice: unitPrice + addonPrice,
          totalPrice: totalItemPrice,
          notes: item.notes,
          addons: addonsData,
        });
      }

      // Get tax rate from settings
      let taxRate = 0.05; // Default to 5%
      try {
        const settings = await prisma.systemSettings.upsert({
          where: { id: 'system' },
          update: {},
          create: {
            id: 'system',
            taxRate: 0.05,
          },
        });
        taxRate = settings.taxRate || 0.05;
      } catch (settingsError) {
        console.warn('Could not fetch/create system settings, using default tax rate:', settingsError.message);
        // Continue with default tax rate
      }
      
      const tax = subtotal * taxRate;
      const total = subtotal - discount + tax;

      // Generate order number
      const orderNumber = await generateOrderNumber(prisma);

      // Determine customer ID
      const customerId = req.user.role === 'CUSTOMER' ? req.user.id : null;
      const createdById = ['RECEPTIONIST', 'CASHIER', 'ADMIN'].includes(req.user.role) ? req.user.id : null;

      // Create order
      const orderData = {
        orderNumber,
        customerId,
        createdById,
        orderType,
        tableNumber: tableNumber || null,
        notes: notes || null,
        deliveryAddress: orderType === 'ONLINE' ? deliveryAddress : null,
        contactPhone: orderType === 'ONLINE' ? contactPhone : null,
        subtotal,
        discount,
        tax,
        total,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: orderItemsData.map((item) => {
            const itemData = {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            };
            // Only include variantId if it's not null
            if (item.variantId) {
              itemData.variantId = item.variantId;
            }
            // Only include notes if they exist
            if (item.notes) {
              itemData.notes = item.notes;
            }
            // Only include addons if there are any
            if (item.addons && item.addons.length > 0) {
              itemData.addons = {
                create: item.addons.map((a) => ({
                  addonId: a.addonId,
                  price: a.price,
                })),
              };
            }
            return itemData;
          }),
        },
      };

      console.log('Creating order with data:', JSON.stringify({
        ...orderData,
        items: { create: orderData.items.create.map(i => ({ ...i, addons: i.addons ? '...' : undefined })) }
      }, null, 2));

      // Create order
      let order;
      try {
        order = await prisma.order.create({
          data: orderData,
          include: {
            items: {
              include: {
                menuItem: {
                  include: {
                    category: true,
                  },
                },
                variant: true,
                addons: {
                  include: {
                    addon: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        });
        console.log('Order created successfully:', order.id, order.orderNumber);
      } catch (createError) {
        console.error('Prisma create error:', createError);
        console.error('Order data that failed:', JSON.stringify(orderData, null, 2));
        throw createError; // Re-throw to be caught by outer catch
      }

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to('kitchen').emit('order:new', order);
        io.to('pos').emit('order:new', order);
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE_ORDER',
        entity: 'Order',
        entityId: order.id,
        details: { orderNumber: order.orderNumber, total: order.total },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ message: 'Order created successfully', order });
    } catch (error) {
      console.error('========== CREATE ORDER ERROR ==========');
      console.error('Error:', error);
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      console.error('User:', req.user?.id, req.user?.role);
      console.error('========================================');
      
      // Return more specific error messages
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Duplicate order number. Please try again.' });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Related record not found. Please refresh and try again.' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid reference. One of the items or variants does not exist.' });
      }
      
      // In development, return detailed error
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? `${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`
        : 'An error occurred while creating your order. Please try again.';
      
      res.status(500).json({ 
        error: 'Failed to create order',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.message,
          code: error.code,
          stack: error.stack 
        })
      });
    }
  }
);

/**
 * @route   GET /api/orders
 * @desc    Get orders (filtered by user role)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, orderType, limit = 50, offset = 0, startDate, endDate, period } = req.query;

    const where = {};

    // Filter by user role
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    }

    // For kitchen staff, only show today's orders
    if (req.user.role === 'KITCHEN_STAFF') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      where.createdAt = {
        gte: today,
        lt: tomorrow,
      };
    }

    // Date filtering for admin and other roles (except kitchen staff which is handled above)
    if (req.user.role !== 'KITCHEN_STAFF') {
      if (period === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        where.createdAt = {
          gte: today,
          lt: tomorrow,
        };
      } else if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
      // If period === 'all', no date filter is applied
    }

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            variant: true,
            addons: {
              include: {
                addon: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.order.count({ where });

    res.json({ orders, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const where = { id: req.params.id };

    // Customers can only see their own orders
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            variant: true,
            addons: {
              include: {
                addon: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Kitchen staff, Admin)
 * @access  Private (Kitchen Staff, Admin)
 */
router.put(
  '/:id/status',
  authenticate,
  authorize('KITCHEN_STAFF', 'ADMIN'),
  [body('status').isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status } = req.body;

      // Track kitchen staff who prepared the order
      const updateData = {
        status,
      };

      // Handle status-specific fields
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        // Get current order to check if readyAt is already set
        const currentOrder = await prisma.order.findUnique({
          where: { id: req.params.id },
          select: { readyAt: true, preparedById: true },
        });
        // Set readyAt if not already set
        if (!currentOrder?.readyAt) {
          updateData.readyAt = new Date();
        }
        // Set preparedById if not already set and user has permission
        if (!currentOrder?.preparedById && (req.user.role === 'KITCHEN_STAFF' || req.user.role === 'ADMIN')) {
          updateData.preparedById = req.user.id;
        }
      } else if (status === 'READY') {
        updateData.readyAt = new Date();
        if (req.user.role === 'KITCHEN_STAFF' || req.user.role === 'ADMIN') {
          updateData.preparedById = req.user.id;
        }
      } else if (status === 'PREPARING' && req.user.role === 'KITCHEN_STAFF') {
        updateData.preparedById = req.user.id;
      }

      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          customer: true,
        },
      });

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.emit('order:status-updated', { orderId: order.id, status: order.status, order });
        if (order.customerId) {
          io.to(`user:${order.customerId}`).emit('order:status-updated', {
            orderId: order.id,
            status: order.status,
            order,
          });
        }
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: order.id,
        details: { status, orderNumber: order.orderNumber },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ message: 'Order status updated successfully', order });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
);

module.exports = router;

