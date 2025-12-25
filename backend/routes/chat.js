const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/chat
 * @desc    Get chats (filtered by user role)
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = {};

  // Customers can only see their own chats
  if (req.user.role === 'CUSTOMER') {
    where.customerId = req.user.id;
  }

  // Admins can see all chats
  if (status) {
    where.status = status;
  }

  const chats = await prisma.chat.findMany({
    where,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Get only the last message for preview
      },
      _count: {
        select: {
          messages: {
            where: {
              isRead: false,
              senderRole: req.user.role === 'CUSTOMER' ? 'ADMIN' : 'CUSTOMER',
            },
          },
        },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  res.json({ chats });
}));

/**
 * @route   GET /api/chat/:id
 * @desc    Get a specific chat with messages
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const where = { id };

  // Customers can only access their own chats
  if (req.user.role === 'CUSTOMER') {
    where.customerId = req.user.id;
  }

  const chat = await prisma.chat.findFirst({
    where,
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }

  // Mark messages as read
  if (req.user.role === 'ADMIN') {
    await prisma.chatMessage.updateMany({
      where: {
        chatId: id,
        senderRole: 'CUSTOMER',
        isRead: false,
      },
      data: { isRead: true },
    });
  } else if (req.user.role === 'CUSTOMER') {
    await prisma.chatMessage.updateMany({
      where: {
        chatId: id,
        senderRole: 'ADMIN',
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  res.json({ chat });
}));

/**
 * @route   POST /api/chat
 * @desc    Create a new chat (for customers)
 * @access  Public (can be called without auth for guests)
 */
router.post(
  '/',
  [
    body('customerName').optional().trim(),
    body('customerEmail').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerName, customerEmail } = req.body;

    // If user is authenticated, use their info
    const customerId = req.user?.id || null;
    const name = customerId ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : customerName;
    const email = customerId ? req.user.email : customerEmail;

    // Check if customer has an active chat
    if (customerId) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          customerId,
          status: 'ACTIVE',
        },
      });

      if (existingChat) {
        return res.json({ chat: existingChat, message: 'Active chat found' });
      }
    }

    const chat = await prisma.chat.create({
      data: {
        customerId,
        customerName: name || 'Guest',
        customerEmail: email,
        status: 'ACTIVE',
      },
      include: {
        messages: true,
      },
    });

    // Emit new chat event to admins
    const io = req.app.get('io');
    if (io) {
      io.to('role:ADMIN').emit('chat:new', chat);
    }

    res.status(201).json({ chat });
  })
);

/**
 * @route   POST /api/chat/:id/messages
 * @desc    Send a message in a chat
 * @access  Private
 */
router.post(
  '/:id/messages',
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  authenticate,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { message } = req.body;

    // Check if chat exists
    let chat = await prisma.chat.findFirst({ where: { id } });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // If user is a customer, check access or update chat to link to user
    if (req.user.role === 'CUSTOMER') {
      // If chat doesn't have a customerId, link it to the current user
      if (!chat.customerId) {
        chat = await prisma.chat.update({
          where: { id },
          data: {
            customerId: req.user.id,
            customerName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Customer',
            customerEmail: req.user.email,
          },
        });
      } else if (chat.customerId !== req.user.id) {
        // Chat belongs to another customer
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Determine sender info
    const senderId = req.user.id;
    const senderRole = req.user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
    const senderName = req.user.role === 'ADMIN'
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin'
      : chat.customerName || 'Customer';

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        chatId: id,
        senderId,
        senderRole,
        senderName,
        message: message.trim(),
      },
    });

    // Update chat's last message timestamp
    const updatedChat = await prisma.chat.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    // Emit real-time message to relevant users
    const io = req.app.get('io');
    if (io) {
      if (senderRole === 'CUSTOMER') {
        // Notify admins
        io.to('role:ADMIN').emit('chat:message', {
          chatId: id,
          message: chatMessage,
        });
        // Also notify the customer
        if (chat.customerId) {
          io.to(`user:${chat.customerId}`).emit('chat:message', {
            chatId: id,
            message: chatMessage,
          });
        }
      } else {
        // Admin sent message - notify customer
        if (chat.customerId) {
          io.to(`user:${chat.customerId}`).emit('chat:message', {
            chatId: id,
            message: chatMessage,
          });
        }
        // Also notify other admins
        io.to('role:ADMIN').emit('chat:message', {
          chatId: id,
          message: chatMessage,
        });
      }
    }

    res.status(201).json({ message: chatMessage, chat: updatedChat });
  })
);

/**
 * @route   PUT /api/chat/:id/status
 * @desc    Update chat status (admin only)
 * @access  Private (Admin)
 */
router.put(
  '/:id/status',
  [
    body('status').isIn(['ACTIVE', 'RESOLVED', 'CLOSED']).withMessage('Invalid status'),
  ],
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const chat = await prisma.chat.update({
      where: { id },
      data: { status },
    });

    // Emit status update
    const io = req.app.get('io');
    if (io) {
      if (chat.customerId) {
        io.to(`user:${chat.customerId}`).emit('chat:status-updated', {
          chatId: id,
          status,
        });
      }
      io.to('role:ADMIN').emit('chat:status-updated', {
        chatId: id,
        status,
      });
    }

    res.json({ chat });
  })
);

/**
 * @route   GET /api/chat/unread/count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread/count', authenticate, asyncHandler(async (req, res) => {
  const where = {};

  if (req.user.role === 'CUSTOMER') {
    where.customerId = req.user.id;
    where.messages = {
      some: {
        senderRole: 'ADMIN',
        isRead: false,
      },
    };
  } else if (req.user.role === 'ADMIN') {
    where.messages = {
      some: {
        senderRole: 'CUSTOMER',
        isRead: false,
      },
    };
  }

  const count = await prisma.chatMessage.count({
    where: {
      chat: where,
      senderRole: req.user.role === 'CUSTOMER' ? 'ADMIN' : 'CUSTOMER',
      isRead: false,
    },
  });

  res.json({ count });
}));

module.exports = router;

