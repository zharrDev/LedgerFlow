import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import owlMascot from "../../assets/owl-mascot.webp";

// Posisi pusat mata (% dari kotak gambar) — diukur otomatis dari HASIL
// CROP owl-mascot.webp oleh scripts/crop-owl.mjs (connected-component
// pixel putih lensa kacamata). Jangan edit manual tanpa mengukur ulang.
const LEFT_EYE = { x: 35.78, y: 35.72 };
const RIGHT_EYE = { x: 63.04, y: 35.3 };
const PUPIL_SIZE = 5; // % dari lebar container
const MAX_TRAVEL_RATIO = 0.06; // jarak maksimum pupil = 6% lebar container
// Batas geometris: travel + PUPIL_SIZE/2 harus ≤ radius lensa terkecil
// (kanan, 9.1% lebar container) — extent 8.5% masih di dalam lensa.
const BLINK_MIN_MS = 3000;
const BLINK_MAX_MS = 7000;
const BLINK_DURATION_MS = 130;

// Spring lembut — gerakan halus & subtle, tidak "kaget" (gaya Kiro)
const PUPIL_SPRING = { stiffness: 120, damping: 22, mass: 0.6 };

/**
 * Maskot owl — hinggap di tepi atas kanan kartu CTA (di luar kartu,
 * kaki menyentuh atap). BADAN DIAM: tidak miring, tidak float. Yang
 * bergerak hanya mata (atan2 per-mata + spring pupil) dan kedipan
 * otomatis acak. Hanya aktif di device ber-cursor (pointer: fine +
 * hover: hover) dan menghormati prefers-reduced-motion — selain itu
 * tampil statis.
 */
export default function OwlMascot() {
  // Feature detection — lazy init agar tidak perlu setState di effect
  const [enabled] = useState(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: no-preference)",
    );
    return fine.matches && hover.matches && reduced.matches;
  });
  const [blinking, setBlinking] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const maxTravelRef = useRef(MAX_TRAVEL_RATIO * 224);

  // Scroll grow-in: mulai 70% ukuran, membesar ke 100% saat pertama
  // kali terlihat di viewport (once) lalu TETAP besar walau scroll lagi.
  const growRef = useRef<HTMLDivElement | null>(null);
  const grown = useInView(growRef, { once: true, margin: "-60px" });

  // Arah pandang per mata: cos/sin dari sudut atan2 (selalu -1…1, proporsional)
  const leftPupilX = useMotionValue(0);
  const leftPupilY = useMotionValue(0);
  const rightPupilX = useMotionValue(0);
  const rightPupilY = useMotionValue(0);

  // Pupil: spring terpisah per mata
  const leftSpringX = useSpring(leftPupilX, PUPIL_SPRING);
  const leftSpringY = useSpring(leftPupilY, PUPIL_SPRING);
  const rightSpringX = useSpring(rightPupilX, PUPIL_SPRING);
  const rightSpringY = useSpring(rightPupilY, PUPIL_SPRING);

  const leftOffsetX = useTransform(leftSpringX, (v) => v * maxTravelRef.current);
  const leftOffsetY = useTransform(leftSpringY, (v) => v * maxTravelRef.current);
  const rightOffsetX = useTransform(rightSpringX, (v) => v * maxTravelRef.current);
  const rightOffsetY = useTransform(rightSpringY, (v) => v * maxTravelRef.current);

  // Jarak tempuh pupil proporsional dengan ukuran render
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      maxTravelRef.current = el.clientWidth * MAX_TRAVEL_RATIO;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      const leftEyeX = rect.left + (LEFT_EYE.x / 100) * rect.width;
      const leftEyeY = rect.top + (LEFT_EYE.y / 100) * rect.height;
      const rightEyeX = rect.left + (RIGHT_EYE.x / 100) * rect.width;
      const rightEyeY = rect.top + (RIGHT_EYE.y / 100) * rect.height;

      const angleLeft = Math.atan2(
        e.clientY - leftEyeY,
        e.clientX - leftEyeX,
      );
      const angleRight = Math.atan2(
        e.clientY - rightEyeY,
        e.clientX - rightEyeX,
      );

      leftPupilX.set(Math.cos(angleLeft));
      leftPupilY.set(Math.sin(angleLeft));
      rightPupilX.set(Math.cos(angleRight));
      rightPupilY.set(Math.sin(angleRight));
    },
    [leftPupilX, leftPupilY, rightPupilX, rightPupilY],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [enabled, handleMove]);

  // Kedipan otomatis dengan interval acak
  useEffect(() => {
    if (!enabled) return;
    let showTimer: number;
    let hideTimer: number;
    const schedule = () => {
      showTimer = window.setTimeout(() => {
        setBlinking(true);
        hideTimer = window.setTimeout(
          () => setBlinking(false),
          BLINK_DURATION_MS,
        );
        schedule();
      }, BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS));
    };
    schedule();
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [enabled]);

  const renderPupil = (
    eye: { x: number; y: number },
    offsetX: MotionValue<number>,
    offsetY: MotionValue<number>,
  ) => (
    <motion.div
      aria-hidden
      className="absolute aspect-square rounded-full"
      style={{
        left: `${eye.x - PUPIL_SIZE / 2}%`,
        top: `${eye.y - PUPIL_SIZE / 2}%`,
        width: `${PUPIL_SIZE}%`,
        x: offsetX,
        y: offsetY,
        transformOrigin: "center",
        background:
          "radial-gradient(circle at 32% 30%, #33507f 0%, #16264a 55%, #0c1730 100%)",
      }}
      animate={{ scaleY: blinking ? 0.12 : 1 }}
      transition={{ duration: 0.09, ease: "easeOut" }}
    />
  );

  return (
    <div
      ref={growRef}
      className="pointer-events-none relative w-28 sm:w-32 md:w-36 lg:w-40"
    >
      {/* Bayangan kontak tipis di bawah kaki — owl terasa duduk di atap */}
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-2 w-16 sm:w-20 -translate-x-1/2 rounded-full bg-black/25 blur-md"
      />
      {/* Grow-in scale + landing dari atas (y:-28 → 0), sekali saat
          pertama terlihat lalu DIAM total. Scale tidak memengaruhi layout. */}
      <motion.div
        initial={
          enabled
            ? { scale: 0.7, opacity: 0, y: -28 }
            : { scale: 1, opacity: 1, y: 0 }
        }
        animate={
          !enabled || grown
            ? { scale: 1, opacity: 1, y: 0 }
            : { scale: 0.7, opacity: 0, y: -28 }
        }
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
      >
        <div ref={containerRef} className="relative aspect-square w-full">
          <img
            src={owlMascot}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
          />
          {renderPupil(LEFT_EYE, leftOffsetX, leftOffsetY)}
          {renderPupil(RIGHT_EYE, rightOffsetX, rightOffsetY)}
        </div>
      </motion.div>
    </div>
  );
}
