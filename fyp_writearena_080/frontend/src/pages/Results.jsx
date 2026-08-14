import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import { PageMotion } from "../components/common/Motion";
import ScoreGauge from "../components/charts/ScoreGauge";
import ShareModal from "../components/common/ShareModal";
import api from "../services/api";

/* Weights used by the backend scorer (app/nlp/scorer.py).
   final = ((1-plag)*0.40 + (1-ai)*0.30 + quality*0.30) * 100 */
const W = { originality: 0.40, authenticity: 0.30, quality: 0.30 };

function TypewriterFeedback({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => { if (!text) return; setDisplayed(""); setI(0); }, [text]);
  useEffect(() => {
    if (!text || i >= text.length) return;
    const speed = Math.random() > 0.92 ? 60 + Math.random() * 100 : 18 + Math.random() * 14;
    const t = setTimeout(() => { setDisplayed(text.slice(0, i + 1)); setI((x) => x + 1); }, speed);
    return () => clearTimeout(t);
  }, [text, i]);
  return (
    <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)", minHeight: 70 }}>
      {displayed}{i < (text?.length || 0) && <span className="typewriter-cursor" />}
    </p>
  );
}

/* One of the three independent readings. `raw` is 0..1 as returned by the API. */
function ReadingCard({ label, raw, color, verdict, blurb, betterWhen }) {
  const pct = raw != null ? raw * 100 : 0;
  return (
    <div className="wa-card" style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600 }}>{label}</div>
      </div>
      <ScoreGauge value={pct} grade="" size={132} color={color} />
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: -6 }}>{raw == null ? "—" : verdict}</div>
      <div style={{ fontSize: 11, color: "var(--ink3)", fontStyle: "italic" }}>{betterWhen}</div>
      <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.55, marginTop: 4 }}>{blurb}</p>
    </div>
  );
}

/* Shows how the three readings are weighted and summed into the final score. */
function CompositeBreakdown({ plag, ai, quality, finalScore, grade }) {
  const rows = [
    { name: "Originality", expr: "1 − plagiarism", raw01: plag != null ? 1 - plag : null, weight: W.originality, color: "var(--mint-d)" },
    { name: "Authenticity", expr: "1 − AI-likelihood", raw01: ai != null ? 1 - ai : null, weight: W.authenticity, color: "var(--sky-d)" },
    { name: "Quality", expr: "quality index", raw01: quality != null ? quality : null, weight: W.quality, color: "var(--lav-d)" },
  ];
  const sum = rows.reduce((a, r) => a + (r.raw01 != null ? r.raw01 * r.weight * 100 : 0), 0);
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => {
          const contrib = r.raw01 != null ? r.raw01 * r.weight * 100 : 0;
          const barMax = r.weight * 100; // this component can contribute at most weight*100
          const fill = barMax ? (contrib / barMax) * 100 : 0;
          return (
            <div key={r.name} style={{ display: "grid", gridTemplateColumns: "128px 1fr 54px", alignItems: "center", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>{r.expr} × {Math.round(r.weight * 100)}%</div>
              </div>
              <div style={{ height: 12, borderRadius: 8, background: "var(--lav-s)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: fill + "%", background: r.color, borderRadius: 8, transition: "width .9s ease" }} />
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 700, color: r.color, textAlign: "right" }}>
                {r.raw01 == null ? "—" : "+" + contrib.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: "1px dashed var(--border)", marginTop: 14, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, color: "var(--ink2)" }}>Final score</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
          {finalScore != null ? finalScore.toFixed(2) : sum.toFixed(1)}
          {grade && <span style={{ fontSize: 14, color: "var(--ink2)", marginLeft: 8 }}>grade {grade}</span>}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "var(--cream2)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink3)", marginBottom: 4 }}>Formula</div>
        <code style={{ fontSize: 11.5, color: "var(--ink)", lineHeight: 1.55, fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>
          final = ((1 − plag) × 0.40 + (1 − ai) × 0.30 + quality × 0.30) × 100
        </code>
      </div>
    </div>
  );
}

export default function Results() {
  const { submissionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();
  const [data, setData] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const id = submissionId || state?.submissionId;
    if (!id) return;
    const load = () => api.get("/feed/submission/" + id).then((r) => setData(r.data)).catch(() => {});
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [submissionId]);

  const result = data || {};
  const scored = result.final_score != null;

  if (data && result.is_dnf) {
    return (
      <AppLayout toasts={toasts} removeToast={remove}>
        <PageMotion className="page" style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
          <div className="wa-card" style={{ padding: 40 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>⏱</div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Time ran out</h1>
            <p style={{ color: "var(--ink2)", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
              There wasn't enough written when the clock hit zero, so this entry wasn't scored — no plagiarism, AI,
              or quality reading, and no XP or streak credit for it. Jump into another room whenever you're ready.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/rooms")}>Find another room</button>
          </div>
        </PageMotion>
      </AppLayout>
    );
  }

  const plag = result.plagiarism_score;      // 0..1  (higher = more overlap)
  const ai = result.ai_score;                // 0..1  (higher = more AI-like)
  const quality = result.quality_score;      // 0..1  (higher = better)
  const relevance = result.relevance_score;  // 0..1  (higher = more on-topic; null for free writing)
  const manuscript = result.content || result.excerpt || result.text || "";

  const plagVerdict = plag == null ? "—" : plag < 0.3 ? "Low overlap" : plag < 0.6 ? "Moderate overlap" : "High overlap";
  const aiVerdict = ai == null ? "—" : ai < 0.3 ? "Human voice" : ai < 0.6 ? "Mixed signals" : "AI likely";
  const qualVerdict = quality == null ? "—" : quality >= 0.7 ? "Strong craft" : quality >= 0.45 ? "Developing" : "Rough draft";

  return (
    <AppLayout toasts={toasts} removeToast={remove}>
      <style>{`
        @keyframes wash { 0%{ transform: translateX(-120%);} 100%{ transform: translateX(120%);} }
        .manu { position: relative; overflow: hidden; }
        .manu .body { color: var(--ink); transition: color 1.1s ease; line-height: 1.85; font-family: var(--serif); font-size: 16px; }
        .manu.gold .body { color: var(--ink); }
        .manu .dropcap { float: left; font-family: var(--serif); font-size: 54px; line-height: 44px; padding: 4px 10px 0 0; color: var(--ink3); transition: color 1.1s ease; }
        .manu.gold .dropcap { color: var(--lav-d); }
        .manu .wash { position: absolute; top: 0; bottom: 0; width: 40%; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); }
        .manu.gold .wash { animation: wash 1.6s ease 0.2s 1; }
      `}</style>

      <PageMotion className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div className="eyebrow">illumination</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>Your manuscript, read by the machine</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {scored && <button className="btn btn-ghost" onClick={() => setShareOpen(true)}>↗ Share</button>}
            <button className="btn btn-ghost" onClick={() => navigate("/rooms")}>Back to rooms</button>
          </div>
        </div>

        {!scored && (
          <div className="loader"><div className="spinner" /><span style={{ marginLeft: 12, color: "var(--ink2)" }}>The machine is reading your words…</span></div>
        )}

        {/* Manuscript + composite score */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 22, alignItems: "start" }}>
          <div className={"wa-card manu" + (scored ? " gold" : "")} style={{ padding: "28px 30px", minHeight: 300 }}>
            <div className="wash" />
            {manuscript ? (
              <p className="body">
                <span className="dropcap">{manuscript.charAt(0)}</span>
                {manuscript.slice(1)}
              </p>
            ) : (
              <p className="body" style={{ color: "var(--ink3)", fontStyle: "italic" }}>Your submitted writing will appear here as it is illuminated.</p>
            )}
          </div>

          <div className="wa-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 12 }}>
              <div className="eyebrow" style={{ alignSelf: "flex-start" }}>combined result</div>
              <motion.div
                initial={{ scale: 0.2, opacity: 0 }}
                animate={scored ? { scale: 1, opacity: 1 } : {}}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                style={{
                  width: 84, height: 84, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "radial-gradient(circle at 35% 30%, #fbe6c2, var(--butter), var(--peach))",
                  boxShadow: "inset 0 3px 8px rgba(140,90,40,.25), 0 10px 24px rgba(240,190,120,.4)",
                  fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, color: "#8a5a2b",
                }}
              >
                {result.grade || "—"}
              </motion.div>
              <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{result.word_count || 0} words</div>
            </div>
            <CompositeBreakdown plag={plag} ai={ai} quality={quality} finalScore={result.final_score} grade={result.grade} />
          </div>
        </div>

        {/* Three independent readings */}
        <div style={{ marginTop: 26, marginBottom: 12 }}>
          <div className="eyebrow">the three readings</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>Each signal, measured on its own</h2>
        </div>
        <div className="grid-3">
          <ReadingCard
            label="Plagiarism" raw={plag} color="var(--blush)" verdict={plagVerdict}
            betterWhen="lower is better" 
            blurb="TF-IDF vector similarity against recent submissions. Under 30% reads as original work."
          />
          <ReadingCard
            label="AI detection" raw={ai} color="var(--lav)" verdict={aiVerdict}
            betterWhen="lower is better"
            blurb="A fine-tuned transformer estimates how likely the text was machine-generated rather than written by hand."
          />
          <ReadingCard
            label="Quality" raw={quality} color="var(--mint)" verdict={qualVerdict}
            betterWhen="higher is better"
            blurb="Readability, vocabulary richness, sentence variety and structure (spaCy + readability metrics)."
          />
          {relevance != null && (
            <ReadingCard
              label="Topic relevance" raw={relevance} color="var(--butter-d)"
              verdict={relevance >= 0.55 ? "On topic" : relevance >= 0.25 ? "Partly on topic" : "Off topic"}
              betterWhen="higher is better"
              blurb="How closely your writing addresses the given prompt — keyword coverage plus thematic similarity."
            />
          )}
        </div>

        {/* Flagged similarity — only ever shown to the author, never named publicly */}
        {result.flagged_similar_to && result.flagged_similar_to.length > 0 && (
          <div className="wa-card" style={{ padding: 20, marginTop: 16, borderLeft: "3px solid var(--blush)" }}>
            <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              Matched language in {result.flagged_similar_to.length} other submission{result.flagged_similar_to.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 12 }}>
              This is what pushed your plagiarism reading up — not an accusation, just what the similarity check found.
            </div>
            {result.flagged_similar_to.map((f) => (
              <div key={f.submission_id} style={{ fontSize: 13, color: "var(--ink2)", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{f.topic_title || f.niche}</span> — "{f.excerpt}"
              </div>
            ))}
          </div>
        )}

        {/* Machine's note */}
        <div className="wa-card" style={{ padding: 24, marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>The machine's note</h3>
            <button className="btn btn-ghost" style={{ padding: "7px 16px", fontSize: 13 }} onClick={() => setShowFeedback(true)} disabled={showFeedback}>
              {showFeedback ? "Revealed" : "Reveal feedback"}
            </button>
          </div>
          {showFeedback && result.ai_feedback
            ? <TypewriterFeedback text={result.ai_feedback} />
            : <p style={{ fontSize: 13, color: "var(--ink2)" }}>Reveal a personalised note on originality, voice, and craft.</p>}
        </div>
      </PageMotion>
      <ShareModal open={shareOpen} submissionId={submissionId || state?.submissionId} onClose={() => setShareOpen(false)} onToast={toast} />
    </AppLayout>
  );
}
