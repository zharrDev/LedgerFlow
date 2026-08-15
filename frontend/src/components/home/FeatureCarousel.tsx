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

// ─── ✅ Fix B4 done: oval membesar + crossfade overlap + loop searah (counter tak-terbatas) ───

export default function FeatureCarousel() {
  // Counter tak-terbatas: arah selalu maju (modulo hanya utk pilih slide)
  const [n, setN] = useState(0);
  const [paused, setPaused] = useState(false);

  const index = ((n % TOTAL) + TOTAL) % TOTAL;
  const slide = SLIDES[index];

  const next = () => setN((v) => v + 1);
  const prev = () => setN((v) => v - 1);
  const goTo = (i: number) =>
    setN((v) => (v - (v % TOTAL)) + i);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <section className="py-20 px-6">
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
          className="relative w-[92%] sm:w-[82%] lg:w-[75%] max-w-5xl mx-auto aspect-video overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 shadow-2xl"
        >
          {/* Slide — crossfade overlap (tanpa mode="wait") */}
          <AnimatePresence initial={false}>
            <motion.div
              key={n}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

              {/* Badge pill kecil (kiri atas) */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.12 }}
                className="absolute top-4 left-4 sm:top-7 sm:left-8 bg-white rounded-full px-4 py-1.5 sm:px-5 sm:py-2 shadow-lg"
              >
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-gray-900 whitespace-nowrap">
                  LedgerFlow Features
                </span>
              </motion.div>

              {/* Pill judul (bawah tengah) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.22 }}
                className="absolute inset-x-0 bottom-4 sm:bottom-8 flex justify-center px-5 sm:px-10"
              >
                <div className="bg-white rounded-full px-5 py-2.5 sm:px-9 sm:py-4 shadow-xl max-w-full">
                  <h3 className="text-sm sm:text-2xl lg:text-3xl font-extrabold text-gray-900 text-center leading-tight truncate">
                    {slide.title}
                  </h3>
                  <p className="mt-0.5 hidden sm:block text-xs sm:text-sm text-gray-600 text-center truncate">
                    {slide.desc}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Tombol navigasi (kanan atas) */}
          <div className="absolute top-4 right-4 sm:top-7 sm:right-8 flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-gray-200 text-gray-700 shadow-lg hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-gray-200 text-gray-700 shadow-lg hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Indikator titik */}
          <div className="absolute inset-x-0 bottom-2.5 sm:bottom-4 flex justify-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Lompat ke slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 bg-white shadow"
                    : "w-2.5 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}