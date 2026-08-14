import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Set in frontend/.env as VITE_GOOGLE_CLIENT_ID=<your OAuth Web client ID>.
// Must match GOOGLE_CLIENT_ID in backend/.env — the frontend uses it to
// render the Google button and request an ID token; the backend uses it to
// verify that token actually came from your app.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** Renders Google's own "Continue with Google" button (via Google Identity
 * Services) and completes sign-in through /auth/google on success. Renders
 * nothing if no client ID is configured, so the rest of the auth screen is
 * unaffected until Google Sign-In is set up. */
export default function GoogleSignInButton() {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const divRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!CLIENT_ID) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          setError("");
          try {
            await googleLogin(response.credential);
            navigate("/dashboard");
          } catch (err) {
            setError(err.response?.data?.detail || "Google sign-in failed. Please try again.");
          }
        },
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 340,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);
    return () => { script.onload = null; };
  }, [googleLogin, navigate]);

  if (!CLIENT_ID) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 16px" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 12, color: "var(--ink3)", fontFamily: "var(--serif)", fontStyle: "italic" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div ref={divRef} style={{ display: "flex", justifyContent: "center" }} />
      {error && (
        <div className="badge badge-red" style={{ display: "block", padding: "8px 12px", borderRadius: 12, marginTop: 10, fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
