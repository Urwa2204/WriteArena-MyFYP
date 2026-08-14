import React from "react";
import Sidebar from "./Sidebar";
import ToastContainer from "../notifications/ToastContainer";
import NotificationBell from "../notifications/NotificationBell";
import UserSearch from "../common/UserSearch";
import Icon from "../common/Icon";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AppLayout({ children, toasts, removeToast }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontSize: 14, color: "var(--ink2)", fontFamily: "var(--sans)" }}>
            {user && (
              <span>
                Welcome back,{" "}
                <strong style={{ color: "var(--ink)", fontFamily: "var(--serif)", fontWeight: 600 }}>
                  {user.display_name || user.username}
                </strong>
                {user.streak_count > 0 && (
                  <span className="streak-display" style={{ marginLeft: 14 }}>
                    <Icon name="flame" size={15} style={{ color: "var(--peach-d)" }} />
                    <span className="streak-count">{user.streak_count}</span>
                    <span style={{ fontSize: 12, color: "var(--ink2)" }}>day streak</span>
                  </span>
                )}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
           <UserSearch />
            <NotificationBell />
            {user?.role !== "admin" && (
              <button
                className="btn btn-ghost"
                style={{ padding: "8px 16px", fontSize: 13 }}
                onClick={() => navigate("/profile/" + user?.user_id)}
              >
                Profile
              </button>
            )}
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 16px", fontSize: 13, color: "var(--ink2)" }}
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
      {toasts && <ToastContainer toasts={toasts} onRemove={removeToast} />}
    </div>
  );
}
