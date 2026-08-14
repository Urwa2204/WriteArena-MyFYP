import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { fileToAvatarDataUrl, setLocalAvatar } from "../lib/avatarStore";
import Icon from "../components/common/Icon";
import GoogleSignInButton from "../components/common/GoogleSignInButton";
import PasswordInput from "../components/common/PasswordInput";
import Logo from "../components/common/Logo";

const NICHES = ["technology","society","literature","science","politics","business","sports","health","entertainment","arts"];
const TOUR = [
  { eyebrow: "step one", title: "Claim your name.", body: "Your username is how the ledger remembers you. Pick something you'll be proud to see at the top." },
  { eyebrow: "step two", title: "Choose your inks.", body: "Tell us the niches you love. We'll point you to rooms where your voice fits best." },
  { eyebrow: "step three", title: "Show your face.", body: "Add a display picture so other writers recognise you in the lobby and on the leaderboard." },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ username: "", email: "", password: "", display_name: "", pen_name: "", bio: "", interests: [] });
  const [avatarData, setAvatarData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const strength = (p) => [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  const s = strength(form.password);
  const strengthColors = ["var(--blush-d)", "var(--peach-d)", "var(--butter-d)", "var(--mint-d)"];

  const toggleNiche = (n) => setForm((f) => ({ ...f, interests: f.interests.includes(n) ? f.interests.filter((i) => i !== n) : [...f.interests, n] }));

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setAvatarData(await fileToAvatarDataUrl(file)); }
    catch (err) { setError(err.message); }
    e.target.value = "";
  };

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      await register(form);
      // Account created — email a code and move to verification.
      // Carry the chosen avatar along; it's saved once the account is verified.
      navigate("/verify-email", { state: { email: form.email, avatarData } });
    } catch (err) { setError(err.response?.data?.detail || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  const tour = TOUR[step - 1];

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Tour panel (synced to step) */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8vw",
        background: "radial-gradient(700px 500px at 20% 0%, var(--lav-s), transparent 60%), radial-gradient(700px 500px at 80% 100%, var(--mint-s), transparent 60%), var(--cream)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <Logo size={40} />
          <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>WriteArena</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>
            <div className="eyebrow">{tour.eyebrow}</div>
            <h1 style={{ fontSize: "clamp(26px,2.8vw,38px)", fontWeight: 600, lineHeight: 1.15, margin: "8px 0 16px" }}>{tour.title}</h1>
            <p style={{ fontSize: 16, color: "var(--ink2)", maxWidth: 380, lineHeight: 1.7 }}>{tour.body}</p>
          </motion.div>
        </AnimatePresence>
        <div style={{ display: "flex", gap: 6, marginTop: 30 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 4, width: 44, borderRadius: 2, background: i <= step ? "var(--lav)" : "var(--border)", transition: "background .3s" }} />)}
        </div>
      </div>

      {/* Form panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--card-solid)", borderLeft: "1px solid var(--border)" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, marginBottom: 18 }}>Join WriteArena</h2>
          {error && <div className="badge badge-red" style={{ display: "block", padding: "10px 14px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{error}</div>}

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="your_username" />
                  <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" />
                  <div>
                    <Label>Password</Label>
                    {/* Hidden username so password managers associate the saved password with this account */}
                    <input type="text" name="username" autoComplete="username" value={form.username} readOnly hidden aria-hidden="true" />
                    <PasswordInput name="new-password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
                    {form.password && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        {[1,2,3,4].map((i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s ? strengthColors[s-1] : "var(--border)", transition: "background .3s" }} />)}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 4 }}
                    onClick={() => { if (!form.username || !form.email || !form.password) return setError("Please fill in all fields."); setError(""); setStep(2); }}>
                    Continue
                  </button>
                </div>
              )}

              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Display name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} placeholder="How others see you" />
                  <Field label="Pen name (optional)" value={form.pen_name} onChange={(v) => setForm({ ...form, pen_name: v })} placeholder="Your writing alias" />
                  <div>
                    <Label>Your inks</Label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {NICHES.map((n) => (
                        <button key={n} className={"pill" + (form.interests.includes(n) ? " active" : "")} onClick={() => toggleNiche(n)} style={{ textTransform: "capitalize", padding: "6px 14px" }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>Continue</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 110, height: 110, borderRadius: "50%", padding: 3, background: "var(--grad-brand)" }}>
                      <div className="avatar" style={{ width: "100%", height: "100%", fontSize: 40 }}>
                        {avatarData ? <img src={avatarData} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : (form.display_name || form.username || "?").charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <button onClick={() => fileRef.current?.click()} title="Upload a picture"
                      style={{ position: "absolute", right: 0, bottom: 4, width: 34, height: 34, borderRadius: "50%", background: "var(--card-solid)",
                        border: "1px solid var(--border-gold)", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lav-d)", cursor: "pointer" }}>
                      <Icon name="camera" size={17} />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
                  </div>
                  <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} style={{ gap: 8 }}>
                    <Icon name="upload" size={16} /> Browse your device
                  </button>
                  <div style={{ display: "flex", gap: 10, width: "100%" }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>Back</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step === 1 && <div style={{ marginTop: 18 }}><GoogleSignInButton /></div>}

          <p style={{ textAlign: "center", marginTop: step === 1 ? 8 : 20, fontSize: 13, color: "var(--ink2)" }}>
            Already have an account? <Link to="/login" style={{ color: "var(--lav-d)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const Label = ({ children }) => <label style={{ fontSize: 12, color: "var(--ink2)", display: "block", marginBottom: 6, fontFamily: "var(--serif)" }}>{children}</label>;
function Field({ label, value, onChange, placeholder, type = "text" }) {
  return <div><Label>{label}</Label><input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}
