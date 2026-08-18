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
    const measure = () =>
      setHeight(Math.min(el.scrollHeight, Math.max(320, window.innerHeight - 112)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
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
            className="overflow-y-auto scrollbar-thin pr-2.5"
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
            className="overflow-y-auto scrollbar-thin pr-2.5"
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
