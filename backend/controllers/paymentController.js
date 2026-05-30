const {
  getOrCreateCustomer,
  getPlanDetails,
  getPlanFromStripePriceId,
  getStripePriceIdForPlan,
  createCheckoutSession,
  stripe,
} = require("../services/stripeService");
const { sendSubscriptionActivatedEmail } = require("../services/authEmailService");
const User = require("../models/User");

const getClientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");

const activeStatuses = ["active", "past_due", "trial"];

const mapStripeStatusToDbStatus = (stripeStatus) => {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "inactive";
  }
};

const addOneMonth = (date) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
};

const getSubscriptionPeriodDates = (subscription) => {
  const startDate = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date();
  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : addOneMonth(startDate);

  return { startDate, endDate };
};

const formatBillDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

const buildActivationEmailPayload = ({ session, subscription }) => {
  const price = subscription.items.data[0]?.price;
  const plan = session.metadata?.plan || getPlanFromStripePriceId(price?.id);
  const planDetails = getPlanDetails(plan);
  const { startDate, endDate } = getSubscriptionPeriodDates(subscription);

  return {
    plan: planDetails.label,
    price: planDetails.displayPrice,
    billingCycle: planDetails.billingCycle,
    status: "Active",
    activationDate: formatBillDate(startDate),
    renewalDate: formatBillDate(endDate),
  };
};

const applyStripeSubscriptionToUser = async ({
  user,
  subscription,
  customerId,
  planFromSession,
  eventType,
}) => {
  const priceId = subscription.items.data[0]?.price?.id;
  const planName = planFromSession || getPlanFromStripePriceId(priceId);
  const planDetails = getPlanDetails(planName);
  const dbStatus = mapStripeStatusToDbStatus(subscription.status);
  const { startDate, endDate } = getSubscriptionPeriodDates(subscription);

  user.stripeCustomerId = customerId || user.stripeCustomerId;
  user.stripeSubscriptionId = subscription.id;
  user.subscriptionPlan = planName;
  user.subscriptionStatus = dbStatus;
  user.subscriptionStartDate = startDate;
  user.subscriptionEndDate = endDate;
  user.currentPeriodEnd = endDate;
  user.subscription = {
    ...(user.subscription || {}),
    plan: planName,
    status: dbStatus,
    price: planDetails.price,
    billingCycle: planDetails.billingCycle,
    stripeCustomerId: customerId || user.stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    activatedAt: startDate,
    renewalDate: endDate,
  };
  user.subscriptionHistory.push({
    ...user.subscription,
    eventType,
  });

  await user.save();
};

const sendActivationEmailIfNeeded = async ({ user, session, subscription }) => {
  if (
    user.subscription?.activationEmailSentForSubscription === subscription.id
  ) {
    return;
  }

  await sendSubscriptionActivatedEmail({
    user,
    subscription: buildActivationEmailPayload({ session, subscription }),
  });

  user.subscription.activationEmailSentForSubscription = subscription.id;
  user.subscription.activationEmailSentAt = new Date();
  await user.save();
};

/**
 * @desc    Create a Stripe Checkout Session for subscription
 * @route   POST /api/payments/create-checkout-session
 * @access  Private
 */
const createSession = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user; // Set by protect middleware

    if (!plan || !["basic", "pro", "enterprise"].includes(plan.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid subscription plan: basic, pro, or enterprise.",
      });
    }

    const selectedPlan = plan.toLowerCase();
    const priceId = getStripePriceIdForPlan(selectedPlan);

    if (!priceId) {
      return res.status(500).json({
        success: false,
        message: `Price ID for plan '${selectedPlan}' is not configured in the environment variables.`,
      });
    }

    if (
      activeStatuses.includes(user.subscriptionStatus) &&
      user.subscriptionPlan === selectedPlan
    ) {
      return res.status(409).json({
        success: false,
        message: "You already have an active subscription for this plan.",
      });
    }

    // 1. Get or create Stripe Customer
    const customerId = await getOrCreateCustomer(user);

    // 2. Define success and cancel URLs
    const clientUrl = getClientUrl();
    const successUrl = `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${clientUrl}/payment/cancel`;

    // 3. Create checkout session
    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      user._id.toString(),
      selectedPlan
    );

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create checkout session.",
    });
  }
};

/**
 * @desc    Get user's subscription details and status
 * @route   GET /api/payments/subscription-status
 * @access  Private
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    return res.status(200).json({
      success: true,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      currentPeriodEnd: user.currentPeriodEnd,
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Error retrieving subscription status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch subscription status.",
    });
  }
};

const syncCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe checkout session id is required.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Checkout session does not belong to the authenticated user.",
      });
    }

    if (session.status !== "complete" || !session.subscription) {
      return res.status(400).json({
        success: false,
        message: "Checkout session is not completed yet.",
      });
    }

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );
    const user = await User.findById(req.user._id);

    await applyStripeSubscriptionToUser({
      user,
      subscription,
      customerId: session.customer,
      planFromSession: session.metadata?.plan,
      eventType: "checkout.session.synced",
    });
    await sendActivationEmailIfNeeded({ user, session, subscription });

    return res.status(200).json({
      success: true,
      message: "Subscription synced successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        currentPeriodEnd: user.currentPeriodEnd,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    console.error("Error syncing checkout session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to sync checkout session.",
    });
  }
};

/**
 * @desc    Cancel user's subscription
 * @route   POST /api/payments/cancel-subscription
 * @access  Private
 */
const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.stripeSubscriptionId || !activeStatuses.includes(user.subscriptionStatus)) {
      return res.status(400).json({
        success: false,
        message: "You do not have an active subscription to cancel.",
      });
    }

    // Cancel the subscription in Stripe immediately
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    // Update the local user details
    user.subscriptionPlan = "free";
    user.subscriptionStatus = "canceled";
    user.subscriptionEndDate = new Date();
    user.currentPeriodEnd = user.subscriptionEndDate;
    user.subscription = {
      ...(user.subscription || {}),
      plan: "free",
      status: "canceled",
      price: 0,
      renewalDate: user.subscriptionEndDate,
    };
    user.subscriptionHistory.push({
      ...(user.subscription || {}),
      eventType: "manual_cancel",
    });
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your subscription has been canceled successfully.",
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel subscription.",
    });
  }
};

const getSubscriptionHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    return res.status(200).json({
      success: true,
      history: user.subscriptionHistory || [],
    });
  } catch (error) {
    console.error("Error retrieving subscription history:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch subscription history.",
    });
  }
};

module.exports = {
  createSession,
  syncCheckoutSession,
  getSubscriptionStatus,
  getSubscriptionHistory,
  cancelSubscription,
};
