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
      className="relative w-full rounded-2xl border border-primary-500/20 p-6 sm:p-8"
    >
      {/* Latar kaca dirender sebagai SIBLING scene 3D (bukan ancestor):
          backdrop-filter pada ancestor mem-flat-kan konteks 3D dan membuat
          backface-visibility diabaikan di Firefox (sisi belakang tembus
          pandang). Visual kartu tetap identik. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-white/80 dark:bg-[#111827]/80 shadow-2xl backdrop-blur-xl"
      />
      <motion.div
        animate={{ height }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative overflow-hidden"
      >
        <motion.div
          animate={{ rotateY: mode === "login" ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          style={{ transformStyle: "preserve-3d" }}
          className="h-full"
        >
          {/* Sisi depan: Login. Elemen sisi WAJIB polos (tanpa overflow):
              overflow pada elemen yang sama merusak backface-visibility di
              Firefox. Scroll dipegang div pembungkus di dalamnya. */}
          <div
            ref={frontRef}
            className={mode === "login" ? "" : "pointer-events-none"}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              MozBackfaceVisibility: "hidden",
              position: "absolute",
              inset: 0,
            }}
          >
            <div
              className={
                mode === "login"
                  ? "h-full max-h-full overflow-y-auto scrollbar-thin pr-3.5"
                  : ""
              }
            >
              {front}
            </div>
          </div>

          {/* Sisi belakang: Register (menumpuk, diputar 180°) */}
          <div
            ref={backRef}
            className={mode === "register" ? "" : "pointer-events-none"}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              MozBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              position: "absolute",
              inset: 0,
            }}
          >
            <div
              className={
                mode === "register"
                  ? "h-full max-h-full overflow-y-auto scrollbar-thin pr-3.5"
                  : ""
              }
            >
              {back}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
