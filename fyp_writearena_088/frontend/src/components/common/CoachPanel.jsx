import React, { useState, useEffect } from "react";
import PaymentModal from "./PaymentModal";
import api from "../../services/api";

/** getText() should return the current writing to critique. */
export default function CoachPanel({ getText }) {
  const [subscribed, setSubscribed] = useState(false);
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [price, setPrice] = useState(500);

  useEffect(() => {
    api.get("/coach/status").then((r) => setSubscribed(r.data.subscribed)).catch(() => {});
    api.get("/payments/prices").then((r) => setPrice(r.data.coach_subscription?.pkr || 500)).catch(() => {});
  }, []);

  const getSuggestion = async () => {
    const text = (getText?.() || "").trim();
    if (text.split(/\s+/).length < 5) { setTip("Write a few sentences first, then ask the coach."); return; }
    setLoading(true); setTip("");
    try {
      const { data } = await api.post("/coach/suggest", { text });
      setTip(data.suggestion);
    } catch (e) {
      if (e.response?.status === 402) setPayOpen(true);
      else setTip("Coach is unavailable right now.");
    } finally { setLoading(false); }
  };

  return (
    <div className="wa-card" style={{ padding: 18, borderLeft: "3px solid var(--butter)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 15 }}>✦ AI Writing Coach</div>
          <div style={{ fontSize: 12, color: "var(--ink2)" }}>One focused improvement for your piece.</div>
        </div>
        {subscribed
          ? <button className="btn btn-primary" onClick={getSuggestion} disabled={loading}>{loading ? "Thinking…" : "Get a suggestion"}</button>
          : <button className="btn btn-primary" onClick={() => setPayOpen(true)}>Unlock · ₨{price}/mo</button>}
      </div>
      {tip && (
        <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--butter-soft, var(--cream2))", borderRadius: 10, fontSize: 14, lineHeight: 1.6, color: "var(--ink)", fontFamily: "var(--serif)" }}>
          {tip}
        </div>
      )}
      <PaymentModal
        open={payOpen}
        title="AI Writing Coach"
        subtitle="Monthly subscription · cancel anytime"
        priceLabel={"₨" + price + " / mo"}
        initiate={(provider, currency) => api.post("/payments/initiate", { purpose: "coach_subscription", provider, currency }).then((r) => r.data)}
        onSuccess={() => { setPayOpen(false); setSubscribed(true); }}
        onClose={() => setPayOpen(false)}
      />
    </div>
  );
}
