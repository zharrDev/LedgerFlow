import { useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FloatingIconProps {
  icon: LucideIcon;
  /** Kelas posisi absolute relatif terhadap container owl, mis. "-left-10 -top-2" */
  className: string;
  /** Durasi siklus float (detik) — bedakan per badge agar tidak serempak */
  duration?: number;
  /** Delay animasi (detik) — bedakan per badge */
  delay?: number;
}

/**
 * Badge bulat kecil semi-transparan dengan glow tipis, melayang idle
 * di sekitar maskot. Murni dekoratif (pointer-events: none) dan statis
 * saat prefers-reduced-motion.
 */
export default function FloatingIcon({
  icon: Icon,
  className,
  duration = 3.5,
  delay = 0,
}: FloatingIconProps) {
  const [floatEnabled] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches,
  );

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-[0_0_18px_rgba(103,232,249,0.25)] w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ${className}`}
      animate={floatEnabled ? { y: [0, -8, 0] } : undefined}
      transition={
        floatEnabled
          ? { repeat: Infinity, duration, delay, ease: "easeInOut" }
          : undefined
      }
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyan-300" />
    </motion.div>
  );
}
