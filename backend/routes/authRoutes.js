const express = require("express");
const {
  signup,
  login,
  googleAuthController,
  logout,
  forgotPassword,
  resetPassword,
  deleteAccount,
  getCurrentUser,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuthController);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.put("/change-password", protect, changePassword);
router.delete("/delete-account", protect, deleteAccount);
router.get("/me", protect, getCurrentUser);

module.exports = router;
