/* ============================================================
   WriteArena — Typewriter sound engine
   Pure Web Audio API synthesis (no audio files). Always on.
   Ported from writearena_landing_with_sound_motion.html.

   Browsers block audio until the first user gesture, so the
   AudioContext is created lazily and resumed on first key/space.
   There is intentionally no mute toggle — sound is always on,
   except that it stays silent for users who request reduced
   motion (an accessibility courtesy, not a user-facing switch).
   ============================================================ */

let audioCtx = null;
let lastKeyIndex = -1;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ctx() {
  if (prefersReducedMotion()) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

/** Call once inside a user-gesture handler (pointerdown / keydown). */
export function primeAudio() {
  ctx();
}

/**
 * Play a single typewriter sound.
 * @param {"key"|"space"|"carriage"} type
 */
export function playClick(type = "key") {
  const ac = ctx();
  if (!ac) return;
  try {
    const now = ac.currentTime;

    if (type === "carriage") {
      const osc2 = ac.createOscillator();
      const g2 = ac.createGain();
      osc2.connect(g2); g2.connect(ac.destination);
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(300, now);
      osc2.frequency.linearRampToValueAtTime(120, now + 0.25);
      g2.gain.setValueAtTime(0.05, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.start(now); osc2.stop(now + 0.28);

      const bell = ac.createOscillator();
      const bg = ac.createGain();
      bell.connect(bg); bg.connect(ac.destination);
      bell.type = "sine";
      bell.frequency.setValueAtTime(880, now + 0.05);
      bg.gain.setValueAtTime(0.0, now);
      bg.gain.setValueAtTime(0.06, now + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      bell.start(now + 0.05); bell.stop(now + 0.55);
      return;
    }

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    osc.connect(filter); filter.connect(gain); gain.connect(ac.destination);

    if (type === "space") {
      osc.type = "square";
      filter.frequency.value = 800; filter.Q.value = 0.5;
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.start(now); osc.stop(now + 0.13);
      return;
    }

    // key
    filter.frequency.value = 2400 + Math.random() * 600;
    filter.Q.value = 0.8;
    osc.type = "square";
    osc.frequency.setValueAtTime(180 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.start(now); osc.stop(now + 0.09);

    // little metallic "snap"
    const noise = ac.createOscillator();
    const ng = ac.createGain();
    const nf = ac.createBiquadFilter();
    nf.type = "highpass"; nf.frequency.value = 3000;
    noise.type = "sawtooth";
    noise.frequency.value = 120 + Math.random() * 40;
    noise.connect(nf); nf.connect(ng); ng.connect(ac.destination);
    ng.gain.setValueAtTime(0.015, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.start(now); noise.stop(now + 0.05);
  } catch {
    /* ignore audio glitches */
  }
}

/** Choose the right sound for a typed character. */
export function playForChar(char) {
  if (char === " ") playClick("space");
  else if (char === "\n") playClick("carriage");
  else playClick("key");
}

/** Pick a non-repeating key index (for animating the physical keys). */
export function nextKeyIndex(count = 10) {
  let i;
  do { i = Math.floor(Math.random() * count); } while (i === lastKeyIndex && count > 1);
  lastKeyIndex = i;
  return i;
}
