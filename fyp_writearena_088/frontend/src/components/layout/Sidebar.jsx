import Logo from "../common/Logo";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Icon from "../common/Icon";
import Avatar from "../common/Avatar";

const NAV = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { to: "/rooms", icon: "rooms", label: "Arena Rooms" },
  { to: "/solo", icon: "feed", label: "Solo Writing" },
  { to: "/feed", icon: "feed", label: "Feed" },
  { to: "/leaderboard", icon: "leaderboard", label: "Leaderboard" },
  { to: "/tournaments", icon: "tournaments", label: "Tournaments" },
  { to: "/messages", icon: "messages", label: "Messages" },
  { to: "/analytics", icon: "analytics", label: "Analytics" },
  { to: "/badges", icon: "badges", label: "Badges" },
];

// An admin account is purely a management console — no personal dashboard,
// feed, solo writing, etc. Just the things an admin runs: accounts,
// tournaments & topics, rooms, and the moderation queue.
const ADMIN_NAV = [
  { to: "/admin", icon: "admin", label: "Overview", end: true },
  { to: "/admin/users", icon: "user", label: "Accounts" },
  { to: "/admin/tournaments", icon: "tournaments", label: "Tournaments & Topics" },
  { to: "/admin/rooms", icon: "rooms", label: "Rooms" },
  { to: "/admin/reports", icon: "bell", label: "Moderation" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const items = isAdmin ? ADMIN_NAV : NAV;

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-logo" style={{ cursor: "pointer" }} onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}>
        <Logo size={34} />
        {!collapsed && <span className="logo-text">WriteArena{isAdmin ? " · Admin" : ""}</span>}
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            title={collapsed ? item.label : ""}
          >
            <span className="nav-icon"><Icon name={item.icon} size={20} /></span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)" }}>
        <button className="nav-item" style={{ width: "100%" }} onClick={toggle} title="Toggle theme">
          <span className="nav-icon"><Icon name={theme === "dark" ? "sun" : "moon"} size={20} /></span>
          {!collapsed && <span className="nav-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
      </div>

      {user && (
        <div className="sidebar-user" style={{ cursor: "pointer" }} onClick={() => navigate("/profile/" + user.user_id)}>
          <Avatar user={user} size={38} />
          {!collapsed && (
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.display_name || user.username}
              </div>
              <div style={{ fontSize: 11, color: "var(--lav-d)", fontFamily: "var(--sans)" }}>
                Level {user.level} · {user.xp_points} XP
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)",
          width: 24, height: 24, background: "var(--card-solid)", border: "1px solid var(--border)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 12, color: "var(--ink2)", zIndex: 101, boxShadow: "var(--shadow-sm)",
        }}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? "›" : "‹"}
      </button>
    </aside>
  );
}
