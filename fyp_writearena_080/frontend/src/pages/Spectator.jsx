import React, { useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { useToast } from "../hooks/useToast";

export default function Spectator() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toasts, remove } = useToast();
  const [writers, setWriters] = useState({});
  const [sessionActive, setSessionActive] = useState(false);
  const [topic, setTopic] = useState("");

  useWebSocket(roomId, {
    onMessage: (data) => {
      if (data.type === "typing") {
        setWriters((prev) => ({ ...prev, [data.user_id]: { word_count: data.word_count } }));
      } else if (data.type === "session_start") {
        setSessionActive(true); setTopic(data.topic);
      } else if (data.type === "user_joined") {
        setWriters((prev) => ({ ...prev, [data.user_id]: { username: data.username, word_count: 0 } }));
      } else if (data.type === "user_left") {
        setWriters((prev) => { const n = { ...prev }; delete n[data.user_id]; return n; });
      } else if (data.type === "session_end") {
        navigate("/rooms");
      }
    },
  });

  const entries = Object.entries(writers);

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Spectating</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <span className={"badge " + (sessionActive ? "badge-green" : "badge-blue")}>{sessionActive ? "Session active" : "Waiting"}</span>
            <button className="btn btn-ghost" onClick={() => navigate("/rooms")}>Leave</button>
          </div>
        </div>
        {topic && (
          <div className="glass-gold" style={{ padding: 20, marginBottom: 20 }}>
            <div className="badge badge-gold" style={{ marginBottom: 8 }}>Topic</div>
            <p style={{ fontSize: 15, fontWeight: 500 }}>{topic}</p>
          </div>
        )}
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
          Spectators see word counts only — not the actual writing.
        </p>
        <div className="grid-3">
          {entries.map(([uid, w]) => (
            <div key={uid} className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{w.username || "Writer"}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{w.word_count || 0}</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>words written</div>
              {w.word_count > 0 && <div style={{ width: "100%", height: 3, background: "var(--border)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}><div style={{ height: "100%", background: "var(--accent)", width: Math.min(100, (w.word_count / 200) * 100) + "%", transition: "width 0.5s ease" }} /></div>}
            </div>
          ))}
          {entries.length === 0 && <div style={{ gridColumn: "span 3", textAlign: "center", padding: 40, color: "var(--text2)" }}>Waiting for writers to join...</div>}
        </div>
      </div>
    </AppLayout>
  );
}
