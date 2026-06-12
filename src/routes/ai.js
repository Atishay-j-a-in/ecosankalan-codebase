const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadAiImages } = require('../middleware/upload');
const { scanWaste } = require('../controllers/aiScanController');

const router = express.Router();

router.post('/analyze', protect, uploadAiImages, scanWaste);

module.exports = router;
