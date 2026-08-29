// frontend/src/components/home/HeroWebGL.tsx
// Procedural 3D fintech scene — crystal, orbit rings, ledger cards, bar chart, particles.
// Lazy-loaded ONLY into HomePage. pointer-events-none so mobile scroll isn't eaten.
// Respects prefers-reduced-motion: if true, this component is never mounted.

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

// ─── Colors ────────────────────────────────────────────────────────
const CYAN = "#22d3ee";
const INDIGO = "#818cf8";
const VIOLET = "#a78bfa";

// ─── Scroll progress (0 at top, 1 after ~1 viewport) ──────────────
// Passed as a mutable ref from parent — no React re-renders per frame.
interface ScrollRef {
  current: number;
}

// ─── Crystal Icosahedron ───────────────────────────────────────────
function Crystal({ scroll }: { scroll: ScrollRef }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (!ref.current) return;
    // Idle rotation
    ref.current.rotation.y += delta * 0.3;
    ref.current.rotation.x += delta * 0.15;
    // Scroll-driven scale pulse
    const s = 1 + scroll.current * 0.15;
    ref.current.scale.setScalar(s);
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.1, 1]} />
        <MeshDistortMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.6}
          distort={0.25}
          speed={2}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

// ─── Orbit Ring ────────────────────────────────────────────────────
function OrbitRing({
  color,
  radius,
  speed,
  scroll,
  rotationAxis,
}: {
  color: string;
  radius: number;
  speed: number;
  scroll: ScrollRef;
  rotationAxis: "x" | "y" | "z";
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const baseRotation = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const angle = baseRotation.current + performance.now() * speed * 0.001;
    ref.current.rotation[rotationAxis] = angle;
    // Spread rings outward on scroll
    const spread = 1 + scroll.current * 0.3;
    ref.current.scale.setScalar(spread);
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.03, 16, 80]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

// ─── Ledger Cards (3D) ────────────────────────────────────────────
function LedgerCards({ scroll }: { scroll: ScrollRef }) {
  const groupRef = useRef<THREE.Group>(null!);

  const cards = useMemo(() => {
    const arr: { y: number; z: number; rotY: number; color: string }[] = [];
    const colors = [CYAN, INDIGO, VIOLET];
    for (let i = 0; i < 3; i++) {
      arr.push({
        y: -0.8 - i * 0.08,
        z: -0.3 - i * 0.15,
        rotY: -0.15 + i * 0.15,
        color: colors[i],
      });
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    // Fan-out on scroll: cards spread apart
    const children = groupRef.current.children;
    cards.forEach((card, i) => {
      const child = children[i] as THREE.Mesh;
      if (!child) return;
      const fanAngle = card.rotY + scroll.current * 0.6 * (i - 1);
      child.rotation.y = fanAngle;
      child.position.x = Math.sin(fanAngle) * 0.5 * scroll.current;
      child.position.y = card.y + scroll.current * 0.3 * i;
    });
  });

  return (
    <group ref={groupRef}>
      {cards.map((card, i) => (
        <mesh key={i} position={[0, card.y, card.z]} rotation={[0.3, card.rotY, 0]}>
          <boxGeometry args={[1.4, 0.9, 0.04]} />
          <meshStandardMaterial
            color={card.color}
            emissive={card.color}
            emissiveIntensity={0.15}
            transparent
            opacity={0.7}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Mini Bar Chart ────────────────────────────────────────────────
function BarChart({ scroll }: { scroll: ScrollRef }) {
  const groupRef = useRef<THREE.Group>(null!);
  const barCount = 5;

  useFrame(() => {
    if (!groupRef.current) return;
    const children = groupRef.current.children;
    for (let i = 0; i < barCount; i++) {
      const bar = children[i] as THREE.Mesh;
      if (!bar) continue;
      // Bar heights grow with scroll
      const baseH = 0.3 + Math.sin(i * 1.2) * 0.2;
      const h = baseH + scroll.current * (0.3 + i * 0.12);
      bar.scale.y = h;
      bar.position.y = h * 0.5 - 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[1.8, -0.5, -0.5]} rotation={[0, -0.4, 0]}>
      {Array.from({ length: barCount }).map((_, i) => (
        <mesh key={i} position={[i * 0.22, 0, 0]}>
          <boxGeometry args={[0.14, 1, 0.14]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? CYAN : INDIGO}
            emissive={i % 2 === 0 ? CYAN : INDIGO}
            emissiveIntensity={0.2}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Particles ─────────────────────────────────────────────────────
function Particles({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
    ref.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={CYAN}
        size={0.025}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Scene (inner) ─────────────────────────────────────────────────
function Scene({ scroll }: { scroll: ScrollRef }) {
  const { camera } = useThree();

  useFrame(() => {
    // Camera dolly on scroll: zoom in slightly + tilt down
    const s = scroll.current;
    camera.position.z = 5 - s * 1.5;
    camera.position.y = 0.3 - s * 0.4;
    camera.lookAt(0, -0.2, 0);
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color={CYAN} />
      <pointLight position={[3, -2, -1]} intensity={0.4} color={INDIGO} />

      <Crystal scroll={scroll} />
      <OrbitRing color={CYAN} radius={2.2} speed={0.4} scroll={scroll} rotationAxis="x" />
      <OrbitRing color={INDIGO} radius={2.8} speed={0.3} scroll={scroll} rotationAxis="y" />
      <OrbitRing color={VIOLET} radius={3.4} speed={0.25} scroll={scroll} rotationAxis="z" />
      <LedgerCards scroll={scroll} />
      <BarChart scroll={scroll} />
      <Particles />
    </>
  );
}

// ─── Main Export ───────────────────────────────────────────────────
// scrollProgress is a ref updated by the parent — avoids re-renders.
export default function HeroWebGL({
  scrollProgress,
}: {
  scrollProgress: React.RefObject<number>;
}) {
  return (
    <div className="w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0.3, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene scroll={scrollProgress as ScrollRef} />
      </Canvas>
    </div>
  );
}
