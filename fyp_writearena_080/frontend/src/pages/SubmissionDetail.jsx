import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { PageMotion } from "../components/common/Motion";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import ShareModal from "../components/common/ShareModal";
import api from "../services/api";

const Av = ({ u, size = 40 }) =>
  u?.avatar_url
    ? <img src={u.avatar_url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--lav-s)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--serif)", fontWeight: 600, color: "var(--lav-d)", fontSize: size * 0.4 }}>
        {(u?.username || "?").charAt(0).toUpperCase()}
      </div>;

export default function SubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, toast, remove } = useToast();
  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    api.get("/feed/submission/" + submissionId).then((r) => {
      setPost(r.data);
      setComments(r.data.comments || []);
      const aid = r.data.author?.user_id;
      if (aid) api.get("/users/" + aid).then((u) => setAuthor(u.data)).catch(() => {});
    }).catch(() => {});
  }, [submissionId]);

  const like = async () => {
    try {
      await api.post("/social/submissions/" + submissionId + "/like");
      setPost((p) => ({ ...p, user_liked: !p.user_liked, like_count: p.user_liked ? p.like_count - 1 : p.like_count + 1 }));
    } catch { toast("Error liking post", "error"); }
  };

  const reportPost = async () => {
    const reason = window.prompt("What's wrong with this submission? (seen by admins only)");
    if (!reason || !reason.trim()) return;
    try {
      await api.post("/social/report", { target_type: "submission", target_id: submissionId, reason });
      toast("Reported — thanks, an admin will take a look.", "success");
    } catch { toast("Couldn't submit the report.", "error"); }
  };

  const toggleFollow = async () => {
    if (!author) return;
    try {
      if (author.is_following) {
        await api.delete("/users/" + author.user_id + "/follow");
        setAuthor((a) => ({ ...a, is_following: false }));
      } else {
        await api.post("/users/" + author.user_id + "/follow");
        setAuthor((a) => ({ ...a, is_following: true }));
        toast("Following " + (author.display_name || author.username), "success");
      }
    } catch { toast("Something went wrong", "error"); }
  };

  const submitComment = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post("/social/submissions/" + submissionId + "/comments", { body: text.trim() });
      setComments((c) => [...c, { comment_id: data.comment_id, body: data.body, created_at: data.created_at, author: { username: user?.username || "You", avatar_url: user?.avatar_url } }]);
      setText("");
    } catch { toast("Couldn't post comment", "error"); }
    finally { setSending(false); }
  };

  if (!post) return <AppLayout toasts={toasts} removeToast={remove}><div className="loader"><div className="spinner" /></div></AppLayout>;

  const a = post.author || {};
  const isOwn = user && a.user_id === user.user_id;

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page" style={{ maxWidth: 760, margin: "0 auto" }}>
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>← Back</button>

        <div className="wa-card" style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Link to={"/profile/" + a.user_id}><Av u={a} size={44} /></Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={"/profile/" + a.user_id} style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                {a.display_name || a.username}
              </Link>
              {a.rank && <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: 11 }}>{a.rank.toUpperCase()}</span>}
              {post.topic_title && <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{post.topic_title}</div>}
            </div>
            {!isOwn && author && (
              <button className={"btn " + (author.is_following ? "btn-ghost" : "btn-primary")} style={{ padding: "7px 18px" }} onClick={toggleFollow}>
                {author.is_following ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <p style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.85, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
            {post.content || post.excerpt}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <button onClick={like} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: post.user_liked ? "var(--blush-d)" : "var(--ink2)", display: "flex", gap: 5, alignItems: "center" }}>
              {post.user_liked ? "♥" : "♡"} {post.like_count}
            </button>
            <span style={{ fontSize: 14, color: "var(--ink2)" }}>◎ {comments.length}</span>
            {post.grade && <span className="badge badge-gold">{post.grade}</span>}
            <span style={{ fontSize: 12, color: "var(--ink3)" }}>{post.word_count} words</span>
            <button onClick={() => setShareOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--lav-d)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              ↗ Share
            </button>
            <button onClick={reportPost} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--ink3)" }}>
              Report
            </button>
          </div>
        </div>

        <div className="wa-card" style={{ padding: 26, marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{comments.length} comment{comments.length === 1 ? "" : "s"}</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
              placeholder="Add a comment…" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={submitComment} disabled={sending || !text.trim()}>Post</button>
          </div>
          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--ink3)", fontStyle: "italic", fontSize: 13 }}>No comments yet — be the first.</div>
          ) : comments.map((c) => (
            <div key={c.comment_id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <Av u={c.author} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.author?.username || "User"}</div>
                <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.5 }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </PageMotion>
      <ShareModal open={shareOpen} submissionId={submissionId} onClose={() => setShareOpen(false)} onToast={toast} />
    </AppLayout>
  );
}
