const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const WasteLog = require('../models/WasteLog');
const { uploadAiImages } = require('../middleware/upload');
const { scanWaste } = require('../controllers/aiScanController');

const router = express.Router();

const categoryKeys = ['plastic', 'organic', 'eWaste', 'metal', 'paper', 'other'];

const getRangeStart = (range) => {
  if (range === 'all') return null;
  const days = range === 'month' ? 30 : 7;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normaliseCategory = (category) => (category === 'e-waste' ? 'eWaste' : category);

const stub = (routeName) => (req, res) => {
  res.status(501).json({
    success: false,
    message: `${routeName} not yet implemented. Coming in Month 3.`,
  });
};

router.use(protect);

router.post('/log', stub('POST /waste/log'));
router.get('/history', stub('GET /waste/history'));

router.get('/stats', async (req, res) => {
  try {
    const range = ['week', 'month', 'all'].includes(req.query.range)
      ? req.query.range
      : 'week';
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const match = { userId };
    const startDate = getRangeStart(range);

    if (startDate) {
      match.createdAt = { $gte: startDate };
    }

    const kgExpression = {
      $cond: [{ $eq: ['$unit', 'g'] }, { $divide: ['$quantity', 1000] }, '$quantity'],
    };

    const [totals, categories, trend] = await Promise.all([
      WasteLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalKg: { $sum: kgExpression },
            totalCo2Saved: { $sum: '$co2Saved' },
            totalPointsEarned: { $sum: '$pointsEarned' },
          },
        },
      ]),
      WasteLog.aggregate([
        { $match: match },
        { $group: { _id: '$category', kg: { $sum: kgExpression } } },
      ]),
      WasteLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Kolkata',
              },
            },
            kg: { $sum: kgExpression },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const categoryBreakdown = categoryKeys.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    categories.forEach((item) => {
      const key = normaliseCategory(item._id);
      if (categoryBreakdown[key] !== undefined) {
        categoryBreakdown[key] = round2(item.kg);
      }
    });

    const total = totals[0] || {};

    res.status(200).json({
      totalKg: round2(total.totalKg),
      totalCo2Saved: round2(total.totalCo2Saved),
      totalPointsEarned: round2(total.totalPointsEarned),
      categoryBreakdown,
      weeklyTrend: trend.map((item) => ({
        date: item._id,
        kg: round2(item.kg),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load waste stats' });
  }
});

router.post('/scan', uploadAiImages, scanWaste);

module.exports = router;
