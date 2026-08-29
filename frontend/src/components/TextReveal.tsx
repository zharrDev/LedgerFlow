// src/components/TextReveal.tsx
// Animasi teks huruf-per-huruf: muncul dari bawah ke atas, berurutan
// kiri → kanan, dipicu saat elemen masuk viewport (scroll).
//
// Prop dasar:
//   <TextReveal text="Kelola Masa Depan" className="..." />
//
// Setiap kata dibungkus inline-block (supaya turun baris wajar) dan tiap
// huruf mendapat delay berjenjang sehingga tampak "terketik" satu-satu.

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type TextRevealProps = {
  text: string;
  className?: string;
  /** delay awal sebelum huruf pertama (detik) */
  delay?: number;
  /** jarak antar huruf (detik) */
  staggerDelay?: number;
  once?: boolean;
};

export function TextReveal({
  text,
  className,
  delay = 0,
  staggerDelay = 0.035,
  once = true,
}: TextRevealProps) {
  const words = text.split(" ");

  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={`w${wi}`} className="inline-block whitespace-nowrap">
          {word.split("").map((char, ci) => {
            const charIndex = words
              .slice(0, wi)
              .reduce((acc, w) => acc + w.length + 1, 0) + ci;
            return (
              <motion.span
                key={`c${ci}`}
                className="inline-block"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  ease: EASE,
                  delay: delay + charIndex * staggerDelay,
                }}
                aria-hidden
              >
                {char}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

// ── WordReveal: animasi per-kata (bukan per-huruf), cocok untuk kalimat ─
type WordRevealProps = {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  once?: boolean;
  children?: ReactNode;
};

export function WordReveal({
  text,
  className,
  delay = 0,
  staggerDelay = 0.09,
  once = true,
  children,
}: WordRevealProps) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, wi) => (
        <span key={`w${wi}`} className="inline-block whitespace-nowrap">
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once, margin: "-40px" }}
            transition={{
              duration: 0.5,
              ease: EASE,
              delay: delay + wi * staggerDelay,
            }}
          >
            {word}
          </motion.span>
          {wi < words.length - 1 && (
            <span className="inline-block">&nbsp;</span>
          )}
        </span>
      ))}
      {children}
    </span>
  );
}

export default TextReveal;
