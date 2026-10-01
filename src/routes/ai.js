const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const { uploadAiImages } = require('../middleware/upload');
const { scanWaste } = require('../controllers/aiScanController');

const router = express.Router();

// AI inference costs money — authenticated + tightly rate-limited.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI scans. Please wait a minute.' },
});

router.post('/analyze', protect, aiLimiter, uploadAiImages, scanWaste);

module.exports = router;
