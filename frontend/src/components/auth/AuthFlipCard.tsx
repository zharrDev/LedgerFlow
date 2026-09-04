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

  useLayoutEffect(() => {
    // Ukur sisi AKTIF saja — tinggi card "pas" dengan kontennya (mode login
    // tidak mewarisi tinggi register yang lebih tinggi, jadi tak ada ruang
    // kosong di bawah link "Sign up"). Cap tinggi hanya di desktop (viewport
    // pendek → sisi card scroll internal); di mobile card tumbuh penuh dan
    // halaman yang discroll (lihat AuthPage).
    const measure = () => {
      const frontH = frontRef.current?.scrollHeight ?? 0;
      const backH = backRef.current?.scrollHeight ?? 0;
      const activeH = mode === "login" ? frontH : backH;
      const cap =
        window.innerWidth >= 1024
          ? Math.max(320, window.innerHeight - 112)
          : Number.POSITIVE_INFINITY;
      setHeight(Math.min(activeH, cap));
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
  }, [mode]);

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
            className={`pr-3.5 scrollbar-thin ${
              mode === "login"
                ? "overflow-y-auto"
                : "overflow-visible pointer-events-none"
            }`}
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
            className={`pr-3.5 scrollbar-thin ${
              mode === "register"
                ? "overflow-y-auto"
                : "overflow-visible pointer-events-none"
            }`}
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
