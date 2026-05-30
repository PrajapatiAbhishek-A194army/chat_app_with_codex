import api from "./api";

/**
 * Creates a Stripe checkout session for a plan
 * @param {string} plan - basic, pro, or enterprise
 * @returns {Promise<Object>} The response containing checkoutUrl
 */
export const createCheckoutSession = async (plan) => {
  const response = await api.post("/payment/create-subscription", { plan });
  return response.data;
};

/**
 * Gets the current user's subscription status
 * @returns {Promise<Object>} The subscription details
 */
export const getSubscriptionStatus = async () => {
  const response = await api.get("/subscription/current");
  return response.data;
};

export const syncCheckoutSession = async (sessionId) => {
  const response = await api.post("/subscription/sync-checkout-session", {
    sessionId,
  });
  return response.data;
};

/**
 * Requests subscription cancellation
 * @returns {Promise<Object>} The success message response
 */
export const cancelSubscription = async () => {
  const response = await api.post("/subscription/cancel");
  return response.data;
};
