import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

interface AuthFlipCardProps {
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  front: ReactNode;
  back: ReactNode;
}

export default function AuthFlipCard({
  mode,
  front,
  back,
}: AuthFlipCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  const visible = mode === "login" ? frontRef : backRef;

  useLayoutEffect(() => {
    const el = visible.current;
    if (!el) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, visible]);

  return (
    <div
      style={{ perspective: "1500px" }}
      className="w-full bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-primary-500/20 rounded-2xl shadow-2xl p-6 sm:p-8"
    >
      <motion.div
        animate={{ height }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative overflow-hidden"
      >
        <motion.div
          animate={{ rotateY: mode === "login" ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Sisi depan: Login */}
          <div
            ref={frontRef}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {front}
          </div>

          {/* Sisi belakang: Register (menumpuk, diputar 180°) */}
          <div
            ref={backRef}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              position: "absolute",
              inset: 0,
            }}
          >
            {back}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
