import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, FileText, TrendingUp, CheckCircle, ArrowRight, ArrowLeft, Building } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const steps = [
  {
    icon: Building,
    title: "Selamat Datang di LedgerFlow!",
    desc: "Platform akuntansi digital yang membantu Anda mencatat keuangan perusahaan dengan mudah.",
    color: "from-primary-600 to-primary-500",
  },
  {
    icon: BookOpen,
    title: "1. Buat Chart of Accounts",
    desc: "Mulai dengan membuat daftar akun (Chart of Accounts). Ini adalah kerangka dasar pencatatan keuangan Anda.",
    color: "from-blue-600 to-blue-500",
  },
  {
    icon: FileText,
    title: "2. Input Jurnal",
    desc: "Catat transaksi harian menggunakan sistem double-entry. Setiap transaksi akan otomatis tercatat di Buku Besar.",
    color: "from-emerald-600 to-emerald-500",
  },
  {
    icon: TrendingUp,
    title: "3. Lihat Laporan Keuangan",
    desc: "Setelah jurnal diposting, lihat laporan Laba Rugi, Neraca, dan Arus Kas secara real-time.",
    color: "from-purple-600 to-purple-500",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (user?.id) localStorage.setItem(`onboarded_${user.id}`, "true");
      navigate("/dashboard", { replace: true });
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10 p-4">
      <div className="w-full max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-primary-500/20 rounded-3xl shadow-2xl p-8 sm:p-10 text-center">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${steps[step].color} flex items-center justify-center shadow-lg`}>
                {(() => {
                  const Icon = steps[step].icon;
                  return <Icon size={36} className="text-white" />;
                })()}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {steps[step].title}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-8">
                {steps[step].desc}
              </p>

              <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === step ? "w-8 bg-primary-500" : "w-2 bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    localStorage.setItem("onboarded", "true");
                    navigate("/dashboard", { replace: true });
                  }}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  Skip
                </button>

                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                >
                  {isLast ? (
                    <>Mulai <CheckCircle size={18} /></>
                  ) : (
                    <>Lanjut <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
