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

// For single-service deployment, allow requests from the same origin
// In development (npm run dev), also allow localhost:3000
const NODE_ENV = process.env.NODE_ENV || "development";
const rawClientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
const allowedOrigins = NODE_ENV === "production" 
  ? [] // Production uses same origin only
  : [...new Set([rawClientUrl, "http://localhost:3000"])];

connectDB();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (Postman, webhooks) that have no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }
      // In production (single-service), allow same-origin requests
      // In development, allow localhost:3000
      if (NODE_ENV === "production" || allowedOrigins.includes(origin)) {
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

// Serve frontend static files in production
const frontendBuildPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendBuildPath));

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

// Fallback: serve React's index.html for all non-API routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendBuildPath, "index.html"));
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
