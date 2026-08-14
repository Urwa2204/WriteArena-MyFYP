import React, { useState, useEffect } from "react";
import api from "../../services/api";
import Icon from "../common/Icon";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
    const iv = setInterval(() => {
      api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const unread = notifs.filter((n) => !n.is_read).length;

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="bell-wrap" style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        style={{ padding: "8px 11px", position: "relative" }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 5, right: 6, width: 9, height: 9,
            background: "var(--blush)", borderRadius: "50%", border: "2px solid var(--card-solid)"
          }} />
        )}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                Mark all read
              </button>
            )}
          </div>
          {notifs.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text2)", fontSize: 13 }}>No notifications</div>
          )}
          {notifs.slice(0, 20).map((n) => (
            <div key={n.notification_id} style={{
              padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13,
              background: n.is_read ? "transparent" : "var(--accent-glow)",
            }}>
              <div style={{ color: "var(--text)" }}>{n.message}</div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
