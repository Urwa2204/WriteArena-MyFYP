import React, { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";

export default function AdminDashboard() {
  const { toasts, remove } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const tiles = [
    { to: "/admin/users", title: "Accounts", desc: "View members, change roles, suspend or reactivate accounts." },
    { to: "/admin/tournaments", title: "Tournaments & topics", desc: "Announce tournaments, close them, and manage writing prompts." },
    { to: "/admin/rooms", title: "Rooms", desc: "Create and remove arena rooms across niches." },
    { to: "/admin/reports", title: "Moderation", desc: "Review flagged submissions, comments and chat." },
  ];

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <div className="eyebrow">management console</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 24px" }}>Admin overview</h1>

        <div className="grid-4" style={{ marginBottom: 28 }}>
          {stats && [
            { label: "Total users", value: stats.total_users },
            { label: "Active users", value: stats.active_users },
            { label: "Submissions", value: stats.total_submissions },
            { label: "Rooms", value: stats.total_rooms },
          ].map((s) => (
            <div key={s.label} className="glass stat-card">
              <div className="stat-num">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {tiles.map((t) => (
            <button key={t.to} onClick={() => navigate(t.to)} className="wa-card hoverable"
              style={{ padding: 22, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
