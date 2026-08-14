import React, { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AdminBack from "../../components/layout/AdminBack";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";

export default function AdminReports() {
  const { toasts, toast, remove } = useToast();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("open");

  const load = () => api.get("/admin/reports", { params: { status } }).then((r) => setReports(r.data)).catch(() => {});
  useEffect(() => { load(); }, [status]);

  const dismiss = async (id) => {
    try { await api.post("/admin/reports/" + id + "/dismiss"); await load(); toast("Dismissed", "info"); }
    catch { toast("Error", "error"); }
  };

  const removeContent = async (id) => {
    if (!window.confirm("Delete the reported content? This cannot be undone.")) return;
    try { await api.post("/admin/reports/" + id + "/remove"); await load(); toast("Content removed", "success"); }
    catch { toast("Error", "error"); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <AdminBack />
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Moderation queue</h1>
        <div className="tabs" style={{ marginBottom: 20 }}>
          {[["open", "Open"], ["dismissed", "Dismissed"], ["removed", "Removed"]].map(([k, label]) => (
            <button key={k} className={"tab" + (status === k ? " active" : "")} onClick={() => setStatus(k)}>{label}</button>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>
            No {status} reports.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reports.map((r) => (
            <div key={r.report_id} className="glass" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>{r.target_type}</span>
                  {r.target_author && <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: 8 }}>by {r.target_author}</span>}
                  <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {status === "open" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => dismiss(r.report_id)}>Dismiss</button>
                    <button className="btn btn-danger" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => removeContent(r.report_id)}>Remove content</button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 10 }}>
                <strong>Reported by {r.reporter}:</strong> {r.reason}
              </div>
              {r.target_still_exists ? (
                <div style={{ fontSize: 13, color: "var(--text)", marginTop: 8, padding: "10px 12px", background: "var(--glass-light)", borderRadius: 8 }}>
                  "{r.target_excerpt}"
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8, fontStyle: "italic" }}>
                  (content no longer exists — already deleted by its author or a prior moderation action)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
