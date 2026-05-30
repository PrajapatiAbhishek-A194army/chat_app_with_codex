import axios from "axios";

// Always use a fixed, explicit base URL.
// NEVER derive from window.location.hostname — it can be 127.0.0.1 vs localhost
// which causes cookie/CORS mismatches after external redirects (e.g. Stripe).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Always send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Single interceptor ID — we replace it when a new unauthorized handler is registered.
let unauthorizedInterceptorId = null;

/**
 * Register a callback to be called whenever the API returns 401 Unauthorized.
 * Ejecting and re-registering ensures only one handler is ever active at a time,
 * preventing stale closures from old renders from firing auth clearing logic.
 */
export const registerUnauthorizedHandler = (handler) => {
  if (unauthorizedInterceptorId !== null) {
    api.interceptors.response.eject(unauthorizedInterceptorId);
  }

  unauthorizedInterceptorId = api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Normalize the error message first
      const message =
        error.response?.data?.message || error.message || "Request failed.";

      // Trigger unauthorized handler for 401 responses — but NOT for the /me
      // endpoint on initial load (that's expected to 401 when logged out).
      if (
        error.response?.status === 401 &&
        typeof handler === "function" &&
        !error.config?.url?.includes("/auth/me")
      ) {
        handler();
      }

      return Promise.reject({ ...error, message });
    }
  );
};

export default api;
