import { useState } from "react";
import { Link } from "react-router-dom";
import { changePassword } from "../services/authService";
import { isValidPassword } from "../utils/validators";

const initialFormData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialVisibility = {
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
};

const ChangePassword = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(initialVisibility);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPassword((currentVisibility) => ({
      ...currentVisibility,
      [fieldName]: !currentVisibility[fieldName],
    }));
  };

  const validateForm = () => {
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      return "All password fields are required.";
    }

    if (!isValidPassword(formData.currentPassword)) {
      return "Current password must be at least 8 characters long.";
    }

    if (!isValidPassword(formData.newPassword)) {
      return "New password must be at least 8 characters long.";
    }

    if (formData.currentPassword === formData.newPassword) {
      return "New password must be different from current password.";
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return "New password and confirm password do not match.";
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
      setLoading(true);
      const data = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      setFormData(initialFormData);
      setShowPassword(initialVisibility);
      setFormMessage(data.message);
    } catch (error) {
      setFormError(error.message || "Password update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="change-password-title">
        <div className="auth-header">
          <p className="eyebrow">Account security</p>
          <h1 id="change-password-title">Change Password</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="currentPassword">Current password</label>
          <div className="password-input-row">
            <input
              id="currentPassword"
              name="currentPassword"
              type={showPassword.currentPassword ? "text" : "password"}
              autoComplete="current-password"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => togglePasswordVisibility("currentPassword")}
              aria-label={
                showPassword.currentPassword
                  ? "Hide current password"
                  : "Show current password"
              }
            >
              {showPassword.currentPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="newPassword">New password</label>
          <div className="password-input-row">
            <input
              id="newPassword"
              name="newPassword"
              type={showPassword.newPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => togglePasswordVisibility("newPassword")}
              aria-label={
                showPassword.newPassword
                  ? "Hide new password"
                  : "Show new password"
              }
            >
              {showPassword.newPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="confirmPassword">Confirm new password</label>
          <div className="password-input-row">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword.confirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat new password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => togglePasswordVisibility("confirmPassword")}
              aria-label={
                showPassword.confirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showPassword.confirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          {formError && <p className="form-alert error">{formError}</p>}
          {formMessage && <p className="toast success">{formMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </section>
    </main>
  );
};

export default ChangePassword;
