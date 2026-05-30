import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { deleteAccount } from "../services/authService";
import { cancelSubscription } from "../services/paymentService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, clearAuthState, refreshUser } = useAuth();
  const [loadingAction, setLoadingAction] = useState("");
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const canChangePassword = user?.authProvider !== "google";
  const activeStatuses = ["active", "past_due", "trial"];

  const handleLogout = async () => {
    try {
      setLoadingAction("logout");
      setFormError("");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoadingAction("");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "This will permanently delete your account. Continue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingAction("delete");
      setFormError("");
      const data = await deleteAccount();
      clearAuthState();
      setFormMessage(data.message);
      navigate("/signup", { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoadingAction("");
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Cancel your current subscription? Premium access will be removed when Stripe confirms cancellation."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingAction("cancel");
      setFormError("");
      setFormMessage("");
      const data = await cancelSubscription();
      await refreshUser();
      setFormMessage(data.message);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoadingAction("");
    }
  };

  const isPremiumActive = activeStatuses.includes(user?.subscriptionStatus);
  const subscription = user?.subscription || {};
  const currentPlanLabel =
    subscription.plan && !["free", "none"].includes(subscription.plan)
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : user?.subscriptionPlan &&
      !["free", "none"].includes(user.subscriptionPlan)
      ? user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)
    : "Free Tier";
  const activationDate = subscription.activatedAt || user?.subscriptionStartDate;
  const getFallbackRenewalDate = (date) => {
    if (!date || !isPremiumActive) return null;
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  };
  const renewalDate =
    subscription.renewalDate ||
    user?.subscriptionEndDate ||
    user?.currentPeriodEnd ||
    getFallbackRenewalDate(activationDate);
  const planPrice =
    typeof subscription.price === "number" && subscription.price > 0
      ? `₹${subscription.price}/${subscription.billingCycle === "yearly" ? "year" : "month"}`
      : "₹0/month";
  const status = subscription.status || user?.subscriptionStatus || "inactive";
  const formattedRenewalDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";
  const formattedActivationDate = activationDate
    ? new Date(activationDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";
  const daysRemaining = renewalDate
    ? Math.max(
        0,
        Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000)
      )
    : 0;

  const getStatusBadgeClass = (value) => {
    if (value === "active") return "sub-status-badge active";
    if (value === "trialing" || value === "trial") return "sub-status-badge trial";
    if (value === "past_due") return "sub-status-badge past_due";
    if (value === "canceled") return "sub-status-badge canceled";
    return "sub-status-badge inactive";
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-panel" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">Protected Route • {currentPlanLabel}</p>
          <h1 id="dashboard-title">Dashboard</h1>
        </div>

        <div className="profile-grid">
          <div>
            <span>Name</span>
            <strong>{user?.name}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>
          <div>
            <span>Plan & Status</span>
            <strong>
              {currentPlanLabel}
            </strong>
          </div>
          <div>
            <span>Price</span>
            <strong>{planPrice}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>
              <span className={getStatusBadgeClass(status)}>{status}</span>
            </strong>
          </div>
          <div>
            <span>Activated On</span>
            <strong>{formattedActivationDate}</strong>
          </div>
          <div>
            <span>Next Billing Date</span>
            <strong>{formattedRenewalDate}</strong>
          </div>
          <div>
            <span>Days Remaining</span>
            <strong>{daysRemaining}</strong>
          </div>
          <div>
            <span>Billing Status</span>
            <strong>{isPremiumActive ? "Recurring billing active" : "No active billing"}</strong>
          </div>
          <div>
            <span>Stripe Customer ID</span>
            <strong>{user?.stripeCustomerId || "Not created yet"}</strong>
          </div>
        </div>

        {/* Premium Gated Features Area */}
        {isPremiumActive ? (
          <div className="premium-feature-card">
            <h3 style={{ margin: "0 0 10px 0", color: "#1e3a8a", fontSize: "18px" }}>
              💎 Premium Features Unlocked!
            </h3>
            <p style={{ margin: 0, color: "#1e293b", fontSize: "14px", lineHeight: "1.5" }}>
              Welcome back to your <strong>{currentPlanLabel}</strong> sandbox. You have full access to our advanced analytics suite, premium priority channels, and unlimited project creation tools.
            </p>
          </div>
        ) : (
          <div className="premium-feature-card" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #cbd5e1" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#475569", fontSize: "18px" }}>
              🔒 Premium Features Locked
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "14px", lineHeight: "1.5" }}>
              Upgrade to a premium subscription plan to unlock priority features, advanced charts, custom domains, and full enterprise API controls.
            </p>
            <Link to="/pricing" className="button-link" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", minHeight: "38px", fontSize: "14px" }}>
              View Upgrade Options
            </Link>
          </div>
        )}

        {formError && <p className="form-alert error">{formError}</p>}
        {formMessage && <p className="form-alert success">{formMessage}</p>}

        <div className="dashboard-actions" style={{ marginTop: "24px" }}>
          <Link className="button-link" to="/chat">
            Open Chat
          </Link>
          <Link className="button-link" to="/subscription">
            Manage Subscription
          </Link>
          <Link className="button-link" to="/pricing">
            {isPremiumActive ? "Upgrade Plan" : "Choose Plan"}
          </Link>
          {isPremiumActive && (
            <button
              type="button"
              className="danger-button"
              onClick={handleCancelSubscription}
              disabled={Boolean(loadingAction)}
            >
              {loadingAction === "cancel" ? "Canceling..." : "Cancel Subscription"}
            </button>
          )}
          {canChangePassword && (
            <Link className="button-link secondary-button" to="/change-password">
              Change Password
            </Link>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === "logout" ? "Logging out..." : "Logout"}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={handleDeleteAccount}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === "delete" ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
