import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/common/GoogleSignInButton";
import PasswordInput from "../components/common/PasswordInput";
import Logo from "../components/common/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && detail === "Email not verified") {
        navigate("/verify-email", { state: { email } });
        return;
      }
      setError(detail || "That didn't work. Check your email and password.");
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Brand panel */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8vw",
        background: "radial-gradient(700px 500px at 20% 0%, var(--lav-s), transparent 60%), radial-gradient(700px 500px at 80% 100%, var(--blush-s), transparent 60%), var(--cream)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Logo size={40} />
          <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>WriteArena</span>
        </div>
        <div className="eyebrow">welcome back</div>
        <h1 style={{ fontSize: "clamp(28px,3vw,40px)", fontWeight: 600, lineHeight: 1.15, margin: "8px 0 16px" }}>
          The ink is still warm.
        </h1>
        <p style={{ fontSize: 16, color: "var(--ink2)", maxWidth: 380, lineHeight: 1.7 }}>
          Step back into the arena. Your streak, your rank, and a fresh topic are waiting.
        </p>
      </div>

      {/* Form */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        background: "var(--card-solid)", borderLeft: "1px solid var(--border)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Sign in</h2>
          <p style={{ color: "var(--ink2)", fontSize: 14, marginBottom: 22 }}>to your WriteArena account</p>

          {error && <div className="badge badge-red" style={{ display: "block", padding: "10px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{error}</div>}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--ink2)", display: "block", marginBottom: 6, fontFamily: "var(--serif)" }}>Email</label>
              <input className="input" type="email" name="email" id="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label htmlFor="current-password" style={{ fontSize: 12, color: "var(--ink2)", fontFamily: "var(--serif)" }}>Password</label>
                <Link to="/reset-password" style={{ fontSize: 12, color: "var(--lav-d)" }}>Forgot?</Link>
              </div>
              <PasswordInput name="current-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: 22 }}>
            <GoogleSignInButton />
          </div>

          <p style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "var(--ink2)" }}>
            No account? <Link to="/register" style={{ color: "var(--lav-d)", fontWeight: 600 }}>Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
