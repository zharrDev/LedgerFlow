import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

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

const AUTO_ADVANCE_MS = 4000;
const TOTAL = SLIDES.length;

// ─── ✅ Fix C4 done: ala Mastercard — kapsul stadium raksasa flat (tanpa
//      3D/rotateY), prev/next sliver lingkaran di tepi layar, badge + judul
//      pill putih di dalam kapsul, panah kanan-atas, dot+pill & play/pause ───
export default function FeatureCarousel() {
  // Counter tak-terbatas: arah selalu maju (modulo hanya utk pilih konten)
  const [n, setN] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [hovering, setHovering] = useState(false);

  const index = ((n % TOTAL) + TOTAL) % TOTAL;
  const slide = SLIDES[index];
  const prevIdx = ((index - 1) % TOTAL + TOTAL) % TOTAL;
  const nextIdx = ((index + 1) % TOTAL + TOTAL) % TOTAL;

  const next = () => setN((v) => v + 1);
  const prev = () => setN((v) => v - 1);
  const goTo = (i: number) => setN((v) => v - (v % TOTAL) + i);

  useEffect(() => {
    if (!autoplay || hovering) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, hovering]);

  return (
    <section className="py-20 px-0 sm:px-4 overflow-hidden">
      {/* Kapsul stadium raksasa ~92-96% lebar viewport, flat tanpa 3D */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto w-[94%] lg:w-[96%] max-w-[1700px]"
      >
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="relative h-[300px] sm:h-[430px] lg:h-[600px] rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-2xl"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={n}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
            >
              <img
                src={slide.image}
                alt={slide.title}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Badge pill kecil kiri-atas */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`badge-${n}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute top-4 left-4 sm:top-7 sm:left-10 bg-white rounded-full px-4 py-1.5 sm:px-5 sm:py-2 shadow-md"
            >
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-gray-900 whitespace-nowrap">
                LedgerFlow Features
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Judul pill besar — bawah, offset (tidak persis tengah) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`title-${n}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute bottom-4 left-4 sm:bottom-10 sm:left-10 right-4 sm:right-auto flex justify-center sm:justify-start"
            >
              <div className="max-w-[90%] sm:max-w-[62%] bg-white rounded-full px-5 py-2.5 sm:px-9 sm:py-4 shadow-xl">
                <h3 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 text-center sm:text-left leading-tight truncate">
                  {slide.title}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Tombol panah kecil kanan-atas, menimpa image */}
          <div className="absolute top-4 right-4 sm:top-7 sm:right-10 flex gap-2 z-10">
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-800 shadow-md hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-800 shadow-md hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Sliver prev/next — lingkaran terpotong di tepi kiri/kanan, sebagian keluar layar */}
        <button
          type="button"
          onClick={prev}
          aria-label="Slide sebelumnya (intip)"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[42%] w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-xl z-10 border-4 border-white/70 dark:border-white/20 hover:border-primary-400 transition-colors cursor-pointer"
        >
          <motion.img
            key={`peek-prev-${n}`}
            src={SLIDES[prevIdx].image}
            alt={SLIDES[prevIdx].title}
            initial={{ opacity: 0.6, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full h-full object-cover"
          />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Slide berikutnya (intip)"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[42%] w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-xl z-10 border-4 border-white/70 dark:border-white/20 hover:border-primary-400 transition-colors cursor-pointer"
        >
          <motion.img
            key={`peek-next-${n}`}
            src={SLIDES[nextIdx].image}
            alt={SLIDES[nextIdx].title}
            initial={{ opacity: 0.6, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full h-full object-cover"
          />
        </button>
      </motion.div>

      {/* Indikator + play/pause */}
      <div className="mt-8 flex items-center justify-center gap-2.5 sm:gap-3">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Lompat ke slide ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === index
                ? "w-8 bg-primary-400 shadow"
                : "w-2.5 bg-gray-300 dark:bg-white/30 hover:bg-primary-400/70"
            }`}
          />
        ))}
        <button
          type="button"
          onClick={() => setAutoplay((v) => !v)}
          aria-label={autoplay ? "Jeda putar otomatis" : "Putar otomatis"}
          className="ml-1 flex items-center justify-center w-9 h-9 rounded-full bg-primary-500 text-white shadow-md hover:bg-primary-600 hover:scale-105 active:scale-95 transition-all"
        >
          {autoplay ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
      </div>
    </section>
  );
}