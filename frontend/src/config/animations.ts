// frontend/src/config/animations.ts
// Sentralisasi semua animation tokens, variants, dan timing.
// Impor dari sini supaya animasi konsisten di seluruh app.
//
// Pemakaian:
//   import { fadeInUp, staggerContainer } from '../config/animations'
//   <motion.div variants={fadeInUp}>...</motion.div>

import type { Variants, Transition } from "framer-motion";

// ── Timing ─────────────────────────────────────────────────────────
export const easings = {
  easeInOut: [0.4, 0, 0.2, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  sharp: [0.4, 0, 0.6, 1] as const,
} as const;

export const durations = {
  fastest: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
  slowest: 0.5,
} as const;

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const smoothSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
};

// ── Common Variants ────────────────────────────────────────────────

/** Fade + slide up — paling umum untuk card, section, list item */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/** Fade saja — untuk overlay, backdrop, elements yang tidak bergerak */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Scale + fade — untuk modal, popup, tooltip */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/** Slide from right — untuk drawer, sidebar mobile */
export const slideInRight: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};

/** Slide from left — untuk sidebar desktop, back navigation */
export const slideInLeft: Variants = {
  initial: { x: "-100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "-100%", opacity: 0 },
};

// ── Stagger Containers ─────────────────────────────────────────────

/** Parent container — pakai di wrapper, anak otomatis stagger */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Setiap anak otomatis fade-in-up */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// ── Page Transitions ───────────────────────────────────────────────

/** Transisi halaman — fade + slide ringan */
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: durations.fast, ease: easings.easeIn },
  },
};

// ── Modal ──────────────────────────────────────────────────────────

/** Backdrop overlay — fade only */
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Modal content — scale + fade, spring */
export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: durations.fast },
  },
};

// ── Card Hover ─────────────────────────────────────────────────────

/** Card hover — untuk KPI, stats, transaction cards */
export const cardHover: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
};

// ── Button ─────────────────────────────────────────────────────────

/** Button tap — shrink saat ditekan */
export const buttonTap = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.03 },
} as const;

// ── Toast ──────────────────────────────────────────────────────────

/** Toast masuk dari kanan */
export const toastSlideIn: Variants = {
  initial: { opacity: 0, x: 80, scale: 0.92 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 28 },
  },
  exit: {
    opacity: 0,
    x: 80,
    scale: 0.92,
    transition: { duration: durations.fast },
  },
};
