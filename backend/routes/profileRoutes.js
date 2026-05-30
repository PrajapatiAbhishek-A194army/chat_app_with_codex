const express = require("express");
const {
  getMyProfile,
  uploadProfileAvatar,
  updateProfile,
} = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");
const {
  handleUploadError,
  uploadAvatar,
} = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMyProfile);
router.put("/update", updateProfile);
router.put("/avatar", uploadAvatar, handleUploadError, uploadProfileAvatar);

module.exports = router;
