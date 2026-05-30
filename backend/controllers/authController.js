const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const {
  sendSignupSuccessEmail,
  sendLoginAlertEmail,
  sendForgotPasswordEmail,
  sendPasswordResetSuccessEmail,
  sendAccountDeletionEmail,
} = require("../services/authEmailService");

const isProduction = process.env.NODE_ENV === "production";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getCookieMaxAge = () =>
  Number(process.env.COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000;

const getCookieOptions = () => {
  const maxAge = getCookieMaxAge();

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    expires: new Date(Date.now() + maxAge),
    path: "/",
  };
};

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);

  res.cookie("token", token, getCookieOptions());

  return res.status(statusCode).json({
    success: true,
    message,
    user: formatUserResponse(user),
  });
};

const clearTokenCookie = (res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });
};

const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  authProvider: user.authProvider,
  avatar: user.avatar,
  bio: user.bio,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  stripeCustomerId: user.stripeCustomerId,
  stripeSubscriptionId: user.stripeSubscriptionId,
  subscriptionPlan: user.subscriptionPlan,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionStartDate: user.subscriptionStartDate,
  subscriptionEndDate: user.subscriptionEndDate,
  currentPeriodEnd: user.currentPeriodEnd,
  subscription: user.subscription,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongEnoughPassword = (password) =>
  typeof password === "string" && password.trim().length >= 8;

const createRandomPassword = () => crypto.randomBytes(32).toString("hex");

const verifyGoogleToken = async (token) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is missing from environment variables.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return ticket.getPayload();
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    try {
      await sendSignupSuccessEmail({ user });
    } catch (emailError) {
      console.error(emailError.message);
    }

    return sendTokenResponse(user, 201, res, "Signup successful.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Signup failed.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.authProvider === "google") {
      return res.status(403).json({
        success: false,
        message: "This account uses Google authentication. Please continue with Google.",
      });
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    try {
      await sendLoginAlertEmail({ user });
    } catch (emailError) {
      console.error(emailError.message);
    }

    return sendTokenResponse(user, 200, res, "Login successful.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed.",
    });
  }
};

const googleAuthController = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google credential token is required.",
      });
    }

    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email || !payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google credential token.",
      });
    }

    if (payload.email_verified === false) {
      return res.status(401).json({
        success: false,
        message: "Google email is not verified.",
      });
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.authProvider !== "google") {
      return res.status(409).json({
        success: false,
        message: "Account already exists with email/password login.",
      });
    }

    if (
      existingUser &&
      existingUser.googleId &&
      existingUser.googleId !== googleId
    ) {
      return res.status(409).json({
        success: false,
        message: "Google account mismatch for this email.",
      });
    }

    let user = existingUser;

    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: createRandomPassword(),
        googleId,
        authProvider: "google",
        avatar: payload.picture,
      });

      try {
        await sendSignupSuccessEmail({ user });
      } catch (emailError) {
        console.error(emailError.message);
      }

      return sendTokenResponse(user, 201, res, "Google signup successful.");
    }

    user.googleId = user.googleId || googleId;
    user.avatar = payload.picture || user.avatar;
    user.name = user.name || payload.name;
    await user.save({ validateBeforeSave: false });

    try {
      await sendLoginAlertEmail({ user });
    } catch (emailError) {
      console.error(emailError.message);
    }

    return sendTokenResponse(user, 200, res, "Google login successful.");
  } catch (error) {
    const statusCode =
      error.message && error.message.includes("GOOGLE_CLIENT_ID") ? 500 : 401;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? error.message
          : "Google authentication failed.",
    });
  }
};

const logout = async (req, res) => {
  try {
    clearTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Logout failed.",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    const resetToken = user.createResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendForgotPasswordEmail({ user, resetUrl });
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: emailError.message || "Password reset email could not be sent.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Forgot password request failed.",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required.",
      });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or has expired.",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    try {
      await sendPasswordResetSuccessEmail({ user });
    } catch (emailError) {
      console.error(emailError.message);
    }

    return sendTokenResponse(user, 200, res, "Password reset successful.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Password reset failed.",
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const deletedUserEmail = user.email;
    const deletedUserName = user.name;

    await User.findByIdAndDelete(user._id);
    clearTokenCookie(res);

    try {
      await sendAccountDeletionEmail({
        email: deletedUserEmail,
        name: deletedUserName,
      });
    } catch (emailError) {
      console.error(emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Account deletion failed.",
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Current user fetch failed.",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password, and confirm password are required.",
      });
    }

    if (!isStrongEnoughPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isCurrentPasswordMatched = await user.comparePassword(
      currentPassword
    );

    if (!isCurrentPasswordMatched) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Password update failed.",
    });
  }
};

module.exports = {
  signup,
  login,
  googleAuthController,
  logout,
  forgotPassword,
  resetPassword,
  deleteAccount,
  getCurrentUser,
  changePassword,
};
