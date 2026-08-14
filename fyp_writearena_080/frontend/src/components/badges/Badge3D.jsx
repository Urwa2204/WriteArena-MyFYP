import React, { useRef, useState, useMemo, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

/* ============================================================
   Badge3D — a floating 3D medallion for each badge.
   The disc is tinted by rarity; a small 3D emblem (pen, book,
   star, trophy, crown, flame, people, cap) sits on the face.
   Rotates gently, speeds up + swells on hover. Unearned badges
   render in muted stone tones.
   ============================================================ */

const RARITY = {
  common:    ["#7FA8D0", "#A9CBF0"],
  rare:      ["#9A82E6", "#C4B5FD"],
  epic:      ["#E07D99", "#F3A8BC"],
  legendary: ["#D4AF37", "#F1D488"],
};
const GOLD = "#C7A231", GOLD_L = "#E0C868", CREAM = "#EAE5D6", DGREEN = "#46543D", STONE = "#9A968C", STONE_L = "#BDB9AE";

const matte = { roughness: 0.5, metalness: 0.2 };
const shiny = { roughness: 0.3, metalness: 0.6 };

function Cyl({ rt, rb, h, seg = 28, color, mat = matte, ...p }) {
  return <mesh {...p}><cylinderGeometry args={[rt, rb, h, seg]} /><meshStandardMaterial color={color} {...mat} /></mesh>;
}
function Box({ w, h, d, color, mat = matte, ...p }) {
  return <mesh {...p}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={color} {...mat} /></mesh>;
}
function Ball({ r, color, mat = matte, ...p }) {
  return <mesh {...p}><sphereGeometry args={[r, 20, 20]} /><meshStandardMaterial color={color} {...mat} /></mesh>;
}
function Cone({ r, h, seg = 20, color, mat = matte, ...p }) {
  return <mesh {...p}><coneGeometry args={[r, h, seg]} /><meshStandardMaterial color={color} {...mat} /></mesh>;
}

function starShape(outer = 0.42, inner = 0.17, pts = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
function Star({ color, mat = shiny, ...p }) {
  const geo = useMemo(() => new THREE.ExtrudeGeometry(starShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), []);
  return <mesh geometry={geo} {...p}><meshStandardMaterial color={color} {...mat} /></mesh>;
}

// emblem per icon type (gold on the medallion face) --------------
function Emblem({ icon, gold, dark }) {
  switch (icon) {
    case "pen":
      return (
        <group rotation={[0, 0, -0.7]}>
          <Cyl rt={0.05} rb={0.05} h={0.62} color={dark} />
          <Cone r={0.09} h={0.22} color={gold} mat={shiny} position={[0, -0.42, 0]} />
          <Cyl rt={0.06} rb={0.06} h={0.08} color={gold} mat={shiny} position={[0, 0.34, 0]} />
        </group>
      );
    case "book":
      return (
        <group>
          <group rotation={[0, 0.4, 0]} position={[-0.22, 0, 0]}><Box w={0.5} h={0.6} d={0.05} color={CREAM} /></group>
          <group rotation={[0, -0.4, 0]} position={[0.22, 0, 0]}><Box w={0.5} h={0.6} d={0.05} color={CREAM} /></group>
          <Box w={0.07} h={0.64} d={0.09} color={gold} mat={shiny} />
        </group>
      );
    case "star":       return <Star color={gold} />;
    case "trophy":
    case "crown_cup":
      return (
        <group>
          <Cyl rt={0.3} rb={0.18} h={0.38} color={gold} mat={shiny} position={[0, 0.12, 0]} />
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.32, 0.14, 0]} rotation={[0, 0, s * 1.1]}><torusGeometry args={[0.13, 0.03, 8, 16, Math.PI]} /><meshStandardMaterial color={gold} {...shiny} /></mesh>)}
          <Cyl rt={0.07} rb={0.07} h={0.14} color={gold} mat={shiny} position={[0, -0.15, 0]} />
          <Cyl rt={0.2} rb={0.24} h={0.08} color={dark} position={[0, -0.26, 0]} />
        </group>
      );
    case "crown":
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}><torusGeometry args={[0.32, 0.06, 12, 28]} /><meshStandardMaterial color={gold} {...shiny} /></mesh>
          {[-0.26, 0, 0.26].map((x, i) => <Cone key={i} r={0.09} h={0.26 + (i === 1 ? 0.1 : 0)} color={gold} mat={shiny} position={[x, 0.12 + (i === 1 ? 0.05 : 0), 0]} />)}
          {[-0.26, 0, 0.26].map((x, i) => <Ball key={"b" + i} r={0.05} color={GOLD_L} mat={shiny} position={[x, 0.28 + (i === 1 ? 0.1 : 0), 0]} />)}
        </group>
      );
    case "fire":
    case "flame":
      return (
        <group>
          <Cone r={0.3} h={0.78} seg={16} color={gold} mat={shiny} />
          <Cone r={0.16} h={0.44} seg={16} color={GOLD_L} mat={shiny} position={[0, -0.1, 0.12]} />
        </group>
      );
    case "users":
      return (
        <group>
          {[-0.28, 0.28].map((x) => (
            <group key={x} position={[x, -0.02, -0.05]} scale={0.85}>
              <Ball r={0.17} color={dark} position={[0, 0.32, 0]} />
              <Cyl rt={0.1} rb={0.26} h={0.42} color={dark} position={[0, -0.02, 0]} />
            </group>
          ))}
          <group position={[0, 0.04, 0.12]}>
            <Ball r={0.19} color={gold} mat={shiny} position={[0, 0.34, 0]} />
            <Cyl rt={0.11} rb={0.28} h={0.46} color={gold} mat={shiny} position={[0, -0.02, 0]} />
          </group>
        </group>
      );
    case "academic":
      return (
        <group>
          <Box w={0.72} h={0.06} d={0.72} color={dark} rotation={[0, 0.4, 0]} position={[0, 0.16, 0]} />
          <Cyl rt={0.16} rb={0.2} h={0.22} color={dark} position={[0, 0.0, 0]} />
          <Cyl rt={0.03} rb={0.03} h={0.34} color={gold} mat={shiny} position={[0.24, 0.05, 0.18]} rotation={[0.3, 0.4, 0]} />
          <Ball r={0.06} color={GOLD_L} mat={shiny} position={[0.32, -0.12, 0.28]} />
        </group>
      );
    default:
      return <Star color={gold} />;
  }
}

function Medallion({ icon, rarity, earned }) {
  const g = useRef();
  const [hover, setHover] = useState(false);
  const t = useRef(0);
  const [c1, c2] = earned ? (RARITY[rarity] || RARITY.rare) : [STONE, STONE_L];
  const gold = earned ? GOLD : STONE_L;
  const dark = earned ? DGREEN : "#6E6A61";

  useFrame((_, dt) => {
    t.current += dt;
    const o = g.current; if (!o) return;
    o.rotation.y += dt * (hover ? 1.4 : 0.5);
    o.position.y = Math.sin(t.current * 1.3) * 0.06;
    const tgt = hover ? 1.12 : 1;
    o.scale.x += (tgt - o.scale.x) * Math.min(1, dt * 8);
    o.scale.y = o.scale.z = o.scale.x;
  });

  return (
    <group ref={g} rotation={[0.18, 0, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}>
      {/* disc */}
      <Cyl rt={1.02} rb={1.02} h={0.22} color={c1} mat={{ roughness: 0.45, metalness: 0.35 }} rotation={[Math.PI / 2, 0, 0]} />
      {/* rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}><torusGeometry args={[1.02, 0.09, 16, 40]} /><meshStandardMaterial color={c2} {...shiny} /></mesh>
      {/* inset face */}
      <Cyl rt={0.82} rb={0.82} h={0.24} color={c2} mat={{ roughness: 0.6, metalness: 0.15 }} rotation={[Math.PI / 2, 0, 0]} />
      {/* emblem, raised on the front face */}
      <group position={[0, 0, 0.2]} scale={0.82}>
        <Emblem icon={icon} gold={gold} dark={dark} />
      </group>
    </group>
  );
}

export default function Badge3D({ icon = "star", rarity = "rare", earned = true, size = 72 }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, opacity: earned ? 1 : 0.85 }} aria-hidden="true">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0.2, 3.6], fov: 40 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} />
        <directionalLight position={[-4, 1, 2]} intensity={0.4} color="#fff6df" />
        <pointLight position={[0, -3, 3]} intensity={0.3} color={GOLD_L} />
        <Suspense fallback={null}>
          <Medallion icon={icon} rarity={rarity} earned={earned} />
        </Suspense>
      </Canvas>
    </div>
  );
}
