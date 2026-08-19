// src/components/home/ScrollCardWrapper.tsx
// Bungkus konten landing dalam "card" membulat besar yang melayang di atas
// kanvas abu-abu solid. Saat halaman discroll, border-radius mengecil dan
// card menyusut halus mengikuti progress scroll.
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
    ["40px", "24px"],
  );
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.98]);

  return (
    <div className="px-3 sm:px-6 pt-20 pb-6">
      <motion.div
        ref={cardRef}
        style={{ borderRadius, scale, willChange: "transform" }}
        className="bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  );
}
