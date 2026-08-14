import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { PageMotion } from "../components/common/Motion";
import RoomIcon3D from "../components/rooms/RoomIcon3D";
import api from "../services/api";

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const initial = useRef(600);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/tournaments/daily-challenge").then((r) => setChallenge(r.data)).catch(() => {});
  }, []);

  // Start the countdown when the writer begins.
  const begin = () => {
    if (started) return;
    const dur = challenge?.duration || 600;
    initial.current = dur;
    setTimeLeft(dur);
    setStarted(true);
  };

  useEffect(() => {
    if (!started || timeLeft == null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); submit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const submit = async (auto = false) => {
    if (submitting || submitted) return;
    if (!auto && wordCount < 10) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const res = await api.post("/tournaments/daily-challenge/submit", { content: text, draft: false });
      setSubmitted(true);
      navigate("/results/" + res.data.submission_id, { state: { submissionId: res.data.submission_id } });
    } catch { setSubmitting(false); }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const mm = timeLeft != null ? String(Math.floor(timeLeft / 60)).padStart(2, "0") : "--";
  const ss = timeLeft != null ? String(timeLeft % 60).padStart(2, "0") : "--";
  const urgent = timeLeft != null && timeLeft <= 60;
  const fillPct = timeLeft != null ? Math.max(0, (timeLeft / initial.current) * 100) : 100;

  return (
    <AppLayout>
      <PageMotion className="page" style={{ maxWidth: 820, margin: "0 auto" }}>
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate("/dashboard")}>← Back to dashboard</button>

        {challenge && (
          <>
            <div className="wa-card" style={{ padding: 22, marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
              <RoomIcon3D niche={challenge.niche || "literature"} active size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="badge badge-gold" style={{ marginBottom: 8 }}>Daily challenge</div>
                <h2 style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.5, fontFamily: "var(--serif)" }}>{challenge.topic}</h2>
              </div>
              {/* Countdown */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>time left</div>
                <div style={{ position: "relative", width: 92, height: 92, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: `conic-gradient(${urgent ? "var(--blush-d)" : "var(--mint-d)"} ${fillPct}%, var(--lav-s) ${fillPct}%)` }}>
                  <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "var(--card-solid)" }} />
                  <span style={{ position: "relative", fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    color: urgent ? "var(--blush-d)" : "var(--ink)" }}>{mm}:{ss}</span>
                </div>
              </div>
            </div>

            {!started ? (
              <div className="wa-card" style={{ padding: 40, textAlign: "center" }}>
                <p style={{ fontSize: 15, color: "var(--ink2)", marginBottom: 6 }}>
                  You'll have <strong style={{ color: "var(--ink)" }}>{Math.round((challenge.duration || 600) / 60)} minutes</strong> once you begin. The clock starts on your first keystroke.
                </p>
                <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 22, fontStyle: "italic" }}>Paste is disabled. Your work auto-submits when the timer ends.</p>
                <button className="btn btn-primary" onClick={begin}>Begin the challenge</button>
              </div>
            ) : (
              <>
                <textarea
                  className="input"
                  value={text}
                  autoFocus
                  onChange={(e) => setText(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  placeholder="Write your response here. Paste is disabled."
                  disabled={submitted}
                  style={{ minHeight: 340, fontSize: 15, lineHeight: 1.8, marginBottom: 12, fontFamily: "var(--serif)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--ink2)" }}>{wordCount} words</span>
                  <button className="btn btn-primary" onClick={() => submit(false)} disabled={submitting || submitted || wordCount < 10}>
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </PageMotion>
    </AppLayout>
  );
}
