import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";
import Icon from "../common/Icon";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [popup, setPopup] = useState(null);
  const seenIds = useRef(null);

  const fetchNotifs = () => api.get("/notifications").then((r) => {
    const data = r.data || [];
    if (seenIds.current === null) {
      seenIds.current = new Set(data.map((n) => n.notification_id));   // first load: no popup
    } else {
      const fresh = data.filter((n) => !n.is_read && !seenIds.current.has(n.notification_id));
      data.forEach((n) => seenIds.current.add(n.notification_id));
      if (fresh.length) {
        setPopup(fresh[0]);
        setTimeout(() => setPopup(null), 5000);
      }
    }
    setNotifs(data);
  }).catch(() => {});

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, []);

  const unread = notifs.filter((n) => !n.is_read).length;

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="bell-wrap" style={{ position: "relative" }}>
      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            onClick={() => { setPopup(null); setOpen(true); }}
            style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", width: 300, cursor: "pointer",
              background: "var(--card-solid)", border: "1px solid var(--lav-d)", borderLeft: "3px solid var(--lav-d)",
              borderRadius: "var(--radius)", boxShadow: "var(--shadow)", zIndex: 300, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Icon name="bell" size={14} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--lav-d)", fontFamily: "var(--serif)" }}>New notification</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink)" }}>{popup.message}</div>
          </motion.div>
        )}
      </AnimatePresence>
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
