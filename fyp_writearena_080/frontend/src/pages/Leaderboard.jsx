import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { PageMotion, staggerContainer, staggerItem } from "../components/common/Motion";
import Avatar from "../components/common/Avatar";
import api from "../services/api";

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
const roman = (n) => (n <= 10 ? ROMAN[n - 1] : n);

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [scope, setScope] = useState("all");
  const { toasts, remove } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/users/leaderboard?limit=50&scope=" + scope).then((r) => setUsers(r.data)).catch(() => {});
  }, [scope]);

const podiumColors = ["var(--lav)", "var(--sky)", "var(--peach)"]; // 1st, 2nd, 3rd
  const podiumOrder = [1, 0, 2]; // render 2nd, 1st, 3rd
  const topXp = users.length ? Math.max(users[0].xp_points, 1) : 1;
  const barHeight = (xp) => 70 + (Math.max(0, xp) / topXp) * 120; // scales with XP

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        <div className="eyebrow">Top scribes this season</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 8 }}>The Grand Ledger</h1>

        <div className="tabs" style={{ marginBottom: 22 }}>
          {[["all","All time"],["week","This week"],["month","This month"]].map(([k, label]) => (
            <button key={k} className={"tab" + (scope === k ? " active" : "")} onClick={() => setScope(k)}>{label}</button>
          ))}
        </div>

        {/* Podium */}
        {users.length >= 3 && (
          <div className="wa-card" style={{ padding: "32px 24px", marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 22 }}>
              {podiumOrder.map((idx, slot) => {
                const u = users[idx]; if (!u) return null;
                const color = podiumColors[idx];
                return (
                  <motion.div key={idx} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: slot * 0.12, type: "spring", stiffness: 120, damping: 14 }}
                    style={{ textAlign: "center", cursor: "pointer" }} onClick={() => navigate("/profile/" + u.user_id)}>
                    <Avatar user={u} size={54} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600 }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: 12, color: "var(--ink2)" }}>{u.xp_points.toLocaleString()} XP</div>
                    <div style={{ width: 84, height: barHeight(u.xp_points), marginTop: 10, borderRadius: "10px 10px 0 0",
                      background: `linear-gradient(180deg, ${color}, transparent)`, display: "flex", alignItems: "flex-start",
                      justifyContent: "center", paddingTop: 10 }}>
                      <span style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, color: "#fff" }}>{roman(idx + 1)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ledger */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="wa-card" style={{ padding: "8px 6px" }}>
          {users.map((u, i) => (
            <motion.div key={u.user_id} variants={staggerItem} className="lrow" style={{ cursor: "pointer" }} onClick={() => navigate("/profile/" + u.user_id)}>
              <span className={"lb-rank" + (i < 3 ? " lb-rank-" + (i + 1) : "")}>{roman(i + 1)}</span>
              <Avatar user={u} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600,
                  color: i < 3 ? ["var(--lav-d)","var(--sky-d)","var(--peach-d)"][i] : "var(--ink)" }}>{u.display_name || u.username}</div>
                <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 5 }}>Level {u.level} · {u.streak_count} day streak</div>
                <div style={{ height: 6, background: "var(--cream2)", borderRadius: 4, overflow: "hidden", maxWidth: 320 }}>
                  <div style={{ height: "100%", width: Math.max(3, (u.xp_points / topXp) * 100) + "%",
                    background: i < 3 ? ["var(--lav)","var(--sky)","var(--peach)"][i] : "var(--lav)", borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--serif)", fontWeight: 600, color: "var(--lav-d)" }}>{u.xp_points.toLocaleString()} XP</div>
                <span style={{ fontSize: 11, color: "var(--ink2)" }}>{(u.rank || "").toUpperCase()}</span>
              </div>
            </motion.div>
          ))}
          {users.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--ink2)" }}>The ledger is empty.</div>}
        </motion.div>
      </PageMotion>
    </AppLayout>
  );
}
