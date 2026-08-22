import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const TRAIL_LENGTH = 10;
const THROTTLE_MS = 16; // ~60fps

interface TrailPoint {
  id: number;
  x: number;
  y: number;
}

/**
 * Ekor komet — titik cahaya kecil mengikuti kursor dengan jejak memudar.
 * Hanya aktif di device ber-cursor (pointer: fine + hover: hover).
 * Sembunyi otomatis di touch device.
 */
export default function CursorTrail() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mqFine = window.matchMedia("(pointer: fine)");
    const mqHover = window.matchMedia("(hover: hover)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (mqFine.matches && mqHover.matches && mqReduced.matches) {
      setEnabled(true);
    }
  }, []);

  const [trail, setTrail] = useState<TrailPoint[]>(() =>
    Array.from({ length: TRAIL_LENGTH }, (_, i) => ({ id: i, x: -100, y: -100 }))
  );
  const counterRef = useRef(0);
  const lastTimeRef = useRef(0);

  const handleMove = useCallback((e: PointerEvent) => {
    const now = Date.now();
    if (now - lastTimeRef.current < THROTTLE_MS) return;
    lastTimeRef.current = now;

    counterRef.current++;
    setTrail((prev) => {
      const newPoint: TrailPoint = { id: counterRef.current, x: e.clientX, y: e.clientY };
      return [newPoint, ...prev.slice(0, TRAIL_LENGTH - 1)];
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [enabled, handleMove]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden
    >
      {trail.map((point, index) => {
        const progress = 1 - index / TRAIL_LENGTH;
        const size = Math.max(2, Math.round(progress * 10));
        const opacity = progress * 0.7;

        return (
          <motion.div
            key={point.id}
            initial={{ opacity, scale: 1 }}
            animate={{ opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              left: point.x - size / 2,
              top: point.y - size / 2,
              width: size,
              height: size,
              backgroundColor: "rgb(34, 211, 238)", // cyan-400
              boxShadow: `0 0 ${size * 2}px ${size}px rgba(34, 211, 238, ${opacity * 0.5})`,
            }}
          />
        );
      })}
    </div>
  );
}
