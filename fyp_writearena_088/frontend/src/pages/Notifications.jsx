import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

export default function Notifications() {
  const { toasts, remove } = useToast();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
  }, []);

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const icons = { like: "♥", comment: "◎", badge: "◈", follow: "→" };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page" style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Notifications</h1>
          <button className="btn btn-ghost" onClick={markAll} style={{ fontSize: 12 }}>Mark all read</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifs.map((n) => (
            <div key={n.notification_id} className="glass" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start", background: n.is_read ? "transparent" : "var(--accent-glow)", borderColor: n.is_read ? "var(--border)" : "var(--accent-border)" }}>
              <span style={{ fontSize: 18, color: "var(--accent)", flexShrink: 0 }}>{icons[n.type] || "◎"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 3 }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {notifs.length === 0 && <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>No notifications yet.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
