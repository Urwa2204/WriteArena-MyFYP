import React, { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AdminBack from "../../components/layout/AdminBack";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";

export default function AdminUsers() {
  const { toasts, toast, remove } = useToast();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");

  const load = () => api.get("/admin/users", { params: { page, q } }).then((r) => {
    setUsers(r.data.users); setPages(r.data.pages); setTotal(r.data.total);
  }).catch(() => {});
  useEffect(() => { load(); }, [page, q]);

  const setStatus = async (uid, status) => {
    try { await api.patch("/admin/users/" + uid + "/status?status=" + status); await load(); toast("Updated", "success"); }
    catch { toast("Error", "error"); }
  };

  const setRole = async (uid, role) => {
    try { await api.patch("/admin/users/" + uid + "/role?role=" + role); await load(); toast("Updated", "success"); }
    catch { toast("Error", "error"); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <AdminBack />
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Manage users</h1>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <input className="input" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Search by username or email…" style={{ maxWidth: 320 }} />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>{total} user{total !== 1 ? "s" : ""} total</span>
        </div>
        <div className="glass" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Username","Email","Role","Status","XP","Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text2)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{u.username}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text2)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}><span className="badge badge-blue">{u.role}</span></td>
                  <td style={{ padding: "12px 16px" }}><span className={"badge " + (u.status === "active" ? "badge-green" : "badge-red")}>{u.status}</span></td>
                  <td style={{ padding: "12px 16px", color: "var(--accent)" }}>{u.xp_points}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {u.status === "active"
                        ? <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setStatus(u.user_id, "banned")}>Ban</button>
                        : <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setStatus(u.user_id, "active")}>Unban</button>
                      }
                      {u.role !== "admin"
                        ? <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setRole(u.user_id, "admin")}>Make admin</button>
                        : <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setRole(u.user_id, "user")}>Remove admin</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16, alignItems: "center" }}>
            <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>Page {page} of {pages}</span>
            <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}
              onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>Next →</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
