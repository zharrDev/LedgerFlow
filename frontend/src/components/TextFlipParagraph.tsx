import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";

// TextFlipParagraph — animasi pergantian bahasa per KATA dengan flip 3D
// (rotateX) + blur, sama seperti TextFlipWords di hero homepage, tapi
// dioptimalkan untuk kalimat paragraf yang panjang di semua page.
//
// Perbedaan vs TextFlipWords:
// - stagger & durasi lebih cepat supaya paragraf 20+ kata tidak lambat
// - total waktu animasi dibatasi (maxTotal) — stagger mengecil otomatis
//   untuk teks panjang
// - bisa render sebagai <p> / <span> / <div> via prop `as` agar semantik
//   HTML tetap benar
// - Hormati prefers-reduced-motion: cukup cross-fade tanpa rotasi/blur.
//
// Pakai:
//   <TextFlipParagraph
//     text={tx(language, "English sentence.", "Kalimat Indonesia.")}
//     language={language}
//     className="text-sm text-gray-600"
//   />

type AsTag = "p" | "span" | "div";

interface TextFlipParagraphProps {
  text: string;
  /** Key pemicu re-animate (mis. bahasa aktif "en" | "id"). */
  language?: string;
  className?: string;
  /** Tag HTML pembungkus (default "p"). */
  as?: AsTag;
  /** Delay awal sebelum kata pertama masuk (detik). */
  delay?: number;
  /** Jeda antar kata (detik) — otomatis dikecilkan untuk teks panjang. */
  stagger?: number;
  /** Batas total waktu stagger agar paragraf panjang tetap gesit (detik). */
  maxTotal?: number;
  style?: CSSProperties;
}

export function TextFlipParagraph({
  text,
  language,
  className,
  as = "p",
  delay = 0,
  stagger = 0.015,
  maxTotal = 0.6,
  style,
}: TextFlipParagraphProps) {
  const reduced = useReducedMotion();
  const key = `${language ?? ""}:${text}`;
  const words = text.split(" ").filter(Boolean);

  // Batasi total waktu stagger untuk paragraf panjang supaya animasi
  // tetap gesit — mis. 40 kata tidak butuh 40 * 0.015 = 0.6s+ lebih.
  const effectiveStagger =
    words.length > 1
      ? Math.min(stagger, maxTotal / Math.max(words.length - 1, 1))
      : 0;

  const Tag = (motion as any)[as] ?? motion.p;

  return (
    <Tag
      className={className}
      style={{ perspective: 600, ...style }}
      aria-label={text}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={key}
          className="inline"
          style={{ transformStyle: "preserve-3d" }}
          aria-hidden="true"
        >
          {words.map((word, i) => (
            <motion.span
              key={`${key}::${i}`}
              className="inline-block will-change-transform"
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
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : {
                      opacity: 0,
                      rotateX: 90,
                      y: "0.35em",
                      filter: "blur(6px)",
                      transition: { duration: 0.16, ease: "easeIn" },
                    }
              }
              transition={{
                duration: 0.35,
                delay: delay + i * effectiveStagger,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </Tag>
  );
}

export default TextFlipParagraph;
