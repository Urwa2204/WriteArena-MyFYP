import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { PageMotion, staggerContainer, staggerItem } from "../components/common/Motion";
import Badge3D from "../components/badges/Badge3D";
import RoomIcon3D from "../components/rooms/RoomIcon3D";
import PaymentModal from "../components/common/PaymentModal";
import api from "../services/api";

export default function Tournaments() {
  const [tab, setTab] = useState("weekly");
  const [tournaments, setTournaments] = useState([]);
  const [daily, setDaily] = useState(null);
  const [joinTarget, setJoinTarget] = useState(null);
  const { toasts, remove } = useToast();
  const navigate = useNavigate();

  const load = () => api.get("/tournaments").then((r) => setTournaments(r.data)).catch(() => {});
  const joinTournament = (t) => {
    if (t.entry_fee > 0) setJoinTarget(t);
    else api.post("/tournaments/" + t.tournament_id + "/join").then(load).catch(() => {});
  };

  useEffect(() => {
    api.get("/tournaments").then((r) => setTournaments(r.data)).catch(() => {});
    api.get("/tournaments/daily-challenge").then((r) => setDaily(r.data)).catch(() => {});
  }, []);

  const filtered = tournaments.filter((t) => tab === "weekly" ? t.type === "weekly" : t.type === "bracket");
  const statusClass = (s) => s === "active" ? "badge-green" : s === "upcoming" ? "badge-blue" : "badge-gold";

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Badge3D icon="trophy" rarity="legendary" earned size={64} />
          <div>
            <div className="eyebrow">glory awaits</div>
            <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>Tournaments</h1>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 22 }}>
          <button className={"tab" + (tab === "weekly" ? " active" : "")} onClick={() => setTab("weekly")}>Weekly</button>
          <button className={"tab" + (tab === "bracket" ? " active" : "")} onClick={() => setTab("bracket")}>Brackets</button>
          <button className={"tab" + (tab === "daily" ? " active" : "")} onClick={() => setTab("daily")}>Daily challenge</button>
        </div>

        {tab === "daily" && daily && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="wa-card" style={{ padding: 26, maxWidth: 640, borderTop: "3px solid var(--butter)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
              <RoomIcon3D niche={daily.niche || "literature"} active size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="badge badge-gold" style={{ marginBottom: 8 }}>Today's challenge · live from the headlines</div>
                <h2 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45, fontFamily: "var(--serif)" }}>{daily.topic}</h2>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginBottom: 22 }} onClick={() => navigate("/daily-challenge")}>Write now</button>
            {daily.leaderboard?.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>today's leaders</div>
                {daily.leaderboard.slice(0, 5).map((e, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--serif)", fontWeight: 700, fontSize: 13,
                      background: i === 0 ? "var(--butter)" : i === 1 ? "var(--lav-s)" : i === 2 ? "var(--peach-s)" : "var(--cream2)", color: "var(--ink)" }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{e.username}</span>
                    <span className="badge badge-gold">{e.grade} · {e.final_score?.toFixed(1)}%</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab !== "daily" && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid-2">
            {filtered.map((t) => (
              <motion.div key={t.tournament_id} variants={staggerItem} whileHover={{ y: -4 }}
                className="wa-card" style={{ padding: 22, display: "flex", gap: 14, alignItems: "center" }}>
                <Badge3D icon="star" rarity={t.status === "active" ? "epic" : "rare"} earned={t.status !== "completed"} size={58} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--serif)" }}>{t.name}</span>
                    <span className={"badge " + statusClass(t.status)} style={{ textTransform: "capitalize" }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                    {t.starts_at && <span>Starts {new Date(t.starts_at).toLocaleDateString()}</span>}
                    {t.ends_at && <span> · Ends {new Date(t.ends_at).toLocaleDateString()}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <span className="badge badge-gold">Entry ₨{t.entry_fee || 0}</span>
                    <span className="badge badge-purple">Prize ₨{Math.floor((t.prize_pool || 0) / 2)}</span>
                    {t.status !== "ended" && (
                      <button className="btn btn-primary" style={{ padding: "5px 14px", fontSize: 12, marginLeft: "auto" }}
                        onClick={() => joinTournament(t)}>
                        {t.entry_fee > 0 ? "Join · ₨" + t.entry_fee : "Join free"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="wa-card" style={{ gridColumn: "span 2", textAlign: "center", padding: 40, color: "var(--ink2)" }}>
                No {tab} tournaments active right now — check back soon.
              </div>
            )}
          </motion.div>
        )}
        <PaymentModal
          open={!!joinTarget}
          title={joinTarget ? "Join " + joinTarget.name : "Join tournament"}
          subtitle="Entry fee joins the prize pool · winner takes half"
          priceLabel={joinTarget ? "₨" + joinTarget.entry_fee : ""}
          initiate={(provider, currency) => api.post("/tournaments/" + joinTarget.tournament_id + "/join", null, { params: { provider, currency } }).then((r) => r.data)}
          onSuccess={() => { setJoinTarget(null); load(); }}
          onClose={() => setJoinTarget(null)}
        />
      </PageMotion>
    </AppLayout>
  );
}
