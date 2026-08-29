// frontend/src/components/home/HeroWebGL.tsx
import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYAN = "#22d3ee";
const GOLD = "#fbbf24";
const GOLD_DARK = "#d97706";
const GRAY = "#94a3b8";
const GREEN = "#34d399";
const GREEN_GLOW = "#10b981";

const BEAM_LENGTH = 3.2;
const START_TILT = 0.32; // radian — kondisi awal: belum balance

// Ease-out dengan sedikit overshoot di akhir, biar terasa seperti
// "settle" beneran (mirip jarum timbangan fisik), bukan berhenti kaku.
function easeSettle(t: number): number {
  if (t < 0.7) {
    const local = t / 0.7;
    return (1 - Math.pow(1 - local, 3)) * 1.06;
  }
  const local = (t - 0.7) / 0.3;
  const overshoot = 1.06;
  return overshoot + (1 - overshoot) * (1 - Math.pow(1 - local, 2));
}

interface BalanceState {
  progress: React.RefObject<number>;
  locked: boolean;
}

function useBalance(onLocked?: () => void): BalanceState {
  const progress = useRef(0);
  const [locked, setLocked] = useState(false);

  useFrame((_, delta) => {
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.35);
      if (progress.current >= 1 && !locked) {
        setLocked(true);
        onLocked?.();
      }
    }
  });

  return { progress, locked };
}

// Satu sisi timbangan (Debit atau Kredit). Piringan + koin ada di
// dalam grup pivot yang di-counter-rotate tiap frame terhadap rotasi
// batang induk, supaya piringan SELALU terlihat rata/level — persis
// perilaku timbangan asli — tanpa perlu hitung posisi manual.
function ScalePan({
  side,
  balance,
}: {
  side: "left" | "right";
  balance: BalanceState;
}) {
  const pivotRef = useRef<THREE.Group>(null!);
  const discRef = useRef<THREE.Mesh>(null!);
  const sign = side === "left" ? -1 : 1;

  useFrame(() => {
    if (!pivotRef.current) return;
    const t = balance.progress.current ?? 0;
    const eased = easeSettle(t);
    const beamAngle = START_TILT * (1 - eased);
    pivotRef.current.rotation.z = -beamAngle;

    if (balance.locked && discRef.current) {
      const mat = discRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        0.7,
        0.06,
      );
      mat.color.lerp(new THREE.Color(GREEN), 0.06);
      mat.emissive.lerp(new THREE.Color(GREEN_GLOW), 0.06);
    }
  });

  return (
    <group position={[sign * (BEAM_LENGTH / 2), 0, 0]}>
      {/* Tali penggantung */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color={GRAY} />
      </mesh>
      {/* Pivot piringan — selalu di-counter-rotate biar tetap level */}
      <group ref={pivotRef} position={[0, -0.7, 0]}>
        <mesh ref={discRef}>
          <cylinderGeometry args={[0.42, 0.42, 0.05, 32]} />
          <meshStandardMaterial
            color={CYAN}
            emissive={CYAN}
            emissiveIntensity={0.15}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        {/* Tumpukan koin */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.05 + i * 0.06, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 24]} />
            <meshStandardMaterial
              color={GOLD}
              emissive={GOLD_DARK}
              emissiveIntensity={0.1}
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Batang timbangan — SATU-SATUNYA objek yang berputar. Piringan kiri
// & kanan nempel sebagai child, jadi posisinya otomatis benar.
function Beam({ balance }: { balance: BalanceState }) {
  const beamRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!beamRef.current) return;
    const t = balance.progress.current ?? 0;
    const eased = easeSettle(t);
    beamRef.current.rotation.z = START_TILT * (1 - eased);
  });

  return (
    <group ref={beamRef} position={[0, 0.9, 0]}>
      <mesh>
        <boxGeometry args={[BEAM_LENGTH, 0.06, 0.06]} />
        <meshStandardMaterial color={CYAN} metalness={0.5} roughness={0.3} />
      </mesh>
      <ScalePan side="left" balance={balance} />
      <ScalePan side="right" balance={balance} />
    </group>
  );
}

function Fulcrum() {
  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.5, 16]} />
        <meshStandardMaterial color={GRAY} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.65, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.1, 32]} />
        <meshStandardMaterial color={GRAY} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Scene({ onLocked }: { onLocked?: () => void }) {
  const balance = useBalance(onLocked);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={0.7} color="#ffffff" />
      <pointLight position={[-2, 1, 2]} intensity={0.3} color={CYAN} />
      <pointLight position={[2, 1, 2]} intensity={0.3} color={GOLD} />

      <group rotation={[0, -0.15, 0]}>
        <Fulcrum />
        <Beam balance={balance} />
      </group>
    </>
  );
}

// onLocked: dipanggil sekali saat timbangan sudah rata & hijau —
// dipakai parent (HomePage) untuk fade-in glow CSS di belakang canvas.
export default function HeroWebGL({ onLocked }: { onLocked?: () => void }) {
  return (
    <div className="w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0.3, 5], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene onLocked={onLocked} />
      </Canvas>
    </div>
  );
}
