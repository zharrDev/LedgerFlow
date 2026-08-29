import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

const CYAN = "#22d3ee";
const INDIGO = "#818cf8";
const VIOLET = "#a78bfa";
const GREEN = "#34d399";
const GREEN_GLOW = "#10b981";

// Spacing diperbesar + tiap elemen ikut mengecil (scale-down) saat lock,
// supaya box yang lebar (0.45–0.7 unit) tidak saling tumpang tindih
// berat walau posisinya dirapatkan.
const COLS = 5;
const SPACING_X = 0.62;
const LOCK_SCALE = 0.55;

function getTargetPosition(
  index: number,
  side: "bank" | "ledger",
): THREE.Vector3 {
  const xBase = (index - (COLS - 1) / 2) * SPACING_X;
  const y = side === "bank" ? 0.16 : -0.16;
  const z = side === "bank" ? 0.06 : -0.06;
  return new THREE.Vector3(xBase, y, z);
}

interface ReconcileState {
  progress: React.RefObject<number>;
  locked: boolean;
}

function useReconcile(onLocked?: () => void): ReconcileState {
  const progress = useRef(0);
  const [locked, setLocked] = useState(false);

  useFrame((_, delta) => {
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.4);
      if (progress.current >= 1 && !locked) {
        setLocked(true);
        onLocked?.();
      }
    }
  });

  return { progress, locked };
}

function PieceElement({
  position,
  size,
  color,
  reconcile,
  index,
  side,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  reconcile: ReconcileState;
  index: number;
  side: "bank" | "ledger";
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const startPos = useRef(new THREE.Vector3(...position));
  const targetPos = useRef(getTargetPosition(index, side));
  const rotSign = side === "bank" ? 1 : -1;

  useFrame(() => {
    if (!ref.current) return;
    const t = reconcile.progress.current ?? 0;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    ref.current.position.lerpVectors(startPos.current, targetPos.current, ease);
    ref.current.rotation.y =
      (1 - ease) * 0.3 * rotSign * (index % 2 === 0 ? 1 : -1);
    ref.current.rotation.x = (1 - ease) * 0.15 * rotSign;

    // Mengecil bertahap saat mendekati posisi kunci — mencegah
    // box saling tumpang tindih walau posisinya dirapatkan.
    const scale = THREE.MathUtils.lerp(1, LOCK_SCALE, ease);
    ref.current.scale.setScalar(scale);

    const mat = ref.current.material as THREE.MeshStandardMaterial;
    if (reconcile.locked) {
      mat.color.lerp(new THREE.Color(GREEN), 0.05);
      mat.emissive.lerp(new THREE.Color(GREEN_GLOW), 0.05);
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        0.6,
        0.05,
      );
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
        opacity={0.85}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}

function Scene({ onLocked }: { onLocked?: () => void }) {
  const reconcile = useReconcile(onLocked);

  const bankElements = useMemo(
    () => [
      {
        pos: [-2.5, 0.8, 0] as [number, number, number],
        size: [0.7, 0.45, 0.06] as [number, number, number],
        color: CYAN,
      },
      {
        pos: [-2.8, 0.1, -0.2] as [number, number, number],
        size: [0.55, 0.35, 0.05] as [number, number, number],
        color: INDIGO,
      },
      {
        pos: [-2.2, -0.5, 0.1] as [number, number, number],
        size: [0.65, 0.4, 0.05] as [number, number, number],
        color: CYAN,
      },
      {
        pos: [-3.0, -0.3, -0.15] as [number, number, number],
        size: [0.5, 0.3, 0.04] as [number, number, number],
        color: VIOLET,
      },
      {
        pos: [-2.6, 1.3, -0.1] as [number, number, number],
        size: [0.45, 0.28, 0.04] as [number, number, number],
        color: INDIGO,
      },
    ],
    [],
  );

  const ledgerElements = useMemo(
    () => [
      {
        pos: [2.5, 0.6, 0] as [number, number, number],
        size: [0.7, 0.45, 0.06] as [number, number, number],
        color: INDIGO,
      },
      {
        pos: [2.8, -0.1, -0.2] as [number, number, number],
        size: [0.55, 0.35, 0.05] as [number, number, number],
        color: VIOLET,
      },
      {
        pos: [2.2, -0.6, 0.1] as [number, number, number],
        size: [0.65, 0.4, 0.05] as [number, number, number],
        color: INDIGO,
      },
      {
        pos: [3.0, 0.2, -0.15] as [number, number, number],
        size: [0.5, 0.3, 0.04] as [number, number, number],
        color: CYAN,
      },
      {
        pos: [2.6, 1.1, -0.1] as [number, number, number],
        size: [0.45, 0.28, 0.04] as [number, number, number],
        color: VIOLET,
      },
    ],
    [],
  );

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-2, 1, 2]} intensity={0.4} color={CYAN} />
      <pointLight position={[2, 1, 2]} intensity={0.4} color={INDIGO} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
        <group>
          {bankElements.map((el, i) => (
            <PieceElement
              key={`bank-${i}`}
              position={el.pos}
              size={el.size}
              color={el.color}
              reconcile={reconcile}
              index={i}
              side="bank"
            />
          ))}
        </group>
      </Float>

      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.3}>
        <group>
          {ledgerElements.map((el, i) => (
            <PieceElement
              key={`ledger-${i}`}
              position={el.pos}
              size={el.size}
              color={el.color}
              reconcile={reconcile}
              index={i}
              side="ledger"
            />
          ))}
        </group>
      </Float>
    </>
  );
}

// onLocked: dipanggil sekali saat elemen sudah terkunci & hijau —
// dipakai parent (HomePage) untuk fade-in glow CSS di belakang canvas.
export default function HeroWebGL({ onLocked }: { onLocked?: () => void }) {
  return (
    <div className="w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene onLocked={onLocked} />
      </Canvas>
    </div>
  );
}
