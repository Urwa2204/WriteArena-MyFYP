import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { palette } from "../../lib/chartTheme";
import { useCountUp } from "../../hooks/useCountUp";

/* ============================================================
   ScoreGauge — chart.js doughnut used as a 0–100 radial gauge.
   Centre shows the grade + the score counting up.
   ============================================================ */

export default function ScoreGauge({ value = 0, grade = "", size = 180, color }) {
  const p = palette();
  const v = Math.max(0, Math.min(100, value));
  const counted = useCountUp(v, 1200, 0);
  const arc = color || p.lav;

  const data = useMemo(() => ({
    datasets: [{
      data: [v, 100 - v],
      backgroundColor: [arc, "rgba(120,100,160,0.10)"],
      borderWidth: 0,
      borderRadius: 20,
      circumference: 270,
      rotation: 225,
      cutout: "78%",
    }],
  }), [v, arc]);

  const options = {
    responsive: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { duration: 1200, easing: "easeOutCubic" },
  };

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <Doughnut data={data} options={options} width={size} height={size} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {grade && <div style={{ fontFamily: "var(--serif)", fontSize: size * 0.2, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{grade}</div>}
        <div style={{ fontFamily: "var(--serif)", fontSize: size * 0.13, color: "var(--ink2)", marginTop: 2 }}>{counted}</div>
      </div>
    </div>
  );
}
