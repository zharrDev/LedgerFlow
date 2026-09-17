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
  // Firefox mengabaikan backface-visibility bila digabung backdrop-blur /
  // overflow (sisi belakang tembus pandang) → pakai crossfade opacity tanpa
  // 3D sama sekali. Chrome dkk tetap flip 3D seperti semula.
  const [isFirefox] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /firefox|fxios/i.test(navigator.userAgent || ""),
  );

  useLayoutEffect(() => {
    // Tinggi card DIIKUTKAN dari sisi LOGIN (front) — register (back)
    // menyesuaikan tinggi yang sama; kontennya yang lebih panjang cukup
    // scroll internal di dalam card. Dengan satu tinggi acuan, flip
    // login <-> register tidak mengubah ukuran card sama sekali.
    // Cap viewport tetap aktif: bila login pun melebihi layar, sisi aktif
    // scroll internal (page tidak discroll — AuthPage locked 100dvh).
    const measure = () => {
      const frontH = frontRef.current?.scrollHeight ?? 0;
      const cap =
        window.innerWidth >= 1024
          ? Math.max(320, window.innerHeight - 112)
          : Math.max(320, window.innerHeight - 180);
      setHeight(Math.max(1, Math.min(frontH, cap)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (frontRef.current) ro.observe(frontRef.current);
    if (backRef.current) ro.observe(backRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

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
          animate={isFirefox ? undefined : { rotateY: mode === "login" ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          style={isFirefox ? undefined : { transformStyle: "preserve-3d" }}
          className="h-full"
        >
          {/* Sisi depan: Login — max-h-full agar terkonstrain tinggi card
              (bisa scroll internal saat konten melebihi cap viewport) */}
          <div
            ref={frontRef}
            className={
              mode === "login"
                ? "max-h-full overflow-y-auto scrollbar-thin pr-3.5"
                : "pointer-events-none"
            }
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              ...(isFirefox
                ? {
                    position: "absolute",
                    inset: 0,
                    opacity: mode === "login" ? 1 : 0,
                    transition: "opacity 0.35s ease",
                  }
                : undefined),
            }}
          >
            {front}
          </div>

          {/* Sisi belakang: Register (menumpuk, diputar 180°) */}
          <div
            ref={backRef}
            className={
              mode === "register"
                ? "overflow-y-auto scrollbar-thin pr-3.5"
                : "pointer-events-none"
            }
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              ...(isFirefox
                ? {
                    opacity: mode === "register" ? 1 : 0,
                    transition: "opacity 0.35s ease",
                  }
                : { transform: "rotateY(180deg)" }),
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
