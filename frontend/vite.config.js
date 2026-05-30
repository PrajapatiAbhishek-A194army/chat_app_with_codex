import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // IMPORTANT: Always bind to localhost, not 127.0.0.1.
    // Browsers treat localhost and 127.0.0.1 as different origins.
    // Google OAuth requires http://localhost:3000 — if Vite serves on
    // 127.0.0.1:3000, you get an origin_mismatch error from Google Console.
    // Cookies set by the backend on localhost also won't be sent to 127.0.0.1.
    host: "localhost",
    port: 3000,
    strictPort: true, // Fail fast if port 3000 is occupied — avoids silently using wrong port
  },
});
