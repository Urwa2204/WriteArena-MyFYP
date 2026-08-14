/* ============================================================
   WriteArena — chart.js theming
   Centralises Chart.js defaults so every chart matches the pastel
   system and re-themes correctly in dark mode. Call applyChartTheme()
   once at app start, and read palette() inside chart configs.
   ============================================================ */

import { Chart as ChartJS } from "chart.js";

/** Read a CSS custom property from :root as a trimmed string. */
export function cssVar(name, fallback = "") {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

/** Current pastel palette resolved from CSS variables (theme-aware). */
export function palette() {
  return {
    lav: cssVar("--lav", "#b9a7e6"),
    lavD: cssVar("--lav-d", "#9a82e6"),
    mint: cssVar("--mint", "#8fd6bd"),
    mintD: cssVar("--mint-d", "#5fb89a"),
    peach: cssVar("--peach", "#f4bd9c"),
    peachD: cssVar("--peach-d", "#e0926a"),
    blush: cssVar("--blush", "#f3a8bc"),
    blushD: cssVar("--blush-d", "#e07d99"),
    butter: cssVar("--butter", "#f1d488"),
    sky: cssVar("--sky", "#a6cbf0"),
    skyD: cssVar("--sky-d", "#6f9fd6"),
    ink: cssVar("--ink", "#4a4458"),
    ink2: cssVar("--ink2", "#7a7390"),
    grid: "rgba(120,100,160,0.10)",
    card: cssVar("--card-solid", "#ffffff"),
  };
}

/** Build a vertical gradient fill for line/area charts. */
export function verticalGradient(ctx, area, colorTop, colorBottom = "rgba(0,0,0,0)") {
  if (!area) return colorTop;
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, colorTop);
  g.addColorStop(1, colorBottom);
  return g;
}

/** Apply global Chart.js defaults that match the design system. */
export function applyChartTheme() {
  const p = palette();
  ChartJS.defaults.font.family =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ChartJS.defaults.font.size = 12;
  ChartJS.defaults.color = p.ink2;
  ChartJS.defaults.borderColor = p.grid;

  ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
  ChartJS.defaults.plugins.legend.labels.boxWidth = 8;
  ChartJS.defaults.plugins.legend.labels.padding = 16;

  ChartJS.defaults.plugins.tooltip.backgroundColor = p.card;
  ChartJS.defaults.plugins.tooltip.titleColor = p.ink;
  ChartJS.defaults.plugins.tooltip.bodyColor = p.ink2;
  ChartJS.defaults.plugins.tooltip.borderColor = p.grid;
  ChartJS.defaults.plugins.tooltip.borderWidth = 1;
  ChartJS.defaults.plugins.tooltip.padding = 12;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 12;
  ChartJS.defaults.plugins.tooltip.titleFont = { family: "Fraunces, Georgia, serif", weight: "600" };
  ChartJS.defaults.plugins.tooltip.displayColors = false;
}
