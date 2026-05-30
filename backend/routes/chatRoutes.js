const express = require("express");
const {
  deleteMessage,
  getChatUsers,
  getMessages,
  sendImageMessage,
  sendMessage,
  sendVideoMessage,
  markMessageAsRead,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
const {
  handleUploadError,
  uploadChatImage,
  uploadChatVideo,
} = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);

router.get("/users", getChatUsers);
router.get("/messages/:userId", getMessages);
router.post("/send-message", sendMessage);
router.post("/send-image", uploadChatImage, handleUploadError, sendImageMessage);
router.post("/send-video", uploadChatVideo, handleUploadError, sendVideoMessage);
router.put("/read/:messageId", markMessageAsRead);
router.delete("/messages/:messageId", deleteMessage);

module.exports = router;
