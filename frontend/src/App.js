import { createElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ChangePassword from "./pages/ChangePassword";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import useAuth from "./hooks/useAuth";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import Subscription from "./pages/Subscription";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import ChatPage from "./pages/chat/ChatPage";
import ProfilePage from "./pages/chat/ProfilePage";
import SettingsPage from "./pages/chat/SettingsPage";

const AuthRedirect = ({ authenticatedTo, guestTo }) => {
  const { isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) {
    return createElement("div", { className: "page-shell" }, "Loading...");
  }

  return createElement(Navigate, {
    to: isAuthenticated ? authenticatedTo : guestTo,
    replace: true,
  });
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) {
    return createElement("div", { className: "page-shell" }, "Loading...");
  }

  if (isAuthenticated) {
    return createElement(Navigate, { to: "/chat", replace: true });
  }

  return children;
};

const App = () => {
  return createElement(
    Routes,
    null,
    createElement(Route, {
      path: "/",
      element: createElement(AuthRedirect, {
        authenticatedTo: "/chat",
        guestTo: "/login",
      }),
    }),
    createElement(Route, {
      path: "/login",
      element: createElement(PublicOnlyRoute, null, createElement(Login)),
    }),
    createElement(Route, {
      path: "/signup",
      element: createElement(PublicOnlyRoute, null, createElement(Signup)),
    }),
    createElement(Route, {
      path: "/forgot-password",
      element: createElement(ForgotPassword),
    }),
    createElement(Route, {
      path: "/reset-password/:token",
      element: createElement(ResetPassword),
    }),
    createElement(Route, {
      path: "/dashboard",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(Dashboard)
      ),
    }),
    createElement(Route, {
      path: "/change-password",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(ChangePassword)
      ),
    }),
    createElement(Route, {
      path: "/chat",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(ChatPage)
      ),
    }),
    createElement(Route, {
      path: "/profile",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(ProfilePage)
      ),
    }),
    createElement(Route, {
      path: "/settings",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(SettingsPage)
      ),
    }),
    createElement(Route, {
      path: "/pricing",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(Pricing)
      ),
    }),
    createElement(Route, {
      path: "/subscription",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(Subscription)
      ),
    }),
    createElement(Route, {
      path: "/payment/success",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(PaymentSuccess)
      ),
    }),
    createElement(Route, {
      path: "/payment/cancel",
      element: createElement(
        ProtectedRoute,
        null,
        createElement(PaymentCancel)
      ),
    }),
    createElement(Route, {
      path: "*",
      element: createElement(Navigate, { to: "/login", replace: true }),
    })
  );
};

export default App;
