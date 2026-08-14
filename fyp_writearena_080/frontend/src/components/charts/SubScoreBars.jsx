import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { palette } from "../../lib/chartTheme";

/* ============================================================
   SubScoreBars — chart.js horizontal bars for the three
   sub-scores. Mint = originality, sky = authentic voice,
   lavender = quality. Animates width from 0 on mount.
   ============================================================ */

export default function SubScoreBars({ originality = 0, voice = 0, quality = 0, height = 150 }) {
  const p = palette();

  const data = useMemo(() => ({
    labels: ["Originality", "Authentic voice", "Quality"],
    datasets: [{
      data: [originality, voice, quality],
      backgroundColor: [p.mint, p.sky, p.lav],
      borderRadius: 10,
      barThickness: 18,
    }],
  }), [originality, voice, quality, p.mint, p.sky, p.lav]);

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1100, easing: "easeOutCubic" },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.parsed.x.toFixed(1)}%` } },
    },
    scales: {
      x: { min: 0, max: 100, grid: { color: "rgba(120,100,160,0.08)" }, ticks: { color: p.ink2, callback: (v) => v + "%" } },
      y: { grid: { display: false }, ticks: { color: p.ink, font: { family: "Fraunces, Georgia, serif", size: 13 } } },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}
