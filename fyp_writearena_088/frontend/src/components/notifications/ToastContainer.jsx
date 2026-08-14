import React from "react";

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || !toasts.length) return null;
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const colors = { success: "#86efac", error: "#f87171", info: "var(--accent)" };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={"toast toast-" + t.type} onClick={() => onRemove(t.id)} style={{ cursor: "pointer" }}>
          <span style={{ color: colors[t.type] || colors.info, fontWeight: 600, fontSize: 16 }}>
            {icons[t.type] || icons.info}
          </span>
          <span style={{ fontSize: 13, color: "var(--text)", flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
