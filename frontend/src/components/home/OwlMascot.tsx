import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import owlMascot from "../../assets/owl-mascot.webp";

// Posisi pusat mata diukur dari owl-mascot.webp (% dari kotak gambar)
const LEFT_EYE = { x: 38.5, y: 36 };
const RIGHT_EYE = { x: 58.5, y: 36 };
const PUPIL_SIZE = 6.5; // % dari lebar container
const MAX_TRAVEL_RATIO = 0.032; // jarak maksimum pupil = 3.2% lebar container
const BLINK_MIN_MS = 3000;
const BLINK_MAX_MS = 7000;
const BLINK_DURATION_MS = 130;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Maskot owl interaktif di hero section homepage.
 * Pupil mengikuti kursor (spring cepat), badan ikut miring (spring lambat),
 * kedipan otomatis acak, dan animasi mengambang saat idle.
 * Hanya aktif di device ber-cursor (pointer: fine + hover: hover)
 * dan menghormati prefers-reduced-motion — selain itu tampil statis.
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
  const maxTravelRef = useRef(MAX_TRAVEL_RATIO * 120);

  // Posisi kursor dinormalisasi: -1 (kiri/atas) … 1 (kanan/bawah) relatif ke owl
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Pupil: spring cepat & responsif
  const pupilSpringX = useSpring(pointerX, {
    stiffness: 260,
    damping: 20,
    mass: 0.5,
  });
  const pupilSpringY = useSpring(pointerY, {
    stiffness: 260,
    damping: 20,
    mass: 0.5,
  });
  const pupilOffsetX = useTransform(pupilSpringX, (v) => v * maxTravelRef.current);
  const pupilOffsetY = useTransform(pupilSpringY, (v) => v * maxTravelRef.current);

  // Badan: spring lebih berat agar terasa "berat" mengikuti
  const bodySpringX = useSpring(pointerX, { stiffness: 55, damping: 15 });
  const rotate = useTransform(bodySpringX, [-1, 1], [-5, 5]);
  const tiltY = useTransform(bodySpringX, [-1, 1], [2, -2]);

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
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      pointerX.set(
        clamp((e.clientX - centerX) / (window.innerWidth / 2), -1, 1),
      );
      pointerY.set(
        clamp((e.clientY - centerY) / (window.innerHeight / 2), -1, 1),
      );
    },
    [pointerX, pointerY],
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

  const renderPupil = (eye: { x: number; y: number }) => (
    <motion.div
      aria-hidden
      className="absolute aspect-square rounded-full"
      style={{
        left: `${eye.x - PUPIL_SIZE / 2}%`,
        top: `${eye.y - PUPIL_SIZE / 2}%`,
        width: `${PUPIL_SIZE}%`,
        x: pupilOffsetX,
        y: pupilOffsetY,
        transformOrigin: "center",
        background:
          "radial-gradient(circle at 32% 30%, #33507f 0%, #16264a 55%, #0c1730 100%)",
      }}
      animate={{ scaleY: blinking ? 0.12 : 1 }}
      transition={{ duration: 0.09, ease: "easeOut" }}
    />
  );

  return (
    <div className="pointer-events-none absolute right-4 top-20 z-20 hidden w-24 sm:block lg:right-8 lg:top-24 lg:w-[120px]">
      <motion.div
        initial={enabled ? { opacity: 0, y: -24, scale: 0.6 } : false}
        animate={enabled ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.4 }}
      >
        {/* Idle float — hanya saat interaktif */}
        <motion.div
          animate={enabled ? { y: [0, -6, 0] } : undefined}
          transition={
            enabled
              ? { repeat: Infinity, duration: 4.5, ease: "easeInOut" }
              : undefined
          }
        >
          {/* Body tilt mengikuti kursor dengan spring berat */}
          <motion.div style={{ rotate, y: tiltY }}>
            <div ref={containerRef} className="relative aspect-square w-full">
              <img
                src={owlMascot}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
              />
              {renderPupil(LEFT_EYE)}
              {renderPupil(RIGHT_EYE)}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
