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
// @ts-expect-error — Vite resolves ?url for non-JS assets
import heroDeviceMockup from "../../assets/hp&laptop.webp";

interface IconDef {
  Icon?: LucideIcon;
  imageSrc?: string;
  top: string;
  left: string;
  size: number;
  color: string;
  floatDuration: number;
  floatDelay: number;
  floatRange: number;
}

const DEFAULT_ICONS: IconDef[] = [
  { Icon: TrendingUp, top: "6%", left: "14%", size: 46, color: "#22d3ee", floatDuration: 4.2, floatDelay: 0, floatRange: 10 },
  { Icon: Receipt, top: "12%", left: "82%", size: 40, color: "#a78bfa", floatDuration: 5.1, floatDelay: 0.4, floatRange: 8 },
  { Icon: Landmark, top: "50%", left: "4%", size: 44, color: "#f5c542", floatDuration: 4.8, floatDelay: 0.8, floatRange: 12 },
  { Icon: BarChart3, top: "78%", left: "84%", size: 42, color: "#34d399", floatDuration: 4.5, floatDelay: 0.2, floatRange: 9 },
  { Icon: Coins, top: "88%", left: "24%", size: 38, color: "#f5c542", floatDuration: 5.4, floatDelay: 0.6, floatRange: 11 },
  { Icon: ShieldCheck, top: "4%", left: "52%", size: 36, color: "#22d3ee", floatDuration: 4.9, floatDelay: 1, floatRange: 7 },
];

const HUB = { top: "48%", left: "50%" };
const HUB_WIDTH = 220;

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

  return (
    <div className="relative w-full h-full">
      {/* Dashed lines from each icon to hub */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {icons.map((icon, i) => (
          <line
            key={i}
            x1={icon.left}
            y1={icon.top}
            x2={HUB.left}
            y2={HUB.top}
            stroke="#22d3ee"
            strokeOpacity={0.25}
            strokeWidth={1.5}
            strokeDasharray="4 5"
          >
            {!reduced && (
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.2s" repeatCount="indefinite" />
            )}
          </line>
        ))}
      </svg>

      {/* Hub glow */}
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/20 blur-2xl"
        style={{ top: HUB.top, left: HUB.left, width: HUB_WIDTH * 1.3, height: HUB_WIDTH * 1.3 }}
        animate={reduced ? {} : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hub device mockup */}
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB.top, left: HUB.left, width: HUB_WIDTH }}
        animate={reduced ? {} : { y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          src={heroDeviceMockup}
          alt="Tampilan dashboard LedgerFlow di laptop dan ponsel"
          className="w-full h-auto drop-shadow-2xl select-none"
          draggable={false}
        />
      </motion.div>

      {/* Floating icons */}
      {icons.map((icon, i) => {
        const { Icon } = icon;
        return (
          <motion.div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm overflow-hidden"
            style={{
              top: icon.top,
              left: icon.left,
              width: icon.size,
              height: icon.size,
              backgroundColor: `${icon.color}1A`,
              border: `1px solid ${icon.color}40`,
            }}
            animate={reduced ? {} : { y: [0, -icon.floatRange, 0], rotate: [0, i % 2 === 0 ? 3 : -3, 0] }}
            transition={{ duration: icon.floatDuration, delay: icon.floatDelay, repeat: Infinity, ease: "easeInOut" }}
          >
            {icon.imageSrc ? (
              <img src={icon.imageSrc} alt="" className="w-full h-full object-contain p-2" draggable={false} />
            ) : Icon ? (
              <Icon size={icon.size * 0.5} color={icon.color} strokeWidth={2} />
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
