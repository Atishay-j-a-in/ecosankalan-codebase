const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Voucher = require('../models/Voucher');

const router = express.Router();

router.use(protect);

router.get('/my', async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(req.user.userId) } },
      { $addFields: { isExpired: { $lte: ['$expiresAt', now] } } },
      { $sort: { isExpired: 1, expiresAt: 1 } },
    ]);

    res.status(200).json(vouchers);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load vouchers' });
  }
});

router.post('/unlock', async (req, res) => {
  try {
    const { partnerName } = req.body;
    if (!partnerName) return res.status(400).json({ success: false, message: 'partnerName is required' });

    const user = await User.findById(req.user.userId).select('ecoPoints');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.ecoPoints < 500) {
      return res.status(400).json({ success: false, message: 'Insufficient ecoPoints' });
    }

    const voucher = await Voucher.findOneAndUpdate(
      { assignedTo: null, partnerName },
      { $set: { assignedTo: req.user.userId, assignedAt: new Date() } },
      { new: true, sort: { expiresAt: 1 } }
    );

    if (!voucher) {
      return res.status(409).json({ success: false, message: 'No voucher available for this partner' });
    }

    await User.findByIdAndUpdate(req.user.userId, { $inc: { ecoPoints: -500 } });
    res.status(200).json(voucher);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unlock voucher' });
  }
});

module.exports = router;
