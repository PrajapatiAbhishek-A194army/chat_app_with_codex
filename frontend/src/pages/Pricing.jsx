import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { createCheckoutSession } from "../services/paymentService";

const Pricing = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");

  const activeStatuses = ["active", "past_due", "trial"];

  const handleSubscribe = async (plan) => {
    try {
      setLoadingPlan(plan);
      setError("");
      
      const data = await createCheckoutSession(plan);
      if (data.checkoutUrl) {
        // Redirect to Stripe Hosted Checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Checkout URL was not returned by the server.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingPlan("");
    }
  };

  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: "₹10",
      period: "/month",
      features: [
        "Access to core features",
        "Community support",
        "Up to 3 projects",
        "Standard analytics",
      ],
      popular: false,
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "₹2000",
      period: "/month",
      features: [
        "Access to premium features",
        "Priority email support",
        "Unlimited projects",
        "Advanced analytics dashboard",
        "API integration options",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "₹1000",
      period: "/month",
      features: [
        "All features unlocked",
        "Dedicated account manager",
        "Custom branding & domains",
        "24/7 phone & chat support",
        "SLA uptime guarantee",
      ],
      popular: false,
    },
  ];

  return (
    <main className="pricing-page">
      <section className="pricing-panel">
        <div className="pricing-header">
          <p className="eyebrow">Subscription Plans</p>
          <h1>Find the Perfect Plan for You</h1>
          <p>Get access to premium features and take your workspace to the next level.</p>
        </div>

        {error && <p className="form-alert error" style={{ textAlign: "center" }}>{error}</p>}

        <div className="pricing-grid">
          {plans.map((plan) => {
            const isCurrentPlan =
              user?.subscriptionPlan === plan.id &&
              activeStatuses.includes(user?.subscriptionStatus);
            const isCheckoutLoading = loadingPlan === plan.id;
            const isDisabled = Boolean(loadingPlan) || isCurrentPlan;
            
            return (
              <div 
                key={plan.id} 
                className={`pricing-card ${plan.popular ? "popular" : ""} ${
                  isCurrentPlan ? "current" : ""
                }`}
              >
                {plan.popular && <span className="popular-tag">Most Popular</span>}
                {isCurrentPlan && <span className="active-plan-tag">Active</span>}
                
                <h3 className="plan-name">{plan.name}</h3>
                
                <div className="plan-price">
                  {plan.price}
                  <span>{plan.period}</span>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={plan.popular ? "primary-button" : "secondary-button"}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isDisabled}
                >
                  {isCurrentPlan
                    ? "Current Active Plan"
                    : isCheckoutLoading
                      ? "Redirecting..."
                      : "Subscribe Now"}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link to="/dashboard" className="secondary-link">
            ← Return to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Pricing;
