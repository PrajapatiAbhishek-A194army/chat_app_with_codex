import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getSubscriptionStatus, cancelSubscription } from "../services/paymentService";

const Subscription = () => {
  const { fetchCurrentUser } = useAuth();
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSubscriptionDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getSubscriptionStatus();
      setSubStatus(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionDetails();
  }, []);

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You will lose access to premium features immediately."
    );

    if (!confirmed) return;

    try {
      setCanceling(true);
      setError("");
      setMessage("");
      const res = await cancelSubscription();
      setMessage(res.message);
      
      // Refresh details and sync auth state
      await fetchCurrentUser();
      await loadSubscriptionDetails();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to cancel subscription.");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <main className="subscription-page">
        <section className="subscription-panel">
          <p style={{ textAlign: "center", fontSize: "18px" }}>Loading subscription details...</p>
        </section>
      </main>
    );
  }

  const isSubscribed =
    subStatus?.subscriptionStatus === "active" ||
    subStatus?.subscriptionStatus === "past_due" ||
    subStatus?.subscriptionStatus === "trial";
  const planLabel =
    subStatus?.subscriptionPlan &&
    !["free", "none"].includes(subStatus.subscriptionPlan)
    ? subStatus.subscriptionPlan.charAt(0).toUpperCase() + subStatus.subscriptionPlan.slice(1)
    : "Free Tier";
  const renewalDate = subStatus?.subscriptionEndDate || subStatus?.currentPeriodEnd;

  const getStatusBadgeClass = (status) => {
    if (status === "active") return "sub-status-badge active";
    if (status === "trial") return "sub-status-badge trial";
    if (status === "past_due") return "sub-status-badge past_due";
    if (status === "canceled") return "sub-status-badge canceled";
    return "sub-status-badge inactive";
  };

  return (
    <main className="subscription-page">
      <section className="subscription-panel">
        <div className="sub-header">
          <p className="eyebrow">Billing & Account</p>
          <h1>Subscription Status</h1>
        </div>

        {error && <p className="form-alert error">{error}</p>}
        {message && <p className="form-alert success">{message}</p>}

        <div className="profile-grid">
          <div>
            <span>Plan Tier</span>
            <strong>{planLabel}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong style={{ marginTop: "4px" }}>
              <span className={getStatusBadgeClass(subStatus?.subscriptionStatus)}>
                {subStatus?.subscriptionStatus || "inactive"}
              </span>
            </strong>
          </div>
          <div>
            <span>Renewal / Expiry Date</span>
            <strong>
              {renewalDate 
                ? new Date(renewalDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </strong>
          </div>
        </div>

        {isSubscribed ? (
          <div style={{ marginTop: "32px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link className="button-link" to="/pricing">
              Change / Upgrade Plan
            </Link>
            <button
              type="button"
              className="danger-button"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? "Canceling..." : "Cancel Subscription"}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: "32px" }}>
            <p style={{ color: "#475569", marginBottom: "20px" }}>
              You do not have an active premium plan. Unlock premium features and tools by selecting a subscription.
            </p>
            <Link className="button-link" to="/pricing">
              View Subscription Plans
            </Link>
          </div>
        )}

        <div style={{ marginTop: "24px", textAlign: "left" }}>
          <Link to="/dashboard" style={{ color: "#64748b", fontSize: "14px" }}>
            ← Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Subscription;
