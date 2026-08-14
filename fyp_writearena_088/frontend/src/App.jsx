import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Lobby from "./pages/Lobby";
import Arena from "./pages/Arena";
import Results from "./pages/Results";
import SubmissionDetail from "./pages/SubmissionDetail";
import SoloWrite from "./pages/SoloWrite";
import Spectator from "./pages/Spectator";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Analytics from "./pages/Analytics";
import Messages from "./pages/Messages";
import Badges from "./pages/Badges";
import Leaderboard from "./pages/Leaderboard";
import Tournaments from "./pages/Tournaments";
import DailyChallenge from "./pages/DailyChallenge";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminReports from "./pages/admin/AdminReports";
import AdminTournaments from "./pages/admin/AdminTournaments";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  // An admin account is a management console only — it has no personal
  // dashboard, feed, solo writing, etc. Bounce admins to the admin area.
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/rooms" element={<Protected><Rooms /></Protected>} />
            <Route path="/lobby/:roomId" element={<Protected><Lobby /></Protected>} />
            <Route path="/arena/:roomId" element={<Protected><Arena /></Protected>} />
            <Route path="/results/:submissionId" element={<Protected><Results /></Protected>} />
            <Route path="/submission/:submissionId" element={<Protected><SubmissionDetail /></Protected>} />
            <Route path="/solo" element={<Protected><SoloWrite /></Protected>} />
            <Route path="/spectator/:roomId" element={<Protected><Spectator /></Protected>} />
            <Route path="/feed" element={<Protected><Feed /></Protected>} />
            <Route path="/profile/:userId" element={<Protected><Profile /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/profile/edit" element={<Protected><EditProfile /></Protected>} />
            <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
            <Route path="/messages" element={<Protected><Messages /></Protected>} />
            <Route path="/badges" element={<Protected><Badges /></Protected>} />
            <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
            <Route path="/tournaments" element={<Protected><Tournaments /></Protected>} />
            <Route path="/daily-challenge" element={<Protected><DailyChallenge /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/notifications" element={<Protected><Notifications /></Protected>} />

            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/tournaments" element={<AdminRoute><AdminTournaments /></AdminRoute>} />
            <Route path="/admin/rooms" element={<AdminRoute><AdminRooms /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
