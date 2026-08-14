import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { playForChar, primeAudio, nextKeyIndex } from "../lib/sound";

const Typewriter3D = lazy(() => import("../components/landing/Typewriter3D"));
import { scrollReveal, staggerContainer, staggerItem } from "../components/common/Motion";
import Logo from "../components/common/Logo";
import RoomIcon3D from "../components/rooms/RoomIcon3D";

/* Ten arenas, ten inks — niche → conic ink colour pair */
const POTS = [
  { name: "Technology", c1: "#a9cbf0", c2: "#6f9fd6", active: true,  members: 7 },
  { name: "Literature", c1: "#c4b5fd", c2: "#9a82e6", active: true,  members: 5 },
  { name: "Science",    c1: "#8fd6bd", c2: "#5fb89a", active: false, members: 2 },
  { name: "Society",    c1: "#f3a8bc", c2: "#e07d99", active: true,  members: 9 },
  { name: "Politics",   c1: "#f4bd9c", c2: "#e0926a", active: false, members: 1 },
  { name: "Business",   c1: "#9fd9d2", c2: "#69b3ab", active: true,  members: 4 },
  { name: "Sports",     c1: "#f1d488", c2: "#dab44e", active: false, members: 3 },
  { name: "Health",     c1: "#a7e6c8", c2: "#6fc7a0", active: true,  members: 6 },
  { name: "Entertainment", c1: "#f4a8d4", c2: "#dd78b0", active: false, members: 2 },
  { name: "Arts",       c1: "#d9c2a0", c2: "#b89b6f", active: true,  members: 8 },
];

const LEDGER = [
  { rank: "I",   name: "inkwell_ada",   xp: 14820 },
  { rank: "II",  name: "marginalia",    xp: 13160 },
  { rank: "III", name: "quietquill",    xp: 12740 },
  { rank: "IV",  name: "serif_smith",   xp: 11890 },
  { rank: "V",   name: "the_archivist", xp: 10550 },
];

function Pot({ pot, i }) {
  const tilt = useCallback((e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(4px)`;
  }, []);
  const reset = useCallback((e) => { e.currentTarget.style.transform = ""; }, []);

  return (
    <motion.div
      variants={staggerItem}
      onMouseMove={tilt}
      onMouseLeave={reset}
      className="wa-card"
      style={{ padding: "20px 16px", textAlign: "center", transition: "transform .15s ease", cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <RoomIcon3D niche={pot.name.toLowerCase()} active={pot.active} size={76} />
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600 }}>{pot.name}</div>
      <div style={{ fontSize: 11, color: pot.active ? "var(--lav-d)" : "var(--ink3)", marginTop: 4, fontStyle: "italic", fontFamily: "var(--serif)" }}>
        {pot.active ? "live now" : "idle"}
      </div>
      <div style={{ fontSize: 11, color: "var(--ink2)", marginTop: 2 }}>{pot.members} writing</div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [pressedKey, setPressedKey] = useState(null);

  // Capture the visitor's real keystrokes → paper + sound + key animation
  useEffect(() => {
    const onKey = (e) => {
      // don't hijack typing in real inputs or modifier combos
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        setTyped((t) => t.slice(0, -1));
        primeAudio(); playForChar("key");
      } else if (e.key === "Enter") {
        e.preventDefault();
        setTyped((t) => (t.length < 220 ? t + "\n" : t));
        playForChar("\n");
      } else if (e.key.length === 1) {
        setTyped((t) => (t.length < 220 ? t + e.key : t));
        primeAudio(); playForChar(e.key);
      } else {
        return;
      }
      const ki = nextKeyIndex(25);
      setPressedKey(ki);
      window.clearTimeout(onKey._t);
      onKey._t = window.setTimeout(() => setPressedKey(null), 90);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }} onPointerDown={primeAudio}>
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px", background: "rgba(251,246,240,0.6)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo size={36} />
          <span style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600 }}>WriteArena</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate("/login")}>Sign in</button>
          <button className="btn btn-primary" onClick={() => navigate("/register")}>Enter the arena</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 20, alignItems: "center",
        maxWidth: 1180, margin: "0 auto", padding: "40px 40px 20px", minHeight: "78vh" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="eyebrow" style={{ fontSize: 13 }}>a competitive writing platform</div>
          <h1 style={{ fontSize: "clamp(28px, 4.6vw, 48px)", fontWeight: 600, lineHeight: 1.1, margin: "14px 0 18px" }}>
            Write against the clock.<br />Be read by the machine.
          </h1>
          <p style={{ fontSize: 17, color: "var(--ink2)", maxWidth: 460, lineHeight: 1.7, marginBottom: 28 }}>
            Real-time rooms · plagiarism, AI &amp; quality scoring · ranks, streaks &amp; badges.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button className="btn btn-primary" style={{ fontSize: 15, padding: "13px 28px" }} onClick={() => navigate("/register")}>Enter the arena</button>
            <button className="btn btn-ghost" style={{ fontSize: 15, padding: "13px 28px" }} onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>See how scoring works</button>
          </div>
          <div style={{ marginTop: 20, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink3)" }}>
            drag the typewriter to spin it · start typing — it prints your words
          </div>
        </motion.div>

        <div style={{ height: "min(64vh, 520px)", minHeight: 360 }}>
          <Suspense fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="wa-card" style={{ width: 280, minHeight: 180, padding: 22, fontFamily: "var(--serif)", color: "var(--ink2)" }}>
                warming up the typewriter…<span className="typewriter-cursor" />
              </div>
            </div>
          }>
            <Typewriter3D text={typed} pressedKey={pressedKey} />
          </Suspense>
        </div>
      </section>

      {/* Niche icons */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "60px 40px" }}>
        <motion.div {...scrollReveal} style={{ marginBottom: 28 }}>
          <div className="eyebrow">Ten arenas, ten worlds</div>
          <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 600, marginTop: 6 }}>Pick your arena.</h2>
        </motion.div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {POTS.map((p, i) => <Pot key={p.name} pot={p} i={i} />)}
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 40px 70px" }}>
        <motion.div {...scrollReveal} style={{ marginBottom: 28 }}>
          <div className="eyebrow">The ritual</div>
          <h2 style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 600, marginTop: 6 }}>How it works</h2>
        </motion.div>
        <div className="grid-3">
          {[
            { n: "01", t: "Choose a room. Pick your niche. Each has its own ink colour." },
            { n: "02", t: "Write under pressure. Five minutes. One topic. Your words only." },
            { n: "03", t: "The machine reads you. Scored on originality, voice, and quality. Instantly." },
          ].map((s) => (
            <motion.div key={s.n} {...scrollReveal} className="wa-card" style={{ padding: 28 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 300, color: "var(--lav)", lineHeight: 1 }}>{s.n}</div>
              <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, marginTop: 14 }}>{s.t}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "20px 40px 70px" }}>
        <motion.div {...scrollReveal} style={{ marginBottom: 20 }}>
          <div className="eyebrow">The grand ledger</div>
          <h2 style={{ fontSize: "clamp(24px,2.6vw,32px)", fontWeight: 600, marginTop: 6 }}>Top scribes this season</h2>
        </motion.div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
          className="wa-card" style={{ padding: "10px 8px" }}>
          {LEDGER.map((row, i) => (
            <motion.div key={row.name} variants={staggerItem} className="lrow">
              <span className={"lb-rank" + (i < 3 ? " lb-rank-" + (i + 1) : "")}>{row.rank}</span>
              <span style={{ flex: 1, fontFamily: "var(--serif)", fontSize: 15, color: i < 3 ? ["var(--lav-d)", "var(--sky-d)", "var(--peach-d)"][i] : "var(--ink)" }}>{row.name}</span>
              <span style={{ fontFamily: "var(--serif)", color: "var(--ink2)" }}>{row.xp.toLocaleString()} XP</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "40px", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink2)", fontSize: 15 }}>
          Typed in pastel, read by machine, remembered in colour. — WriteArena
        </p>
      </footer>
    </div>
  );
}
