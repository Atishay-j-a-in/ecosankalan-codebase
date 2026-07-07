const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const challengeController = require('../controllers/challengeController');

const router = express.Router();

// ── Admin CRUD ─────────────────────────────────────────────────────────
router.post('/', protect, authorize('admin'), challengeController.createChallenge);
router.put('/:id', protect, authorize('admin'), challengeController.updateChallenge);
router.delete('/:id', protect, authorize('admin'), challengeController.deleteChallenge);
router.get('/admin', protect, authorize('admin'), challengeController.getAdminChallenges);

// ── User participation ─────────────────────────────────────────────────
router.post('/:id/join', protect, challengeController.joinChallenge);

// ── User progress & viewing ────────────────────────────────────────────
router.get('/active', protect, challengeController.getActiveChallenges);
router.post('/:id/progress', protect, challengeController.updateProgress);
router.get('/history', protect, challengeController.getHistory);

module.exports = router;
