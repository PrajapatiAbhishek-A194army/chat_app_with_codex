const {
  getPlanDetails,
  getPlanFromStripePriceId,
  stripe,
} = require("../services/stripeService");
const User = require("../models/User");
const {
  sendCancellationEmail,
  sendRenewalConfirmationEmail,
  sendSubscriptionActivatedEmail,
} = require("../services/authEmailService");

// Helper to map Stripe subscription status to our database schema status
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

const applySubscriptionToUser = async ({
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

  user.stripeSubscriptionId = subscription.id;
  user.subscriptionPlan = planName;
  user.subscriptionStatus = dbStatus;
  user.subscriptionStartDate = startDate;
  user.subscriptionEndDate = endDate;
  user.currentPeriodEnd = endDate;
  user.subscription = {
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

  if (customerId && !user.stripeCustomerId) {
    user.stripeCustomerId = customerId;
  }

  await user.save();
};

const formatBillDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

const buildEmailSubscriptionPayload = ({ session, subscription }) => {
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

const sendCheckoutActivationEmail = async ({ user, session, subscription }) => {
  const emailPayload = buildEmailSubscriptionPayload({ session, subscription });

  try {
    await sendSubscriptionActivatedEmail({
      user,
      subscription: emailPayload,
    });
    user.subscription.activationEmailSentForSubscription = subscription.id;
    user.subscription.activationEmailSentAt = new Date();
    await user.save();
    console.log(`Subscription activation email sent to ${user.email}.`);
  } catch (emailError) {
    console.error(
      `Subscription activation email failed for ${user.email}:`,
      emailError.message
    );
  }
};

const sendRenewalEmail = async ({ user, invoice }) => {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const emailPayload = buildEmailSubscriptionPayload({
    session: { metadata: subscription.metadata || {} },
    subscription,
  });

  try {
    await sendRenewalConfirmationEmail({ user, subscription: emailPayload });
    console.log(`Renewal confirmation email sent to ${user.email}.`);
  } catch (emailError) {
    console.error(`Renewal email failed for ${user.email}:`, emailError.message);
  }
};

const sendSubscriptionCancellationEmail = async ({ user, subscription }) => {
  const planDetails = getPlanDetails(user.subscription?.plan || user.subscriptionPlan);
  const { endDate } = getSubscriptionPeriodDates(subscription);

  try {
    await sendCancellationEmail({
      user,
      subscription: {
        plan: planDetails.label,
        renewalDate: formatBillDate(endDate),
      },
    });
    console.log(`Cancellation email sent to ${user.email}.`);
  } catch (emailError) {
    console.error(`Cancellation email failed for ${user.email}:`, emailError.message);
  }
};

/**
 * Handles incoming Stripe Webhooks
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  const sessionOrSub = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = sessionOrSub;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const userId = session.metadata?.userId;

        console.log(`Checkout session completed for user: ${userId}, subscription: ${subscriptionId}`);

        // Retrieve full subscription details to get the Price ID and period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // Find the user by ID (or stripeCustomerId as fallback)
        let user;
        if (userId) {
          user = await User.findById(userId);
        }
        if (!user && customerId) {
          user = await User.findOne({ stripeCustomerId: customerId });
        }

        if (user) {
          await applySubscriptionToUser({
            user,
            subscription,
            customerId,
            planFromSession: session.metadata?.plan,
            eventType: event.type,
          });
          await sendCheckoutActivationEmail({ user, session, subscription });
          console.log(`User ${user.email} subscription activated successfully.`);
        } else {
          console.error(`User not found for session customer ${customerId} / userId ${userId}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = sessionOrSub;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        console.log(`Subscription created/updated: ${subscriptionId} for customer: ${customerId}`);

        let user = await User.findOne({ stripeCustomerId: customerId });
        if (!user && subscription.metadata?.userId) {
          user = await User.findById(subscription.metadata.userId);
        }

        if (user) {
          await applySubscriptionToUser({
            user,
            subscription,
            customerId,
            planFromSession: subscription.metadata?.plan,
            eventType: event.type,
          });
          console.log(`User ${user.email} subscription details updated.`);
        } else {
          console.warn(`User with stripeCustomerId ${customerId} not found.`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = sessionOrSub;
        const customerId = subscription.customer;

        console.log(`Subscription deleted: ${subscription.id} for customer: ${customerId}`);

        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          const { endDate } = getSubscriptionPeriodDates(subscription);
          user.subscriptionPlan = "free";
          user.subscriptionStatus = "canceled";
          user.subscriptionEndDate = endDate || new Date();
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
            eventType: event.type,
          });
          await user.save();
          await sendSubscriptionCancellationEmail({ user, subscription });
          console.log(`User ${user.email} subscription status set to canceled.`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = sessionOrSub;
        const customerId = invoice.customer;

        console.log(`Invoice paid for customer: ${customerId}`);

        let user = await User.findOne({ stripeCustomerId: customerId });
        if (user && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await applySubscriptionToUser({
            user,
            subscription,
            customerId,
            planFromSession: subscription.metadata?.plan,
            eventType: event.type,
          });
          await sendRenewalEmail({ user, invoice });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = sessionOrSub;
        const customerId = invoice.customer;

        console.log(`Payment failed for invoice customer: ${customerId}`);

        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.subscriptionStatus = "past_due";
          await user.save();
          console.log(`User ${user.email} subscription status set to past_due.`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error handling webhook event:", error);
    res.status(500).json({ success: false, message: "Webhook execution failed." });
  }
};

module.exports = {
  handleStripeWebhook,
};
