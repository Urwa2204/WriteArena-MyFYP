import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { PageMotion, staggerContainer, staggerItem } from "../components/common/Motion";
import Badge3D from "../components/badges/Badge3D";
import api from "../services/api";

export default function Badges() {
  const { user } = useAuth();
  const { toasts, remove } = useToast();
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (user?.user_id) api.get("/users/" + user.user_id + "/badges").then((r) => setBadges(r.data)).catch(() => {});
  }, [user]);

  const rarityBadge = { legendary: "badge-gold", epic: "badge-red", rare: "badge-purple", common: "badge-blue" };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page">
        <div className="eyebrow">marks of the craft</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 6 }}>Badges</h1>
        <p style={{ color: "var(--ink2)", fontSize: 14, marginBottom: 24 }}>Awarded automatically when you meet the requirements.</p>

        {badges.length === 0 ? (
          <div className="wa-card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}><Badge3D icon="star" rarity="common" earned={false} size={84} /></div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, marginTop: 12 }}>No badges yet</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 6 }}>Complete writing sessions to earn your first seal.</div>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid-3">
            {badges.map((b) => {
              const earned = !!b.awarded_at;
              return (
                <motion.div key={b.badge_id} variants={staggerItem} whileHover={{ y: -4 }}
                  className="wa-card" style={{ padding: 24, textAlign: "center", opacity: earned ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                    <Badge3D icon={b.icon} rarity={b.rarity} earned={earned} size={84} />
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5, margin: "6px 0 12px" }}>{b.description}</div>
                  <span className={"badge " + (rarityBadge[b.rarity] || "badge-purple")} style={{ textTransform: "capitalize" }}>{b.rarity}</span>
                  {earned
                    ? <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 8 }}>Earned {new Date(b.awarded_at).toLocaleDateString()}</div>
                    : b.unlock_hint && <div style={{ fontSize: 11, color: "var(--lav-d)", marginTop: 8, fontStyle: "italic" }}>🔒 {b.unlock_hint}</div>}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </PageMotion>
    </AppLayout>
  );
}
