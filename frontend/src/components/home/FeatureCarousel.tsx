import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
const SLIDE_W_PCT = 0.7; // desktop/tablet: slide aktif 70% lebar container
const SLIDE_W_PCT_MOBILE = 0.86; // mobile: hampir full, peek tipis
const GAP_PX = 24;
const GAP_PX_MOBILE = 16;

export default function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = containerW > 0 && containerW < 640;
  const slideW = containerW * (isMobile ? SLIDE_W_PCT_MOBILE : SLIDE_W_PCT);
  const gap = isMobile ? GAP_PX_MOBILE : GAP_PX;
  const centerOffset = (containerW - slideW) / 2;
  const trackX = centerOffset - index * (slideW + gap);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
          ref={containerRef}
          className="relative h-[380px] sm:h-[480px] lg:h-[560px] overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] lg:rounded-[8rem] bg-gray-200 dark:bg-gray-800 shadow-2xl"
        >
          {/* Track slide — translateX smooth */}
          <motion.div
            className="h-full flex items-center"
            style={{ gap, width: "max-content" }}
            animate={{ x: containerW > 0 ? trackX : 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {SLIDES.map((s, i) => {
              const isActive = i === index;
              const isAdjacent = Math.abs(i - index) === 1;
              return (
                <motion.button
                  key={s.title}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Tampilkan ${s.title}`}
                  animate={{
                    opacity: isActive ? 1 : isAdjacent ? 0.45 : 0.2,
                    scale: isActive ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  style={{ width: slideW > 0 ? slideW : "70%" }}
                  className={`relative shrink-0 h-full overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gray-300 dark:bg-gray-700 shadow-lg ${
                    isActive ? "cursor-default" : "cursor-pointer"
                  }`}
                >
                  <img
                    src={s.image}
                    alt={s.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Gradient halus di bawah (hanya slide aktif) */}
                  <motion.div
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
                  />

                  {/* Badge pill kecil (kiri atas, slide aktif) */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : -8,
                    }}
                    transition={{
                      duration: 0.35,
                      ease: "easeOut",
                      delay: isActive ? 0.12 : 0,
                    }}
                    className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white rounded-full px-3.5 py-1.5 sm:px-4 shadow-lg"
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900 whitespace-nowrap">
                      LedgerFlow Features
                    </span>
                  </motion.div>

                  {/* Pill judul (bawah tengah, slide aktif) */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 16,
                    }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: isActive ? 0.22 : 0,
                    }}
                    className="absolute inset-x-0 bottom-4 sm:bottom-7 flex justify-center px-4 sm:px-8"
                  >
                    <div className="bg-white rounded-full px-5 py-3 sm:px-9 sm:py-4 shadow-xl max-w-full">
                      <h3 className="text-base sm:text-2xl lg:text-3xl font-extrabold text-gray-900 text-center leading-tight truncate">
                        {s.title}
                      </h3>
                      {isActive && (
                        <p className="mt-0.5 text-[10px] sm:text-sm text-gray-600 text-center truncate">
                          {s.desc}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Tombol navigasi (kanan atas) */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2">
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
          <div className="absolute inset-x-0 bottom-3 sm:bottom-4 flex justify-center gap-2">
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