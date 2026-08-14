import React, { useEffect, useState, useRef } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

export default function Messages() {
  const { user } = useAuth();
  const { toasts, remove } = useToast();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [contacts, setContacts] = useState([]);
  const endRef = useRef(null);

  const openNew = () => {
    api.get("/messages/contacts").then((r) => setContacts(r.data)).catch(() => {});
    setShowNew(true);
  };
  const startChat = (u) => {
    setShowNew(false);
    setActive(u);
    if (!convos.some((c) => c.user.user_id === u.user_id)) {
      setConvos((prev) => [{ user: u, last_message: null, last_at: null, unread: 0 }, ...prev]);
    }
  };

  useEffect(() => {
    api.get("/messages/conversations").then((r) => setConvos(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    api.get("/messages/" + active.user_id).then((r) => setMessages(r.data)).catch(() => {});
    const iv = setInterval(() => api.get("/messages/" + active.user_id).then((r) => setMessages(r.data)).catch(() => {}), 5000);
    return () => clearInterval(iv);
  }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !active) return;
    const content = input; setInput("");
    try {
      await api.post("/messages/" + active.user_id, { content });
      api.get("/messages/" + active.user_id).then((r) => setMessages(r.data));
    } catch {}
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className={"messages-grid" + (active ? " has-active" : "")} style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "calc(100vh - 65px)" }}>
        {/* Conversations */}
        <div className="msg-list" style={{ borderRight: "1px solid var(--border)", overflowY: "auto" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Messages</span>
            <button onClick={openNew} title="New message" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 8, padding: "4px 12px", fontSize: 13, cursor: "pointer" }}>+ New</button>
          </div>
          {showNew && (
            <div style={{ borderBottom: "1px solid var(--border)", background: "var(--glass-light)" }}>
              <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--text2)", display: "flex", justifyContent: "space-between" }}>
                <span>Start a chat with someone you follow</span>
                <span style={{ cursor: "pointer" }} onClick={() => setShowNew(false)}>✕</span>
              </div>
              {contacts.length === 0
                ? <div style={{ padding: "12px 20px", fontSize: 13, color: "var(--text2)" }}>Follow someone first to message them.</div>
                : contacts.map((u) => (
                    <div key={u.user_id} onClick={() => startChat(u)} style={{ padding: "10px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                        {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : u.username.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, flex: 1 }}>{u.username}</span>
                      {u.follows_you && <span style={{ fontSize: 11, color: "var(--text3)" }}>follows you</span>}
                    </div>
                  ))}
            </div>
          )}
          {convos.map((c) => (
            <div key={c.user.user_id} onClick={() => setActive(c.user)} style={{
              padding: "14px 20px", cursor: "pointer", borderBottom: "1px solid var(--border)",
              background: active?.user_id === c.user.user_id ? "var(--accent-glow)" : "transparent",
              transition: "background 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                  {c.user.avatar_url ? <img src={c.user.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} /> : c.user.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{c.user.username}</span>
                    {c.unread > 0 && <span style={{ background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{c.unread}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message}</div>
                </div>
              </div>
            </div>
          ))}
          {convos.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text2)", fontSize: 13 }}>No conversations yet.</div>}
        </div>

        {/* Messages panel */}
        {active ? (
          <div className="msg-panel" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 10 }}>
              <button className="msg-back btn btn-ghost" onClick={() => setActive(null)} style={{ padding: "4px 10px", fontSize: 13 }}>← Back</button>
              <span>{active.username}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m) => {
                const mine = m.sender_id === user?.user_id;
                return (
                  <div key={m.message_id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px", borderRadius: 14, fontSize: 14,
                      background: mine ? "var(--accent)" : "var(--glass)",
                      color: mine ? "#fff" : "var(--text)",
                      border: mine ? "none" : "1px solid var(--border)",
                      wordBreak: "break-word", overflowWrap: "anywhere", whiteSpace: "pre-wrap",
                    }}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
              <input className="input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message..." />
              <button className="btn btn-primary" onClick={send}>Send</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", fontSize: 14 }}>Select a conversation to start messaging.</div>
        )}
      </div>
    </AppLayout>
  );
}
