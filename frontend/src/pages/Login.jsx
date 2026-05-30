import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import useAuth from "../hooks/useAuth";
import { isValidEmail, isValidPassword } from "../utils/validators";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth, login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const redirectTo = location.state?.from?.pathname || "/chat";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!isValidEmail(formData.email)) {
      return "Please enter a valid email address.";
    }

    if (!isValidPassword(formData.password)) {
      return "Password must be at least 8 characters long.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      setFormMessage("Login successful.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleGoogleSuccess = async (token) => {
    try {
      setFormError("");
      setFormMessage("");
      await googleAuth(token);
      setFormMessage("Login successful.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleGoogleError = (error) => {
    setFormMessage("");
    setFormError(error.message);
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-header">
          <p className="eyebrow">Secure access</p>
          <h1 id="login-title">Login</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />

          {formError && <p className="form-alert error">{formError}</p>}
          {formMessage && <p className="form-alert success">{formMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <GoogleAuthButton
          disabled={loading}
          isLoading={loading}
          mode="login"
          onError={handleGoogleError}
          onSuccess={handleGoogleSuccess}
        />

        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/signup">Create account</Link>
        </div>
      </section>
    </main>
  );
};

export default Login;
