import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Avatar from "./Avatar";
import Icon from "./Icon";

/** Search other writers by name / pen name. Lives in the top bar. */
export default function UserSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (q.trim().length < 1) { setResults([]); return; }
    const t = setTimeout(() => {
      api.get("/users/search", { params: { q } })
        .then((r) => { setResults(r.data); setOpen(true); })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (u) => { setOpen(false); setQ(""); setResults([]); navigate("/profile/" + u.user_id); };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div className="user-search-box" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--cream2)", border: "1px solid var(--border)", borderRadius: 999, padding: "6px 12px", width: 220 }}>
        <Icon name="search" size={15} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
          placeholder="Search writers…"
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: "var(--ink)" }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, maxHeight: 360, overflowY: "auto", background: "var(--card-solid)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", zIndex: 200 }}>
          {results.map((u) => (
            <div key={u.user_id} onClick={() => go(u)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
              <Avatar user={u} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.display_name || u.username}</div>
                <div style={{ fontSize: 11, color: "var(--ink2)" }}>@{u.username}{u.pen_name ? " · " + u.pen_name : ""}</div>
              </div>
              <span style={{ fontSize: 11, color: "var(--lav-d)", fontFamily: "var(--serif)" }}>{(u.xp_points || 0).toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, background: "var(--card-solid)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", zIndex: 200, padding: 16, fontSize: 13, color: "var(--ink2)", textAlign: "center" }}>
          No writers found.
        </div>
      )}
    </div>
  );
}
