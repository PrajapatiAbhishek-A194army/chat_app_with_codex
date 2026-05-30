import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { syncCheckoutSession } from "../services/paymentService";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  // refreshUser re-fetches user data WITHOUT setting checkingAuth=true,
  // so ProtectedRoute never re-evaluates during the subscription sync.
  // This prevents the user from being flashed to /login after payment.
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  // Prevent double-firing the sync if React StrictMode double-invokes effects
  const hasSynced = useRef(false);

  useEffect(() => {
    // refreshUser() is safe to call at any time — it does NOT reset checkingAuth,
    // so ProtectedRoute won't flash the loading state or redirect to /login.
    if (hasSynced.current) return;
    hasSynced.current = true;

    const syncUserSubscription = async () => {
      try {
        const sessionId = new URLSearchParams(window.location.search).get(
          "session_id"
        );

        if (sessionId) {
          await syncCheckoutSession(sessionId);
        }

        // Stripe webhooks can arrive a moment after Checkout redirects back.
        // Retry briefly so the dashboard receives the persisted subscription.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const latestUser = await refreshUser();
          if (latestUser?.subscriptionStatus === "active") {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      } catch (err) {
        // Non-fatal: ProtectedRoute already verified the user is authenticated.
        // We just couldn't refresh the subscription data.
        console.error("Error synchronizing subscription after payment:", err);
      } finally {
        setLoading(false);
      }
    };

    syncUserSubscription();
  }, [refreshUser]);

  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/dashboard", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, navigate]);

  return (
    <main className="page-shell">
      <section className="auth-panel" style={{ textAlign: "center", padding: "40px 32px" }}>
        <div className="success-icon-container">✓</div>

        <h1 style={{ color: "#065f46", fontSize: "28px", marginBottom: "16px" }}>
          Payment Successful!
        </h1>

        {loading ? (
          <p style={{ color: "#475569" }}>Verifying your premium subscription status...</p>
        ) : (
          <>
            <p style={{ color: "#1e293b", fontWeight: "700", marginBottom: "12px" }}>
              Thank you for subscribing!
            </p>
            <p style={{ color: "#475569", fontSize: "14px", marginBottom: "24px" }}>
              Your account has been upgraded successfully. You are now being redirected to your dashboard.
            </p>

            <div style={{ margin: "24px 0" }}>
              <Link to="/dashboard" className="button-link" style={{ width: "100%" }}>
                Go to Dashboard ({countdown}s)
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default PaymentSuccess;
