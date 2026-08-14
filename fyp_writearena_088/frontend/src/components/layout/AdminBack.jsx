import React from "react";
import { useNavigate } from "react-router-dom";

/* Back control for admin sub-pages. Prefers real browser history, but falls
   back to the admin overview so it always goes somewhere sensible (e.g. when
   the page was opened directly by URL). */
export default function AdminBack({ label = "Back to admin" }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/admin");
  };
  return (
    <button
      className="btn btn-ghost"
      onClick={goBack}
      style={{ padding: "7px 14px", fontSize: 13, marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}
