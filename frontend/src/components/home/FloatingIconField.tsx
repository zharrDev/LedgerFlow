import { useEffect, useMemo, useState } from "react";
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

interface IconDef {
  Icon?: LucideIcon;
  imageSrc?: string;
  top: string;
  left: string;
  size: number;
  color: string;
  orbitRadius: number;
  orbitDuration: number;
  orbitDelay: number;
  clockwise: boolean;
}

const DEFAULT_ICONS: IconDef[] = [
  { Icon: TrendingUp, top: "10%", left: "20%", size: 46, color: "#0ea5e9", orbitRadius: 16, orbitDuration: 6, orbitDelay: 0, clockwise: true },
  { Icon: Receipt, top: "8%", left: "70%", size: 40, color: "#8b5cf6", orbitRadius: 14, orbitDuration: 7, orbitDelay: 0.3, clockwise: false },
  { Icon: Landmark, top: "45%", left: "8%", size: 44, color: "#d97706", orbitRadius: 18, orbitDuration: 5.5, orbitDelay: 0.6, clockwise: true },
  { Icon: BarChart3, top: "88%", left: "78%", size: 42, color: "#059669", orbitRadius: 15, orbitDuration: 6.5, orbitDelay: 0.9, clockwise: false },
  { Icon: Coins, top: "82%", left: "18%", size: 38, color: "#d97706", orbitRadius: 17, orbitDuration: 7.2, orbitDelay: 0.2, clockwise: true },
  { Icon: ShieldCheck, top: "42%", left: "88%", size: 36, color: "#0ea5e9", orbitRadius: 13, orbitDuration: 5.8, orbitDelay: 0.5, clockwise: false },
];

const HUB = { top: "48%", left: "48%" };
const HUB_WIDTH = 220;
const ORBIT_STEPS = 24;

function buildOrbitPath(radius: number, clockwise: boolean) {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i <= ORBIT_STEPS; i++) {
    const angle = (i / ORBIT_STEPS) * Math.PI * 2 * (clockwise ? 1 : -1);
    x.push(Math.cos(angle) * radius);
    y.push(Math.sin(angle) * radius);
  }
  return { x, y };
}

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

export default function FloatingIconField({ icons = DEFAULT_ICONS }: { icons?: IconDef[] }) {
  const reduced = useReducedMotion();
  const speedMultiplier = reduced ? 0.3 : 1;

  const orbitPaths = useMemo(
    () => icons.map((icon) => buildOrbitPath(reduced ? icon.orbitRadius * 0.4 : icon.orbitRadius, icon.clockwise)),
    [icons, reduced],
  );

  return (
    <div className="relative w-full h-full">
      {/* Dashed lines — anchor at each icon's base position */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {icons.map((icon, i) => (
          <line
            key={i}
            x1={icon.left}
            y1={icon.top}
            x2={HUB.left}
            y2={HUB.top}
            stroke="#22d3ee"
            strokeOpacity={0.35}
            strokeWidth={1.5}
            strokeDasharray="4 5"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.2s" repeatCount="indefinite" />
          </line>
        ))}
      </svg>

      {/* Hub glow */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB.top, left: HUB.left, width: HUB_WIDTH * 1.3, height: HUB_WIDTH * 1.3 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-primary-500/25 blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 3.2 / speedMultiplier, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Hub device mockup — float (not orbit) */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB.top, left: HUB.left, width: HUB_WIDTH }}
      >
        <motion.img
          src={heroDeviceMockup}
          alt="Tampilan dashboard LedgerFlow di laptop dan ponsel"
          className="w-full h-auto drop-shadow-2xl select-none"
          draggable={false}
          animate={{ y: [0, -8 * speedMultiplier, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Orbiting icons */}
      {icons.map((icon, i) => {
        const { Icon } = icon;
        const path = orbitPaths[i];
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: icon.top, left: icon.left, width: icon.size, height: icon.size }}
          >
            <motion.div
              className="w-full h-full rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
              style={{
                backgroundColor: `${icon.color}33`,
                border: `1.5px solid ${icon.color}80`,
              }}
              animate={{ x: path.x, y: path.y }}
              transition={{
                duration: icon.orbitDuration / speedMultiplier,
                delay: icon.orbitDelay,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {icon.imageSrc ? (
                <img src={icon.imageSrc} alt="" className="w-full h-full object-contain p-2" draggable={false} />
              ) : Icon ? (
                <Icon size={icon.size * 0.5} color={icon.color} strokeWidth={2.25} />
              ) : null}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
