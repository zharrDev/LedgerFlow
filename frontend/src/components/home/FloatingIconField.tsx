import { useEffect, useRef, useState } from "react";
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

// ── Icon definitions: scattered positions (not uniform circle) ──────
interface ScatteredIconDef {
  Icon?: LucideIcon;
  imageSrc?: string;
  size: number;
  color: string;
  /** x/y offset in px from center — scattered, not symmetrical */
  x: number;
  y: number;
  floatDuration: number;
  floatDelay: number;
  floatRange: number;
}

const DEFAULT_ICONS: ScatteredIconDef[] = [
  { Icon: TrendingUp,   size: 46, color: "#0ea5e9", x: -180, y: -140, floatDuration: 4.2, floatDelay: 0,   floatRange: 10 },
  { Icon: Receipt,      size: 40, color: "#8b5cf6", x:  190, y: -100, floatDuration: 5.1, floatDelay: 0.4, floatRange: 8 },
  { Icon: Landmark,     size: 44, color: "#d97706", x: -220, y:   60, floatDuration: 4.8, floatDelay: 0.8, floatRange: 12 },
  { Icon: BarChart3,    size: 42, color: "#059669", x:  210, y:   90, floatDuration: 4.5, floatDelay: 0.2, floatRange: 9 },
  { Icon: Coins,        size: 38, color: "#d97706", x:  -80, y:  200, floatDuration: 5.4, floatDelay: 0.6, floatRange: 11 },
  { Icon: ShieldCheck,  size: 36, color: "#0ea5e9", x:  130, y: -220, floatDuration: 4.9, floatDelay: 1,   floatRange: 7 },
];

// Scale factor for small screens so icons don't overflow
function useScaleFactor(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setScale(0.45);
      else if (w < 1024) setScale(0.65);
      else setScale(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
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

// ── Hub center ──────────────────────────────────────────────────────
const HUB_TOP = "48%";
const HUB_LEFT = "48%";
const HUB_WIDTH = 350;

export default function FloatingIconField({ icons = DEFAULT_ICONS }: { icons?: ScatteredIconDef[] }) {
  const reduced = useReducedMotion();
  const scaleFactor = useScaleFactor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hubPixel, setHubPixel] = useState<{ cx: number; cy: number } | null>(null);

  // Calculate hub center in pixels for SVG lines
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setHubPixel({
        cx: rect.width * 0.48,
        cy: rect.height * 0.48,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const floatMul = reduced ? 0.3 : 1;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-visible">
      {/* ── Dashed lines: each icon → center ── */}
      {hubPixel && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: "visible" }}
        >
          {icons.map((icon, i) => {
            const ix = hubPixel.cx + icon.x * scaleFactor;
            const iy = hubPixel.cy + icon.y * scaleFactor;
            return (
              <line
                key={i}
                x1={hubPixel.cx}
                y1={hubPixel.cy}
                x2={ix}
                y2={iy}
                stroke={icon.color}
                strokeOpacity={0.3}
                strokeWidth={1.5}
                strokeDasharray="6 5"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-22"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
            );
          })}
        </svg>
      )}

      {/* ── Hub: glow + device mockup ── */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB_TOP, left: HUB_LEFT, width: HUB_WIDTH * 1.3, height: HUB_WIDTH * 1.3 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-primary-500/25 blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: HUB_TOP, left: HUB_LEFT, width: HUB_WIDTH }}
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

      {/* ── Scattered icons: positioned absolutely, gentle floating ── */}
      {icons.map((icon, i) => {
        const { Icon } = icon;
        const left = `calc(${HUB_LEFT} + ${icon.x * scaleFactor}px)`;
        const top = `calc(${HUB_TOP} + ${icon.y * scaleFactor}px)`;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left, top, width: icon.size, height: icon.size }}
          >
            <motion.div
              className="w-full h-full rounded-2xl flex items-center justify-center shadow-lg overflow-hidden backdrop-blur-sm"
              style={{
                backgroundColor: `${icon.color}33`,
                border: `1.5px solid ${icon.color}80`,
              }}
              animate={{ y: [0, -icon.floatRange * floatMul, 0] }}
              transition={{
                duration: icon.floatDuration,
                delay: icon.floatDelay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {icon.imageSrc ? (
                <img
                  src={icon.imageSrc}
                  alt=""
                  className="w-full h-full object-contain p-2"
                  draggable={false}
                />
              ) : Icon ? (
                <Icon
                  size={icon.size * 0.5}
                  color={icon.color}
                  strokeWidth={2.25}
                />
              ) : null}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
