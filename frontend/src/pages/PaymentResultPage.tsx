// ============================================================================
// LEDGERFLOW - Payment Result Page
// ============================================================================
// Halaman hasil pembayaran yang ditampilkan setelah user selesai bayar:
//   /payment/success?order_id=xxx  → Pembayaran berhasil 
//   /payment/pending?order_id=xxx  → Menunggu pembayaran 
//   /payment/failed?order_id=xxx   → Pembayaran gagal 
//
// Desain: Full-screen centered card dengan animasi smooth,
//         icon animasi bounce-in, gradient glow, staggered content
// ============================================================================

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Home,
  RefreshCw,
  Zap,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Crown,
  Upload,
  FileUp,
} from "lucide-react";
import { testComplete, isSandboxMode } from "../services/paymentService";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorMessage";

// ─── Types ──────────────────────────────────────────────────────────
type ResultType = "success" | "pending" | "failed";

// ─── Konfigurasi tampilan per status ────────────────────────────────
const RESULT_CONFIG: Record<
  ResultType,
  {
    icon: typeof CheckCircle2;
    title: string;
    subtitle: string;
    description: string;
    gradient: string;
    glowColor: string;
    ringColor: string;
    iconColor: string;
    cardBg: string;
    cardBorder: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    title: "Pembayaran Berhasil",
    subtitle: "Upgrade aktif! Selamat menikmati fitur premium 🎉",
    description:
      "Subscription Anda sudah aktif. Semua fitur premium LedgerFlow sekarang bisa Anda gunakan.",
    gradient: "from-emerald-500 to-teal-400",
    glowColor: "bg-emerald-400/20",
    ringColor: "ring-emerald-400/30",
    iconColor: "text-emerald-500",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    cardBorder: "border-emerald-200/60 dark:border-emerald-800/30",
  },
  pending: {
    icon: Clock,
    title: "Menunggu Pembayaran",
    subtitle: "Selesaikan pembayaran untuk mengaktifkan subscription",
    description:
      "Pembayaran Anda sedang menunggu konfirmasi. Subscription akan aktif otomatis setelah pembayaran berhasil.",
    gradient: "from-amber-500 to-orange-400",
    glowColor: "bg-amber-400/20",
    ringColor: "ring-amber-400/30",
    iconColor: "text-amber-500",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/30",
    cardBorder: "border-amber-200/60 dark:border-amber-800/30",
  },
  failed: {
    icon: XCircle,
    title: "Pembayaran Gagal",
    subtitle: "Tenang, Anda bisa coba lagi",
    description:
      "Pembayaran tidak berhasil. Silakan coba lagi atau gunakan metode pembayaran yang berbeda.",
    gradient: "from-rose-500 to-red-400",
    glowColor: "bg-rose-400/20",
    ringColor: "ring-rose-400/30",
    iconColor: "text-rose-500",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/30",
    cardBorder: "border-rose-200/60 dark:border-rose-800/30",
  },
};

// ─── Animation Variants ─────────────────────────────────────────────
// Stagger container — children muncul satu per satu dengan delay
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

// Setiap child element slide-up + fade-in
const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Component ──────────────────────────────────────────────────────
interface PaymentResultPageProps {
  type: ResultType;
}

export default function PaymentResultPage({ type }: PaymentResultPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const config = RESULT_CONFIG[type];
  const Icon = config.icon;

  // ─── Sandbox state ────────────────────────────────────────────────
  const [isSandbox, setIsSandbox] = useState(false);
  const [isForceCompleting, setIsForceCompleting] = useState(false);
  const [forceCompleteError, setForceCompleteError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    isSandboxMode()
      .then(setIsSandbox)
      .catch(() => setIsSandbox(false));
  }, []);

  const handleForceComplete = async () => {
    if (!orderId) return;
    setIsForceCompleting(true);
    setForceCompleteError(null);
    try {
      await testComplete(orderId);
      navigate("/payment/success?order_id=" + orderId);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setForceCompleteError(msg);
    } finally {
      setIsForceCompleting(false);
    }
  };

  // ─── Upload bukti pembayaran ───────────────────────────────────────
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofError(null);

    if (file.size > 2 * 1024 * 1024) {
      setProofError("Ukuran file maksimal 2MB");
      return;
    }

    setUploadingProof(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data } = await api.post("/api/upload/proof", {
        dataUrl: base64,
        order_id: orderId ?? undefined,
      });
      setProofUrl(data?.url ?? null);
    } catch (err: any) {
      setProofError(getErrorMessage(err));
    } finally {
      setUploadingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-darkBg dark:via-gray-900 dark:to-darkBg flex items-center justify-center px-4 sm:px-6 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg w-full mx-auto"
      >
        {/* ═══════════════════════════════════════════════════════════════
            MAIN CARD
            ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          variants={itemVariants}
          className={`relative overflow-hidden rounded-3xl border ${config.cardBorder} bg-white dark:bg-darkCard shadow-xl shadow-gray-200/50 dark:shadow-none`}
        >
          {/* ─── Top gradient bar ─────────────────────────────────── */}
          <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />

          {/* ─── Glow background behind icon ──────────────────────── */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] ${config.glowColor} blur-[100px] rounded-full pointer-events-none`}
          />

          <div className="relative px-6 sm:px-8 pt-10 pb-8 text-center">
            {/* ─── Animated Icon ──────────────────────────────────── */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="relative inline-flex mb-6"
            >
              {/* Outer ring pulse */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute inset-0 rounded-full ${config.glowColor} ring-4 ${config.ringColor}`}
              />
              {/* Icon circle */}
              <div
                className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
              >
                <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>
            </motion.div>

            {/* ─── Title ──────────────────────────────────────────── */}
            <motion.h1
              variants={itemVariants}
              className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
            >
              {config.title}
            </motion.h1>

            {/* ─── Subtitle ───────────────────────────────────────── */}
            <motion.p
              variants={itemVariants}
              className="mt-2 text-sm sm:text-base font-medium text-gray-600 dark:text-gray-300"
            >
              {config.subtitle}
            </motion.p>

            {/* ─── Description ────────────────────────────────────── */}
            <motion.p
              variants={itemVariants}
              className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed"
            >
              {config.description}
            </motion.p>

            {/* ─── Success: Feature highlights ────────────────────── */}
            <AnimatePresence>
              {type === "success" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-6 grid grid-cols-3 gap-2.5"
                >
                  {[
                    {
                      icon: Crown,
                      label: "Pro Aktif",
                      color: "text-blue-500",
                      bg: "bg-blue-50 dark:bg-blue-900/20",
                    },
                    {
                      icon: ShieldCheck,
                      label: "Semua Laporan",
                      color: "text-emerald-500",
                      bg: "bg-emerald-50 dark:bg-emerald-900/20",
                    },
                    {
                      icon: Sparkles,
                      label: "Export PDF",
                      color: "text-purple-500",
                      bg: "bg-purple-50 dark:bg-purple-900/20",
                    },
                  ].map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.08 }}
                        className={`rounded-xl ${item.bg} p-3 text-center`}
                      >
                        <ItemIcon
                          className={`w-5 h-5 ${item.color} mx-auto mb-1.5`}
                        />
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {item.label}
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Order ID pill ──────────────────────────────────── */}
            {orderId && (
              <motion.div
                variants={itemVariants}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100/80 dark:bg-gray-800/60"
              >
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Order
                </span>
                <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 tracking-wide">
                  {orderId}
                </span>
              </motion.div>
            )}

            {/* ═══ Sandbox: Force Complete Card ═════════════════════ */}
            <AnimatePresence>
              {type === "pending" && isSandbox && orderId && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: 0.5 }}
                  className="mt-5 p-4 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/10 text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle
                      size={14}
                      className="text-amber-500 flex-shrink-0"
                    />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Mode Sandbox
                    </span>
                  </div>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mb-3 leading-relaxed">
                    Pembayaran VA di sandbox akan tetap pending. Klik tombol di
                    bawah untuk simulasi pembayaran berhasil.
                  </p>
                  <button
                    onClick={handleForceComplete}
                    disabled={isForceCompleting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isForceCompleting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Zap size={15} />
                        Simulasi Bayar Berhasil
                      </>
                    )}
                  </button>
                  {forceCompleteError && (
                    <p className="mt-2 text-xs text-red-500 text-center">
                      {forceCompleteError}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══ Upload Bukti Pembayaran (pending) ════════════════ */}
            <AnimatePresence>
              {type === "pending" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600/60 bg-gray-50/60 dark:bg-gray-800/30 text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Upload size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Upload Bukti Pembayaran
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                    Sudah transfer manual? Unggah bukti pembayaran agar admin
                    bisa memverifikasi pesanan Anda lebih cepat.
                  </p>
                  {!proofUrl ? (
                    <>
                      <button
                        onClick={() => proofInputRef.current?.click()}
                        disabled={uploadingProof}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-darkCard text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingProof ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Mengupload...
                          </>
                        ) : (
                          <>
                            <FileUp size={15} />
                            Pilih File (maks 2MB)
                          </>
                        )}
                      </button>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProofChange}
                        className="hidden"
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                      <CheckCircle2 size={16} />
                      Bukti pembayaran berhasil diupload
                    </div>
                  )}
                  {proofError && (
                    <p className="mt-2 text-xs text-red-500">{proofError}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ Action Buttons (bottom section) ════════════════════ */}
          <div className="px-6 sm:px-8 pb-8">
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              {/* ─── Success buttons ─────────────────────────────── */}
              {type === "success" && (
                <Link
                  to="/dashboard"
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all`}
                >
                  <Home size={16} />
                  Ke Dashboard
                  <ArrowRight size={16} />
                </Link>
              )}

              {/* ─── Pending buttons ─────────────────────────────── */}
              {type === "pending" && (
                <>
                  <Link
                    to="/dashboard"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Home size={16} />
                    Ke Dashboard
                  </Link>
                  <button
                    onClick={() => window.location.reload()}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all`}
                  >
                    <RefreshCw size={16} />
                    Cek Status
                  </button>
                </>
              )}

              {/* ─── Failed buttons ──────────────────────────────── */}
              {type === "failed" && (
                <>
                  <Link
                    to="/pricing"
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all`}
                  >
                    <RefreshCw size={16} />
                    Coba Lagi
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Home size={16} />
                    Ke Dashboard
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* ═══ Footer ─══════════════════════════════════════════════ */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500"
        >
          Butuh bantuan?{" "}
          <Link
            to="/help-center"
            className="text-primary-500 hover:text-primary-600 hover:underline transition-colors"
          >
            Hubungi Support
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
