// frontend/src/components/home/HeroWebGL.tsx
// Reconciliation 3D scene — Bank Statement (left) + Internal Ledger (right)
// fly to center and lock together like puzzle pieces.
// Once unified: soft green glow = balanced. Lazy-loaded into HomePage only.

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// ─── Colors ────────────────────────────────────────────────────────
const CYAN = "#22d3ee";
const INDIGO = "#818cf8";
const VIOLET = "#a78bfa";
const GREEN = "#34d399";
const GREEN_GLOW = "#10b981";

interface ScrollRef {
  current: number;
}

// ─── Reconciliation State ──────────────────────────────────────────
// 0 = clusters apart, 0–1 = flying together, 1 = locked + green
function useReconcile() {
  const progress = useRef(0);
  const [locked, setLocked] = useState(false);

  useFrame((_, delta) => {
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.4);
      if (progress.current >= 1 && !locked) setLocked(true);
    }
  });

  return { progress, locked };
}

// ─── Bank Statement Element (left cluster) ─────────────────────────
function BankElement({
  position,
  size,
  color,
  reconcile,
  index,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  reconcile: { progress: THREE.RefObject<number>; locked: boolean };
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const startPos = useRef(new THREE.Vector3(...position));
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!ref.current) return;
    const t = reconcile.progress.current ?? 0;
    // Eased interpolation (mechanical, precise)
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Fly from start to center
    ref.current.position.lerpVectors(startPos.current, targetPos.current, ease);

    // Slight rotation during flight
    ref.current.rotation.y = (1 - ease) * 0.3 * (index % 2 === 0 ? 1 : -1);
    ref.current.rotation.x = (1 - ease) * 0.15;

    // Color shift: cyan → green when locked
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    if (reconcile.locked) {
      mat.color.lerp(new THREE.Color(GREEN), 0.05);
      mat.emissive.lerp(new THREE.Color(GREEN_GLOW), 0.05);
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.6, 0.05);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        transparent
        opacity={0.8}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}

// ─── Internal Ledger Element (right cluster) ───────────────────────
function LedgerElement({
  position,
  size,
  color,
  reconcile,
  index,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  reconcile: { progress: THREE.RefObject<number>; locked: boolean };
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const startPos = useRef(new THREE.Vector3(...position));
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!ref.current) return;
    const t = reconcile.progress.current ?? 0;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    ref.current.position.lerpVectors(startPos.current, targetPos.current, ease);
    ref.current.rotation.y = (1 - ease) * -0.3 * (index % 2 === 0 ? 1 : -1);
    ref.current.rotation.x = (1 - ease) * -0.15;

    const mat = ref.current.material as THREE.MeshStandardMaterial;
    if (reconcile.locked) {
      mat.color.lerp(new THREE.Color(GREEN), 0.05);
      mat.emissive.lerp(new THREE.Color(GREEN_GLOW), 0.05);
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.6, 0.05);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        transparent
        opacity={0.8}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}

// ─── Glow Pulse (after lock) ───────────────────────────────────────
function GlowPulse({ reconcile }: { reconcile: { progress: THREE.RefObject<number>; locked: boolean } }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (!ref.current) return;
    const t = reconcile.progress.current ?? 0;
    // Appear only after lock
    const scale = Math.max(0, (t - 0.8) * 5);
    ref.current.scale.setScalar(scale + Math.sin(performance.now() * 0.003) * 0.1 * scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = scale * 0.3;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshBasicMaterial color={GREEN_GLOW} transparent opacity={0} side={THREE.BackSide} />
    </mesh>
  );
}

// �── Connection Lines (after lock) ──────────────────────────────────
function ConnectionLines({ reconcile }: { reconcile: { progress: THREE.RefObject<number>; locked: boolean } }) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!ref.current) return;
    const t = reconcile.progress.current ?? 0;
    const visible = t > 0.85;
    ref.current.visible = visible;
    if (visible) {
      const opacity = (t - 0.85) / 0.15;
      ref.current.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = opacity * 0.4;
      });
    }
  });

  const lines = useMemo(() => {
    const arr: { from: [number, number, number]; to: [number, number, number] }[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      arr.push({
        from: [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0],
        to: [Math.cos(angle) * 0.8, Math.sin(angle) * 0.8, 0],
      });
    }
    return arr;
  }, []);

  return (
    <group ref={ref}>
      {lines.map((line, i) => {
        const mid: [number, number, number] = [
          (line.from[0] + line.to[0]) / 2,
          (line.from[1] + line.to[1]) / 2,
          (line.from[2] + line.to[2]) / 2,
        ];
        const dx = line.to[0] - line.from[0];
        const dy = line.to[1] - line.from[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <mesh key={i} position={mid} rotation={[0, 0, angle]}>
            <planeGeometry args={[len, 0.015]} />
            <meshBasicMaterial color={GREEN} transparent opacity={0} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Scene ─────────────────────────────────────────────────────────
function Scene({ scroll }: { scroll: ScrollRef }) {
  const reconcile = useReconcile();

  // Bank Statement elements (left cluster) — cyan/indigo tones
  const bankElements = useMemo(
    () => [
      { pos: [-2.5, 0.8, 0] as [number, number, number], size: [0.7, 0.45, 0.06] as [number, number, number], color: CYAN },
      { pos: [-2.8, 0.1, -0.2] as [number, number, number], size: [0.55, 0.35, 0.05] as [number, number, number], color: INDIGO },
      { pos: [-2.2, -0.5, 0.1] as [number, number, number], size: [0.65, 0.4, 0.05] as [number, number, number], color: CYAN },
      { pos: [-3.0, -0.3, -0.15] as [number, number, number], size: [0.5, 0.3, 0.04] as [number, number, number], color: VIOLET },
      { pos: [-2.6, 1.3, -0.1] as [number, number, number], size: [0.45, 0.28, 0.04] as [number, number, number], color: INDIGO },
    ],
    [],
  );

  // Internal Ledger elements (right cluster) — indigo/violet tones
  const ledgerElements = useMemo(
    () => [
      { pos: [2.5, 0.6, 0] as [number, number, number], size: [0.7, 0.45, 0.06] as [number, number, number], color: INDIGO },
      { pos: [2.8, -0.1, -0.2] as [number, number, number], size: [0.55, 0.35, 0.05] as [number, number, number], color: VIOLET },
      { pos: [2.2, -0.6, 0.1] as [number, number, number], size: [0.65, 0.4, 0.05] as [number, number, number], color: INDIGO },
      { pos: [3.0, 0.2, -0.15] as [number, number, number], size: [0.5, 0.3, 0.04] as [number, number, number], color: CYAN },
      { pos: [2.6, 1.1, -0.1] as [number, number, number], size: [0.45, 0.28, 0.04] as [number, number, number], color: VIOLET },
    ],
    [],
  );

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-2, 1, 2]} intensity={0.4} color={CYAN} />
      <pointLight position={[2, 1, 2]} intensity={0.4} color={INDIGO} />

      {/* Bank Statement cluster (left) */}
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
        <group>
          {bankElements.map((el, i) => (
            <BankElement
              key={`bank-${i}`}
              position={el.pos}
              size={el.size}
              color={el.color}
              reconcile={reconcile}
              index={i}
            />
          ))}
        </group>
      </Float>

      {/* Internal Ledger cluster (right) */}
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.3}>
        <group>
          {ledgerElements.map((el, i) => (
            <LedgerElement
              key={`ledger-${i}`}
              position={el.pos}
              size={el.size}
              color={el.color}
              reconcile={reconcile}
              index={i}
            />
          ))}
        </group>
      </Float>

      {/* Glow after lock */}
      <GlowPulse reconcile={reconcile} />
      <ConnectionLines reconcile={reconcile} />
    </>
  );
}

// ─── Main Export ───────────────────────────────────────────────────
export default function HeroWebGL({
  scrollProgress,
}: {
  scrollProgress: React.RefObject<number>;
}) {
  return (
    <div className="w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene scroll={scrollProgress as ScrollRef} />
      </Canvas>
    </div>
  );
}
