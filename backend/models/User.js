const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long."],
      maxlength: [50, "Name cannot exceed 50 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters long."],
      select: false,
    },
    googleId: {
      type: String,
      default: undefined,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    avatar: {
      type: String,
      default: undefined,
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: [300, "Bio cannot exceed 300 characters."],
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: undefined,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },
    stripeCustomerId: {
      type: String,
      default: undefined,
    },
    stripeSubscriptionId: {
      type: String,
      default: undefined,
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "none", "basic", "pro", "enterprise"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["inactive", "active", "canceled", "past_due", "trial"],
      default: "inactive",
    },
    subscriptionStartDate: {
      type: Date,
      default: undefined,
    },
    subscriptionEndDate: {
      type: Date,
      default: undefined,
    },
    currentPeriodEnd: {
      type: Date,
      default: undefined,
    },
    subscription: {
      plan: {
        type: String,
        default: "free",
      },
      status: {
        type: String,
        default: "inactive",
      },
      price: {
        type: Number,
        default: 0,
      },
      billingCycle: {
        type: String,
        default: "monthly",
      },
      stripeCustomerId: {
        type: String,
        default: undefined,
      },
      stripeSubscriptionId: {
        type: String,
        default: undefined,
      },
      activatedAt: {
        type: Date,
        default: undefined,
      },
      renewalDate: {
        type: Date,
        default: undefined,
      },
      activationEmailSentForSubscription: {
        type: String,
        default: undefined,
      },
      activationEmailSentAt: {
        type: Date,
        default: undefined,
      },
    },
    subscriptionHistory: [
      {
        plan: String,
        status: String,
        price: Number,
        billingCycle: String,
        stripeSubscriptionId: String,
        activatedAt: Date,
        renewalDate: Date,
        eventType: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPassword(next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function comparePassword(
  enteredPassword
) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed.");
  }
};

userSchema.methods.createResetPasswordToken =
  function createResetPasswordToken() {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
  };

const User = mongoose.model("User", userSchema);

module.exports = User;
