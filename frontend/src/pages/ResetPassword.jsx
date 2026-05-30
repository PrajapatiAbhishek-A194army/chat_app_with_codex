import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
import { isValidPassword } from "../utils/validators";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    if (!isValidPassword(password)) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const data = await resetPassword({ token, password });
      setFormMessage(data.message);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="reset-title">
        <div className="auth-header">
          <p className="eyebrow">Set a new password</p>
          <h1 id="reset-title">Reset Password</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            required
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat new password"
            required
          />

          {formError && <p className="form-alert error">{formError}</p>}
          {formMessage && <p className="form-alert success">{formMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;
