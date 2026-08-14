import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import { PageMotion, staggerContainer, staggerItem } from "../components/common/Motion";
import { useCountUp } from "../hooks/useCountUp";
import Avatar from "../components/common/Avatar";
import Icon from "../components/common/Icon";
import api from "../services/api";

function StatCard({ label, value, color, decimals = 0, suffix = "" }) {
  const n = useCountUp(typeof value === "number" ? value : 0, 1100, decimals);
  return (
    <motion.div variants={staggerItem} className="wa-card lift stat-card">
      <div className="stat-num" style={{ color }}>{typeof value === "number" ? n : value}{suffix}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toasts, remove } = useToast();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get("/rooms").then((r) => setRooms(r.data.slice(0, 5))).catch(() => {});
    api.get("/tournaments/daily-challenge").then((r) => setChallenge(r.data)).catch(() => {});
    api.get("/analytics/me").then((r) => setAnalytics(r.data)).catch(() => {});
  }, []);

  const xpForNext = ((user?.level || 1)) * 500;
  const xpProgress = (((user?.xp_points || 0) % 500) / 500) * 100;

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        {/* Hero card */}
        <div className="wa-card" style={{ padding: 26, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <Avatar user={user} size={64} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ fontSize: 24, fontWeight: 600 }}>{user?.display_name || user?.username}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                <span className="badge badge-purple">{(user?.rank || "bronze").toUpperCase()}</span>
                <span style={{ fontSize: 13, color: "var(--ink2)" }}>Level {user?.level || 1}</span>
                <span className="streak-display">
                  <Icon name="flame" size={15} style={{ color: "var(--peach-d)" }} />
                  <span className="streak-count">{user?.streak_count || 0}</span>
                  <span style={{ fontSize: 12, color: "var(--ink2)" }}>day streak</span>
                </span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink2)", marginBottom: 6, fontFamily: "var(--serif)" }}>
                  <span>{user?.xp_points || 0} XP</span>
                  <span>Next level · {xpForNext} XP</span>
                </div>
                <div className="xp-bar"><motion.div className="xp-fill" initial={{ width: 0 }} animate={{ width: xpProgress + "%" }} transition={{ duration: 1 }} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid-4" style={{ marginBottom: 22 }}>
          <StatCard label="competitions entered" value={analytics?.total_sessions || 0} color="var(--lav-d)" />
          <StatCard label="average score" value={analytics ? Number(analytics.avg_score) : 0} decimals={1} suffix="%" color="var(--mint-d)" />
          <StatCard label="experience points" value={user?.xp_points || 0} color="var(--blush-d)" />
          <StatCard label="day streak" value={user?.streak_count || 0} color="var(--peach-d)" />
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Live rooms */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 17 }}>Writing rooms</h2>
              <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => navigate("/rooms")}>View all</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rooms.map((r) => (
                <div key={r.room_id} className="wa-card lift" style={{ padding: "14px 18px", cursor: "pointer" }} onClick={() => navigate("/lobby/" + r.room_id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{r.member_count}/{r.capacity} writers</div>
                    </div>
                    <span className={"badge " + (r.status === "active" ? "badge-green" : "badge-blue")}>{r.status}</span>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && <div className="wa-card" style={{ padding: 20, textAlign: "center", color: "var(--ink2)" }}>No rooms open right now.</div>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => navigate("/rooms")}>Find a room</button>
              <button className="btn btn-ghost" onClick={() => navigate("/daily-challenge")}>Daily challenge</button>
              <button className="btn btn-ghost" onClick={() => navigate("/profile/" + user?.user_id)}>View profile</button>
            </div>
          </div>

          {/* Daily challenge */}
          <div>
            <h2 style={{ fontSize: 17, marginBottom: 14 }}>Daily challenge</h2>
            {challenge ? (
              <div className="wa-card" style={{ padding: 22 }}>
                <span className="badge badge-purple" style={{ marginBottom: 12 }}>Today</span>
                <p style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.5, marginBottom: 18 }}>{challenge.topic}</p>
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate("/daily-challenge")}>Accept challenge</button>
                {challenge.leaderboard?.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>today's top writers</div>
                    {challenge.leaderboard.slice(0, 3).map((e, i) => (
                      <div key={i} className="lrow" style={{ padding: "8px 6px" }}>
                        <span className={"lb-rank lb-rank-" + (i + 1)} style={{ fontSize: 13 }}>{["I","II","III"][i]}</span>
                        <span style={{ flex: 1, fontFamily: "var(--serif)" }}>{e.username}</span>
                        <span className="badge badge-purple">{e.final_score?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="wa-card" style={{ padding: 20, textAlign: "center" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
            )}
          </div>
        </div>
      </PageMotion>
    </AppLayout>
  );
}
