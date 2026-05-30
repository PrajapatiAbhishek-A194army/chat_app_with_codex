const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_CATALOG = {
  basic: {
    label: "Basic Plan",
    price: 10,
    displayPrice: "₹10/month",
    billingCycle: "monthly",
  },
  pro: {
    label: "Pro Plan",
    price: 2000,
    displayPrice: "₹2000/month",
    billingCycle: "monthly",
  },
  enterprise: {
    label: "Enterprise Plan",
    price: 1000,
    displayPrice: "₹1000/month",
    billingCycle: "monthly",
  },
};

const getPlanDetails = (plan) =>
  PLAN_CATALOG[plan] || {
    label: "Free Plan",
    price: 0,
    displayPrice: "₹0/month",
    billingCycle: "monthly",
  };

const getStripePriceIdForPlan = (plan) => {
  const priceIds = {
    basic: process.env.STRIPE_BASIC_PRICE_ID || process.env.STRIPE_PRICE_ID_BASIC,
    pro: process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID_PRO,
    enterprise:
      process.env.STRIPE_ENTERPRISE_PRICE_ID ||
      process.env.STRIPE_PRICE_ID_ENTERPRISE,
  };

  return priceIds[plan];
};

const getPlanFromStripePriceId = (priceId) => {
  const plan = ["basic", "pro", "enterprise"].find(
    (planName) => getStripePriceIdForPlan(planName) === priceId
  );

  return plan || "free";
};

/**
 * Retrieves an existing Stripe customer ID or creates a new Stripe customer
 * and updates the corresponding user document in MongoDB.
 * @param {Object} user - The mongoose user document
 * @returns {Promise<string>} The Stripe Customer ID
 */
const getOrCreateCustomer = async (user) => {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new customer in Stripe
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user._id.toString(),
    },
  });

  // Save the Stripe customer ID to our MongoDB database
  user.stripeCustomerId = customer.id;
  await user.save();

  return customer.id;
};

/**
 * Creates a Stripe Hosted Checkout Session for a subscription plan
 * @param {string} customerId - The Stripe customer ID
 * @param {string} priceId - The Stripe price ID for the plan
 * @param {string} successUrl - URL redirect on success
 * @param {string} cancelUrl - URL redirect on cancel/failure
 * @param {string} userId - The user's MongoDB ID
 * @returns {Promise<Object>} The checkout session object
 */
const createCheckoutSession = async (
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
  plan
) => {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
    },
    subscription_data: {
      metadata: {
        userId,
        plan,
      },
    },
  });

  return session;
};

module.exports = {
  stripe,
  getOrCreateCustomer,
  getPlanFromStripePriceId,
  getPlanDetails,
  getStripePriceIdForPlan,
  createCheckoutSession,
};
