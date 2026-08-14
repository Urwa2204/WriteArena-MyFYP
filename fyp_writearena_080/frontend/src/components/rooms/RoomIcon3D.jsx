import React, { useRef, useState, useMemo, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

/* ============================================================
   RoomIcon3D — polished, meaningful 3D emblem per niche.
   A shared earthy palette (cream / sage / dark-green / gold)
   keeps the ten icons cohesive; each is a little modelled
   object (chip, book, flask, people, scale, bar-chart, trophy,
   heart, film reel, palette). They float, rotate gently, and
   speed up + swell on hover. One small transparent <Canvas>
   per card.
   ============================================================ */

// ---- shared palette (matches the reference set) ----
const CREAM = "#D8D3C2", CREAM_L = "#E7E2D4";
const SAGE = "#8D9A7E", SAGE_L = "#B4C0A4", SAGE_D = "#5C6A50";
const DGREEN = "#3F4A36";
const GOLD = "#C7A231", GOLD_L = "#DABE58", GOLD_D = "#A8841C";

const matte = { roughness: 0.62, metalness: 0.12 };
const metal = { roughness: 0.34, metalness: 0.55 };

// small helpers -------------------------------------------------
function Box({ w, h, d, color, mat = matte, ...p }) {
  return (
    <mesh {...p}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}
function Cyl({ rt, rb, h, seg = 24, color, mat = matte, ...p }) {
  return (
    <mesh {...p}>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}
function Ball({ r, color, mat = matte, ...p }) {
  return (
    <mesh {...p}>
      <sphereGeometry args={[r, 22, 22]} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}

// extruded-shape helpers ---------------------------------------
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.3);
  s.bezierCurveTo(0, 0.4, -0.15, 0.62, -0.45, 0.62);
  s.bezierCurveTo(-0.82, 0.62, -0.82, 0.18, -0.82, 0.18);
  s.bezierCurveTo(-0.82, -0.1, -0.5, -0.42, 0, -0.7);
  s.bezierCurveTo(0.5, -0.42, 0.82, -0.1, 0.82, 0.18);
  s.bezierCurveTo(0.82, 0.18, 0.82, 0.62, 0.45, 0.62);
  s.bezierCurveTo(0.15, 0.62, 0, 0.4, 0, 0.3);
  return s;
}
function starShape(outer = 0.5, inner = 0.21, pts = 5) {
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
function paletteShape() {
  const s = new THREE.Shape();
  s.absellipse(0, 0, 0.78, 0.6, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0.34, -0.16, 0.13, 0.17, 0, Math.PI * 2, true, 0);
  s.holes.push(hole);
  return s;
}
function Extruded({ shape, depth = 0.3, color, mat = matte, ...p }) {
  const geo = useMemo(
    () => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, steps: 1 }),
    [shape, depth]
  );
  return (
    <mesh geometry={geo} {...p}>
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}

// ---- the ten icons (each centred, ~2-unit tall) --------------
function TechChip() {
  const pins = [];
  for (let i = -1; i <= 1; i++) {
    pins.push(<Box key={"l" + i} w={0.32} h={0.09} d={0.09} color={GOLD_D} mat={metal} position={[-0.86, i * 0.4, 0]} />);
    pins.push(<Box key={"r" + i} w={0.32} h={0.09} d={0.09} color={GOLD_D} mat={metal} position={[0.86, i * 0.4, 0]} />);
    pins.push(<Box key={"t" + i} w={0.09} h={0.32} d={0.09} color={GOLD_D} mat={metal} position={[i * 0.4, 0.86, 0]} />);
    pins.push(<Box key={"b" + i} w={0.09} h={0.32} d={0.09} color={GOLD_D} mat={metal} position={[i * 0.4, -0.86, 0]} />);
  }
  return (
    <group>
      {pins}
      <RoundedBox args={[1.25, 1.25, 0.34]} radius={0.09} smoothness={4}>
        <meshStandardMaterial color={CREAM} {...matte} />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.7, 0.12]} radius={0.06} smoothness={4} position={[0, 0, 0.22]}>
        <meshStandardMaterial color={SAGE_D} {...matte} />
      </RoundedBox>
      <Ball r={0.16} color={GOLD} mat={metal} position={[0, 0, 0.36]} />
    </group>
  );
}
function LitBook() {
  return (
    <group rotation={[0.12, 0, 0]}>
      <group rotation={[0, 0.42, 0]} position={[-0.4, 0, 0]}>
        <RoundedBox args={[0.9, 1.15, 0.07]} radius={0.03} smoothness={3}><meshStandardMaterial color={CREAM_L} {...matte} /></RoundedBox>
      </group>
      <group rotation={[0, -0.42, 0]} position={[0.4, 0, 0]}>
        <RoundedBox args={[0.9, 1.15, 0.07]} radius={0.03} smoothness={3}><meshStandardMaterial color={CREAM_L} {...matte} /></RoundedBox>
      </group>
      <Box w={0.12} h={1.2} d={0.16} color={SAGE_D} position={[0, 0, 0.02]} />
      <Box w={0.14} h={0.5} d={0.03} color={GOLD} mat={metal} position={[0.42, 0.45, 0.34]} rotation={[0, -0.42, 0]} />
    </group>
  );
}
function SciFlask() {
  return (
    <group position={[0, -0.1, 0]}>
      <Cyl rt={0.16} rb={0.78} h={1.05} color={CREAM_L} mat={{ roughness: 0.5, metalness: 0.1 }} position={[0, -0.05, 0]} />
      <Cyl rt={0.19} rb={0.62} h={0.42} color={SAGE_L} mat={matte} position={[0, -0.32, 0]} />
      <Cyl rt={0.16} rb={0.16} h={0.4} color={CREAM_L} mat={{ roughness: 0.5, metalness: 0.1 }} position={[0, 0.66, 0]} />
      <Cyl rt={0.2} rb={0.2} h={0.2} color={DGREEN} position={[0, 0.94, 0]} />
      <Ball r={0.08} color={GOLD} mat={metal} position={[0.14, -0.05, 0.3]} />
      <Ball r={0.055} color={GOLD_L} mat={metal} position={[-0.05, 0.15, 0.28]} />
    </group>
  );
}
function Person({ color, tie }) {
  return (
    <group>
      <Ball r={0.24} color={color} position={[0, 0.5, 0]} />
      <Cyl rt={0.14} rb={0.36} h={0.62} color={color} position={[0, -0.02, 0]} />
      {tie && <Box w={0.09} h={0.32} d={0.06} color={GOLD} mat={metal} position={[0, 0.02, 0.3]} />}
    </group>
  );
}
function Society() {
  return (
    <group position={[0, -0.1, 0]}>
      <group position={[-0.62, -0.05, -0.1]} scale={0.82}><Person color={SAGE_L} /></group>
      <group position={[0.62, -0.05, -0.1]} scale={0.82}><Person color={SAGE} /></group>
      <group position={[0, 0.05, 0.15]}><Person color={SAGE_D} tie /></group>
    </group>
  );
}
function Scale() {
  return (
    <group position={[0, -0.05, 0]}>
      <Cyl rt={0.34} rb={0.42} h={0.14} color={CREAM} position={[0, -0.78, 0]} />
      <Cyl rt={0.07} rb={0.07} h={1.4} color={GOLD} mat={metal} position={[0, 0.02, 0]} />
      <Ball r={0.11} color={GOLD_L} mat={metal} position={[0, 0.78, 0]} />
      <Box w={1.45} h={0.09} d={0.09} color={GOLD} mat={metal} position={[0, 0.6, 0]} />
      {[-0.62, 0.62].map((x) => (
        <group key={x} position={[x, 0.6, 0]}>
          <Box w={0.02} h={0.28} d={0.02} color={GOLD_D} mat={metal} position={[0, -0.16, 0]} />
          <Cyl rt={0.26} rb={0.22} h={0.05} color={CREAM_L} position={[0, -0.32, 0]} />
        </group>
      ))}
    </group>
  );
}
function BarChart() {
  const bars = [
    { x: -0.44, h: 0.55, c: SAGE_L }, { x: 0.02, h: 0.9, c: SAGE_D }, { x: 0.48, h: 1.3, c: GOLD },
  ];
  return (
    <group position={[0, -0.1, 0]}>
      <Box w={1.5} h={0.09} d={0.55} color={CREAM} position={[0, -0.68, 0]} />
      {bars.map((b) => (
        <RoundedBox key={b.x} args={[0.32, b.h, 0.32]} radius={0.04} smoothness={3} position={[b.x, -0.63 + b.h / 2, 0]}>
          <meshStandardMaterial color={b.c} {...matte} />
        </RoundedBox>
      ))}
      {bars.map((b) => <Ball key={"d" + b.x} r={0.08} color={DGREEN} position={[b.x, -0.55 + b.h, 0.18]} />)}
    </group>
  );
}
function Trophy() {
  return (
    <group position={[0, -0.05, 0]}>
      <Cyl rt={0.5} rb={0.3} h={0.62} color={GOLD} mat={metal} position={[0, 0.42, 0]} />
      <mesh position={[0, 0.73, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.46, 0.05, 12, 32]} /><meshStandardMaterial color={GOLD_L} {...metal} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.52, 0.46, 0]} rotation={[0, 0, s * 1.1]}><torusGeometry args={[0.2, 0.045, 10, 20, Math.PI]} /><meshStandardMaterial color={GOLD} {...metal} /></mesh>
      ))}
      <Cyl rt={0.11} rb={0.11} h={0.26} color={GOLD_D} mat={metal} position={[0, 0.0, 0]} />
      <Cyl rt={0.3} rb={0.36} h={0.14} color={CREAM} position={[0, -0.2, 0]} />
      <Box w={0.6} h={0.12} d={0.44} color={SAGE_D} position={[0, -0.33, 0]} />
      <Extruded shape={starShape(0.19, 0.08)} depth={0.06} color={GOLD_L} mat={metal} position={[0, 0.46, 0.34]} />
    </group>
  );
}
function Health() {
  const pulse = [
    { x: -0.42, y: 0, r: 0, w: 0.28 }, { x: -0.2, y: -0.18, r: -0.9, w: 0.24 },
    { x: 0.02, y: 0.22, r: 1.05, w: 0.42 }, { x: 0.26, y: -0.08, r: -0.7, w: 0.34 }, { x: 0.5, y: 0.02, r: 0.4, w: 0.24 },
  ];
  return (
    <group>
      <Extruded shape={heartShape()} depth={0.34} color={SAGE_L} position={[0, 0.05, -0.1]} scale={1.05} />
      {pulse.map((s, i) => <Box key={i} w={s.w} h={0.07} d={0.07} color={GOLD} mat={metal} position={[s.x, s.y - 0.02, 0.34]} rotation={[0, 0, s.r]} />)}
    </group>
  );
}
function FilmReel() {
  const holes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    holes.push(<Cyl key={i} rt={0.13} rb={0.13} h={0.24} color={DGREEN} rotation={[Math.PI / 2, 0, 0]} position={[Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0]} />);
  }
  return (
    <group rotation={[0.15, -0.2, 0]}>
      <Cyl rt={0.78} rb={0.78} h={0.18} color={CREAM} rotation={[Math.PI / 2, 0, 0]} />
      {holes}
      <Cyl rt={0.2} rb={0.2} h={0.22} color={GOLD} mat={metal} rotation={[Math.PI / 2, 0, 0]} />
      <group position={[0.72, 0.6, 0.05]} rotation={[0, 0, -0.5]}>
        <Box w={0.66} h={0.34} d={0.1} color={DGREEN} />
        {[-0.18, 0, 0.18].map((x) => <Box key={x} w={0.1} h={0.1} d={0.06} color={GOLD_L} mat={metal} position={[x, 0, 0.08]} />)}
      </group>
    </group>
  );
}
function Palette() {
  const dots = [
    { x: -0.34, y: 0.2, c: GOLD }, { x: 0.05, y: 0.32, c: SAGE }, { x: 0.36, y: 0.16, c: DGREEN },
    { x: -0.4, y: -0.16, c: SAGE_L }, { x: -0.02, y: -0.08, c: GOLD_L },
  ];
  return (
    <group rotation={[0.55, -0.15, 0.15]}>
      <Extruded shape={paletteShape()} depth={0.16} color={CREAM_L} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
      {dots.map((d, i) => <Ball key={i} r={0.11} color={d.c} position={[d.x, 0.16, d.y]} />)}
      <group position={[0.15, 0.4, -0.5]} rotation={[0.4, 0, -0.7]}>
        <Cyl rt={0.05} rb={0.05} h={0.95} color={DGREEN} />
        <Cyl rt={0.06} rb={0.02} h={0.22} color={GOLD} mat={metal} position={[0, 0.56, 0]} />
      </group>
    </group>
  );
}

const ICONS = {
  technology: TechChip, literature: LitBook, science: SciFlask, society: Society,
  politics: Scale, business: BarChart, sports: Trophy, health: Health,
  entertainment: FilmReel, arts: Palette,
};

function Rig({ niche, active }) {
  const g = useRef();
  const [hovered, setHovered] = useState(false);
  const t = useRef(0);
  const Icon = ICONS[niche] || ICONS.literature;

  useFrame((_, dt) => {
    t.current += dt;
    const o = g.current; if (!o) return;
    o.rotation.y += dt * (hovered ? 1.5 : active ? 0.85 : 0.5);
    o.position.y = Math.sin(t.current * 1.3) * 0.07;
    const tgt = hovered ? 1.12 : 1;
    o.scale.x += (tgt - o.scale.x) * Math.min(1, dt * 8);
    o.scale.y = o.scale.z = o.scale.x;
  });

  return (
    <group ref={g} rotation={[0.16, 0, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}>
      <group scale={0.92}><Icon /></group>
    </group>
  );
}

export default function RoomIcon3D({ niche = "literature", active = false, size = 64 }) {
  const key = String(niche || "").toLowerCase();
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} aria-hidden="true">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0.2, 3.7], fov: 40 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.25} />
        <directionalLight position={[-4, 1, 2]} intensity={0.45} color="#fff6df" />
        <pointLight position={[0, -3, 3]} intensity={0.35} color={GOLD_L} />
        <Suspense fallback={null}>
          <Rig niche={key} active={active} />
        </Suspense>
      </Canvas>
    </div>
  );
}
