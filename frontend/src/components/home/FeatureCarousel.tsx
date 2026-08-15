import { useEffect, useState } from "react";
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

const AUTO_ADVANCE_MS = 3000;
const TOTAL = SLIDES.length;

// Posisi slot relatif thd slide aktif (dalam % lebar slide)
const SLOT = {
  "-2": { x: -128, scale: 0.84, opacity: 0, z: 1 },
  "-1": { x: -64, scale: 0.84, opacity: 0.92, z: 2 },
  "0": { x: 0, scale: 1, opacity: 1, z: 3 },
  "1": { x: 64, scale: 0.84, opacity: 0.92, z: 2 },
  "2": { x: 128, scale: 0.84, opacity: 0, z: 1 },
} as const;

// ─── ✅ Fix B5 done: rolling track (5 slot) — prev/next mengintip,
//      slide masuk dari kanan kecil lalu membesar, loop searah tanpa lompat ───
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
    : { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const };

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
          {/* Track gulir: prev mengintip kiri — aktif tengah membesar — next mengintip kanan */}
          {renderKeys.map((k) => {
            const pos = String(k - n) as keyof typeof SLOT;
            const slot = SLOT[pos];
            const s = SLIDES[((k % TOTAL) + TOTAL) % TOTAL];
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
                style={{ width: "78%" }}
                className="absolute left-1/2 top-1/2 h-full"
              >
                <div className="relative w-full h-full overflow-hidden rounded-full shadow-lg">
                  <img
                    src={s.image}
                    alt={s.title}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                  {/* Badge pill kecil (kiri atas) */}
                  <div className="absolute top-3 left-3 sm:top-6 sm:left-6 bg-white rounded-full px-3 py-1 sm:px-4 sm:py-1.5 shadow-lg">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-gray-900 whitespace-nowrap">
                      LedgerFlow Features
                    </span>
                  </div>

                  {/* Pill judul (bawah tengah) — kecil agar tak tertutup lengkung oval */}
                  <div className="absolute inset-x-0 bottom-3 sm:bottom-6 flex justify-center px-3 sm:px-4">
                    <div className="max-w-[85%] bg-white rounded-full px-4 py-2 sm:px-6 sm:py-3 shadow-xl">
                      <h3 className="text-sm sm:text-xl lg:text-2xl font-extrabold text-gray-900 text-center leading-tight truncate">
                        {s.title}
                      </h3>
                      <p className="hidden sm:block text-xs text-gray-600 text-center truncate">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Tombol navigasi (kanan atas) — tema cyan */}
          <div className="absolute top-4 right-4 sm:top-7 sm:right-8 flex gap-2 z-10">
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Indikator titik — aktif cyan sesuai tema */}
          <div className="absolute inset-x-0 bottom-2.5 sm:bottom-4 flex justify-center gap-2 z-10">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Lompat ke slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 bg-primary-400 shadow"
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