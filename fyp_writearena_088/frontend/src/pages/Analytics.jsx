import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Line, Radar } from "react-chartjs-2";
import { useToast } from "../hooks/useToast";
import { PageMotion, staggerContainer, staggerItem } from "../components/common/Motion";
import { useCountUp } from "../hooks/useCountUp";
import { palette, verticalGradient } from "../lib/chartTheme";
import { motion } from "framer-motion";
import api from "../services/api";

function Stat({ label, value, suffix = "", decimals = 0, color }) {
  const n = useCountUp(Number(value) || 0, 1100, decimals);
  return (
    <motion.div variants={staggerItem} className="wa-card lift stat-card">
      <div className="stat-num" style={{ color }}>{n}{suffix}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

export default function Analytics() {
  const { toasts, remove } = useToast();
  const [data, setData] = useState(null);
  const p = palette();

  useEffect(() => { api.get("/analytics/me").then((r) => setData(r.data)).catch(() => {}); }, []);

  const lineData = useMemo(() => ({
    labels: (data?.timeline || []).map((t) => t.date),
    datasets: [{
      label: "Score",
      data: (data?.timeline || []).map((t) => t.final_score),
      borderColor: p.lavD,
      borderWidth: 2.5,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: p.lavD,
      fill: true,
      backgroundColor: (ctx) => verticalGradient(ctx.chart.ctx, ctx.chart.chartArea, "rgba(185,167,230,0.32)", "rgba(185,167,230,0)"),
    }],
  }), [data, p.lavD]);

  const radarData = useMemo(() => {
    const entries = data?.radar ? Object.entries(data.radar) : [];
    return {
      labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
      datasets: [{
        label: "Skill",
        data: entries.map(([, v]) => Math.round(v)),
        borderColor: p.mintD,
        backgroundColor: "rgba(143,214,189,0.22)",
        borderWidth: 2,
        pointBackgroundColor: p.mintD,
      }],
    };
  }, [data, p.mintD]);

  if (!data) return <AppLayout toasts={toasts} removeToast={remove}><div className="loader"><div className="spinner" /></div></AppLayout>;

  const today = new Date();
  const calCells = Array.from({ length: 364 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (363 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, count: data.heatmap?.[key] || 0 };
  });
  const cellOpacity = (c) => (c === 0 ? 0.08 : Math.min(1, 0.28 + c * 0.24));

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        <div className="eyebrow">your season, measured</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 22 }}>Analytics</h1>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid-4" style={{ marginBottom: 22 }}>
          <Stat label="competitions entered" value={data.total_sessions} color="var(--lav-d)" />
          <Stat label="average score" value={data.avg_score} decimals={1} suffix="%" color="var(--mint-d)" />
          <Stat label="best score" value={data.best_score || (data.timeline?.length ? Math.max(...data.timeline.map((t) => t.final_score)) : 0)} decimals={1} suffix="%" color="var(--blush-d)" />
          <Stat label="active days" value={Object.keys(data.heatmap || {}).length} color="var(--peach-d)" />
        </motion.div>

        {/* Line */}
        <div className="wa-card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>score over time</div>
          {data.timeline?.length > 0 ? (
            <div style={{ height: 260 }}>
              <Line data={lineData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100, grid: { color: "rgba(120,100,160,0.08)" } }, x: { grid: { display: false } } },
              }} />
            </div>
          ) : <div style={{ textAlign: "center", padding: 32, color: "var(--ink2)" }}>No sessions yet — start competing to chart your progress.</div>}
        </div>

        {/* Radar + heatmap */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
          <div className="wa-card" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>skill radar</div>
            <div style={{ height: 240 }}>
              <Radar data={radarData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { r: { min: 0, max: 100, grid: { color: "rgba(120,100,160,0.12)" }, angleLines: { color: "rgba(120,100,160,0.12)" }, pointLabels: { color: p.ink2, font: { family: "Fraunces, Georgia, serif", size: 12 } }, ticks: { display: false } } },
              }} />
            </div>
          </div>

          <div className="wa-card" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>activity calendar</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(52, 1fr)", gap: 3 }}>
              {calCells.map((c) => (
                <div key={c.key} title={`${c.key}: ${c.count} session(s)`} style={{
                  width: "100%", aspectRatio: "1", borderRadius: 3,
                  background: `rgba(185,167,230,${cellOpacity(c.count)})`,
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14, alignItems: "center", fontSize: 11, color: "var(--ink2)" }}>
              <span>Less</span>
              {[0.08, 0.32, 0.56, 0.8, 1].map((o, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(185,167,230,${o})` }} />)}
              <span>More</span>
            </div>
          </div>
        </div>
      </PageMotion>
    </AppLayout>
  );
}
