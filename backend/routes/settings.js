const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

/**
 * @route   GET /api/settings
 * @desc    Get system settings (public - needed for customer app and other frontends)
 * @desc    Paystack keys are only returned for authenticated admin users
 * @access  Public (sensitive fields require admin auth)
 */
router.get('/', async (req, res) => {
  // Optional authentication - try to authenticate but don't fail if no token
  let isAdmin = false;
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true, isActive: true },
      });
      if (user && user.isActive && user.role === 'ADMIN') {
        isAdmin = true;
      }
    }
  } catch (error) {
    // Ignore auth errors - endpoint is public
  }
  // Default settings to return as fallback
  const getDefaultSettings = () => ({
    id: 'system',
    restaurantName: process.env.RESTAURANT_NAME || 'De Fusion Flame Kitchen',
    restaurantAddress: process.env.RESTAURANT_ADDRESS || null,
    restaurantPhone: process.env.RESTAURANT_PHONE || null,
    restaurantEmail: null,
    restaurantLogo: null,
    taxRate: 0.05,
    currency: 'GHS',
    currencySymbol: '₵',
    orderPrefix: 'ORD',
    autoConfirmOrders: false,
    requirePaymentBeforePrep: false,
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || null,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
    paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || null,
    updatedAt: new Date(),
  });

  try {
    let settings;
    try {
      // Try to access the model - will throw if model doesn't exist in Prisma Client
      settings = await prisma.systemSettings.findUnique({
        where: { id: 'system' },
      });

      // If settings don't exist, create with defaults
      if (!settings) {
        try {
          settings = await prisma.systemSettings.create({
            data: {
              id: 'system',
              restaurantName: process.env.RESTAURANT_NAME || 'De Fusion Flame Kitchen',
              restaurantAddress: process.env.RESTAURANT_ADDRESS || null,
              restaurantPhone: process.env.RESTAURANT_PHONE || null,
              restaurantEmail: null,
              taxRate: 0.05,
              currency: 'GHS',
              currencySymbol: '₵',
              orderPrefix: 'ORD',
              autoConfirmOrders: false,
              requirePaymentBeforePrep: false,
              paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || null,
              paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
              paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || null,
            },
          });
        } catch (createError) {
          // If table doesn't exist, return default settings
          const errorMsg = createError.message || '';
          const errorCode = createError.code || '';
          if (errorCode === 'P2001' || 
              errorCode === 'P2025' ||
              errorMsg.includes('does not exist') || 
              errorMsg.includes('no such table') ||
              (errorMsg.includes('table') && errorMsg.includes('not found'))) {
            console.warn('SystemSettings table does not exist. Please run database migration.');
            // Return default settings as fallback
            settings = getDefaultSettings();
          } else {
            throw createError;
          }
        }
      }
    } catch (queryError) {
      // Handle case where table doesn't exist in the initial query
      const errorMsg = queryError.message || '';
      const errorCode = queryError.code || '';
      if (errorCode === 'P2001' || 
          errorCode === 'P2025' ||
          errorMsg.includes('does not exist') || 
          errorMsg.includes('no such table') ||
          (errorMsg.includes('table') && errorMsg.includes('not found'))) {
        console.warn('SystemSettings table does not exist. Returning default settings.');
        settings = getDefaultSettings();
      } else {
        throw queryError;
      }
    }

    // isAdmin is set above from optional authentication
    
    // Prepare settings response
    const settingsResponse = { ...settings };
    
    // Only include Paystack keys if user is authenticated admin
    if (!isAdmin) {
      delete settingsResponse.paystackSecretKey;
      delete settingsResponse.paystackPublicKey;
      delete settingsResponse.paystackWebhookSecret;
    }
    
    // Always return settings (either from DB or defaults)
    return res.json({ settings: settingsResponse });
  } catch (error) {
    console.error('Get settings error:', error);
    
    // Always return default settings as fallback, never fail completely
    const errorMsg = (error.message || '').toLowerCase();
    const errorCode = error.code || '';
    
    // Check for various error conditions
    const isModelMissing = errorMsg.includes('systemsettings') || errorMsg.includes('system settings');
    const isTableMissing = errorCode === 'P2001' || 
        errorCode === 'P2025' ||
        errorMsg.includes('does not exist') || 
        errorMsg.includes('no such table') ||
        errorMsg.includes('unknown table') ||
        (errorMsg.includes('table') && errorMsg.includes('not found'));
    
    let warningMessage = 'Error loading settings from database. Using default settings.';
    if (isModelMissing) {
      warningMessage = 'Prisma Client not updated. Please run: cd backend && npx prisma generate';
    } else if (isTableMissing) {
      warningMessage = 'Database table not found. Please run: cd backend && npx prisma migrate dev';
    }
    
    console.error('Error fetching settings:', error.message);
    
    // isAdmin is set above from optional authentication
    const defaultSettings = getDefaultSettings();
    
    // Only include Paystack keys if user is authenticated admin
    if (!isAdmin) {
      delete defaultSettings.paystackSecretKey;
      delete defaultSettings.paystackPublicKey;
      delete defaultSettings.paystackWebhookSecret;
    }
    
    return res.json({ 
      settings: defaultSettings,
      warning: warningMessage
    });
  }
});

/**
 * @route   PUT /api/settings
 * @desc    Update system settings
 * @access  Private (Admin)
 */
router.put(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('restaurantName').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Restaurant name cannot be empty'),
    body('restaurantAddress').optional({ checkFalsy: true }).trim(),
    body('restaurantPhone').optional({ checkFalsy: true }).trim(),
    body('restaurantEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format'),
    body('restaurantLogo').optional({ checkFalsy: true }).trim(),
    body('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
    body('currency').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Currency cannot be empty'),
    body('currencySymbol').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Currency symbol cannot be empty'),
    body('orderPrefix').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Order prefix cannot be empty'),
    body('autoConfirmOrders').optional().isBoolean(),
    body('requirePaymentBeforePrep').optional().isBoolean(),
    body('paystackSecretKey').optional({ checkFalsy: true }).trim(),
    body('paystackPublicKey').optional({ checkFalsy: true }).trim(),
    body('paystackWebhookSecret').optional({ checkFalsy: true }).trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          errors: errors.array(),
          details: errors.array().map(e => e.msg).join(', ')
        });
      }

      const updateData = {};
      const allowedFields = [
        'restaurantName',
        'restaurantAddress',
        'restaurantPhone',
        'restaurantEmail',
        'restaurantLogo',
        'taxRate',
        'currency',
        'currencySymbol',
        'orderPrefix',
        'autoConfirmOrders',
        'requirePaymentBeforePrep',
        'paystackSecretKey',
        'paystackPublicKey',
        'paystackWebhookSecret',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Check if settings exist, if not create them
      let settings;
      try {
        settings = await prisma.systemSettings.findUnique({
          where: { id: 'system' },
        });

        if (!settings) {
          settings = await prisma.systemSettings.create({
            data: {
              id: 'system',
              restaurantName: process.env.RESTAURANT_NAME || 'De Fusion Flame Kitchen',
              restaurantAddress: process.env.RESTAURANT_ADDRESS || null,
              restaurantPhone: process.env.RESTAURANT_PHONE || null,
              restaurantEmail: null,
              restaurantLogo: null,
              taxRate: 0.05,
              currency: 'GHS',
              currencySymbol: '₵',
              orderPrefix: 'ORD',
              autoConfirmOrders: false,
              requirePaymentBeforePrep: false,
              paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || null,
              paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
              paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || null,
              ...updateData,
            },
          });
        } else {
          settings = await prisma.systemSettings.update({
            where: { id: 'system' },
            data: updateData,
          });
        }
      } catch (dbError) {
        const errorMsg = dbError.message || '';
        const errorCode = dbError.code || '';
        if (errorCode === 'P2001' || 
            errorCode === 'P2025' ||
            errorMsg.includes('does not exist') || 
            errorMsg.includes('no such table') ||
            (errorMsg.includes('table') && errorMsg.includes('not found'))) {
          return res.status(500).json({ 
            error: 'Database table not found. Please run: cd backend && npx prisma migrate dev',
            details: 'The SystemSettings table does not exist. Run database migrations to create it.',
          });
        }
        throw dbError;
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entity: 'SystemSettings',
        entityId: 'system',
        details: updateData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
      // Provide more detailed error messages
      let errorMessage = 'Failed to update settings';
      if (error.code === 'P2002') {
        errorMessage = 'Settings record already exists with this ID';
      } else if (error.code === 'P2025') {
        errorMessage = 'Settings record not found';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;

