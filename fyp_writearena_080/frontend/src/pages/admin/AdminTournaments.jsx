import React, { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AdminBack from "../../components/layout/AdminBack";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";

const NICHES = ["technology", "society", "literature", "science", "politics", "business", "sports", "health", "entertainment", "arts"];

export default function AdminTournaments() {
  const { toasts, toast, remove } = useToast();
  const [tours, setTours] = useState([]);
  const [form, setForm] = useState({ name: "", type: "weekly", entry_fee: 150, starts_at: "", ends_at: "", description: "" });
  const [busy, setBusy] = useState(false);

  // Topics
  const [topicNiche, setTopicNiche] = useState("technology");
  const [topicTitle, setTopicTitle] = useState("");

  const loadTours = () => api.get("/tournaments").then((r) => setTours(r.data)).catch(() => {});
  useEffect(() => { loadTours(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const announce = async () => {
    if (!form.name.trim()) { toast("Give the tournament a name.", "error"); return; }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast("End date must be after the start date.", "error"); return;
    }
    setBusy(true);
    try {
      await api.post("/admin/tournaments", { ...form, entry_fee: Number(form.entry_fee) || 0 });
      toast("Tournament announced!", "success");
      setForm({ name: "", type: "weekly", entry_fee: 150, starts_at: "", ends_at: "", description: "" });
      loadTours();
    } catch (e) { toast(e.response?.data?.detail || "Could not create.", "error"); }
    finally { setBusy(false); }
  };

  const closeTour = async (id, name) => {
    if (!window.confirm(`Close "${name}" and pay out the winner now? This cannot be undone.`)) return;
    try {
      const { data } = await api.post("/admin/tournaments/" + id + "/close");
      toast(data.winner ? "Winner: " + data.winner + " · payout ₨" + data.payout : "Tournament closed.", "success");
      loadTours();
    } catch { toast("Could not close.", "error"); }
  };

  const addTopic = async () => {
    if (!topicTitle.trim()) { toast("Enter a topic prompt.", "error"); return; }
    try {
      await api.post("/admin/topics", { title: topicTitle.trim(), niche: topicNiche });
      toast("Topic added.", "success");
      setTopicTitle("");
    } catch { toast("Could not add the topic.", "error"); }
  };

  const generateTopics = async () => {
    try {
      const { data } = await api.post("/admin/topics/generate?niche=" + topicNiche);
      toast(data.created ? `Added ${data.created} topic${data.created === 1 ? "" : "s"}.` : "No new topics to add.", "success");
    } catch { toast("Could not generate topics.", "error"); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <AdminBack />
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Tournaments &amp; topics</h1>

        {/* Announce a tournament */}
        <div className="wa-card" style={{ padding: 22, marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, fontFamily: "var(--serif)" }}>Announce a tournament</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input className="input" placeholder="Tournament name" value={form.name} onChange={set("name")} />
            <select className="input" value={form.type} onChange={set("type")}>
              <option value="weekly">Weekly</option>
              <option value="bracket">Bracket</option>
            </select>
            <label style={{ fontSize: 12, color: "var(--ink2)" }}>Entry fee (₨)
              <input className="input" type="number" min="0" value={form.entry_fee} onChange={set("entry_fee")} />
            </label>
            <div />
            <label style={{ fontSize: 12, color: "var(--ink2)" }}>Starts
              <input className="input" type="date" value={form.starts_at} onChange={set("starts_at")} />
            </label>
            <label style={{ fontSize: 12, color: "var(--ink2)" }}>Ends
              <input className="input" type="date" value={form.ends_at} onChange={set("ends_at")} />
            </label>
          </div>
          <textarea className="input" placeholder="Description (optional)" value={form.description} onChange={set("description")} style={{ marginTop: 12, minHeight: 70 }} />
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink3)" }}>Prize pool grows with each paid entry; winner receives half at close.</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={announce} disabled={busy}>{busy ? "Creating…" : "Announce tournament"}</button>
        </div>

        {/* Existing tournaments */}
        <div className="wa-card" style={{ padding: 22, marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12, fontFamily: "var(--serif)" }}>Tournaments</h2>
          {tours.length === 0 ? <div style={{ color: "var(--ink2)", fontSize: 14 }}>None yet.</div> :
            tours.map((t) => (
              <div key={t.tournament_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  <span className="badge" style={{ marginLeft: 8, textTransform: "capitalize" }}>{t.status}</span>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>Entry ₨{t.entry_fee || 0} · Pool ₨{t.prize_pool || 0} · Prize ₨{Math.floor((t.prize_pool || 0) / 2)}</div>
                </div>
                {t.status !== "ended" && <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => closeTour(t.tournament_id, t.name)}>Close &amp; pick winner</button>}
              </div>
            ))}
        </div>

        {/* Topics */}
        <div className="wa-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12, fontFamily: "var(--serif)" }}>Writing topics</h2>
          <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 14 }}>
            Add prompts for a niche, or generate a starter set. Live sessions also pull trending prompts automatically.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <select className="input" value={topicNiche} onChange={(e) => setTopicNiche(e.target.value)} style={{ maxWidth: 200, textTransform: "capitalize" }}>
              {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={generateTopics}>Generate starter topics</button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" placeholder="Add a specific topic prompt…" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTopic()} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={addTopic}>Add topic</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
