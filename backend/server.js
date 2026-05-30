const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const { handleStripeWebhook } = require("./webhooks/stripeWebhook");
const { initializeSocket } = require("./socket/socketServer");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Normalise CLIENT_URL to avoid trailing slash or protocol differences.
// IMPORTANT: This must be http://localhost:3000 (not 127.0.0.1) in development.
// Browsers treat them as different origins for cookie and CORS purposes.
const rawClientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");

// Build a de-duplicated list of allowed origins.
// We always include http://localhost:3000 as a fallback for development.
const allowedOrigins = [...new Set([rawClientUrl, "http://localhost:3000"])];

connectDB();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (Postman, webhooks) that have no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,            // Required so the browser sends the JWT cookie
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // OPTIONS preflight requests must be answered with 200, not 404.
    // express cors() does this automatically when preflightContinue is false.
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Stripe Webhook needs raw body, register before express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/subscription", paymentRoutes);

app.get("/", async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "MERN authentication API is running.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server health check failed.",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error.",
  });
});

initializeSocket(server, allowedOrigins);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
