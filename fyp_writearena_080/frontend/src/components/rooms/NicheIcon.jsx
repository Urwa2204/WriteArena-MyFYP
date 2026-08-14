import React from "react";

/* ============================================================
   NicheIcon — crisp, dimensional niche emblems in the site's
   own palette (no more muted/camouflaged look). Each sits on a
   soft tinted tile so it pops on cream or dark backgrounds, and
   gently floats when its room is live. Scales to any size and
   works anywhere (rooms, landing, arena) with no WebGL cost.

   Props: niche, size (px, default 64), active (adds float + glow)
   ============================================================ */

// niche -> palette hue tokens (tile = -s soft, body = -d saturated)
const HUE = {
  technology:    { tile: "--sky-s",   main: "--sky-d",   soft: "--sky",   accent: "--butter-d" },
  literature:    { tile: "--lav-s",   main: "--lav-d",   soft: "--lav",   accent: "--butter-d" },
  science:       { tile: "--mint-s",  main: "--mint-d",  soft: "--mint",  accent: "--butter-d" },
  society:       { tile: "--peach-s", main: "--peach-d", soft: "--peach", accent: "--mint-d" },
  politics:      { tile: "--butter-s",main: "--butter-d",soft: "--butter",accent: "--ink2" },
  business:      { tile: "--sky-s",   main: "--sky-d",   soft: "--sky",   accent: "--mint-d" },
  sports:        { tile: "--butter-s",main: "--butter-d",soft: "--butter",accent: "--peach-d" },
  health:        { tile: "--blush-s", main: "--blush-d", soft: "--blush", accent: "--butter-d" },
  entertainment: { tile: "--lav-s",   main: "--lav-d",   soft: "--lav",   accent: "--butter-d" },
  arts:          { tile: "--peach-s", main: "--peach-d", soft: "--peach", accent: "--lav-d" },
};

const V = (t) => `var(${t})`;

function Shape({ niche, c }) {
  const main = V(c.main), soft = V(c.soft), acc = V(c.accent), ink = "var(--ink)";
  switch (niche) {
    case "technology": // isometric cube + node
      return (
        <g>
          <polygon points="50,26 71,38 50,50 29,38" fill={soft} />
          <polygon points="29,38 50,50 50,74 29,62" fill={main} />
          <polygon points="71,38 50,50 50,74 71,62" fill={acc} opacity="0.9" />
          <circle cx="50" cy="50" r="4.2" fill={V("--butter-d")} stroke="#fff" strokeWidth="1.2" />
          <g stroke={main} strokeWidth="2" strokeLinecap="round">
            <line x1="29" y1="38" x2="20" y2="33" /><line x1="71" y1="38" x2="80" y2="33" />
            <line x1="50" y1="26" x2="50" y2="18" />
          </g>
          <g fill={acc}><circle cx="20" cy="33" r="2"/><circle cx="80" cy="33" r="2"/><circle cx="50" cy="18" r="2"/></g>
        </g>
      );
    case "literature": // open book + bookmark
      return (
        <g>
          <polygon points="50,34 24,30 24,68 50,72" fill={main} />
          <polygon points="50,34 76,30 76,68 50,72" fill={soft} />
          <line x1="50" y1="34" x2="50" y2="72" stroke="#fff" strokeWidth="2" opacity="0.8" />
          <g stroke="#fff" strokeWidth="1.5" opacity="0.55">
            <line x1="30" y1="40" x2="45" y2="42.5"/><line x1="30" y1="48" x2="45" y2="50.5"/><line x1="30" y1="56" x2="45" y2="58.5"/>
            <line x1="55" y1="42.5" x2="70" y2="40"/><line x1="55" y1="50.5" x2="70" y2="48"/><line x1="55" y1="58.5" x2="70" y2="56"/>
          </g>
          <path d="M62,30 l8,-1 v16 l-4,-3 l-4,3 z" fill={acc} />
        </g>
      );
    case "science": // erlenmeyer flask
      return (
        <g>
          <rect x="45" y="24" width="10" height="14" rx="2" fill={soft} />
          <rect x="43" y="20" width="14" height="6" rx="2" fill={ink} />
          <path d="M38.5,52 h23 l6,16 a4,4 0 0 1 -3.6,5.6 h-27.8 A4,4 0 0 1 32.5,68 z" fill={main} />
          <path d="M44,38 h12 l4.5,12 h-21 z" fill={soft} opacity="0.6" />
          <circle cx="46" cy="62" r="2.4" fill="#fff" opacity="0.8" /><circle cx="55" cy="67" r="1.8" fill="#fff" opacity="0.7" />
          <circle cx="50" cy="58" r="1.6" fill={V("--butter-d")} />
        </g>
      );
    case "society": // three people
      return (
        <g>
          <g fill={soft} opacity="0.85">
            <circle cx="30" cy="42" r="7" /><rect x="21" y="52" width="18" height="16" rx="7" />
            <circle cx="70" cy="42" r="7" /><rect x="61" y="52" width="18" height="16" rx="7" />
          </g>
          <circle cx="50" cy="36" r="9" fill={main} />
          <path d="M36,72 v-8 a14,14 0 0 1 28,0 v8 z" fill={main} />
          <polygon points="50,47 46,54 50,66 54,54" fill={acc} />
        </g>
      );
    case "politics": // balance scale
      return (
        <g stroke={main} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <line x1="50" y1="26" x2="50" y2="66" />
          <line x1="28" y1="34" x2="72" y2="34" />
          <line x1="28" y1="34" x2="22" y2="48" /><line x1="28" y1="34" x2="34" y2="48" />
          <line x1="72" y1="34" x2="66" y2="48" /><line x1="72" y1="34" x2="78" y2="48" />
          <line x1="40" y1="70" x2="60" y2="70" />
          <path d="M22,48 a6,4 0 0 0 12,0 z" fill={soft} stroke="none" />
          <path d="M66,48 a6,4 0 0 0 12,0 z" fill={soft} stroke="none" />
          <circle cx="50" cy="24" r="4" fill={acc} stroke="none" />
        </g>
      );
    case "business": // bar chart + up trend
      return (
        <g>
          <rect x="26" y="72" width="48" height="3" rx="1.5" fill={main} opacity="0.5" />
          <rect x="29" y="56" width="10" height="16" rx="2" fill={soft} />
          <rect x="45" y="46" width="10" height="26" rx="2" fill={main} />
          <rect x="61" y="34" width="10" height="38" rx="2" fill={acc} />
          <polyline points="30,54 50,44 66,32" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points="66,32 60,32 66,26 72,32 66,32 66,38" fill={ink} />
          <g fill="#fff" stroke={ink} strokeWidth="1.4"><circle cx="30" cy="54" r="2.4"/><circle cx="50" cy="44" r="2.4"/></g>
        </g>
      );
    case "sports": // trophy
      return (
        <g>
          <path d="M34,28 h32 v10 c0,13 -8,20 -16,20 c-8,0 -16,-7 -16,-20 z" fill={main} />
          <path d="M34,32 c-8,0 -10,10 -3,14" fill="none" stroke={main} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M66,32 c8,0 10,10 3,14" fill="none" stroke={main} strokeWidth="3.4" strokeLinecap="round" />
          <rect x="46" y="58" width="8" height="9" fill={acc} />
          <path d="M38,67 h24 l3,7 h-30 z" fill={acc} />
          <path d="M50,34 l2.4,4.9 5.4,0.8 -3.9,3.8 0.9,5.4 -4.8,-2.5 -4.8,2.5 0.9,-5.4 -3.9,-3.8 5.4,-0.8 z" fill="#fff" />
        </g>
      );
    case "health": // heart + pulse
      return (
        <g>
          <path d="M50,66 L34,50 a10,10 0 0 1 14,-14 l2,2 l2,-2 a10,10 0 0 1 14,14 z" fill={main} />
          <polyline points="30,54 42,54 47,44 53,64 58,54 70,54" fill="none" stroke={acc} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "entertainment": // film reel
      return (
        <g>
          <circle cx="46" cy="52" r="22" fill={main} />
          <circle cx="46" cy="52" r="6" fill={V("--butter-d")} stroke="#fff" strokeWidth="1.4" />
          <g fill={V("--cream")}>
            <circle cx="46" cy="38" r="4" /><circle cx="46" cy="66" r="4" />
            <circle cx="33" cy="52" r="4" /><circle cx="59" cy="52" r="4" />
            <circle cx="37" cy="42" r="3.2" /><circle cx="55" cy="42" r="3.2" />
          </g>
          <rect x="60" y="30" width="18" height="9" rx="2" fill={soft} transform="rotate(20 69 34)" />
          <g fill={ink} opacity="0.6" transform="rotate(20 69 34)"><rect x="62" y="31.5" width="2" height="2"/><rect x="66" y="31.5" width="2" height="2"/><rect x="70" y="31.5" width="2" height="2"/></g>
        </g>
      );
    case "arts": // palette + brush
      return (
        <g>
          <path d="M30,42 a24,20 0 1 0 24,30 c-6,0 -6,-8 0,-9 c8,-1 14,-6 14,-15 c0,-11 -13,-18 -24,-18 c-6,0 -10,4 -14,12 z" fill={soft} opacity="0.5" stroke={main} strokeWidth="2" />
          <circle cx="34" cy="52" r="3.4" fill={V("--blush-d")} />
          <circle cx="30" cy="62" r="3.4" fill={V("--sky-d")} />
          <circle cx="40" cy="68" r="3.4" fill={V("--mint-d")} />
          <circle cx="47" cy="50" r="3.4" fill={V("--butter-d")} />
          <circle cx="42" cy="42" r="3.4" fill={acc} />
          <g transform="rotate(38 64 34)">
            <rect x="62" y="18" width="4" height="20" rx="2" fill={ink} />
            <path d="M62,38 h4 l-1,7 h-2 z" fill={V("--peach-d")} />
          </g>
        </g>
      );
    default:
      return <circle cx="50" cy="50" r="20" fill={main} />;
  }
}

export default function NicheIcon({ niche = "literature", size = 64, active = false }) {
  const c = HUE[niche] || HUE.literature;
  return (
    <div
      className={"niche-ico" + (active ? " animate" : "")}
      style={{ width: size, height: size, flexShrink: 0, filter: active ? "drop-shadow(0 4px 10px rgba(0,0,0,.10))" : "drop-shadow(0 2px 5px rgba(0,0,0,.06))" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <rect x="6" y="6" width="88" height="88" rx="22" fill={V(c.tile)} />
        <rect x="6" y="6" width="88" height="88" rx="22" fill="none" stroke={V(c.main)} strokeOpacity="0.18" strokeWidth="1.5" />
        <Shape niche={niche} c={c} />
      </svg>
    </div>
  );
}
