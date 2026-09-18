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

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
import { refreshSubscription, useSubscription } from "../hooks/useSubscription";
import { syncPaymentStatus } from "../services/paymentService";

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
    subtitle: "Upgrade aktif! Selamat menikmati fitur premium",
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
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

// Setiap child element slide-up + fade-in (tanpa filter blur —
// blur teks mahal di GPU HP dan glitchy di Firefox).
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Component ──────────────────────────────────────────────────────
export interface PaymentResultPageProps {
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

  // ─── Polling & timer status pembayaran ────────────────────────────
  const checkInFlight = useRef(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Satu pintu cek status: dipakai saat mount, interval otomatis, dan tombol
  // "Cek Sekarang". Return true bila pembayaran baru saja aktif.
  const checkStatus = useCallback(async () => {
    if (!orderId || checkInFlight.current) return false;
    checkInFlight.current = true;
    setCheckingNow(true);
    try {
      const res = await syncPaymentStatus(orderId);
      setLastCheckedAt(new Date());
      if (res.activated) {
        // Reload cache supaya seluruh app tahu plan sudah naik
        await refreshSubscription().catch(() => {});
        navigate("/payment/success?order_id=" + orderId, { replace: true });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      checkInFlight.current = false;
      setCheckingNow(false);
    }
  }, [orderId, navigate]);

  // Saat halaman result dibuka: tanyakan status terkini ke Midtrans —
  // bila ternyata sudah dibayar tapi webhook belum masuk, subscription
  // langsung diaktifkan di sini (failsafe).
  useEffect(() => {
    if (!orderId) return;
    void checkStatus();
  }, [orderId, checkStatus]);

  // Pending: cek otomatis tiap 8 detik sampai pembayaran aktif.
  useEffect(() => {
    if (type !== "pending" || !orderId) return;
    const id = window.setInterval(() => {
      void checkStatus();
    }, 8000);
    return () => window.clearInterval(id);
  }, [type, orderId, checkStatus]);

  // Pending: penghitung waktu tunggu.
  useEffect(() => {
    if (type !== "pending") return;
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [type]);

  useEffect(() => {
    isSandboxMode()
      .then(setIsSandbox)
      .catch(() => setIsSandbox(false));
  }, []);

  // Plan aktif dari subscription (untuk highlight dinamis di success).
  const { subscription } = useSubscription();
  const activePlanKey = (subscription?.plans?.name || "").toLowerCase();
  const isEnterprisePlan = activePlanKey === "enterprise";
  const activePlanLabel =
    subscription?.plans?.display_name ||
    (isEnterprisePlan ? "Enterprise" : "Pro");

  const successTiles = isEnterprisePlan
    ? [
        { icon: Crown, label: "Enterprise Aktif", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
        { icon: ShieldCheck, label: "Semua Laporan", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        { icon: Sparkles, label: "AI CFO Unlimited", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
      ]
    : [
        { icon: Crown, label: `${activePlanLabel} Aktif`, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { icon: ShieldCheck, label: "Semua Laporan", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        { icon: Sparkles, label: "Export PDF", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
      ];

  // Confetti ringan (FR-only, tanpa dependensi baru).
  const confettiPieces = useMemo(() => {
    if (type !== "success" || prefersReducedMotion) return [];
    const colors = ["#10b981", "#14b8a6", "#f59e0b", "#3b82f6", "#a78bfa"];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      duration: 2.4 + Math.random() * 1.4,
      size: 6 + Math.random() * 6,
      color: colors[i % colors.length],
      drift: (Math.random() - 0.5) * 140,
      round: Math.random() > 0.5,
    }));
  }, [type, prefersReducedMotion]);

  const fmtClock = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleForceComplete = async () => {
    if (!orderId) return;
    setIsForceCompleting(true);
    setForceCompleteError(null);
    try {
      await testComplete(orderId);
      await refreshSubscription().catch(() => {});
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

    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isPdf) {
      setProofError("Format file harus gambar atau PDF");
      return;
    }

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
    <div className="relative min-h-screen supports-[min-height:100dvh]:min-h-[100dvh] bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-darkBg dark:via-gray-900 dark:to-darkBg flex items-center justify-center px-4 sm:px-6 py-8 overflow-hidden">
      {/* ═══ Confetti selebrasi (success saja) ═══════════════════════ */}
      {confettiPieces.length > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {confettiPieces.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: -24, opacity: 1, rotate: 0 }}
              animate={{ x: p.drift, y: 480, opacity: [1, 1, 0], rotate: 360 }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
              className="absolute top-0"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size * (p.round ? 1 : 0.5),
                backgroundColor: p.color,
                borderRadius: p.round ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
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
              {/* Icon circle — success: animasi centang "draw" */}
              <div
                className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
              >
                {type === "success" && !prefersReducedMotion ? (
                  <motion.svg viewBox="0 0 52 52" className="w-10 h-10" aria-hidden="true">
                    <motion.circle
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                      stroke="white"
                      strokeWidth={2.5}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    <motion.path
                      d="M14 27l8 8 16-16"
                      fill="none"
                      stroke="white"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                    />
                  </motion.svg>
                ) : (
                  <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />
                )}
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

            {/* ─── Success: Feature highlights (dinamis ikut plan aktif) ── */}
            <AnimatePresence>
              {type === "success" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-6 grid grid-cols-3 sm:gap-2.5 gap-2"
                >
                  {successTiles.map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
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

            {/* ─── Pending: status live + timeline langkah ──────────── */}
            <AnimatePresence>
              {type === "pending" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-5 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-900/10 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Mengecek status otomatis tiap 8 detik
                    </span>
                    <span className="ml-auto text-xs font-mono text-amber-600/80 dark:text-amber-400/70 tabular-nums">
                      {fmtElapsed(elapsedSec)}
                    </span>
                  </div>
                  {lastCheckedAt && (
                    <p className="mt-1.5 text-[11px] text-amber-600/70 dark:text-amber-400/60">
                      Terakhir dicek {fmtClock(lastCheckedAt)} — halaman akan
                      pindah otomatis begitu pembayaran terkonfirmasi.
                    </p>
                  )}
                  <ol className="mt-3 space-y-2.5">
                    {[
                      { label: "Pesanan dibuat", state: "done" as const },
                      { label: "Konfirmasi pembayaran", state: "active" as const },
                      { label: "Subscription aktif", state: "todo" as const },
                    ].map((step, i) => (
                      <li key={step.label} className="flex items-start gap-2.5">
                        <span className="flex flex-col items-center">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              step.state === "done"
                                ? "bg-emerald-500 text-white"
                                : step.state === "active"
                                  ? "bg-amber-500 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {step.state === "done" ? "✓" : i + 1}
                          </span>
                          {i < 2 && (
                            <span
                              className={`mt-1 w-0.5 h-3 rounded ${
                                step.state === "done"
                                  ? "bg-emerald-400"
                                  : "bg-gray-200 dark:bg-gray-700"
                              }`}
                            />
                          )}
                        </span>
                        <span
                          className={`text-xs pt-0.5 ${
                            step.state === "todo"
                              ? "text-gray-400 dark:text-gray-500"
                              : "font-medium text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {step.label}
                        </span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>

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
                        accept="image/*,application/pdf,.pdf"
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
                <>
                  <Link
                    to="/dashboard"
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all`}
                  >
                    <Home size={16} />
                    Ke Dashboard
                    <ArrowRight size={16} />
                  </Link>
                </>
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
                    onClick={() => void checkStatus()}
                    disabled={checkingNow}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {checkingNow ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Mengecek...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Cek Sekarang
                      </>
                    )}
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

            {/* ─── Success: jelajahi fitur yang baru terbuka ─────────── */}
            {type === "success" && (
              <motion.div
                variants={itemVariants}
                className="mt-2.5 flex items-center justify-center gap-4 text-sm"
              >
                <Link
                  to="/income-statement"
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                >
                  Lihat Laba Rugi
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link
                  to="/ai-cfo"
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                >
                  Coba AI CFO
                </Link>
              </motion.div>
            )}
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
