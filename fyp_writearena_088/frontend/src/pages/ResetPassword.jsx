import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import Logo from "../components/common/Logo";
import PasswordInput from "../components/common/PasswordInput";

export default function ResetPassword() {
  const location = useLocation();
  const prefillEmail = location.state?.email || "";
  // Arriving from Settings ("Send password reset OTP") means a code was
  // already sent for this email — skip straight to entering it instead of
  // making the user request a second one for no reason.
  const [step, setStep] = useState(prefillEmail ? 2 : 1);
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState(prefillEmail ? "Code sent to " + prefillEmail + " — enter it below." : "");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const sendOtp = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setMsg("OTP sent. Check the server console in dev mode.");
      setStep(2);
    } catch { setError("Something went wrong."); }
  };

  const resetPwd = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: newPassword });
      setMsg("Password reset! Redirecting...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) { setError(err.response?.data?.detail || "Invalid OTP."); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass-gold" style={{ width: "100%", maxWidth: 420, padding: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Logo size={32} />
          <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>WriteArena</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Reset password</h2>
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 24 }}>
          {step === 1 ? "Enter your email to receive a one-time code." : "Enter the OTP from the server console and your new password."}
        </p>
        {msg && <div style={{ padding: "10px 14px", background: "var(--accent-glow)", border: "1px solid var(--accent-border)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--accent)" }}>{msg}</div>}
        {error && <div style={{ padding: "10px 14px", background: "rgba(224,125,153,0.12)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--blush-d)" }}>{error}</div>}
        {step === 1 ? (
          <form onSubmit={sendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            <button className="btn btn-primary" type="submit" style={{ justifyContent: "center" }}>Send OTP</button>
          </form>
        ) : (
          <form onSubmit={resetPwd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" required maxLength={6} autoComplete="one-time-code" />
            <PasswordInput name="new-password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" required />
            <button className="btn btn-primary" type="submit" style={{ justifyContent: "center" }}>Reset password</button>
          </form>
        )}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text2)" }}>
          <Link to="/login" style={{ color: "var(--accent)" }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
