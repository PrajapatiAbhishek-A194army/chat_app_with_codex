import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  googleAuthUser,
  loginUser,
  logoutUser,
  signupUser,
} from "../services/authService";
import { registerUnauthorizedHandler } from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const clearAuthState = useCallback(() => {
    setUser(null);
  }, []);

  /**
   * fetchCurrentUser — called once on app startup (and after Stripe redirect).
   * Sets checkingAuth=true while running, which makes ProtectedRoute show a
   * loading spinner instead of redirecting to /login.
   *
   * On 401: silently clears user (logged out state). The api.js interceptor
   * does NOT call clearAuthState() for /auth/me 401s to prevent double-clearing.
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      setCheckingAuth(true);
      setAuthError("");
      const data = await getCurrentUser();
      setUser(data.user);
      return data.user;
    } catch (error) {
      if ([401, 404].includes(error.response?.status)) {
        clearAuthState();
      } else {
        setAuthError(error.message || "Unable to restore your session.");
      }
      return null;
    } finally {
      setCheckingAuth(false);
    }
  }, [clearAuthState]);

  /**
   * refreshUser — lightweight re-fetch of the current user.
   * Does NOT change checkingAuth, so the UI never flashes back to "Loading...".
   * Use this when you need to sync updated user data (e.g. subscription after
   * Stripe webhook) without disrupting the current auth session display.
   */
  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      return data.user;
    } catch (error) {
      if ([401, 404].includes(error.response?.status)) {
        clearAuthState();
      }
      return null;
    }
  }, [clearAuthState]);

  // On app startup (and after every full-page reload / Stripe redirect),
  // verify the JWT cookie is still valid and restore the user session.
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Register the global 401 handler. When any non-/me API call returns 401,
  // the interceptor in api.js calls clearAuthState() to reset auth context.
  useEffect(() => {
    registerUnauthorizedHandler(clearAuthState);
  }, [clearAuthState]);

  const signup = async (payload) => {
    try {
      setLoading(true);
      setAuthError("");
      const data = await signupUser(payload);
      setUser(data.user);
      return data;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (payload) => {
    try {
      setLoading(true);
      setAuthError("");
      const data = await loginUser(payload);
      setUser(data.user);
      return data;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const googleAuth = async (token) => {
    try {
      setLoading(true);
      setAuthError("");
      const data = await googleAuthUser(token);
      setUser(data.user);
      return data;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setAuthError("");
      await logoutUser();
      clearAuthState();
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      checkingAuth,
      authError,
      isAuthenticated: Boolean(user),
      signup,
      login,
      googleAuth,
      logout,
      fetchCurrentUser,
      refreshUser,
      clearAuthState,
      setUser,
      setAuthError,
    }),
    [
      user,
      loading,
      checkingAuth,
      authError,
      fetchCurrentUser,
      refreshUser,
      clearAuthState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
