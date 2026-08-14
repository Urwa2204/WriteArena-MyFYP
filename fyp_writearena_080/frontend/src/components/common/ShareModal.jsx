import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";

/* Share a submission: copy its link, or send it as a direct message to
   someone you're connected with (follow / follows you). */
export default function ShareModal({ open, submissionId, onClose, onToast }) {
  const [contacts, setContacts] = useState([]);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setNote("");
    api.get("/messages/contacts").then((r) => setContacts(r.data)).catch(() => setContacts([]));
  }, [open]);

  if (!open) return null;

  const link = `${window.location.origin}/submission/${submissionId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onToast?.("Link copied to clipboard.", "success");
    } catch {
      onToast?.("Couldn't copy — here's the link: " + link, "info");
    }
  };

  const shareTo = async (u) => {
    setBusyId(u.user_id);
    try {
      await api.post(`/social/submissions/${submissionId}/share`, { to_user_id: u.user_id, note });
      onToast?.(`Shared with ${u.username}.`, "success");
      onClose?.();
    } catch (e) {
      onToast?.(e.response?.data?.detail || "Couldn't share.", "error");
    } finally { setBusyId(null); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(40,30,35,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
          onClick={(e) => e.stopPropagation()} className="wa-card" style={{ width: "100%", maxWidth: 440, padding: 24 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Share this writing</div>
          <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 16 }}>Copy the link, or send it to someone you're connected with.</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <input className="input" readOnly value={link} style={{ flex: 1, fontSize: 12 }} />
            <button className="btn btn-primary" style={{ padding: "10px 16px" }} onClick={copyLink}>Copy</button>
          </div>

          <input className="input" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 14 }} />

          <div className="eyebrow" style={{ marginBottom: 8 }}>send to</div>
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {contacts.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink2)" }}>You can share by DM once you follow someone or they follow you. The link above works for anyone.</div>
            ) : contacts.map((u) => (
              <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 13 }}>{(u.username || "?").charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, fontSize: 14 }}>{u.username}</div>
                <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }} disabled={busyId === u.user_id} onClick={() => shareTo(u)}>
                  {busyId === u.user_id ? "Sending…" : "Send"}
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
