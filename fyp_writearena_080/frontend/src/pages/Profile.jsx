import React, { useEffect, useState, useRef } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { PageMotion } from "../components/common/Motion";
import Avatar from "../components/common/Avatar";
import Icon from "../components/common/Icon";
import { uploadAvatarLocally } from "../lib/avatarStore";
import api from "../services/api";

export default function Profile() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("history");
  const fileRef = useRef(null);
  const isMe = !userId || userId === me?.user_id;
  const targetId = userId || me?.user_id;

  useEffect(() => {
    if (!targetId) return;
    api.get("/users/" + targetId).then((r) => setProfile(r.data)).catch(() => {});
    api.get("/users/" + targetId + "/badges").then((r) => setBadges(r.data)).catch(() => {});
    api.get("/users/" + targetId + "/history").then((r) => setHistory(r.data)).catch(() => {});
  }, [targetId]);

  const follow = async () => {
    try {
      if (profile.is_following) {
        await api.delete("/users/" + targetId + "/follow");
        setProfile((p) => ({ ...p, is_following: false, followers_count: p.followers_count - 1 }));
      } else {
        await api.post("/users/" + targetId + "/follow");
        setProfile((p) => ({ ...p, is_following: true, followers_count: p.followers_count + 1 }));
      }
    } catch { toast("Something went wrong", "error"); }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadAvatarLocally(targetId, file); toast("Display picture updated", "success"); }
    catch (err) { toast(err.message || "Could not use that image", "error"); }
    e.target.value = "";
  };

  if (!profile) return <AppLayout toasts={toasts} removeToast={remove}><div className="loader"><div className="spinner" /></div></AppLayout>;

  const gradeBadge = (g) => g === "A+" || g === "A" ? "badge-green" : g === "B+" || g === "B" ? "badge-purple" : "badge-red";

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion style={{ maxWidth: 820, margin: "0 auto", padding: "0 0 40px" }}>
        {/* Cover */}
        <div style={{ height: 180, background: "var(--grad-brand)", borderRadius: "0 0 var(--radius) var(--radius)", position: "relative", overflow: "hidden" }}>
          {profile.cover_url && <img src={profile.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>

        <div style={{ padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ position: "relative", marginTop: -44 }}>
              <div style={{ borderRadius: "50%", padding: 3, background: "var(--grad-brand)" }}>
                <Avatar user={{ ...profile, user_id: targetId }} size={92} style={{ border: "3px solid var(--card-solid)" }} />
              </div>
              {isMe && (
                <>
                  <button onClick={() => fileRef.current?.click()} title="Change picture"
                    style={{ position: "absolute", right: -2, bottom: 2, width: 32, height: 32, borderRadius: "50%",
                      background: "var(--card-solid)", border: "1px solid var(--border-gold)", boxShadow: "var(--shadow-sm)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lav-d)", cursor: "pointer" }}>
                    <Icon name="camera" size={16} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: "none" }} />
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {isMe
                ? <button className="btn btn-ghost" onClick={() => navigate("/profile/edit")}>Edit profile</button>
                : <>
                    <button className="btn btn-ghost" onClick={() => navigate("/messages")}>Message</button>
                    <button className={"btn " + (profile.is_following ? "btn-ghost" : "btn-primary")} onClick={follow}>
                      {profile.is_following ? "Following" : "Follow"}
                    </button>
                  </>}
            </div>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 600 }}>{profile.display_name || profile.username}</h1>
          {profile.pen_name && <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink2)", marginTop: 2 }}>"{profile.pen_name}"</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge badge-purple">{(profile.rank || "bronze").toUpperCase()}</span>
            <span style={{ fontSize: 13, color: "var(--ink2)" }}>Level {profile.level}</span>
            {profile.location && <span style={{ fontSize: 13, color: "var(--ink2)" }}>{profile.location}</span>}
          </div>
          {profile.bio && <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, marginTop: 12, maxWidth: 520 }}>{profile.bio}</p>}

          <div style={{ display: "flex", gap: 22, marginTop: 16, fontSize: 14 }}>
            {[["followers", profile.followers_count], ["following", profile.following_count], ["sessions", profile.sessions_count], ["XP", profile.xp_points]].map(([l, v]) => (
              <span key={l}><strong style={{ fontFamily: "var(--serif)" }}>{v || 0}</strong> <span style={{ color: "var(--ink2)" }}>{l}</span></span>
            ))}
          </div>

          <div className="tabs" style={{ marginTop: 22 }}>
            <button className={"tab" + (tab === "history" ? " active" : "")} onClick={() => setTab("history")}>History</button>
            <button className={"tab" + (tab === "badges" ? " active" : "")} onClick={() => setTab("badges")}>Badges ({badges.length})</button>
          </div>

          {tab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {history.map((h) => (
                <div key={h.submission_id} className="wa-card lift" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 2 }}>{h.niche}</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{h.topic_title || "Free writing"}</div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{h.word_count} words · {new Date(h.submitted_at).toLocaleDateString()}</div>
                  </div>
                  {h.grade && <span className={"badge " + gradeBadge(h.grade)}>{h.grade} · {h.final_score?.toFixed(1)}%</span>}
                </div>
              ))}
              {history.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--ink2)" }}>No sessions yet.</div>}
            </div>
          )}

          {tab === "badges" && (
            <div className="grid-3">
              {badges.map((b) => (
                <div key={b.badge_id} className="wa-card" style={{ padding: 18, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4 }}>{b.description}</div>
                  <span className={"badge " + (b.rarity === "legendary" ? "badge-gold" : b.rarity === "epic" ? "badge-red" : b.rarity === "rare" ? "badge-purple" : "badge-blue")}
                    style={{ marginTop: 8, textTransform: "capitalize" }}>{b.rarity}</span>
                </div>
              ))}
              {badges.length === 0 && <div style={{ gridColumn: "span 3", textAlign: "center", padding: 32, color: "var(--ink2)" }}>No badges earned yet.</div>}
            </div>
          )}
        </div>
      </PageMotion>
    </AppLayout>
  );
}
