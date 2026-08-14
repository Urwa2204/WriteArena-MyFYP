import React, { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AdminBack from "../../components/layout/AdminBack";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";

const NICHES = ["technology","society","literature","science","politics","business","sports","health","entertainment","arts"];

export default function AdminRooms() {
  const { toasts, toast, remove } = useToast();
  const [rooms, setRooms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", niche: "technology", capacity: 10, session_duration: 300, description: "" });

  const load = () => api.get("/admin/rooms").then((r) => setRooms(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault(); setCreating(true);
    try { await api.post("/admin/rooms", form); await load(); toast("Room created", "success"); setForm({ name: "", niche: "technology", capacity: 10, session_duration: 300, description: "" }); }
    catch { toast("Error creating room", "error"); } finally { setCreating(false); }
  };

  const del = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone, and any in-progress session in this room will be cut off.`)) return;
    try { await api.delete("/admin/rooms/" + id); await load(); toast("Deleted", "info"); }
    catch { toast("Error", "error"); }
  };

  const seedTopics = async (niche) => {
    try { const r = await api.post("/admin/topics/generate?niche=" + niche); toast("Added " + r.data.created + " topics for " + niche, "success"); }
    catch { toast("Error", "error"); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <AdminBack />
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Manage rooms</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
          <div className="glass" style={{ padding: 24, height: "fit-content" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Create room</h3>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Room name" required />
              <select className="input" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}>
                {NICHES.map((n) => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
              </select>
              <input className="input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} placeholder="Capacity" min={2} max={50} />
              <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" style={{ minHeight: 70 }} />
              <button className="btn btn-primary" type="submit" disabled={creating} style={{ justifyContent: "center" }}>{creating ? "Creating..." : "Create"}</button>
            </form>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>All rooms ({rooms.length})</h3>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => NICHES.forEach((n) => seedTopics(n))}>Seed all topics</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rooms.map((r) => (
                <div key={r.room_id} className="glass" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>{r.niche} · capacity {r.capacity}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => seedTopics(r.niche)}>Seed topics</button>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => del(r.room_id, r.name)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
