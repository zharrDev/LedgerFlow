// src/components/home/ScrollCardWrapper.tsx
// Pembungkus full-bleed: konten tetap memenuhi lebar halaman seperti biasa
// (tanpa card melayang), hanya diberi efek smooth saat discroll —
// border-radius menyusut halus dan card sedikit mengecil mengikuti progress.
import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function ScrollCardWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start start", "end start"],
  });

  const borderRadius = useTransform(
    scrollYProgress,
    [0, 0.5],
    ["28px", "14px"],
  );
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.98]);

  return (
    <motion.div
      ref={cardRef}
      style={{ borderRadius, scale, willChange: "transform" }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}