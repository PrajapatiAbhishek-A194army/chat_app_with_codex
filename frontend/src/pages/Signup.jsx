import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import useAuth from "../hooks/useAuth";
import { isValidEmail, isValidPassword } from "../utils/validators";

const Signup = () => {
  const navigate = useNavigate();
  const { googleAuth, signup, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (formData.name.trim().length < 2) {
      return "Name must be at least 2 characters long.";
    }

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
      await signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setFormMessage("Account created successfully.");
      navigate("/chat", { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleGoogleSuccess = async (token) => {
    try {
      setFormError("");
      setFormMessage("");
      await googleAuth(token);
      setFormMessage("Account created successfully.");
      navigate("/chat", { replace: true });
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
      <section className="auth-panel" aria-labelledby="signup-title">
        <div className="auth-header">
          <p className="eyebrow">Create your account</p>
          <h1 id="signup-title">Signup</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            required
          />

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
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            required
          />

          {formError && <p className="form-alert error">{formError}</p>}
          {formMessage && <p className="form-alert success">{formMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <GoogleAuthButton
          disabled={loading}
          isLoading={loading}
          mode="signup"
          onError={handleGoogleError}
          onSuccess={handleGoogleSuccess}
        />

        <div className="auth-links">
          <Link to="/login">Already have an account?</Link>
        </div>
      </section>
    </main>
  );
};

export default Signup;
