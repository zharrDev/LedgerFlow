import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

const steps = [
  {
    icon: Building,
    title: { id: "Selamat Datang di LedgerFlow!", en: "Welcome to LedgerFlow!" },
    desc: {
      id: "Platform akuntansi digital yang membantu Anda mencatat keuangan perusahaan dengan mudah.",
      en: "A digital accounting platform that helps you record company finances with ease.",
    },
    color: "from-primary-600 to-primary-500",
  },
  {
    icon: BookOpen,
    title: { id: "1. Buat Chart of Accounts", en: "1. Create Chart of Accounts" },
    desc: {
      id: "Mulai dengan membuat daftar akun (Chart of Accounts). Ini adalah kerangka dasar pencatatan keuangan Anda.",
      en: "Start by creating your account list (Chart of Accounts). This is the foundation of your financial recording.",
    },
    color: "from-blue-600 to-blue-500",
  },
  {
    icon: FileText,
    title: { id: "2. Input Jurnal", en: "2. Input Journal" },
    desc: {
      id: "Catat transaksi harian menggunakan sistem double-entry. Setiap transaksi akan otomatis tercatat di Buku Besar.",
      en: "Record daily transactions using double-entry system. Each transaction is automatically posted to the General Ledger.",
    },
    color: "from-emerald-600 to-emerald-500",
  },
  {
    icon: TrendingUp,
    title: { id: "3. Lihat Laporan Keuangan", en: "3. View Financial Reports" },
    desc: {
      id: "Setelah jurnal diposting, lihat laporan Laba Rugi, Neraca, dan Arus Kas secara real-time.",
      en: "After posting journals, view Income Statement, Balance Sheet, and Cash Flow reports in real-time.",
    },
    color: "from-purple-600 to-purple-500",
  },
];

function markOnboarded(userId?: string) {
  if (userId) localStorage.setItem(`onboarded_${userId}`, "true");
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const finish = () => {
    markOnboarded(user?.id);
    navigate("/dashboard", { replace: true });
  };

  const handleNext = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10 p-4">
      {/* Dekor blob gradient — "bahan" yang di-blur kartu glass. Mask radial
          supaya memudar sebelum tepi (tanpa garis potong), pola yang sama
          dengan halaman publik. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary-500/15 blur-3xl dark:bg-primary-500/20"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 72%)",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 70%)",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 70%)",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white/55 dark:bg-[#111827]/55 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-5 sm:p-8 text-center">
              <div
                className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${steps[step].color} flex items-center justify-center shadow-lg`}
              >
                {(() => {
                  const Icon = steps[step].icon;
                  return <Icon size={36} className="text-white" />;
                })()}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {steps[step].title[language]}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-8">
                {steps[step].desc[language]}
              </p>

              <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-8 bg-primary-500"
                        : "w-2 bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={finish}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition px-2 py-2"
                >
                  {tx(language, "Skip", "Lewati")}
                </button>

                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={() => setStep((s) => s - 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <ArrowLeft size={16} />
                      {tx(language, "Back", "Kembali")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                  >
                    {isLast ? (
                      <>
                        {tx(language, "Start", "Mulai")} <CheckCircle size={18} />
                      </>
                    ) : (
                      <>
                        {tx(language, "Next", "Lanjut")} <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
