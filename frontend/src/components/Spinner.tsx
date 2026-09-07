import { motion } from "framer-motion";

type Props = {
  /** Ukuran titik dalam piksel (default 7). */
  size?: number;
  /** Warna titik (default primary). Terima kelas warna Tailwind. */
  colorClass?: string;
  /** Kelas tambahan untuk wrapper (posisi/margin). */
  className?: string;
};

/** Indikator loading 3 titik memantul — satu warna, halus, modern
 *  (gaya Linear/Vercel). Menggantikan spinner ring 2-warna lama yang
 *  tampak kasar (ring pudar + aksen terang menyolok).
 *
 *  Titik memantul dengan delay berjenjang dan easing lembut; skala
 *  vertikal (scaleY) dipakai agar pantulan terasa "squash" alami. */
export default function Spinner({
  size = 7,
  colorClass = "bg-primary-500",
  className = "",
}: Props) {
  return (
    <div
      className={`inline-flex items-center justify-center gap-1.5 ${className}`}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={`block rounded-full ${colorClass}`}
          style={{ width: size, height: size }}
          animate={{
            y: [0, -size * 0.9, 0],
            scaleY: [1, 0.75, 1],
          }}
          transition={{
            duration: 0.55,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}
