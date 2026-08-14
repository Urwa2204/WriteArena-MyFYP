import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

const NICHES = ["all","technology","society","literature","science","politics","business","sports","health","entertainment","arts"];

export default function Feed() {
  const [tab, setTab] = useState("explore");
  const [niche, setNiche] = useState("all");
  const [sort, setSort] = useState("top");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();

  const load = async (targetPage = 1, append = false) => {
    setLoading(true);
    try {
      const url = tab === "explore"
        ? "/feed/explore?sort=" + sort + (niche !== "all" ? "&niche=" + niche : "") + "&page=" + targetPage
        : "/feed/following?page=" + targetPage;
      const { data } = await api.get(url);
      const items = data.items || [];
      setPosts((prev) => (append ? [...prev, ...items] : items));
      setHasMore(items.length >= 20);   // backend pages at 20 per call
      setPage(targetPage);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(1, false); }, [tab, niche, sort]);

  const like = async (sub_id) => {
    try {
      await api.post("/social/submissions/" + sub_id + "/like");
      setPosts((prev) => prev.map((p) => p.submission_id === sub_id
        ? { ...p, like_count: p.user_liked ? p.like_count - 1 : p.like_count + 1, user_liked: !p.user_liked }
        : p));
    } catch { toast("Error liking post", "error"); }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <div className="page">
        <div className="eyebrow">what the community is writing</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 18 }}>Feed</h1>
        <div className="tabs">
          <button className={"tab" + (tab === "explore" ? " active" : "")} onClick={() => setTab("explore")}>Explore</button>
          <button className={"tab" + (tab === "following" ? " active" : "")} onClick={() => setTab("following")}>Following</button>
        </div>

        {tab === "explore" && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
              {NICHES.map((n) => (
                <button key={n} onClick={() => setNiche(n)} style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap",
                  background: niche === n ? "var(--accent)" : "var(--glass-light)",
                  color: niche === n ? "#fff" : "var(--text2)",
                  border: "1px solid " + (niche === n ? "var(--accent)" : "var(--border)"),
                  cursor: "pointer",
                }}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["top","recent"].map((s) => (
                <button key={s} onClick={() => setSort(s)} style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12,
                  background: sort === s ? "var(--accent-glow)" : "transparent",
                  color: sort === s ? "var(--accent)" : "var(--text2)",
                  border: "1px solid " + (sort === s ? "var(--accent-border)" : "var(--border)"),
                  cursor: "pointer",
                }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="loader"><div className="spinner" /></div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {posts.map((p) => (
            <div key={p.submission_id} className="glass post-card" onClick={() => navigate("/submission/" + p.submission_id)}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 15, flexShrink: 0 }}>
                  {p.author?.avatar_url
                    ? <img src={p.author.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    : (p.author?.username || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{p.author?.display_name || p.author?.username}</span>
                      {p.author?.rank && <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: 11 }}>{p.author.rank.toUpperCase()}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {p.grade && <span className={"badge " + (p.grade === "A+" ? "badge-gold" : p.grade === "A" ? "badge-green" : "badge-blue")}>{p.grade}</span>}
                      {p.final_score != null && <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{p.final_score.toFixed(1)}%</span>}
                    </div>
                  </div>
                  {p.topic_title && <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{p.topic_title}</div>}
                  <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginTop: 8 }}>{p.excerpt}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); like(p.submission_id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: p.user_liked ? "var(--accent)" : "var(--text2)", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {p.user_liked ? "♥" : "♡"} {p.like_count}
                    </button>
                    <span style={{ fontSize: 13, color: "var(--text2)" }}>◎ {p.comment_count}</span>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>{p.word_count} words</span>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{p.niche}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && posts.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text2)" }}>
              {tab === "following" ? "Follow writers to see their posts here." : "No posts yet."}
            </div>
          )}
          {posts.length > 0 && hasMore && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button className="btn btn-ghost" disabled={loading} onClick={() => load(page + 1, true)}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
