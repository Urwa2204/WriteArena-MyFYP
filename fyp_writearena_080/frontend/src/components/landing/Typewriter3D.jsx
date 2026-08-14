import React, { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Html } from "@react-three/drei";
import gsap from "gsap";

/* ============================================================
   WriteArena — 3D Typewriter
   A pastel typewriter built from primitives (body, platen, paper,
   keys, hammer, feet). On mount the parts start scattered in space
   and GSAP snaps them into place over 2.2s (power3.out, staggered).
   After assembly it sways gently, floats, and can be dragged to spin.
   The paper shows the visitor's live keystrokes; keys press as you
   type and the engine plays typewriter sounds.
   Colours mirror writearena_landing_with_sound_motion.html.
   ============================================================ */

const COL = {
  body: "#c1aee8",
  bodyDark: "#a98fd8",
  platen: "#f3a8bc",
  paper: "#fffef8",
  key: "#fbf3e8",
  keyAlt: "#bcd9f4",
  hammer: "#7a6f9e",
  feet: "#9a86c8",
};

function KeyCap({ position, alt, pressedRef, index }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const target = pressedRef.current === index ? -0.05 : 0;
    ref.current.position.y += (target - ref.current.position.y) * 0.4;
  });
  return (
    <RoundedBox ref={ref} args={[0.18, 0.08, 0.18]} radius={0.03} smoothness={3} position={position} castShadow>
      <meshStandardMaterial color={alt ? COL.keyAlt : COL.key} roughness={0.5} metalness={0.05} />
    </RoundedBox>
  );
}

function TypewriterModel({ text, pressedKey }) {
  const root = useRef();
  const partRefs = {
    body: useRef(), platen: useRef(), paper: useRef(),
    keys: useRef(), hammer: useRef(), feetL: useRef(), feetR: useRef(),
  };
  const hammerRef = useRef();
  const drag = useRef({ active: false, x: 0, vel: 0, rot: 0 });
  const assembled = useRef(false);

  // key grid layout
  const keyData = useMemo(() => {
    const rows = [
      { z: -0.32, n: 8 },
      { z: -0.10, n: 9 },
      { z: 0.12, n: 8 },
    ];
    const out = [];
    let i = 0;
    rows.forEach((r) => {
      const span = (r.n - 1) * 0.22;
      for (let k = 0; k < r.n; k++) {
        out.push({ pos: [-span / 2 + k * 0.22, 0.05, r.z], alt: (i % 7 === 3), index: i });
        i++;
      }
    });
    return out;
  }, []);

  // GSAP assembly on mount: scatter then snap into place
  useEffect(() => {
    const groups = Object.values(partRefs).map((r) => r.current).filter(Boolean);
    const tl = gsap.timeline({ onComplete: () => { assembled.current = true; } });
    groups.forEach((g, idx) => {
      const home = { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z };
      gsap.set(g.position, {
        x: home.x + (Math.random() - 0.5) * 16,
        y: home.y + (Math.random() - 0.5) * 16,
        z: home.z + (Math.random() - 0.5) * 16,
      });
      gsap.set(g.rotation, {
        x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6,
      });
      tl.to(g.position, { x: home.x, y: home.y, z: home.z, duration: 2.2, ease: "power3.out" }, idx * 0.08);
      tl.to(g.rotation, { x: home.rx, y: home.ry, z: home.rz, duration: 2.2, ease: "power3.out" }, idx * 0.08);
    });
    return () => tl.kill();
  }, []);

  // hammer strike when a key is pressed
  useEffect(() => {
    if (pressedKey == null || !hammerRef.current) return;
    gsap.fromTo(hammerRef.current.rotation, { x: -0.6 }, { x: 0, duration: 0.18, ease: "power2.out" });
  }, [pressedKey]);

  // pointer drag to spin
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const down = (e) => { drag.current.active = true; drag.current.x = e.clientX; };
    const move = (e) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      drag.current.x = e.clientX;
      drag.current.vel = dx * 0.01;
      drag.current.rot += drag.current.vel;
    };
    const up = () => { drag.current.active = false; };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    // gentle float
    root.current.position.y = Math.sin(t * 0.9) * 0.06;
    // gentle auto-sway + drag inertia (keeps paper facing viewer)
    if (!drag.current.active) {
      drag.current.vel *= 0.95;
      drag.current.rot += drag.current.vel;
    }
    const sway = Math.sin(t * 0.4) * 0.18;
    root.current.rotation.y = sway + drag.current.rot;
    root.current.rotation.x = -0.18 + Math.sin(t * 0.6) * 0.02;
  });

  return (
    <group ref={root} scale={1.05} position={[0, 0, 0]}>
      {/* feet */}
      <RoundedBox ref={partRefs.feetL} args={[0.3, 0.18, 0.3]} radius={0.06} smoothness={3} position={[-0.9, -0.62, 0.4]} castShadow>
        <meshStandardMaterial color={COL.feet} roughness={0.6} />
      </RoundedBox>
      <RoundedBox ref={partRefs.feetR} args={[0.3, 0.18, 0.3]} radius={0.06} smoothness={3} position={[0.9, -0.62, 0.4]} castShadow>
        <meshStandardMaterial color={COL.feet} roughness={0.6} />
      </RoundedBox>

      {/* body */}
      <group ref={partRefs.body}>
        <RoundedBox args={[2.5, 1.0, 1.5]} radius={0.18} smoothness={4} position={[0, -0.1, 0.1]} castShadow receiveShadow>
          <meshStandardMaterial color={COL.body} roughness={0.45} metalness={0.06} />
        </RoundedBox>
        <RoundedBox args={[2.3, 0.5, 1.1]} radius={0.14} smoothness={4} position={[0, 0.28, -0.15]} castShadow>
          <meshStandardMaterial color={COL.bodyDark} roughness={0.5} />
        </RoundedBox>
      </group>

      {/* platen (roller) */}
      <group ref={partRefs.platen}>
        <mesh position={[0, 0.62, -0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 2.5, 24]} />
          <meshStandardMaterial color={COL.platen} roughness={0.4} />
        </mesh>
      </group>

      {/* paper + live typed text */}
      <group ref={partRefs.paper} position={[0, 0.78, -0.32]} rotation={[-0.32, 0, 0]}>
        <mesh castShadow>
          <planeGeometry args={[1.7, 1.1]} />
          <meshStandardMaterial color={COL.paper} roughness={0.85} side={2} />
        </mesh>
        <Html transform distanceFactor={2.4} position={[0, 0, 0.01]} pointerEvents="none" style={{ pointerEvents: "none" }}>
          <div style={{
            width: 250, height: 165, padding: "16px 18px", boxSizing: "border-box",
            fontFamily: "Fraunces, Georgia, serif", fontSize: 18, lineHeight: "26px",
            color: "#5a4d78", overflow: "hidden", userSelect: "none",
          }}>
            {text || "type anything…"}
            <span style={{ display: "inline-block", width: 2, height: 20, background: "#9a82e6", marginLeft: 1, verticalAlign: "middle", animation: "blink .7s step-end infinite" }} />
          </div>
        </Html>
      </group>

      {/* hammer */}
      <group ref={partRefs.hammer} position={[0, 0.34, -0.18]}>
        <mesh ref={hammerRef}>
          <boxGeometry args={[0.05, 0.5, 0.05]} />
          <meshStandardMaterial color={COL.hammer} roughness={0.4} metalness={0.2} />
        </mesh>
      </group>

      {/* keys */}
      <group ref={partRefs.keys} position={[0, 0.05, 0.5]}>
        {keyData.map((k) => (
          <KeyCap key={k.index} position={k.pos} alt={k.alt} index={k.index} pressedRef={{ current: pressedKey }} />
        ))}
        {/* space bar */}
        <RoundedBox args={[1.1, 0.08, 0.18]} radius={0.03} smoothness={3} position={[0, 0.05, 0.34]} castShadow>
          <meshStandardMaterial color={COL.key} roughness={0.5} />
        </RoundedBox>
      </group>
    </group>
  );
}

class CanvasBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function Typewriter3D({ text, pressedKey }) {
  const fallback = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
    }}>
      <div className="wa-card" style={{ width: 280, minHeight: 180, padding: 22, fontFamily: "var(--serif)", color: "var(--ink2)", lineHeight: 1.6 }}>
        {text || "type anything…"}
        <span className="typewriter-cursor" />
      </div>
    </div>
  );

  return (
    <CanvasBoundary fallback={fallback}>
      <Canvas shadows gl={{ alpha: true, antialias: true }} camera={{ position: [0, 1.6, 6], fov: 42 }} dpr={[1, 2]} style={{ width: "100%", height: "100%", background: "transparent" }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 8, 6]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#f3a8bc" />
        <Suspense fallback={null}>
          <TypewriterModel text={text} pressedKey={pressedKey} />
        </Suspense>
      </Canvas>
    </CanvasBoundary>
  );
}
