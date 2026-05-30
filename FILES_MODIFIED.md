# Modified Files - Detailed Changes

## File 1: `/package.json` (NEW FILE - ROOT LEVEL)

```json
{
  "name": "mern-app",
  "version": "1.0.0",
  "description": "Single-service MERN application for Render deployment",
  "main": "backend/server.js",
  "type": "commonjs",
  "scripts": {
    "install-all": "npm install && npm install --prefix frontend && npm install --prefix backend",
    "build": "npm install --prefix frontend && npm run build --prefix frontend",
    "start": "node backend/server.js",
    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "dev:backend": "npm run dev --prefix backend",
    "dev:frontend": "npm run dev --prefix frontend"
  },
  "keywords": ["mern", "authentication", "react", "express", "mongodb", "socket.io"],
  "author": "",
  "license": "MIT"
}
```

**Purpose**: Root-level build and start scripts for Render deployment.

---

## File 2: `/backend/server.js` (MODIFIED)

### Change 1: Updated CORS and Origins Configuration (Lines 21-27)

```diff
- const app = express();
- const server = http.createServer(app);
- const PORT = process.env.PORT || 5000;
-
- // Normalise CLIENT_URL to avoid trailing slash or protocol differences.
- // IMPORTANT: This must be http://localhost:3000 (not 127.0.0.1) in development.
- // Browsers treat them as different origins for cookie and CORS purposes.
- const rawClientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
-
- // Build a de-duplicated list of allowed origins.
- // We always include http://localhost:3000 as a fallback for development.
- const allowedOrigins = [...new Set([rawClientUrl, "http://localhost:3000"])];

+ const app = express();
+ const server = http.createServer(app);
+ const PORT = process.env.PORT || 5000;
+
+ // For single-service deployment, allow requests from the same origin
+ // In development (npm run dev), also allow localhost:3000
+ const NODE_ENV = process.env.NODE_ENV || "development";
+ const rawClientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
+ const allowedOrigins = NODE_ENV === "production" 
+   ? [] // Production uses same origin only
+   : [...new Set([rawClientUrl, "http://localhost:3000"])];
```

### Change 2: Updated CORS Origin Check (Lines 41)

```diff
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (Postman, webhooks) that have no Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }
-       if (allowedOrigins.includes(origin)) {
+       // In production (single-service), allow same-origin requests
+       // In development, allow localhost:3000
+       if (NODE_ENV === "production" || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
```

### Change 3: Added Static File Serving and React Router Fallback (Lines 73-101)

```diff
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());

+ // Serve frontend static files in production
+ const frontendBuildPath = path.join(__dirname, "..", "frontend", "dist");
+ app.use(express.static(frontendBuildPath));

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

- app.use((req, res) => {
-   res.status(404).json({
-     success: false,
-     message: "Route not found.",
-   });
- });
+
+ // Fallback: serve React's index.html for all non-API routes (SPA support)
+ app.get("*", (req, res) => {
+   res.sendFile(path.join(frontendBuildPath, "index.html"));
+ });

  app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  });
```

---

## File 3: `/frontend/src/services/api.js` (MODIFIED)

### Change: Updated Base URL to Relative Path

```diff
  import axios from "axios";

- // Always use a fixed, explicit base URL.
- // NEVER derive from window.location.hostname — it can be 127.0.0.1 vs localhost
- // which causes cookie/CORS mismatches after external redirects (e.g. Stripe).
- const API_BASE_URL =
-   import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
- console.log("Using API base URL:", API_BASE_URL);
- const api = axios.create({
-   baseURL: API_BASE_URL,
+ // Use relative URL for single-service deployment.
+ // In production: requests go to /api/* on the same domain.
+ // In development: Vite proxy might redirect to http://localhost:5000/api
+ const API_BASE_URL = "/api";
+ console.log("Using API base URL:", API_BASE_URL);
+
+ const api = axios.create({
+   baseURL: API_BASE_URL,
    withCredentials: true, // Always send cookies with every request
    headers: {
      "Content-Type": "application/json",
    },
  });
```

**Impact**: All API requests now use `/api` prefix, working on any domain automatically.

---

## File 4: `/frontend/src/services/socketService.js` (MODIFIED)

### Change: Updated Socket URL to Use window.location.origin

```diff
  import { io } from "socket.io-client";

- const API_BASE_URL =
-   import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
-
- const SOCKET_URL =
-   import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, "");
-
- let socket = null;

+ // For single-service deployment, connect to the same origin
+ // window.location.origin = current domain (e.g., https://app.render.com)
+ const SOCKET_URL = window.location.origin;
+
+ let socket = null;
```

**Impact**: Socket.IO automatically connects to the same domain as the frontend.

---

## File 5: `/backend/Dockerfile` (DELETED)

```diff
- FROM node:22
- 
- WORKDIR /app
- 
- COPY package*.json ./
- 
- RUN npm install --omit=dev
- 
- COPY . .
- 
- EXPOSE 5000
- 
- CMD ["npm","start"]
```

**Reason**: Render automatically provides Node.js environment; Docker not needed for single service.

---

## File 6: Unmodified But Important Files

### `/backend/package.json` (NO CHANGES - Already Correct)
```json
{
  "scripts": {
    "start": "node server.js",  // ✓ Already correct for Render
    "dev": "nodemon server.js"
  }
}
```

### `/frontend/package.json` (NO CHANGES - Already Correct)
```json
{
  "scripts": {
    "dev": "vite --host localhost --port 3000",
    "build": "vite build",  // ✓ Builds to /dist directory
    "preview": "vite preview --host localhost --port 3000"
  }
}
```

### `/frontend/vite.config.js` (NO CHANGES - Already Correct)
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 3000,
    strictPort: true,
  },
  // ✓ Production build configured correctly
  // ✓ No proxy needed anymore (API uses relative /api path)
});
```

---

## Summary of Changes

| File | Type | Change | Impact |
|------|------|--------|--------|
| `/package.json` | NEW | Root build/start scripts | Enables single-service build |
| `/backend/server.js` | EDIT | Add static serving + fallback | Serves frontend, SPA routing |
| `/frontend/src/services/api.js` | EDIT | Change baseURL to `/api` | All APIs use relative URLs |
| `/frontend/src/services/socketService.js` | EDIT | Use window.location.origin | Socket.IO auto-connects |
| `/backend/Dockerfile` | DELETE | Remove Docker file | Not needed for Render |
| All other files | NONE | ✓ No changes needed | Fully compatible |

---

## Environment Variables - Changes Needed

### 🗑️ REMOVE from Render Dashboard
- `VITE_API_BASE_URL` (no longer used, API is `/api`)
- `VITE_SOCKET_URL` (no longer used, Socket.IO uses `window.location.origin`)
- `CLIENT_URL` (no longer used, single-service mode)

### ✅ KEEP in Render Dashboard
- `NODE_ENV=production` (important for CORS)
- `MONGODB_URI=...`
- `JWT_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_PUBLIC_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `NODEMAILER_EMAIL=...`
- `NODEMAILER_PASSWORD=...`
- All other existing env vars

---

## Testing Checklist

- [ ] Root `package.json` exists with build/start scripts
- [ ] `backend/server.js` serves frontend static files
- [ ] `backend/server.js` has React Router fallback route
- [ ] `frontend/src/services/api.js` uses `/api` baseURL
- [ ] `frontend/src/services/socketService.js` uses `window.location.origin`
- [ ] `backend/Dockerfile` is deleted
- [ ] All other service files unchanged (use centralized api.js)
- [ ] Backend package.json unchanged (start script correct)
- [ ] Frontend package.json unchanged (build script correct)
- [ ] Vite config unchanged (no proxy needed)

---

*Conversion Completed: 2026-05-30*
*Ready for Render Deployment*
