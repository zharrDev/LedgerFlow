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

// ── Arah tambahan ─────────────────────────────────────────────────────
// Muncul dari kiri (x: -32 → 0), dll. Mempertahankan gaya yang sama
// (fade + geser) hanya dengan arah berbeda.

export const SCROLL_REVEAL_LEFT: ScrollRevealProps = {
  initial: { opacity: 0, x: -44 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.9, ease: EASE },
};

export const SCROLL_REVEAL_RIGHT: ScrollRevealProps = {
  initial: { opacity: 0, x: 44 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.9, ease: EASE },
};

export const SCROLL_REVEAL_SCALE: ScrollRevealProps = {
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.9, ease: EASE },
};

export const SCROLL_REVEAL_FADE: ScrollRevealProps = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.9, ease: EASE },
};
