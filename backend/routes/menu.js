const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/menu/categories
 * @desc    Get all active categories
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            variants: true,
            addons: true,
          },
        },
      },
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * @route   GET /api/menu/items
 * @desc    Get all menu items (with optional filters)
 * @access  Public
 */
router.get('/items', async (req, res) => {
  try {
    const { categoryId, available } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (available !== undefined) where.isAvailable = available === 'true';

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: true,
        addons: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ items });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

/**
 * @route   GET /api/menu/items/:id
 * @desc    Get single menu item
 * @access  Public
 */
router.get('/items/:id', async (req, res) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        variants: true,
        addons: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

/**
 * @route   POST /api/menu/categories
 * @desc    Create new category (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/categories',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('description').optional().trim(),
    body('image').optional().custom((value) => {
      if (!value || value === '') return true; // Allow empty string
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Image must be a valid URL');
      }
    }),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, image, displayOrder } = req.body;

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          image: image?.trim() || null,
          displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        },
      });

      res.status(201).json({ message: 'Category created successfully', category });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to create category',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   PUT /api/menu/categories/:id
 * @desc    Update category (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/categories/:id',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('image').optional().isURL(),
    body('displayOrder').optional().isInt(),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, image, displayOrder, isActive } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);
      if (isActive !== undefined) updateData.isActive = isActive;

      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          items: true,
        },
      });

      res.json({ message: 'Category updated successfully', category });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
);

/**
 * @route   DELETE /api/menu/categories/:id
 * @desc    Delete category (Admin only)
 * @access  Private (Admin)
 */
router.delete('/categories/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // Check if category has items
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.items.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with items. Please delete or move items first.' 
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * @route   POST /api/menu/items
 * @desc    Create new menu item (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/items',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Item name is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('basePrice').custom((value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Base price must be a positive number');
      }
      return true;
    }),
    body('description').optional().trim(),
    body('image').optional().custom((value) => {
      if (!value || value === '') return true; // Allow empty string
      // Allow both URLs and relative paths
      if (value.startsWith('/')) return true; // Relative path
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Image must be a valid URL or relative path');
      }
    }),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, image, categoryId, basePrice, displayOrder, variants, addons } = req.body;

      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }

      const item = await prisma.menuItem.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          image: image?.trim() || null,
          categoryId,
          basePrice: parseFloat(basePrice),
          displayOrder: displayOrder ? parseInt(displayOrder) : 0,
          variants: variants
            ? {
                create: variants.map((v) => ({
                  name: v.name,
                  price: parseFloat(v.price),
                })),
              }
            : undefined,
          addons: addons
            ? {
                create: addons.map((a) => ({
                  name: a.name,
                  price: parseFloat(a.price || 0),
                })),
              }
            : undefined,
        },
        include: {
          category: true,
          variants: true,
          addons: true,
        },
      });

      res.status(201).json({ message: 'Menu item created successfully', item });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to create menu item',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   PUT /api/menu/items/:id
 * @desc    Update menu item (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/items/:id',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').optional().trim().notEmpty(),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('isAvailable').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, image, basePrice, isAvailable, displayOrder } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice);
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

      const item = await prisma.menuItem.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          category: true,
          variants: true,
          addons: true,
        },
      });

      res.json({ message: 'Menu item updated successfully', item });
    } catch (error) {
      console.error('Update menu item error:', error);
      res.status(500).json({ error: 'Failed to update menu item' });
    }
  }
);

/**
 * @route   DELETE /api/menu/items/:id
 * @desc    Delete menu item (Admin only)
 * @access  Private (Admin)
 */
router.delete('/items/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.menuItem.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;

