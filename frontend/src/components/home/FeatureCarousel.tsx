import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FeatureSlide {
  title: string;
  desc: string;
  image: string;
}

const SLIDES: FeatureSlide[] = [
  {
    title: "Automated Reconciliation",
    desc: "Match transactions automatically with bank feeds",
    image: "/Automatic-Reconsiliation.png",
  },
  {
    title: "Real-time Analytics",
    desc: "Live dashboard with key financial metrics",
    image: "/Realtimeanalityc.png",
  },
  {
    title: "Audit Trail",
    desc: "Complete history of every change and access",
    image: "/AuditTrail.png",
  },
  {
    title: "Smart Budgeting",
    desc: "AI-powered budget forecasting and alerts",
    image: "/Smartbudgetting.png",
  },
  {
    title: "Multi-entity Support",
    desc: "Manage multiple companies from one account",
    image: "/multyEntitySupport.png",
  },
  {
    title: "Multi-currency",
    desc: "Handle transactions in 150+ currencies",
    image: "/MultyCurrency.png",
  },
];

const AUTO_ADVANCE_MS = 3000;
const TOTAL = SLIDES.length;

// Posisi slot relatif thd slide aktif (x dalam % lebar slide).
// Tiap image = persegi panjang agak oval: kecil di sisi → membesar di tengah.
const SLOT = {
  "-2": { x: -145, scale: 0.4, opacity: 0, z: 1 },
  "-1": { x: -82, scale: 0.4, opacity: 1, z: 2 },
  "0": { x: 0, scale: 1, opacity: 1, z: 3 },
  "1": { x: 82, scale: 0.4, opacity: 1, z: 2 },
  "2": { x: 145, scale: 0.4, opacity: 0, z: 1 },
} as const;

// ─── ✅ Fix B8 done: tanpa container, image besar persegi-panjang-agak-oval,
//      judul & tombol di dalam image (crossfade), loop searah ───
export default function FeatureCarousel() {
  // Counter tak-terbatas: arah selalu maju (modulo hanya utk pilih konten)
  const [n, setN] = useState(0);
  const [paused, setPaused] = useState(false);
  const [instant, setInstant] = useState(false);

  const index = ((n % TOTAL) + TOTAL) % TOTAL;

  const next = () => setN((v) => v + 1);
  const prev = () => setN((v) => v - 1);
  const goTo = (i: number) => {
    setInstant(true);
    setN((v) => v - (v % TOTAL) + i);
  };

  useEffect(() => {
    if (!instant) return;
    const t = window.setTimeout(() => setInstant(false), 80);
    return () => window.clearTimeout(t);
  }, [instant]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // 5 slide di sekitar aktif; pos = k - n menentukan slot
  const renderKeys = [n - 2, n - 1, n, n + 1, n + 2];
  const transition = instant
    ? { duration: 0 }
    : { type: "spring", stiffness: 130, damping: 22 } as const;

  return (
    <section className="py-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Built for modern finance teams
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3">
            Explore the LedgerFlow platform
          </p>
        </motion.div>

        {/* Area carousel — tanpa container: image oval mengambang bebas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="relative mx-auto w-[92%] sm:w-[82%] lg:w-[75%] max-w-5xl h-[340px] sm:h-[480px] lg:h-[620px]"
        >
          {/* Track: oval kecil di sisi, membesar ke tengah saat gilirannya */}
          {renderKeys.map((k) => {
            const pos = String(k - n) as keyof typeof SLOT;
            const slot = SLOT[pos];
            const s = SLIDES[((k % TOTAL) + TOTAL) % TOTAL];
            const isCenter = slot.z === 3;
            const isSide = slot.z === 2;
            return (
              <motion.div
                key={k}
                initial={false}
                animate={{
                  x: `${slot.x}%`,
                  y: "-50%",
                  scale: slot.scale,
                  opacity: slot.opacity,
                  zIndex: slot.z,
                }}
                transition={transition}
                style={{ width: "70%" }}
                onClick={() => {
                  if (!isCenter) {
                    if (isSide && slot.x > 0) next();
                    else if (isSide) prev();
                  }
                }}
                className={`absolute left-1/2 top-1/2 sm:w-[56%] lg:w-[44%] aspect-video rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden ${
                  isCenter ? "shadow-2xl" : "shadow-lg"
                } ${
                  isSide
                    ? "cursor-pointer hover:brightness-110 transition-[filter]"
                    : ""
                }`}
              >
                <img
                  src={s.image}
                  alt={s.title}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            );
          })}

          {/* Teks & tombol statis — di dalam image tengah, tidak menumpuk berlapis */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[56%] lg:w-[44%] aspect-video z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={`badge-${n}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 bg-white rounded-full px-2.5 py-0.5 sm:px-3.5 sm:py-1.5 shadow-md"
              >
                <span className="text-[8px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900 whitespace-nowrap">
                  LedgerFlow Features
                </span>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={`title-${n}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-x-0 bottom-2 sm:bottom-4 flex justify-center px-3 sm:px-6"
              >
                <div className="max-w-[85%] bg-white/95 rounded-full px-3 py-1 sm:px-5 sm:py-2 shadow-lg">
                  <h3 className="text-[11px] sm:text-sm lg:text-base font-extrabold text-gray-900 text-center leading-tight truncate">
                    {SLIDES[index].title}
                  </h3>
                  <p className="hidden sm:block text-xs text-gray-600 text-center truncate">
                    {SLIDES[index].desc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Tombol navigasi — bulat cyan di tepi kiri/kanan dalam image */}
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="pointer-events-auto absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="pointer-events-auto absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Indikator titik — aktif cyan sesuai tema */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 z-10">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Lompat ke slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 bg-primary-400 shadow"
                    : "w-2.5 bg-primary-600/30 dark:bg-white/40 hover:bg-primary-400/70"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}