import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { setLocalAvatar } from "../lib/avatarStore";
import Logo from "../components/common/Logo";

const RESEND_COOLDOWN = 30; // seconds

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification } = useAuth();

  const [email, setEmail] = useState(state?.email || "");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);
  const avatarData = state?.avatarData || null;

  useEffect(() => { if (!state?.email) return; setMsg("We've sent a 6-digit code to your email."); }, [state]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setDigit = (i, v) => {
    const c = v.replace(/\D/g, "").slice(-1);
    setDigits((d) => { const n = [...d]; n[i] = c; return n; });
    if (c && i < 5) inputs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };
  const onPaste = (e) => {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const n = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) n[i] = text[i];
    setDigits(n);
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (e) => {
    e?.preventDefault();
    const otp = digits.join("");
    if (otp.length !== 6) return setError("Enter the full 6-digit code.");
    if (!email) return setError("Enter the email you registered with.");
    setError(""); setLoading(true);
    try {
      const user = await verifyEmail(email, otp);
      if (avatarData && user?.user_id) setLocalAvatar(user.user_id, avatarData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "That code didn't work. Try again.");
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setError(""); setMsg("");
    try {
      await resendVerification(email);
      setMsg("A new code is on its way.");
      setCooldown(RESEND_COOLDOWN);
    } catch { setError("Couldn't resend just now — try again shortly."); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Brand panel */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8vw",
        background: "radial-gradient(700px 500px at 20% 0%, var(--lav-s), transparent 60%), radial-gradient(700px 500px at 80% 100%, var(--mint-s), transparent 60%), var(--cream)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Logo size={40} />
          <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>WriteArena</span>
        </div>
        <div className="eyebrow">one last step</div>
        <h1 style={{ fontSize: "clamp(26px,2.8vw,38px)", fontWeight: 600, lineHeight: 1.15, margin: "8px 0 16px" }}>
          Confirm it's you.
        </h1>
        <p style={{ fontSize: 16, color: "var(--ink2)", maxWidth: 380, lineHeight: 1.7 }}>
          We've emailed a six-digit code to {email ? <strong>{email}</strong> : "your inbox"}. Enter it here to activate your account and step into the arena.
        </p>
      </div>

      {/* Form panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        background: "var(--card-solid)", borderLeft: "1px solid var(--border)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Verify your email</h2>
          <p style={{ color: "var(--ink2)", fontSize: 14, marginBottom: 20 }}>Enter the code we sent you.</p>

          {msg && <div className="badge badge-purple" style={{ display: "block", padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13 }}>{msg}</div>}
          {error && <div className="badge badge-red" style={{ display: "block", padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13 }}>{error}</div>}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!state?.email && (
              <div>
                <label style={{ fontSize: 12, color: "var(--ink2)", display: "block", marginBottom: 6, fontFamily: "var(--serif)" }}>Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: "var(--ink2)", display: "block", marginBottom: 8, fontFamily: "var(--serif)" }}>Verification code</label>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }} onPaste={onPaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    className="input"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    autoFocus={i === 0}
                    style={{ width: 48, height: 56, textAlign: "center", fontSize: 22, fontFamily: "var(--serif)", padding: 0 }}
                  />
                ))}
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--ink2)" }}>
            Didn't get it?{" "}
            <button onClick={resend} disabled={cooldown > 0}
              style={{ background: "none", border: "none", cursor: cooldown > 0 ? "default" : "pointer", color: cooldown > 0 ? "var(--ink3)" : "var(--lav-d)", fontWeight: 600, fontFamily: "inherit", fontSize: 13, padding: 0 }}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
          <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--ink2)" }}>
            <Link to="/login" style={{ color: "var(--lav-d)", fontWeight: 600 }}>Back to sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
