import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const isLoopbackIp = window.location.hostname === "127.0.0.1";

if (isLoopbackIp) {
  window.location.replace(
    window.location.href.replace("://127.0.0.1", "://localhost")
  );
} else {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={googleClientId}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <ChatProvider>
                <App />
              </ChatProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}
