const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

/**
 * Socket.io authentication middleware
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow anonymous connections for public features
      return next();
    }

    if (!process.env.JWT_SECRET) {
      // JWT_SECRET not configured, allow anonymous connection
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (user && user.isActive) {
      socket.user = user;
    }
  } catch (error) {
    // Allow connection even if token is invalid (for public features)
    // Silently fail - connection will be anonymous
  }

  next();
};

module.exports = { authenticateSocket };

