import React, { useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import PurchasesPanel from "../components/common/PurchasesPanel";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { toasts, toast, remove } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("account");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/auth/forgot-password", { email: user.email });
      toast("Code sent — enter it on the next screen.", "success");
      // Previously this just showed a toast and left the user on Settings
      // with no way forward — they'd have to already know to navigate to
      // Reset Password and re-type their email themselves.
      navigate("/reset-password", { state: { email: user.email } });
    } catch { toast("Error", "error"); } finally { setSaving(false); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page" style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
        <div className="tabs">
          <button className={"tab" + (tab === "account" ? " active" : "")} onClick={() => setTab("account")}>Account</button>
          <button className={"tab" + (tab === "appearance" ? " active" : "")} onClick={() => setTab("appearance")}>Appearance</button>
        </div>

        {tab === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Account info</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text2)" }}>Username</span><span>{user?.username}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text2)" }}>Email</span><span>{user?.email}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text2)" }}>Role</span><span>{user?.role}</span></div>
              </div>
            </div>
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Change password</h3>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>An OTP will be sent. In dev mode, check the server console.</p>
              <button className="btn btn-ghost" onClick={changePassword} disabled={saving}>{saving ? "Sending..." : "Send password reset OTP"}</button>
            </div>
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--blush-d)" }}>Danger zone</h3>
              <button className="btn btn-danger" onClick={logout}>Sign out of all sessions</button>
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <div className="glass" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Theme</h3>
            <div style={{ display: "flex", gap: 14 }}>
              {["dark","light"].map((t) => (
                <button key={t} onClick={() => theme !== t && toggle()} style={{
                  padding: "16px 28px", borderRadius: "var(--radius)", border: "2px solid " + (theme === t ? "var(--accent)" : "var(--border)"),
                  background: t === "dark" ? "#0a0e1a" : "#f0f2f8", color: t === "dark" ? "#fff" : "#0a0e1a",
                  cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s",
                }}>
                  {t === "dark" ? "☾ Dark" : "☀ Light"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
        <PurchasesPanel />
    </AppLayout>
  );
}
