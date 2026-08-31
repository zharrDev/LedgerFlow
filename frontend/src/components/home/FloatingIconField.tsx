import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Receipt,
  Landmark,
  BarChart3,
  Coins,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import heroDeviceMockup from "../../assets/Rekomendasi-Laptop-untuk-Finance--1200x900.webp";

interface OrbitIconDef {
  Icon?: LucideIcon;
  imageSrc?: string;
  size: number;
  color: string;
  orbitRadius: number;
  orbitDuration: number;
  startAngle: number;
  clockwise: boolean;
}

const SHARED_ORBIT_RADIUS = 135;

const DEFAULT_ICONS: OrbitIconDef[] = [
  { Icon: TrendingUp, size: 50, color: "#0ea5e9", orbitRadius: SHARED_ORBIT_RADIUS, orbitDuration: 22, startAngle: 180, clockwise: false },
  { Icon: Receipt, size: 50, color: "#8b5cf6", orbitRadius: SHARED_ORBIT_RADIUS, orbitDuration: 22, startAngle: 240, clockwise: false },
  { Icon: Landmark, size: 50, color: "#d97706", orbitRadius: SHARED_ORBIT_RADIUS, orbitDuration: 22, startAngle: 300, clockwise: false },
  { Icon: BarChart3, size: 50, color: "#059669", orbitRadius: SHARED_ORBIT_RADIUS, orbitDuration: 22, startAngle: 0, clockwise: false },
  { Icon: Coins, size: 50, color: "#d97706", orbitRadius: SHARED_ORBIT_RADIUS, orbitDuration: 22, startAngle: 60, clockwise: false },
  { Icon: ShieldCheck, size: 50, color: "#0ea5e9", orbitRadius: SHARED_ORBIT_RADIUS, orbitDuration: 22, startAngle: 120, clockwise: false },
];

const HUB = { top: "48%", left: "48%" };
const HUB_WIDTH = 350;
const HUB_IMAGE_LEFT = "60%";
const ARM_CLIP_SIZE = 600;
const RING_LEFT = "35%";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function OrbitArm({ icon, reduced }: { icon: OrbitIconDef; reduced: boolean }) {
  const { Icon } = icon;
  const direction = icon.clockwise ? 360 : -360;
  const duration = reduced ? icon.orbitDuration * 3 : icon.orbitDuration;

    return (
      <motion.div
        className="absolute top-1/2 left-1/2 h-px"
        style={{
          width: icon.orbitRadius,
          transformOrigin: "0px 0px",
        }}
        initial={{ rotate: icon.startAngle }}
        animate={{ rotate: icon.startAngle + direction }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
          style={{
            right: 0,
            width: icon.size,
            height: icon.size,
            backgroundColor: `${icon.color}33`,
            border: `1.5px solid ${icon.color}80`,
          }}
          initial={{ rotate: -icon.startAngle }}
          animate={{ rotate: -(icon.startAngle + direction) }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
          {icon.imageSrc ? (
            <img src={icon.imageSrc} alt="" className="w-full h-full object-contain p-2" draggable={false} />
          ) : Icon ? (
            <Icon size={icon.size * 0.5} color={icon.color} strokeWidth={2.25} />
          ) : null}
        </motion.div>
      </motion.div>
    );
  }

export default function FloatingIconField({ icons = DEFAULT_ICONS }: { icons?: OrbitIconDef[] }) {
  const reduced = useReducedMotion();

  return (
    <div className="relative w-full h-full">
      {/* Glow hub */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB.top, left: HUB_IMAGE_LEFT, width: HUB_WIDTH * 1.3, height: HUB_WIDTH * 1.3 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-primary-500/25 blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Planetary orbit ring — solid semicircle, right half hidden by image */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: HUB.top,
          left: RING_LEFT,
          width: SHARED_ORBIT_RADIUS * 2,
          height: SHARED_ORBIT_RADIUS * 2,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "#94a3b8",
          borderRadius: "50%",
          opacity: 0.3,
          transform: "translate(-50%, -50%)",
          clipPath: "inset(0 50% 0 0)",
        }}
      />

      {/* Orbit arms — anchored at ring center */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: HUB.top,
          left: RING_LEFT,
          width: ARM_CLIP_SIZE,
          height: ARM_CLIP_SIZE,
          transform: "translate(-50%, -50%)",
        }}
      >
        {icons.map((icon, i) => (
          <OrbitArm key={i} icon={icon} reduced={reduced} />
        ))}
      </div>

      {/* Device mockup — hub center, shifted slightly right, on top */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB.top, left: HUB_IMAGE_LEFT, width: HUB_WIDTH, zIndex: 10 }}
      >
        <motion.img
          src={heroDeviceMockup}
          alt="Tampilan dashboard LedgerFlow di laptop dan ponsel"
          className="w-full h-auto drop-shadow-2xl select-none rounded-2xl"
          draggable={false}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
