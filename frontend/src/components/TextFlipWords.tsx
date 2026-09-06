import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// TextFlipWords — animasi pergantian teks per KATA dengan flip 3D (rotateX).
// Dipakai untuk transisi ganti bahasa (ID↔EN) yang smooth: kata lama "jatuh"
// ke BELAKANG (ujung atas menunduk menjauh, rotateX 0→90), lalu kata baru
// bangkit dari posisi terbalik itu (rotateX 90→0) satu per satu stagger —
// efeknya seperti kartu split-flap yang dibalik ke belakang.
//
// - `language` dipakai sebagai key: begitu berubah, seluruh blok di-animate
//   ulang (AnimatePresence mode="wait" — exit dulu, lalu masuk stagger).
// - `wordClassName` untuk styling per kata (wajib dipakai bila teks berada
//   di dalam efek bg-clip-text/gradient — transform pada child bisa
//   merusak clip kalau gradient dipasang di parent).
// - Hormati prefers-reduced-motion: cukup cross-fade, tanpa rotasi.
// - Exit tanpa stagger (0.12s) supaya total transisi tetap < 0.6s.

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
                  : { opacity: 0, rotateX: 90, y: "0.35em" }
              }
              animate={
                reduced
                  ? { opacity: 1 }
                  : { opacity: 1, rotateX: 0, y: "0em" }
              }
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : {
                      // jatuh ke belakang: arah sama dengan pose awal kata
                      // baru (rotateX 90) → transisi terasa seperti kartu
                      // yang dibalik ke belakang, bukan dibalik ke depan.
                      opacity: 0,
                      rotateX: 90,
                      y: "0.35em",
                      transition: { duration: 0.14, ease: "easeIn" },
                    }
              }
              transition={{
                duration: 0.3,
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
