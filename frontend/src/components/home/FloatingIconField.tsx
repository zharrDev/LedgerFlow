import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Bot,
  Landmark,
  BarChart3,
  Coins,
  ShieldCheck,
  CreditCard,
  FileText,
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

// Base values at reference width 800px
const BASE_ORBIT_RADIUS = 135;
const BASE_ICON_SIZE = 50;
const BASE_HUB_WIDTH = 350;

const DEFAULT_ICONS: OrbitIconDef[] = [
  { Icon: TrendingUp, size: BASE_ICON_SIZE, color: "#0ea5e9", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 180, clockwise: false },
  { Icon: Bot, size: BASE_ICON_SIZE, color: "#8b5cf6", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 225, clockwise: false },
  { Icon: Landmark, size: BASE_ICON_SIZE, color: "#d97706", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 270, clockwise: false },
  { Icon: BarChart3, size: BASE_ICON_SIZE, color: "#059669", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 315, clockwise: false },
  { Icon: Coins, size: BASE_ICON_SIZE, color: "#d97706", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 0, clockwise: false },
  { Icon: ShieldCheck, size: BASE_ICON_SIZE, color: "#0ea5e9", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 45, clockwise: false },
  { Icon: CreditCard, size: BASE_ICON_SIZE, color: "#8b5cf6", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 90, clockwise: false },
  { Icon: FileText, size: BASE_ICON_SIZE, color: "#059669", orbitRadius: BASE_ORBIT_RADIUS, orbitDuration: 22, startAngle: 135, clockwise: false },
];

const REF_WIDTH = 800;

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

function useResponsiveScale(containerRef: React.RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    const s = Math.min(1, Math.max(0.38, w / REF_WIDTH));
    setScale(s);
  }, [containerRef]);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, containerRef]);

  return scale;
}

function OrbitArm({ icon, reduced, scale }: { icon: OrbitIconDef; reduced: boolean; scale: number }) {
  const { Icon } = icon;
  const direction = icon.clockwise ? 360 : -360;
  const duration = reduced ? icon.orbitDuration * 3 : icon.orbitDuration;
  const r = icon.orbitRadius * scale;
  const sz = icon.size * scale;

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 h-px"
      style={{
        width: r,
        transformOrigin: "0px 0px",
      }}
      initial={{ rotate: icon.startAngle }}
      animate={{ rotate: icon.startAngle + direction }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
        style={{
          right: -(sz / 2),
          width: sz,
          height: sz,
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
          <Icon size={sz * 0.5} color={icon.color} strokeWidth={2.25} />
        ) : null}
      </motion.div>
    </motion.div>
  );
}

export default function FloatingIconField({ icons = DEFAULT_ICONS }: { icons?: OrbitIconDef[] }) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useResponsiveScale(containerRef);

  const hubWidth = BASE_HUB_WIDTH * scale;
  const orbitR = BASE_ORBIT_RADIUS * scale;
  const armClip = 600 * scale;

  const hubTop = "48%";
  const hubLeft = "55%";
  const ringLeft = "37%";

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Glow hub */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: hubTop, left: hubLeft, width: hubWidth * 1.3, height: hubWidth * 1.3 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-primary-500/25 blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Planetary orbit ring — solid semicircle */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: hubTop,
          left: ringLeft,
          width: orbitR * 2,
          height: orbitR * 2,
          borderWidth: 0.5,
          borderStyle: "solid",
          borderColor: "#94a3b8",
          borderRadius: "50%",
          opacity: 0.3,
          transform: "translate(-50%, -50%)",
          clipPath: "inset(0 50% 0 0)",
        }}
      />

      {/* Orbit arms */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: hubTop,
          left: ringLeft,
          width: armClip,
          height: armClip,
          transform: "translate(-50%, -50%)",
        }}
      >
        {icons.map((icon, i) => (
          <OrbitArm key={i} icon={icon} reduced={reduced} scale={scale} />
        ))}
      </div>

      {/* Device mockup — hub center, on top */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: hubTop, left: hubLeft, width: hubWidth, zIndex: 10 }}
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
