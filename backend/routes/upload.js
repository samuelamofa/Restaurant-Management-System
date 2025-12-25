const express = require('express');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/upload/menu-image
 * @desc    Upload menu item image
 * @access  Private (Admin only)
 */
router.post(
  '/menu-image',
  authenticate,
  authorize('ADMIN'),
  upload.single('image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Return the file path relative to the uploads directory
      // The file will be served from /uploads/...
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        message: 'Image uploaded successfully',
        url: fileUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload image', details: error.message });
    }
  }
);

/**
 * @route   POST /api/upload/logo
 * @desc    Upload restaurant logo
 * @access  Private (Admin only)
 */
router.post(
  '/logo',
  authenticate,
  authorize('ADMIN'),
  upload.single('logo'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Return the file path relative to the uploads directory
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        message: 'Logo uploaded successfully',
        url: fileUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload logo', details: error.message });
    }
  }
);

/**
 * @route   DELETE /api/upload/menu-image/:filename
 * @desc    Delete menu item image
 * @access  Private (Admin only)
 */
router.delete(
  '/menu-image/:filename',
  authenticate,
  authorize('ADMIN'),
  (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../uploads', req.params.filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ message: 'Image deleted successfully' });
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({ error: 'Failed to delete image', details: error.message });
    }
  }
);

module.exports = router;

