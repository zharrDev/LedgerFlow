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

const AUTO_ADVANCE_MS = 5000;

export default function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];

  const goTo = (next: number) =>
    setIndex((next % SLIDES.length + SLIDES.length) % SLIDES.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

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
          className="relative h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] lg:rounded-[8rem] bg-gray-200 dark:bg-gray-800 shadow-2xl"
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={index}
              src={slide.image}
              alt={slide.title}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Badge pill (kiri atas) */}
          <motion.div
            key={`badge-${index}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.12 }}
            className="absolute top-5 left-5 sm:top-7 sm:left-8 bg-white rounded-full px-4 py-1.5 sm:px-5 sm:py-2 shadow-lg"
          >
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-gray-900">
              LedgerFlow Features
            </span>
          </motion.div>

          {/* Tombol navigasi (kanan atas) */}
          <div className="absolute top-5 right-5 sm:top-7 sm:right-8 flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border border-gray-200 text-gray-700 shadow-lg hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border border-gray-200 text-gray-700 shadow-lg hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Pill judul (bawah tengah) + indikator titik */}
          <motion.div
            key={`title-${index}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.22 }}
            className="absolute inset-x-0 bottom-16 sm:bottom-20 flex justify-center px-6"
          >
            <div className="bg-white rounded-full px-6 py-4 sm:px-10 sm:py-5 shadow-xl max-w-full">
              <h3 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 text-center leading-tight">
                {slide.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 text-center">
                {slide.desc}
              </p>
            </div>
          </motion.div>

          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
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