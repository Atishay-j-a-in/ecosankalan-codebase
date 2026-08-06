const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  saveFCMToken,
  removeFCMToken,
  sendToUser,
  broadcast,
} = require("../controllers/notificationController");

router.post("/token", protect, saveFCMToken);
router.delete("/token", protect, removeFCMToken);
router.post("/send", protect, sendToUser);
router.post("/broadcast", protect, broadcast);

module.exports = router;