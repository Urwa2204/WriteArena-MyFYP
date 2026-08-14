import React, { useState, useEffect } from "react";
import PaymentModal from "./PaymentModal";
import api from "../../services/api";

export default function PurchasesPanel() {
  const [cert, setCert] = useState(null);
  const [reason, setReason] = useState("");
  const [certPay, setCertPay] = useState(false);
  const [freezePay, setFreezePay] = useState(false);
  const [msg, setMsg] = useState("");

  const loadCert = () => api.get("/payments/certificate/eligibility").then((r) => setCert(r.data)).catch(() => {});
  useEffect(() => { loadCert(); }, []);

  const download = async () => {
    try {
      const res = await api.get("/payments/certificate/download", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "WriteArena_Certificate.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { setMsg("Could not download certificate."); }
  };

  return (
    <>
      {/* Certificate */}
      <div className="wa-card" style={{ padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, fontFamily: "var(--serif)" }}>Certificate of Achievement</h2>
        {cert && (
          <>
            <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 12 }}>
              Unlocks at a score of <strong>{cert.min_score}+</strong> while on a <strong>{cert.min_streak}-day</strong> streak.
              Your best: <strong>{cert.best_score}</strong> · streak: <strong>{cert.streak} days</strong>.
            </p>
            {!cert.eligible
              ? <span className="badge">Keep writing to unlock</span>
              : cert.already_paid
                ? <button className="btn btn-primary" onClick={download}>⬇ Download certificate</button>
                : <button className="btn btn-primary" onClick={() => setCertPay(true)}>Get certificate · ₨{cert.price_pkr}</button>}
          </>
        )}
        {msg && <div style={{ fontSize: 12, color: "var(--blush-d)", marginTop: 8 }}>{msg}</div>}
      </div>

      {/* Streak freeze */}
      <div className="wa-card" style={{ padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, fontFamily: "var(--serif)" }}>Streak freeze</h2>
        <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 12 }}>
          Protect your streak while you're away. Tell us why you'll be gone, then activate a freeze.
        </p>
        <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Exams next week, travelling until Sunday…" style={{ minHeight: 64, marginBottom: 10 }} />
        <button className="btn btn-primary" disabled={!reason.trim()} onClick={() => setFreezePay(true)}>Buy streak freeze · ₨300</button>
      </div>

      <PaymentModal
        open={certPay}
        title="Certificate of Achievement"
        subtitle="A signed PDF on the WriteArena scroll"
        priceLabel={cert ? "₨" + cert.price_pkr : ""}
        initiate={(provider, currency) => api.post("/payments/initiate", { purpose: "certificate", provider, currency }).then((r) => r.data)}
        onSuccess={() => { setCertPay(false); loadCert(); setTimeout(download, 400); }}
        onClose={() => setCertPay(false)}
      />
      <PaymentModal
        open={freezePay}
        title="Streak freeze"
        subtitle="Protects your streak for up to 2 days"
        priceLabel="₨300"
        initiate={(provider, currency) => api.post("/payments/streak-freeze", { reason, provider, currency }).then((r) => r.data)}
        onSuccess={() => { setFreezePay(false); setReason(""); setMsg("Streak freeze activated."); }}
        onClose={() => setFreezePay(false)}
      />
    </>
  );
}
