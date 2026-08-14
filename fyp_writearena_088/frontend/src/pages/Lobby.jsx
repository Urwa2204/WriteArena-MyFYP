import React, { useEffect, useState, useRef } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { useToast } from "../hooks/useToast";
import { PageMotion } from "../components/common/Motion";
import api from "../services/api";

const NICHE_INK = {
  technology: ["#a9cbf0","#6f9fd6"], literature: ["#c4b5fd","#9a82e6"], science: ["#8fd6bd","#5fb89a"],
  society: ["#f3a8bc","#e07d99"], politics: ["#f4bd9c","#e0926a"], business: ["#9fd9d2","#69b3ab"],
  sports: ["#f1d488","#dab44e"], health: ["#a7e6c8","#6fc7a0"], entertainment: ["#f4a8d4","#dd78b0"],
  arts: ["#d9c2a0","#b89b6f"],
};

export default function Lobby() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const messagesEndRef = useRef(null);
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s) % 60).padStart(2, "0")}`;

  const { send } = useWebSocket(roomId, {
    onConnect: () => toast("Connected to lobby", "success"),
    onMessage: (data) => {
      if (data.type === "user_joined") {
        setMembers((prev) => prev.find((m) => m.user_id === data.user_id) ? prev
          : [...prev, { user_id: data.user_id, username: data.username, avatar_url: data.avatar_url }]);
      } else if (data.type === "user_left") {
        setMembers((prev) => prev.filter((m) => m.user_id !== data.user_id));
      } else if (data.type === "chat") {
        setMessages((prev) => {
          // Ignore a message we've already shown (guards against any
          // duplicate delivery so a line never appears twice).
          if (data.msg_id && prev.some((m) => m.msg_id === data.msg_id)) return prev;
          return [...prev, data];
        });
      } else if (data.type === "session_start") {
        toast("Session started!", "success");
        navigate("/arena/" + roomId, { state: { session: data } });
      } else if (data.type === "error") {
        toast(data.message || "That didn't work.", "error");
      }
    },
  });

  useEffect(() => { api.get("/rooms/" + roomId).then((r) => setRoom(r.data)).catch(() => {}); }, [roomId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Pick up an already-running session (late join / refresh) so the clock is correct.
  useEffect(() => {
    let alive = true;
    api.get("/rooms/" + roomId + "/session").then((r) => {
      if (!alive) return;
      setSessionInfo(r.data);
      if (r.data.active) setRemaining(r.data.remaining);
    }).catch(() => {});
    return () => { alive = false; };
  }, [roomId]);

  // Tick the remaining-time countdown while a session is live.
  useEffect(() => {
    if (!sessionInfo?.active) return;
    const iv = setInterval(() => setRemaining((t) => (t == null ? t : Math.max(0, t - 1))), 1000);
    return () => clearInterval(iv);
  }, [sessionInfo?.active]);

  const sessionActive = !!sessionInfo?.active;
  const sessionLen = sessionInfo?.duration ?? room?.session_duration ?? 300;

  const sendChat = () => { if (!chatInput.trim()) return; send({ type: "chat", message: chatInput }); setChatInput(""); };
  const startSession = () => { send({ type: "start_session" }); toast("Starting session…", "info"); };
  const flagMessage = async (m) => {
    try {
      await api.post("/social/report", { target_type: "chat", target_id: roomId,
        reason: `Flagged lobby chat from ${m.username}: "${(m.message || "").slice(0, 200)}"` });
      toast("Message flagged for review. Thanks.", "success");
    } catch { toast("Couldn't flag that message.", "error"); }
  };
  const joinLive = () => navigate("/arena/" + roomId, {
    state: { session: { session_id: sessionInfo.session_id, topic: sessionInfo.topic, duration: remaining ?? sessionInfo.remaining } },
  });

  const ink = NICHE_INK[room?.niche] || NICHE_INK.literature;
  const orbs = members.length ? members : (user ? [{ user_id: user.user_id, username: user.username }] : []);
  const radius = 150;

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div className="eyebrow">the waiting chamber</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{room?.name || "Loading…"}</h1>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 6, display: "flex", alignItems: "center", gap: 7 }}>
              <span aria-hidden="true">⏱</span>
              {sessionActive
                ? <span>Session in progress · <strong style={{ color: "var(--lav-d)", fontVariantNumeric: "tabular-nums" }}>{fmt(remaining ?? 0)}</strong> left</span>
                : <span>Each session runs for <strong style={{ color: "var(--ink)" }}>{fmt(sessionLen)}</strong> — any participant can start it for everyone here.</span>}
            </div>
          </div>
          {sessionActive
            ? <button className="btn btn-primary" onClick={joinLive}>Join the session</button>
            : <button className="btn btn-primary" onClick={startSession}>Start session</button>}
        </div>

        {sessionActive && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="wa-card" style={{ padding: "12px 18px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderLeft: "3px solid var(--mint-d)" }}>
            <div style={{ fontSize: 13, color: "var(--ink)" }}>
              A session is already live in this room. <span style={{ color: "var(--ink2)" }}>Jump in — you’ll pick up with <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(remaining ?? 0)}</strong> on the clock.</span>
            </div>
            <button className="btn btn-ghost" style={{ padding: "8px 16px", whiteSpace: "nowrap" }} onClick={joinLive}>Enter arena →</button>
          </motion.div>
        )}

        {/* Orbital chamber */}
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 0 10px" }}>
          <div style={{ position: "relative", width: 400, height: 400, perspective: 1200 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}
            >
              <AnimatePresence>
                {orbs.map((m, i) => {
                  const angle = (i / Math.max(1, orbs.length)) * Math.PI * 2;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  return (
                    <motion.div
                      key={m.user_id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -26, marginTop: -26,
                        transform: `translate(${x}px, ${y}px)` }}
                    >
                      <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                        style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          background: `linear-gradient(135deg, ${ink[0]}, ${ink[1]})`, color: "#fff",
                          fontFamily: "var(--serif)", fontWeight: 600, fontSize: 20, boxShadow: "var(--shadow-sm)",
                          border: m.user_id === user?.user_id ? "2px solid var(--lav-d)" : "none" }}>
                        {(m.username || "?").charAt(0).toUpperCase()}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* center podium */}
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 130, height: 130, marginLeft: -65, marginTop: -65,
              borderRadius: "50%", background: "var(--grad-brand)", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", textAlign: "center", padding: 14, color: "#fff",
              boxShadow: "0 14px 36px rgba(185,167,230,.45)", animation: "podiumPulse 2s ease-in-out infinite" }}>
              <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{room?.name || "Arena"}</div>
              <div style={{ fontSize: 11, opacity: .9, marginTop: 6, lineHeight: 1.3 }}>Session starts when host begins</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "var(--ink2)", fontFamily: "var(--serif)", fontStyle: "italic", marginBottom: 24 }}>
          {orbs.length === 1 ? "Waiting for more writers to arrive…" : `${orbs.length} writers in the chamber`}
        </div>

        {/* Chat */}
        <div className="wa-card" style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", maxHeight: 340 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontFamily: "var(--serif)", fontWeight: 600 }}>Lobby chat</div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m, i) => (
              <div key={m.msg_id || i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }} className="chat-line">
                <div className="avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{(m.username || "?").charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}><span style={{ fontSize: 12, color: "var(--lav-d)", fontWeight: 600 }}>{m.username}: </span><span style={{ fontSize: 13 }}>{m.message}</span></div>
                {m.user_id !== user?.user_id && (
                  <button onClick={() => flagMessage(m)} title="Flag this message"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>⚑</button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
            <input className="input" style={{ flex: 1 }} value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Say something…" />
            <button className="btn btn-primary" style={{ padding: "10px 18px" }} onClick={sendChat}>Send</button>
          </div>
        </div>
      </PageMotion>
    </AppLayout>
  );
}
