import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";

const PROVIDERS = [
  { id: "jazzcash", label: "JazzCash", tint: "#B01E2E" },
  { id: "easypaisa", label: "EasyPaisa", tint: "#3AA935" },
  { id: "nayapay", label: "NayaPay", tint: "#5B2A86" },
];

/**
 * Reusable checkout. `initiate(provider, currency)` must return the backend's
 * response containing either { free: true } or { payment / payment_id, checkout }.
 * The modal then confirms the payment and calls onSuccess(result).
 */
export default function PaymentModal({ open, title, subtitle, priceLabel, initiate, onSuccess, onClose }) {
  const [provider, setProvider] = useState("jazzcash");
  const [currency, setCurrency] = useState("PKR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get("/payments/mode").then((r) => setMode(r.data.mode)).catch(() => setMode(null));
  }, [open]);

  if (!open) return null;

  // For live-mode JazzCash/EasyPaisa, the provider's hosted page expects a
  // real browser POST (not a fetch/XHR) with the pp_*/merchant fields as
  // form data — so we build and auto-submit a real hidden <form>, which
  // navigates the whole tab to the provider. They redirect back to our
  // /payments/callback/{provider} route once the customer finishes paying.
  const submitHostedForm = (url, fields) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = url;
    Object.entries(fields || {}).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const pay = async () => {
    setBusy(true); setError("");
    try {
      const res = await initiate(provider, currency);
      if (res?.free) { onSuccess?.(res); return; }

      const checkout = res?.checkout;
      if (checkout?.mode === "live") {
        if (!checkout.redirect_url) {
          setError(checkout.message || "This payment method isn't fully configured yet.");
          return;
        }
        // JazzCash/EasyPaisa need a real form POST with their pp_*/merchant
        // fields; NayaPay's checkout_url is a plain hosted link. Either way,
        // the page navigates away here to the provider's own site.
        if (checkout.form_fields) submitHostedForm(checkout.redirect_url, checkout.form_fields);
        else window.location.href = checkout.redirect_url;
        return;
      }

      // Sandbox mode: same-tab "Confirm" flow, no real provider involved.
      const pid = res?.payment?.payment_id || res?.payment_id;
      if (!pid) throw new Error("No payment created");
      const { data } = await api.post("/payments/" + pid + "/confirm");
      if (data.status === "completed") onSuccess?.(data);
      else setError("Payment could not be completed. Try again.");
    } catch (e) {
      setError(e.response?.data?.detail || "Payment failed. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(40,30,35,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
          onClick={(e) => e.stopPropagation()} className="wa-card"
          style={{ width: "100%", maxWidth: 420, padding: 24 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4 }}>{subtitle}</div>}

          {mode === "sandbox" && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: "var(--butter-s)",
              border: "1px solid var(--border-gold)", fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55 }}>
              <strong>Sandbox mode.</strong> No real money is charged — this simulates a successful
              payment so the full flow is demoable. Live JazzCash / EasyPaisa / NayaPay checkout is
              wired up and can be enabled with merchant credentials in future work.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0", padding: "12px 16px", background: "var(--cream2)", borderRadius: 12 }}>
            <span style={{ fontSize: 13, color: "var(--ink2)" }}>Amount</span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{priceLabel}</span>
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>Pay with</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => setProvider(p.id)}
                style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: "2px solid " + (provider === p.id ? p.tint : "var(--border)"),
                  background: provider === p.id ? p.tint : "var(--card-solid)",
                  color: provider === p.id ? "#fff" : "var(--ink2)" }}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
            <span className="eyebrow" style={{ margin: 0 }}>Currency</span>
            {["PKR", "USD"].map((c) => (
              <button key={c} onClick={() => setCurrency(c)}
                style={{ padding: "5px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  border: "1px solid " + (currency === c ? "var(--lav-d)" : "var(--border)"),
                  background: currency === c ? "var(--lav-s)" : "transparent", color: currency === c ? "var(--lav-d)" : "var(--ink2)" }}>
                {c}
              </button>
            ))}
          </div>

          {error && <div className="badge badge-red" style={{ display: "block", padding: "8px 12px", borderRadius: 10, marginBottom: 12, fontSize: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={pay} disabled={busy}>
              {busy ? "Processing…" : mode === "sandbox" ? "Simulate payment" : "Pay now"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink3)", textAlign: "center", marginTop: 12 }}>
            {mode === "sandbox"
              ? "Sandbox checkout · no real charge is made."
              : `Secured checkout · you'll be charged once via ${PROVIDERS.find((p) => p.id === provider)?.label}.`}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
