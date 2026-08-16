import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import automaticReconciliation from "../../assets/hero/Automatic-Reconsiliation.png";
import realtimeAnalytics from "../../assets/hero/Realtimeanalityc.png";
import auditTrail from "../../assets/hero/AuditTrail.png";
import smartBudgeting from "../../assets/hero/Smartbudgetting.png";
import multiEntitySupport from "../../assets/hero/multyEntitySupport.png";
import multiCurrency from "../../assets/hero/MultyCurrency.png";

interface FeatureSlide {
  title: string;
  desc: string;
  image: string;
}

const SLIDES: FeatureSlide[] = [
  {
    title: "Automated Reconciliation",
    desc: "Match transactions automatically with bank feeds",
    image: automaticReconciliation,
  },
  {
    title: "Real-time Analytics",
    desc: "Live dashboard with key financial metrics",
    image: realtimeAnalytics,
  },
  {
    title: "Audit Trail",
    desc: "Complete history of every change and access",
    image: auditTrail,
  },
  {
    title: "Smart Budgeting",
    desc: "AI-powered budget forecasting and alerts",
    image: smartBudgeting,
  },
  {
    title: "Multi-entity Support",
    desc: "Manage multiple companies from one account",
    image: multiEntitySupport,
  },
  {
    title: "Multi-currency",
    desc: "Handle transactions in 150+ currencies",
    image: multiCurrency,
  },
];

const AUTO_ADVANCE_MS = 4000;
const TOTAL = SLIDES.length;

// ─── ✅ Fix C4 done: ala Mastercard — kapsul stadium raksasa flat (tanpa
//      3D/rotateY), prev/next sliver pill setengah di tepi layar, judul
//      pill putih non-bold center-bawah, panah kanan-atas, dot+pill,
//      autoplay terus-menerus, pergantian slide membesar (scale kecil→penuh) ───
export default function FeatureCarousel() {
  // Counter tak-terbatas: arah selalu maju, autoplay terus-menerus (tanpa pause)
  const [n, setN] = useState(0);

  const index = ((n % TOTAL) + TOTAL) % TOTAL;
  const slide = SLIDES[index];
  const prevIdx = ((index - 1) % TOTAL + TOTAL) % TOTAL;
  const nextIdx = ((index + 1) % TOTAL + TOTAL) % TOTAL;

  const next = () => setN((v) => v + 1);
  const prev = () => setN((v) => v - 1);
  const goTo = (i: number) => setN((v) => v - (v % TOTAL) + i);

  useEffect(() => {
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="py-20 px-0 sm:px-4 overflow-hidden">
      {/* Kapsul stadium raksasa ~92-96% lebar viewport, flat tanpa 3D */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto w-[96%] max-w-[1700px]"
      >
        <div className="relative mx-auto w-[70%] sm:w-[78%] lg:w-[80%] h-[280px] sm:h-[400px] lg:h-[550px] rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900">
          <AnimatePresence initial={false}>
            <motion.div
              key={n}
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
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

          {/* Judul pill besar — tengah bawah, aman di dalam lengkung kapsul */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`title-${n}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-8 sm:bottom-12 flex justify-center px-5 sm:px-12"
            >
              <div className="group relative max-w-[90%] sm:max-w-[80%] bg-white rounded-full px-4 py-2 sm:px-6 sm:py-3 shadow-md overflow-hidden">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square rounded-full bg-primary-400 scale-0 transition-transform duration-500 ease-out group-hover:scale-100" />
                <h3 className="relative z-10 text-base sm:text-2xl lg:text-3xl font-poppins font-medium text-gray-900 text-center leading-tight truncate">
                  {slide.title}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sliver prev/next — bentuk pill setengah: ujung membulat terlihat,
            sisanya terpotong keluar layar (kesan ngeslide bergulir) */}
        <button
          type="button"
          onClick={prev}
          aria-label="Slide sebelumnya (intip)"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[80%] z-10 w-[130px] sm:w-[170px] lg:w-[240px] h-16 sm:h-24 lg:h-36 overflow-hidden cursor-pointer group"
        >
          <div className="absolute inset-0 rounded-full border-2 border-white/80 dark:border-white/30 transition-colors group-hover:border-primary-400">
            <motion.img
              key={`peek-prev-${n}`}
              src={SLIDES[prevIdx].image}
              alt={SLIDES[prevIdx].title}
              initial={{ opacity: 0.7, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Slide berikutnya (intip)"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[80%] z-10 w-[130px] sm:w-[170px] lg:w-[240px] h-16 sm:h-24 lg:h-36 overflow-hidden cursor-pointer group"
        >
          <div className="absolute inset-0 rounded-full border-2 border-white/80 dark:border-white/30 transition-colors group-hover:border-primary-400">
            <motion.img
              key={`peek-next-${n}`}
              src={SLIDES[nextIdx].image}
              alt={SLIDES[nextIdx].title}
              initial={{ opacity: 0.7, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </button>
      </motion.div>

      {/* Indikator dot + pill — autoplay terus, tanpa tombol play/pause */}
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
      </div>
    </section>
  );
}