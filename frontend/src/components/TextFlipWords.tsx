import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// TextFlipWords — animasi pergantian teks per KATA dengan flip 3D (rotateX)
// + blur. Dipakai untuk transisi ganti bahasa (ID↔EN): kata lama "jatuh" ke
// BELAKANG sambil mengeblur keluar, lalu kata baru bangkit dari posisi
// terbalik itu satu per satu (stagger) — efek kartu split-flap yang halus.
//
// Tempo sengaja PELAN & halus (durasi 0.5s/kata, easing easeOutCubic) sesuai
// arahan desain; exit tetap cepat (0.2s) supaya tidak terasa nunggu.
//
// - `language` dipakai sebagai key: begitu berubah, seluruh blok di-animate
//   ulang (AnimatePresence mode="wait" — exit dulu, lalu masuk stagger).
// - `wordClassName` untuk styling per kata (wajib dipakai bila teks berada
//   di dalam efek bg-clip-text/gradient — transform pada child bisa
//   merusak clip kalau gradient dipasang di parent).
// - Hormati prefers-reduced-motion: cukup cross-fade, tanpa rotasi/blur.

interface TextFlipWordsProps {
  text: string;
  /** Key pemicu re-animate (mis. bahasa aktif). */
  language?: string;
  className?: string;
  /** Class tambahan untuk tiap kata (mis. gradient text). */
  wordClassName?: string;
  /** Delay awal sebelum kata pertama masuk (detik). */
  delay?: number;
  /** Jeda antar kata (detik). */
  stagger?: number;
}

export function TextFlipWords({
  text,
  language,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.04,
}: TextFlipWordsProps) {
  const reduced = useReducedMotion();
  const key = `${language ?? ""}:${text}`;
  const words = text.split(" ");

  return (
    <span
      className={className}
      style={{ perspective: 600, display: "inline-block" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={key}
          aria-label={text}
          className="inline"
          style={{ transformStyle: "preserve-3d" }}
        >
          {words.map((word, i) => (
            <motion.span
              key={`${key}::${i}`}
              aria-hidden="true"
              className={`inline-block will-change-transform ${wordClassName ?? ""}`}
              style={{ transformOrigin: "50% 100%" }}
              initial={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, rotateX: 90, y: "0.35em", filter: "blur(6px)" }
              }
              animate={
                reduced
                  ? { opacity: 1 }
                  : { opacity: 1, rotateX: 0, y: "0em", filter: "blur(0px)" }
              }
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : {
                      // jatuh ke belakang + memudar kabur: arah sama dengan
                      // pose awal kata baru → transisi terasa seperti kartu
                      // yang dibalik ke belakang, lembut tidak menyentak.
                      opacity: 0,
                      rotateX: 90,
                      y: "0.35em",
                      filter: "blur(6px)",
                      transition: { duration: 0.2, ease: "easeIn" },
                    }
              }
              transition={{
                duration: 0.5,
                delay: delay + i * stagger,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
