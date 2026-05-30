import { GoogleLogin } from "@react-oauth/google";

const GoogleAuthButton = ({ disabled, isLoading, mode, onError, onSuccess }) => {
  if (disabled || isLoading) {
    return (
      <button type="button" className="google-auth-button" disabled>
        {isLoading ? "Connecting..." : "Continue with Google"}
      </button>
    );
  }

  return (
    <div className="google-auth-wrapper">
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          if (!credentialResponse.credential) {
            onError(new Error("Google did not return a credential token."));
            return;
          }

          await onSuccess(credentialResponse.credential);
        }}
        onError={() => {
          onError(new Error("Google authentication was cancelled or failed."));
        }}
        shape="rectangular"
        size="large"
        text={mode === "signup" ? "signup_with" : "continue_with"}
        theme="outline"
        width="100%"
      />
    </div>
  );
};

export default GoogleAuthButton;
