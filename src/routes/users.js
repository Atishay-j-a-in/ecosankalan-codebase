/**
 * routes/users.js — User profile routes (Month 2)
 */
const express = require('express');
<<<<<<< Updated upstream
const { protect, authorize } = require('../middleware/auth');
=======
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');
const uploadAvatar = require('../middleware/avatarUpload');

>>>>>>> Stashed changes
const router = express.Router();

const stub = (routeName) => (req, res) => {
  res.status(501).json({
    success: false,
    message: `${routeName} not yet implemented.`,
  });
};

// All user routes require authentication
router.use(protect);

<<<<<<< Updated upstream
router.get('/profile', stub('GET /users/profile'));          // Month 2
router.put('/profile', stub('PUT /users/profile'));          // Month 2
router.get('/points', stub('GET /users/points'));            // Month 3
router.get('/badges', stub('GET /users/badges'));            // Month 4
=======
router.get('/profile', userController.getProfile);   // FR-04
router.put('/profile', userController.updateProfile); // FR-04
router.put('/profile/avatar', uploadAvatar, userController.uploadAvatar);
router.get('/points', userController.getPoints);      // Month 3
router.get('/badges', userController.getBadges);      // Month 4
>>>>>>> Stashed changes

module.exports = router;
