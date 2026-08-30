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
// @ts-expect-error — Vite resolves asset imports
import heroDeviceMockup from "../../assets/hp&lapropp.webp";

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

const DEFAULT_ICONS: OrbitIconDef[] = [
  { Icon: TrendingUp, size: 46, color: "#0ea5e9", orbitRadius: 170, orbitDuration: 22, startAngle: 0, clockwise: false },
  { Icon: Receipt, size: 40, color: "#8b5cf6", orbitRadius: 150, orbitDuration: 18, startAngle: 60, clockwise: false },
  { Icon: Landmark, size: 44, color: "#d97706", orbitRadius: 185, orbitDuration: 26, startAngle: 120, clockwise: false },
  { Icon: BarChart3, size: 42, color: "#059669", orbitRadius: 160, orbitDuration: 20, startAngle: 180, clockwise: false },
  { Icon: Coins, size: 38, color: "#d97706", orbitRadius: 175, orbitDuration: 24, startAngle: 240, clockwise: false },
  { Icon: ShieldCheck, size: 36, color: "#0ea5e9", orbitRadius: 155, orbitDuration: 19, startAngle: 300, clockwise: false },
];

const HUB = { top: "48%", left: "48%" };
const HUB_WIDTH = 280;

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
      {/* Dashed line from center to icon — rotates with the arm */}
      <div
        className="absolute inset-y-0 left-0 right-9 border-t border-dashed opacity-40"
        style={{ borderColor: icon.color }}
      />

      {/* Icon at arm tip — counter-rotate to stay upright */}
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
        style={{ top: HUB.top, left: HUB.left, width: HUB_WIDTH * 1.3, height: HUB_WIDTH * 1.3 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-primary-500/25 blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Device mockup — hub center, float gently */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB.top, left: HUB.left, width: HUB_WIDTH }}
      >
        <motion.img
          src={heroDeviceMockup}
          alt="Tampilan dashboard LedgerFlow di laptop dan ponsel"
          className="w-full h-auto drop-shadow-2xl select-none"
          draggable={false}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Orbit arms — anchored exactly at hub center */}
      <div
        className="absolute"
        style={{ top: HUB.top, left: HUB.left, width: 0, height: 0 }}
      >
        {icons.map((icon, i) => (
          <OrbitArm key={i} icon={icon} reduced={reduced} />
        ))}
      </div>
    </div>
  );
}
