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
  // Use a transaction when a real Mongo connection exists; tests mock models
  // with no connection (readyState 0), so run the same steps without one.
  const useTxn = mongoose.connection && mongoose.connection.readyState === 1;
  let session = null;
  try {
    const { partnerName } = req.body;
    if (!partnerName) return res.status(400).json({ success: false, message: 'partnerName is required' });

    // Helper: apply .sort/.session/.lean only when the mock/query supports chaining.
    const execQuery = async (query, { sort, session: sess } = {}) => {
      let q = query;
      if (sort && q && typeof q.sort === 'function') q = q.sort(sort);
      if (sess && q && typeof q.session === 'function') q = q.session(sess);
      if (q && typeof q.lean === 'function') q = q.lean();
      return q;
    };

    const claim = async (sess) => {
      const now = new Date();
      // Cheapest non-expired unassigned voucher for this partner defines the cost.
      const cheapest = await execQuery(
        Voucher.findOne({ partnerName, assignedTo: null, expiresAt: { $gt: now } }),
        { sort: { ecoPointsCost: 1, expiresAt: 1 }, session: sess }
      );
      if (!cheapest) {
        const anyVoucher = await execQuery(
          Voucher.findOne({ partnerName, assignedTo: null }),
          { session: sess }
        );
        const err = new Error(
          anyVoucher
            ? 'No non-expired voucher available for this partner'
            : 'No voucher available for this partner'
        );
        err.statusCode = 409;
        throw err;
      }
      const cost = Number(cheapest.ecoPointsCost ?? 500);

      // Atomically debit only if the user still has enough points.
      const debitQuery = User.findOneAndUpdate(
        { _id: req.user.userId, ecoPoints: { $gte: cost } },
        { $inc: { ecoPoints: -cost } },
        sess ? { new: true, session: sess } : { new: true }
      );
      const user = await execQuery(debitQuery, {});
      // execQuery may leave a query-like with .select; handle both shapes.
      const resolvedUser = user && typeof user.select === 'function'
        ? await user.select('ecoPoints')
        : user;
      if (!resolvedUser) {
        const err = new Error('Insufficient ecoPoints');
        err.statusCode = 400;
        throw err;
      }

      // Assign that specific voucher (still unassigned + unexpired).
      const unlocked = await Voucher.findOneAndUpdate(
        { _id: cheapest._id, assignedTo: null, expiresAt: { $gt: now } },
        { $set: { assignedTo: req.user.userId, assignedAt: new Date() } },
        sess ? { new: true, session: sess } : { new: true }
      );
      if (!unlocked) {
        const err = new Error('Voucher was just claimed. Please try again.');
        err.statusCode = 409;
        throw err;
      }
      const plain = typeof unlocked.toObject === 'function' ? unlocked.toObject() : unlocked;
      return { ...plain, cost };
    };

    let unlocked;
    if (useTxn) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        unlocked = await claim(session);
      });
    } else {
      unlocked = await claim(null);
    }

    res.status(200).json(unlocked);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to unlock voucher' });
  } finally {
    if (session) await session.endSession();
  }
});

module.exports = router;
