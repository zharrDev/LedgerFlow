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

// ─── ✅ Fix C1 done: ala Mastercard Messi — 1 image besar 1 tampilan,
//      transisi membesar halus (scale 0.97→1), teks di luar gambar,
//      tombol Previous/Next pill putih + indikator angka, loop searah ───
export default function FeatureCarousel() {
  // Counter tak-terbatas: arah selalu maju (modulo hanya utk pilih konten)
  const [n, setN] = useState(0);
  const [paused, setPaused] = useState(false);

  const index = ((n % TOTAL) + TOTAL) % TOTAL;
  const slide = SLIDES[index];

  const next = () => setN((v) => v + 1);
  const prev = () => setN((v) => v - 1);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

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

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="relative mx-auto max-w-5xl"
        >
          {/* Kartu gambar besar — 1 slide per tampilan */}
          <div className="relative mx-auto max-w-4xl aspect-video rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-2xl">
            <AnimatePresence initial={false}>
              <motion.div
                key={n}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
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
          </div>

          {/* Teks di luar gambar (ala Mastercard: label → judul → deskripsi) */}
          <div className="mt-6 sm:mt-8 text-center px-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${n}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                  LedgerFlow Features
                </p>
                <h3 className="mt-2 text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {slide.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                  {slide.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Kontrol: tombol Previous/Next pill + indikator angka */}
          <div className="mt-6 sm:mt-7 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white dark:bg-darkCard border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-800 dark:text-white shadow-sm hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setN(i)}
                  aria-label={`Lompat ke slide ${i + 1}`}
                  className={`w-7 h-7 rounded-full text-xs font-semibold transition-all duration-300 ${
                    i === index
                      ? "bg-primary-500 text-white shadow scale-110"
                      : "bg-white dark:bg-darkCard text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-primary-400 hover:text-primary-600"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white dark:bg-darkCard border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-800 dark:text-white shadow-sm hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:scale-105 active:scale-95 transition-all"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}