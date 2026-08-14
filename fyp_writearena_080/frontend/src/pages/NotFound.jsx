import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/common/Logo";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", textAlign: "center", padding: 24 }}>
      <Logo size={44} />
      <div style={{ fontSize: 72, fontWeight: 700, color: "var(--accent)", marginTop: 16, marginBottom: 8 }}>404</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Page not found</h1>
      <p style={{ color: "var(--text2)", marginBottom: 24 }}>The page you are looking for does not exist.</p>
      <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>Go to dashboard</button>
    </div>
  );
}
