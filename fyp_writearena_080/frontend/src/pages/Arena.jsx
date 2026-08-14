import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { playForChar, primeAudio } from "../lib/sound";
import RoomIcon3D from "../components/rooms/RoomIcon3D";
import { countWords } from "../lib/wordCount";
import api from "../services/api";

const NICHE_INK = {
  technology: ["#a9cbf0", "#6f9fd6"], literature: ["#c4b5fd", "#9a82e6"],
  science: ["#8fd6bd", "#5fb89a"], society: ["#f3a8bc", "#e07d99"],
  politics: ["#f4bd9c", "#e0926a"], business: ["#9fd9d2", "#69b3ab"],
  sports: ["#f1d488", "#dab44e"], health: ["#a7e6c8", "#6fc7a0"],
  entertainment: ["#f4a8d4", "#dd78b0"], arts: ["#d9c2a0", "#b89b6f"],
};

function AmbientBg() {
  const colors = ["var(--lav)", "var(--mint)", "var(--peach)"];
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i, size: 5 + Math.random() * 12, left: Math.random() * 100, top: Math.random() * 100,
    duration: 4 + Math.random() * 6, delay: Math.random() * 4, color: colors[i % 3],
  }));
  return (
    <div className="ambient-bg">
      {particles.map((p) => (
        <div key={p.id} className="ambient-particle" style={{
          width: p.size, height: p.size, left: p.left + "%", top: p.top + "%",
          background: p.color, animationDuration: p.duration + "s", animationDelay: p.delay + "s",
        }} />
      ))}
    </div>
  );
}

export default function Arena() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const initialDuration = useRef(state?.session?.duration || 300);
  const [timeLeft, setTimeLeft] = useState(initialDuration.current);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);        // show "time ended" popup
  const [autoCountdown, setAutoCountdown] = useState(10);
  const [sessionId, setSessionId] = useState(state?.session?.session_id);
  const [topic, setTopic] = useState(state?.session?.topic || "");
  const [ink, setInk] = useState(NICHE_INK.literature);
  const [niche, setNiche] = useState("literature");
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const areaRef = useRef(null);
  const wordCount = countWords(text);

  const { send } = useWebSocket(roomId, {
    onMessage: (data) => {
      if (data.type === "session_end") {
        clearInterval(timerRef.current);
        navigate("/results/" + roomId, { state: { leaderboard: data.leaderboard } });
      }
    },
  });

  useEffect(() => {
    api.get("/rooms/" + roomId).then((r) => { if (NICHE_INK[r.data.niche]) setInk(NICHE_INK[r.data.niche]); if (r.data.niche) setNiche(r.data.niche); }).catch(() => {});
    areaRef.current?.focus();
  }, [roomId]);

  // Sync the clock with the server so a page refresh or a late join shows the
  // real remaining time (and links submissions to the running session).
  useEffect(() => {
    api.get("/rooms/" + roomId + "/session").then((r) => {
      const s = r.data;
      if (s && s.active) {
        initialDuration.current = s.duration || initialDuration.current;
        setTimeLeft(s.remaining);
        if (s.session_id) setSessionId(s.session_id);
        if (s.topic) setTopic(s.topic);
      }
    }).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); setTimeUp(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // When the clock hits zero we show a "time's up — submit?" popup and start a
  // short grace countdown; if the writer doesn't act, we auto-submit for them
  // so nothing is lost. (Text writable up to this point is captured as-is.)
  useEffect(() => {
    if (!timeUp || submitted || submitting) return;
    if (autoCountdown <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setAutoCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [timeUp, autoCountdown, submitted, submitting]);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (text && sessionId) api.post("/rooms/" + roomId + "/submit", { content: text, draft: true }).catch(() => {});
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [text, sessionId, roomId]);

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const dnf = text.trim().split(/\s+/).filter(Boolean).length < 10;
      const res = await api.post("/rooms/" + roomId + "/submit", { content: text, draft: false, dnf });
      setSubmitted(true);
      navigate("/results/" + res.data.submission_id, { state: { submissionId: res.data.submission_id, isDnf: res.data.is_dnf } });
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const onKeyDown = (e) => {
    primeAudio();
    if (e.key === "Enter") playForChar("\n");
    else if (e.key === " ") playForChar(" ");
    else if (e.key.length === 1) playForChar(e.key);
  };

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  const urgent = timeLeft <= 60;

  // time vial fill + colour
  const fillPct = Math.max(0, (timeLeft / initialDuration.current) * 100);
  const vialColor = timeLeft <= 30 ? "var(--blush)" : timeLeft <= 60 ? "var(--peach)" : "var(--mint)";
  const inkPct = Math.min(100, (wordCount / 120) * 100);

  return (
    <div className="arena-page" style={{ minHeight: "100vh" }} onPointerDown={primeAudio}>
      <AmbientBg />

      <div className="editor-area" style={{ gridTemplateColumns: "1fr 290px", paddingTop: 24 }}>
        {/* LEFT — the writing sheet */}
        <div className="editor-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <RoomIcon3D niche={niche} active size={52} />
            <div>
              <div className="eyebrow" style={{ marginBottom: 2, textTransform: "capitalize" }}>{niche} arena</div>
              <div className="eyebrow" style={{ margin: 0 }}>{topic ? "today's topic" : "free writing"}</div>
            </div>
          </div>
          {topic && <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--ink)", marginBottom: 14 }}>{topic}</p>}

          <div className="sheet" style={{
            position: "relative", background: "var(--card-solid)", borderRadius: 22, boxShadow: "var(--shadow-sm)",
            border: "1px solid var(--border)", padding: "28px 28px 28px 64px", minHeight: 460,
            backgroundImage: "repeating-linear-gradient(transparent, transparent 37px, rgba(120,100,160,.10) 37px, rgba(120,100,160,.10) 38px)",
          }}>
            <div style={{ position: "absolute", left: 44, top: 0, bottom: 0, width: 1.5, background: "rgba(243,168,188,.5)" }} />
            <textarea
              ref={areaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); send({ type: "typing", word_count: countWords(e.target.value) }); }}
              onKeyDown={onKeyDown}
              onPaste={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              placeholder="Begin in your own hand…"
              disabled={submitted}
              spellCheck
              style={{
                width: "100%", minHeight: 400, border: "none", background: "transparent", resize: "none",
                fontFamily: "var(--serif)", fontSize: 19, lineHeight: "38px", color: "var(--ink)",
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitted || submitting || wordCount < 10}
            style={{ marginTop: 16, alignSelf: "flex-start", padding: "13px 30px", fontSize: 15 }}
          >
            {submitting ? "Submitting…" : submitted ? "Submitted" : "Submit writing"}
          </button>
        </div>

        {/* RIGHT — instrument cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Time vial */}
          <div className="wa-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>time remaining</div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 24, height: 110, borderRadius: 12, background: "var(--lav-s)", position: "relative", overflow: "hidden", border: "1px solid var(--border)" }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: fillPct + "%", background: vialColor, transition: "height 1s linear, background .6s ease" }} />
              </div>
              <div className={"timer" + (urgent ? " urgent" : "")} style={{ fontSize: 28 }}>{minutes}:{seconds}</div>
            </div>
          </div>

          {/* Word inkpot */}
          <div className="wa-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>words written</div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--cream2)", position: "relative", overflow: "hidden", border: "1px solid var(--border)" }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: inkPct + "%", background: `linear-gradient(${ink[0]}, ${ink[1]})`, transition: "height .4s ease" }} />
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
                {wordCount} <span style={{ fontSize: 14, color: "var(--ink2)" }}>/ 120 words</span>
              </div>
            </div>
          </div>

          {/* House rules */}
          <div className="wa-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>house rules</div>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
              Copy-paste is off. Every line is scored for originality, authentic voice and quality. Write in your own hand.
            </p>
          </div>
        </div>
      </div>

      {/* Time's up — auto-submit popup */}
      {timeUp && !submitted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(40,30,35,0.55)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="wa-card" style={{ width: "100%", maxWidth: 420, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>⏱</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Time's up!</h2>
            <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 20 }}>
              The clock has run out. Do you want to submit what you've written?
              {" "}It will submit automatically in <strong style={{ color: "var(--lav-d)" }}>{autoCountdown}s</strong>.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSubmit()} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit now"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 12 }}>
              {wordCount < 10 ? "Too little was written, so this will be recorded as a did-not-finish." : `${wordCount} words will be submitted.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
