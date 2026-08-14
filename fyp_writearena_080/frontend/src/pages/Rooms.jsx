import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { PageMotion, staggerContainer, staggerItem } from "../components/common/Motion";
import RoomIcon3D from "../components/rooms/RoomIcon3D";
import api from "../services/api";

const NICHES = ["all","technology","society","literature","science","politics","business","sports","health","entertainment","arts"];

function RoomCard({ r, onJoin, onWatch }) {
  const active = r.status === "active";
  const full = r.member_count >= r.capacity;

  const tilt = useCallback((e) => {
    const el = e.currentTarget; const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(4px)`;
  }, []);
  const reset = useCallback((e) => { e.currentTarget.style.transform = ""; }, []);

  return (
    <motion.div variants={staggerItem} onMouseMove={tilt} onMouseLeave={reset}
      className="wa-card" style={{ padding: 22, transition: "transform .15s ease", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <RoomIcon3D niche={r.niche} active={active} size={62} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: active ? "var(--lav-d)" : "var(--ink3)", fontStyle: "italic", fontFamily: "var(--serif)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mint-d)", boxShadow: "0 0 0 3px rgba(95,184,154,.2)" }} />}
            {active ? "live now" : "idle"}
          </div>
        </div>
        <span className="badge badge-purple" style={{ textTransform: "capitalize" }}>{r.niche}</span>
      </div>

      {r.description && <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5 }}>{r.description}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink2)" }}>
        <span>{r.member_count}/{r.capacity} writers</span>
        <span>{Math.floor((r.session_duration || 300) / 60)} min sessions</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onJoin(r)} disabled={full}>
          {full ? "Full" : "Enter room"}
        </button>
        <button className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={() => onWatch(r)}>Watch</button>
      </div>
    </motion.div>
  );
}

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("active"); // active | members | name
  const { toasts, toast, remove } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => api.get("/rooms").then((r) => setRooms(r.data)).catch(() => {});
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  const filtered = rooms
    .filter((r) => filter === "all" || r.niche === filter)
    .filter((r) => !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase())
                  || r.description?.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === "members") return b.member_count - a.member_count;
      if (sort === "name") return a.name.localeCompare(b.name);
      // "active" (default): live rooms first, then by member count
      return (b.status === "active") - (a.status === "active") || b.member_count - a.member_count;
    });

  const join = async (room) => {
    try { await api.post("/rooms/" + room.room_id + "/join"); navigate("/lobby/" + room.room_id); }
    catch (err) { toast(err.response?.data?.detail || "Could not join room", "error"); }
  };
  const watch = async (room) => {
    try { await api.post("/rooms/" + room.room_id + "/spectate"); navigate("/spectator/" + room.room_id); }
    catch { navigate("/spectator/" + room.room_id); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        <div style={{ marginBottom: 20 }}>
          <div className="eyebrow">Ten arenas, ten worlds</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Pick your arena.</h1>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
          {NICHES.map((n) => (
            <button key={n} className={"pill" + (filter === n ? " active" : "")} onClick={() => setFilter(n)} style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
              {n}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms by name or description…" style={{ flex: "1 1 260px" }} />
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 180 }}>
            <option value="active">Sort: Live first</option>
            <option value="members">Sort: Most writers</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid-3">
          {filtered.map((r) => <RoomCard key={r.room_id} r={r} onJoin={join} onWatch={watch} />)}
        </motion.div>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--ink2)" }}>No rooms match your search.</div>}
      </PageMotion>
    </AppLayout>
  );
}
