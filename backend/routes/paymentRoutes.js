const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createSession,
  syncCheckoutSession,
  getSubscriptionStatus,
  getSubscriptionHistory,
  cancelSubscription,
} = require("../controllers/paymentController");

const router = express.Router();

// Protected subscription payment routes
router.post("/create-checkout-session", protect, createSession);
router.post("/create-subscription", protect, createSession);
router.post("/sync-checkout-session", protect, syncCheckoutSession);
router.get("/subscription-status", protect, getSubscriptionStatus);
router.get("/current", protect, getSubscriptionStatus);
router.get("/history", protect, getSubscriptionHistory);
router.post("/cancel-subscription", protect, cancelSubscription);
router.post("/cancel", protect, cancelSubscription);

module.exports = router;
