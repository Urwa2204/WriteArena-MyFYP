import React, { useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { getLocalAvatar, clearLocalAvatar } from "../lib/avatarStore";
import api from "../services/api";

const NICHES = ["technology","society","literature","science","politics","business","sports","health","entertainment","arts"];

// Fields the user must fill. The three URL fields (website, avatar, cover) stay
// optional on purpose — forcing a URL would block anyone without a website.
const REQUIRED = [
  ["display_name", "Display name"],
  ["pen_name", "Pen name"],
  ["bio", "Bio"],
  ["age", "Age"],
  ["location", "Location"],
];

export default function EditProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const [form, setForm] = useState({
    display_name: user?.display_name || "",
    pen_name: user?.pen_name || "",
    bio: user?.bio || "",
    age: user?.age || "",
    location: user?.location || "",
    website: user?.website || "",
    avatar_url: user?.avatar_url || "",
    cover_url: user?.cover_url || "",
    interests: user?.interests ? user.interests.split(",") : [],
  });
  const [saving, setSaving] = useState(false);
  const [hasLocalAvatar, setHasLocalAvatar] = useState(() => !!getLocalAvatar(user?.user_id));

  const clearAvatar = () => {
    clearLocalAvatar(user?.user_id);
    setHasLocalAvatar(false);
    toast("Locally uploaded photo cleared — your Avatar URL below will show instead.", "success");
  };

  const toggleNiche = (n) => setForm((f) => ({
    ...f, interests: f.interests.includes(n) ? f.interests.filter((i) => i !== n) : [...f.interests, n]
  }));

  const save = async (e) => {
    e.preventDefault();
    const missing = REQUIRED.filter(([k]) => !String(form[k] ?? "").trim());
    if (missing.length > 0 || form.interests.length === 0) {
      toast("Please fill all required fields (marked with *).", "error");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/users/me", form);
      await refreshUser();
      toast("Profile updated", "success");
      navigate("/profile/" + user.user_id);
    } catch { toast("Error saving profile", "error"); } finally { setSaving(false); }
  };

  const field = (label, key, type = "text", placeholder = "", required = false) => (
    <div>
      <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--blush-d, #c0392b)", marginLeft: 3 }}>*</span>}
      </label>
      {type === "textarea"
        ? <textarea className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} required={required} style={{ minHeight: 90 }} />
        : <input className="input" type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} required={required} />
      }
    </div>
  );

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page" style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Edit profile</h1>
          <button className="btn btn-ghost" onClick={() => navigate("/profile/" + user?.user_id)}>Cancel</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 14 }}>
          Fields marked <span style={{ color: "var(--blush-d, #c0392b)" }}>*</span> are required.
        </p>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {field("Display name", "display_name", "text", "How others see you", true)}
            {field("Pen name", "pen_name", "text", "Your writing alias", true)}
            {field("Bio", "bio", "textarea", "Tell the community about yourself", true)}
            {field("Age", "age", "number", "Your age", true)}
            {field("Location", "location", "text", "City, Country", true)}
            {field("Website", "website", "url", "https://yourwebsite.com (optional)")}
            {field("Avatar URL", "avatar_url", "url", "https://... (optional)")}
            {hasLocalAvatar && (
              <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: -8, padding: "8px 10px", background: "var(--cream2)", borderRadius: 8 }}>
                You uploaded a photo directly on this device — it takes priority over the URL above and is what
                actually shows right now. <button type="button" onClick={clearAvatar}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--lav-d)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                  Clear it
                </button> to use the URL instead.
              </div>
            )}
            {field("Cover image URL", "cover_url", "url", "https://... (optional)")}
          </div>
          <div className="glass" style={{ padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 10 }}>
              Interests <span style={{ color: "var(--blush-d, #c0392b)" }}>*</span>
              <span style={{ fontSize: 11, color: "var(--ink2)", fontWeight: 400, marginLeft: 6 }}>(pick at least one)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {NICHES.map((n) => (
                <button key={n} type="button" onClick={() => toggleNiche(n)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: form.interests.includes(n) ? "var(--accent)" : "var(--glass-light)",
                  color: form.interests.includes(n) ? "#fff" : "var(--text2)",
                  border: "1px solid " + (form.interests.includes(n) ? "var(--accent)" : "var(--border)"),
                  cursor: "pointer",
                }}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
