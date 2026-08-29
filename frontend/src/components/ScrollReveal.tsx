// src/components/ScrollReveal.tsx
// Pembungkus animasi scroll-reveal yang reusable.
// Memunculkan konten secara halus (& lebih) saat elemen masuk viewport.
// Dipicu oleh IntersectionObserver (whileInView) sehingga bekerja baik di
// scroll window maupun container overflow seperti homepage.

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export type RevealDirection = "up" | "down" | "left" | "right" | "scale" | "fade";

type ScrollRevealProps = {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  once?: boolean;
  distance?: number;
  className?: string;
  stagger?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function buildVariants(
  direction: RevealDirection,
  distance: number,
  duration: number,
  delay: number,
): Variants {
  let hidden: Record<string, number> = { opacity: 0 };

  switch (direction) {
    case "up":
      hidden.y = distance;
      break;
    case "down":
      hidden.y = -distance;
      break;
    case "left":
      hidden.x = distance;
      break;
    case "right":
      hidden.x = -distance;
      break;
    case "scale":
      hidden.scale = 0.85;
      break;
    case "fade":
      break;
  }

  return {
    hidden,
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration, ease: EASE, delay },
    },
  };
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.9,
  once = true,
  distance = 44,
  className,
  stagger = false,
}: ScrollRevealProps) {
  const variants = buildVariants(direction, distance, duration, delay);

  if (stagger) {
    return (
      <motion.div
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="show"
        viewport={{ once, amount: 0.18 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.18 }}
      variants={{
        hidden: variants.hidden,
        show: variants.show,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Variant helper untuk stagger anak ────────────────────────────────
// Pakai pada parent <ScrollReveal stagger> lalu anak pakai
// <motion.div variants={childUp}/> dan akan otomatis tertunda satu-satu.
export const childUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

export const childRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

export const childLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

export default ScrollReveal;
