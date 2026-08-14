import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { PageMotion } from "../components/common/Motion";
import CoachPanel from "../components/common/CoachPanel";
import RoomIcon3D from "../components/rooms/RoomIcon3D";
import { useToast } from "../hooks/useToast";
import { countWords } from "../lib/wordCount";
import api from "../services/api";

const NICHES = ["technology", "society", "literature", "science", "politics", "business", "sports", "health", "entertainment", "arts"];

export default function SoloWrite() {
  const [niche, setNiche] = useState("literature");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { toasts, toast, remove } = useToast();
  const navigate = useNavigate();
  const textRef = useRef("");
  textRef.current = text;

  const words = countWords(text);

  const submit = async () => {
    if (words < 5) { toast("Write a little more first.", "error"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/solo/submit", { content: text, niche, topic_title: "Solo practice", is_public: false });
      navigate("/results/" + data.submission_id, { state: { submissionId: data.submission_id } });
    } catch (e) {
      toast(e.response?.data?.detail || "Could not submit.", "error"); setBusy(false);
    }
  };

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <PageMotion className="page" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <RoomIcon3D niche={niche} active size={56} />
          <div>
            <div className="eyebrow">practice · not competitive</div>
            <h1 style={{ fontSize: 26, fontWeight: 600 }}>Solo writing</h1>
          </div>
        </div>
        <p style={{ color: "var(--ink2)", fontSize: 14, marginBottom: 18 }}>
          Write at your own pace and get it scored. Works offline, and it still earns XP, streaks and badges.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {NICHES.map((n) => (
            <button key={n} onClick={() => setNiche(n)}
              className={"badge " + (niche === n ? "badge-gold" : "")}
              style={{ cursor: "pointer", textTransform: "capitalize", border: "1px solid var(--border)",
                background: niche === n ? undefined : "transparent", color: niche === n ? undefined : "var(--ink2)" }}>
              {n}
            </button>
          ))}
        </div>

        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Start writing…" style={{ minHeight: 320, fontSize: 15, lineHeight: 1.8, fontFamily: "var(--serif)", marginBottom: 12 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 13, color: "var(--ink2)" }}>{words} words</span>
          <button className="btn btn-primary" onClick={submit} disabled={busy || words < 5}>{busy ? "Scoring…" : "Score my writing"}</button>
        </div>

        <CoachPanel getText={() => textRef.current} />
      </PageMotion>
    </AppLayout>
  );
}
