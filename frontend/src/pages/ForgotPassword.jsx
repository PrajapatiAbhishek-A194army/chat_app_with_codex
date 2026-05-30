import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import { isValidEmail } from "../utils/validators";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword({ email: email.trim() });
      setFormMessage(data.message);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="forgot-title">
        <div className="auth-header">
          <p className="eyebrow">Account recovery</p>
          <h1 id="forgot-title">Forgot Password</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />

          {formError && <p className="form-alert error">{formError}</p>}
          {formMessage && <p className="form-alert success">{formMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
