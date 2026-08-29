// frontend/src/components/home/HeroWebGL.tsx
// LedgerFlow-specific 3D scene — ledger book, floating entries, pie chart arcs,
// bar chart, number particles. Lazy-loaded ONLY into HomePage.
// pointer-events-none so mobile scroll isn't eaten.
// Respects prefers-reduced-motion: if true, this component is never mounted.

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// ─── Colors (LedgerFlow brand) ─────────────────────────────────────
const CYAN = "#22d3ee";
const INDIGO = "#818cf8";
const VIOLET = "#a78bfa";
const DARK = "#0F172A";

// ─── Scroll progress (0 at top, 1 after ~1 viewport) ──────────────
interface ScrollRef {
  current: number;
}

// ─── Ledger Book (center piece) ────────────────────────────────────
function LedgerBook({ scroll }: { scroll: ScrollRef }) {
  const groupRef = useRef<THREE.Group>(null!);
  const coverRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Idle rotation
    groupRef.current.rotation.y += delta * 0.2;
    groupRef.current.rotation.x = Math.sin(performance.now() * 0.0005) * 0.08;

    // Scroll: book opens — cover rotates to reveal pages
    if (coverRef.current) {
      const openAngle = Math.min(scroll.current * 1.2, 1.0) * -1.2;
      coverRef.current.rotation.y = openAngle;
    }

    // Scale up slightly on scroll
    const s = 1 + scroll.current * 0.1;
    groupRef.current.scale.setScalar(s);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={groupRef}>
        {/* Book spine (bottom cover) */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[1.6, 1.1, 0.06]} />
          <meshStandardMaterial color={DARK} roughness={0.3} metalness={0.5} />
        </mesh>

        {/* Pages (white block inside) */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[1.4, 0.95, 0.08]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>

        {/* Page lines (decorative grooves) */}
        {[0.25, 0.1, -0.05, -0.2].map((y, i) => (
          <mesh key={i} position={[0, 0.07, y * 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[1.1, 0.015, 0.001]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.5} />
          </mesh>
        ))}

        {/* Top cover — rotates open on scroll */}
        <mesh
          ref={coverRef}
          position={[0, 0.08, -0.55]}
          rotation={[0, 0, 0]}
          // Pivot at bottom edge (z = -0.55 = back edge)
        >
          <boxGeometry args={[1.6, 0.06, 1.1]} />
          <meshStandardMaterial
            color={CYAN}
            emissive={CYAN}
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Cyan edge glow on cover */}
        <mesh position={[0, 0.12, -0.55]}>
          <boxGeometry args={[1.62, 0.005, 1.12]} />
          <meshStandardMaterial
            color={CYAN}
            emissive={CYAN}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>
    </Float>
  );
}

// ─── Floating Entry Cards (orbit the book) ─────────────────────────
function EntryCards({ scroll }: { scroll: ScrollRef }) {
  const groupRef = useRef<THREE.Group>(null!);

  const cards = useMemo(() => {
    const colors = [CYAN, INDIGO, VIOLET];
    return Array.from({ length: 4 }, (_, i) => ({
      angle: (i / 4) * Math.PI * 2,
      radius: 1.6 + (i % 2) * 0.4,
      y: -0.3 + (i % 3) * 0.35,
      color: colors[i % 3],
      speed: 0.3 + i * 0.08,
    }));
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const now = performance.now() * 0.001;
    const children = groupRef.current.children;

    cards.forEach((card, i) => {
      const child = children[i] as THREE.Mesh;
      if (!child) return;

      // Orbit around book
      const angle = card.angle + now * card.speed;
      const r = card.radius + scroll.current * 0.5;
      child.position.x = Math.cos(angle) * r;
      child.position.z = Math.sin(angle) * r;
      child.position.y = card.y + Math.sin(now * 0.5 + i) * 0.15;

      // Face camera-ish
      child.rotation.y = -angle + Math.PI;
      child.rotation.x = Math.sin(now * 0.3 + i) * 0.1;

      // Fan out on scroll
      const scale = 0.6 + scroll.current * 0.2;
      child.scale.setScalar(scale);
    });
  });

  return (
    <group ref={groupRef}>
      {cards.map((card, i) => (
        <mesh key={i}>
          <planeGeometry args={[0.55, 0.35]} />
          <meshStandardMaterial
            color={card.color}
            emissive={card.color}
            emissiveIntensity={0.2}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Pie Chart Arcs (instead of torus rings) ───────────────────────
function PieArc({
  color,
  radius,
  arcLength,
  speed,
  scroll,
  startAngle,
}: {
  color: string;
  radius: number;
  arcLength: number;
  speed: number;
  scroll: ScrollRef;
  startAngle: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (!ref.current) return;
    const now = performance.now() * 0.001;
    ref.current.rotation.z = startAngle + now * speed;

    // Spread outward on scroll
    const spread = 1 + scroll.current * 0.25;
    ref.current.scale.setScalar(spread);
  });

  // Create arc shape
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const innerR = radius - 0.04;
    const outerR = radius + 0.04;
    const segments = 32;

    shape.moveTo(
      Math.cos(0) * innerR,
      Math.sin(0) * innerR,
    );

    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * arcLength;
      shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    }

    for (let i = segments; i >= 0; i--) {
      const a = (i / segments) * arcLength;
      shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    }

    return new THREE.ShapeGeometry(shape);
  }, [radius, arcLength]);

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Bar Chart (grows on scroll) ───────────────────────────────────
function BarChart({ scroll }: { scroll: ScrollRef }) {
  const groupRef = useRef<THREE.Group>(null!);
  const barCount = 6;

  useFrame(() => {
    if (!groupRef.current) return;
    const children = groupRef.current.children;
    const now = performance.now() * 0.001;

    for (let i = 0; i < barCount; i++) {
      const bar = children[i] as THREE.Mesh;
      if (!bar) continue;
      // Bar heights grow with scroll + idle wave
      const wave = Math.sin(now * 0.8 + i * 0.7) * 0.05;
      const baseH = 0.2 + Math.sin(i * 1.1) * 0.15;
      const h = baseH + scroll.current * (0.25 + i * 0.1) + wave;
      bar.scale.y = Math.max(0.01, h);
      bar.position.y = h * 0.5 - 0.4;
    }
  });

  return (
    <group ref={groupRef} position={[2.2, -0.4, 0.3]} rotation={[0, -0.3, 0]}>
      {Array.from({ length: barCount }).map((_, i) => (
        <mesh key={i} position={[i * 0.2, 0, 0]}>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? CYAN : i % 3 === 1 ? INDIGO : VIOLET}
            emissive={i % 3 === 0 ? CYAN : i % 3 === 1 ? INDIGO : VIOLET}
            emissiveIntensity={0.2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Number Particles (floating digits) ────────────────────────────
function NumberParticles({ count = 40 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 7;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.015;
    // Gentle float
    ref.current.position.y = Math.sin(performance.now() * 0.0003) * 0.1;
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
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Scene (inner) ─────────────────────────────────────────────────
function Scene({ scroll }: { scroll: ScrollRef }) {
  const { camera } = useThree();

  useFrame(() => {
    const s = scroll.current;
    // Camera: slight dolly + tilt on scroll
    camera.position.z = 5.5 - s * 1.2;
    camera.position.y = 0.4 - s * 0.3;
    camera.lookAt(0, -0.1, 0);
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={0.5} color={CYAN} />
      <pointLight position={[3, -1, -1]} intensity={0.3} color={INDIGO} />

      {/* Center: Ledger book */}
      <LedgerBook scroll={scroll} />

      {/* Orbiting: Entry cards */}
      <EntryCards scroll={scroll} />

      {/* Pie chart arcs (replace torus rings) */}
      <PieArc color={CYAN} radius={2.0} arcLength={1.8} speed={0.15} scroll={scroll} startAngle={0} />
      <PieArc color={INDIGO} radius={2.5} arcLength={2.2} speed={-0.1} scroll={scroll} startAngle={1.2} />
      <PieArc color={VIOLET} radius={3.0} arcLength={1.5} speed={0.08} scroll={scroll} startAngle={2.8} />

      {/* Bar chart (right side) */}
      <BarChart scroll={scroll} />

      {/* Particles */}
      <NumberParticles />
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
        camera={{ position: [0, 0.4, 5.5], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene scroll={scrollProgress as ScrollRef} />
      </Canvas>
    </div>
  );
}
