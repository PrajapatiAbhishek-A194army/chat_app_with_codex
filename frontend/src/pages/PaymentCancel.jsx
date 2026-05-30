import { Link } from "react-router-dom";

const PaymentCancel = () => {
  return (
    <main className="page-shell">
      <section className="auth-panel" style={{ textAlign: "center", padding: "40px 32px" }}>
        <div className="cancel-icon-container">✕</div>
        
        <h1 style={{ color: "#991b1b", fontSize: "28px", marginBottom: "16px" }}>
          Payment Cancelled
        </h1>
        
        <p style={{ color: "#475569", fontSize: "14px", marginBottom: "28px", lineHeight: "1.5" }}>
          It looks like the checkout process was interrupted or cancelled. Don't worry, your account was not charged.
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link to="/pricing" className="button-link">
            Return to Pricing & Try Again
          </Link>
          <Link to="/dashboard" className="button-link secondary-button">
            Go to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
};

export default PaymentCancel;
