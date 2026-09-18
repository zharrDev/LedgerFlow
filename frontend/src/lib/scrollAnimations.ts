// frontend/src/lib/scrollAnimations.ts
// Konstanta animasi scroll-reveal standar untuk seluruh homepage
// dan komponen pendukungnya. Dipakai via spread props:
//   <motion.div {...SCROLL_REVEAL} className="...">
// Untuk list card dengan index, pakai:
//   <motion.div {...SCROLL_REVEAL_STAGGER(idx)} ...>

import type { MotionProps } from "framer-motion";

type ScrollRevealProps = Pick<
  MotionProps,
  "initial" | "whileInView" | "viewport" | "transition"
>;

const EASE = [0.22, 1, 0.36, 1] as const;

export const SCROLL_REVEAL: ScrollRevealProps = {
  initial: { opacity: 0, y: 44 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.9, ease: EASE },
};

export const SCROLL_REVEAL_STAGGER = (idx: number): ScrollRevealProps => ({
  ...SCROLL_REVEAL,
  transition: { ...SCROLL_REVEAL.transition, delay: idx * 0.12 },
});
