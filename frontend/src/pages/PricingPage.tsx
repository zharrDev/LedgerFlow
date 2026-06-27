// ============================================================================
// LEDGERFLOW - Pricing Page (with AppShell Header)
// ============================================================================

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import {
  getPlans,
  subscribe,
  openSnapPayment,
  testComplete,
  isSandboxMode,
  formatPrice,
  type Plan,
} from "../services/paymentService";
import { AppShell } from "../components/AppShell";
import {
  Check,
  X,
  Crown,
  Sparkles,
  Shield,
  Zap,
  Loader2,
  Star,
  Lock,
} from "lucide-react";

// ─── Plan Icon & Color Config ───────────────────────────────────────
const PLAN_CONFIG: Record<
  string,
  {
    icon: typeof Crown;
    gradient: string;
    border: string;
    badge?: string;
    iconBg: string;
  }
> = {
  free: {
    icon: Zap,
    gradient: "from-gray-500 to-gray-600",
    border: "border-gray-200 dark:border-gray-700",
    iconBg: "bg-gray-100 dark:bg-gray-800",
  },
  pro: {
    icon: Crown,
    gradient: "from-blue-600 to-cyan-500",
    border: "border-blue-500/50",
    badge: "Paling Populer",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  enterprise: {
    icon: Shield,
    gradient: "from-purple-600 to-pink-500",
    border: "border-purple-500/30",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
  },
};

// ─── Feature Comparison ─────────────────────────────────────────────
const FEATURE_COMPARISON = [
  {
    category: "Fitur Dasar",
    items: [
      { name: "Chart of Accounts", free: true, pro: true, enterprise: true },
      { name: "Dashboard Analytics", free: true, pro: true, enterprise: true },
      { name: "Buku Besar", free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: "Journal Entries",
    items: [
      {
        name: "Jurnal Manual",
        free: "50/bulan",
        pro: "Unlimited",
        enterprise: "Unlimited",
      },
      { name: "Auto-Balance", free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: "Laporan Keuangan",
    items: [
      { name: "Laporan Laba Rugi", free: false, pro: true, enterprise: true },
      {
        name: "Neraca (Balance Sheet)",
        free: false,
        pro: true,
        enterprise: true,
      },
      { name: "Laporan Arus Kas", free: false, pro: true, enterprise: true },
      { name: "Custom Reports", free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Export & Integration",
    items: [
      { name: "Export PDF", free: false, pro: true, enterprise: true },
      { name: "Export CSV", free: false, pro: false, enterprise: true },
      { name: "API Access", free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Manajemen",
    items: [
      {
        name: "Jumlah Perusahaan",
        free: "1",
        pro: "3",
        enterprise: "Unlimited",
      },
      { name: "Multi-User & Roles", free: false, pro: false, enterprise: true },
      { name: "Audit Trail", free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Support",
    items: [
      { name: "Community Support", free: true, pro: true, enterprise: true },
      { name: "Priority Support", free: false, pro: true, enterprise: true },
      {
        name: "Dedicated Account Manager",
        free: false,
        pro: false,
        enterprise: true,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    subscription,
    planName: currentPlan,
    isLoading: subLoading,
  } = useSubscription();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubscribe = async (planName: string) => {
    if (!user) {
      navigate("/register");
      return;
    }
    if (planName === "free") return;
    if (planName === currentPlan) return;

    setSubscribing(planName);
    try {
      const result = await subscribe(planName, billingCycle);
      const sandboxMode = await isSandboxMode();

      openSnapPayment(result.snap_token, {
        onSuccess: (res) =>
          navigate("/payment/success?order_id=" + result.order_id),
        onPending: async (res) => {
          // ─── SANDBOX: Auto-force complete payment ──────────────────
          // In sandbox, VA/bank transfer stays "pending" forever because
          // the webhook never fires. So we auto-complete it so the user
          // can immediately try the upgraded features.
          if (sandboxMode) {
            console.log(
              "[Pricing] Sandbox mode — auto-completing payment:",
              result.order_id,
            );
            try {
              await testComplete(result.order_id);
              navigate("/payment/success?order_id=" + result.order_id);
              return;
            } catch (err) {
              console.warn(
                "[Pricing] Test-complete failed, falling back to pending page:",
                err,
              );
            }
          }
          // Production: normal flow — wait for webhook
          navigate("/payment/pending?order_id=" + result.order_id);
        },
        onError: (res) =>
          navigate("/payment/failed?order_id=" + result.order_id),
        onClose: () => setSubscribing(null),
      });
    } catch (err: any) {
      console.error("Subscribe error:", err);
      alert(err.response?.data?.error || "Gagal membuat pembayaran");
    } finally {
      setSubscribing(null);
    }
  };

  const getButtonLabel = (planName: string) => {
    if (!user) return "Mulai Free Trial";
    if (planName === currentPlan) return "Plan Saat Ini";
    if (planName === "free") return "Downgrade";
    return "Upgrade Sekarang";
  };

  const getButtonDisabled = (planName: string) => {
    return planName === currentPlan || subscribing !== null;
  };

  const getSavings = (plan: Plan) => {
    if (plan.price_monthly === 0) return 0;
    const yearlyMonthly = plan.price_yearly / 12;
    return Math.round(
      ((plan.price_monthly - yearlyMonthly) / plan.price_monthly) * 100,
    );
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
        {/* ═══ Hero ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-600 text-sm font-medium mb-4">
            <Sparkles size={16} />
            Pricing yang Transparan
          </div>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.035, delayChildren: 0.2 },
              },
            }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center"
          >
            {/* Baris 1 */}
            <span className="block text-gray-900 dark:text-white">
              {"Pilih Plan yang Tepat".split("").map((char, i) => (
                <motion.span
                  key={`a-${i}`}
                  variants={{
                    hidden: { y: 40, opacity: 0, rotateX: -90 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      rotateX: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 18,
                      },
                    },
                  }}
                  className="inline-block"
                  style={{ transformOrigin: "bottom center" }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>

            {/* Baris 2 — gradient */}
            <span className="block mt-2 bg-gradient-to-r from-primary-600 to-cyan-500 bg-clip-text text-transparent">
              {"untuk Bisnis Anda".split("").map((char, i) => (
                <motion.span
                  key={`b-${i}`}
                  variants={{
                    hidden: { y: 40, opacity: 0, rotateX: -90 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      rotateX: 0,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 18,
                      },
                    },
                  }}
                  className="inline-block"
                  style={{ transformOrigin: "bottom center" }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
          </motion.h1>{" "}
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Mulai gratis, upgrade kapan saja. Semua plan termasuk 15 hari free
            trial untuk fitur premium.
          </p>
        </motion.div>

        {/* ═══ Billing Toggle ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-darkCard shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-darkCard shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Tahunan
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                Hemat 15%
              </span>
            </button>
          </div>
        </motion.div>

        {/* ═══ Pricing Cards ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            const config = PLAN_CONFIG[plan.name] || PLAN_CONFIG.free;
            const Icon = config.icon;
            const price =
              billingCycle === "monthly"
                ? plan.price_monthly
                : plan.price_yearly;
            const monthlyPrice =
              billingCycle === "yearly" && plan.price_yearly > 0
                ? Math.round(plan.price_yearly / 12)
                : plan.price_monthly;
            const savings = getSavings(plan);
            const isCurrentPlan = plan.name === currentPlan;
            const isPopular = plan.name === "pro";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.1 }}
                className={`relative rounded-3xl bg-white dark:bg-darkCard border-2 ${
                  isPopular
                    ? config.border + " shadow-2xl shadow-blue-500/15"
                    : config.border + " shadow-lg"
                } overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2`}
              >
                {config.badge && (
                  <div
                    className={`absolute top-0 left-0 right-0 py-2.5 bg-gradient-to-r ${config.gradient} text-white text-center text-xs font-bold tracking-wider uppercase`}
                  >
                    <Star size={12} className="inline mr-1" />
                    {config.badge}
                  </div>
                )}

                <div className={`p-6 sm:p-8 ${config.badge ? "pt-14" : ""}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${config.iconBg}`}>
                      <Icon
                        size={24}
                        style={{
                          color:
                            plan.name === "free"
                              ? "#6B7280"
                              : plan.name === "pro"
                                ? "#2563EB"
                                : "#9333EA",
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {plan.display_name}
                      </h3>
                      {isCurrentPlan && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                          Plan Anda
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    {price === 0 ? (
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        Gratis
                      </span>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                            {formatPrice(price)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            /{billingCycle === "yearly" ? "tahun" : "bulan"}
                          </span>
                        </div>
                        {billingCycle === "yearly" && savings > 0 && (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                            Hemat {savings}% — setara{" "}
                            {formatPrice(monthlyPrice)}/bulan
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={getButtonDisabled(plan.name)}
                    className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                      isCurrentPlan
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                        : plan.name === "free"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                          : `bg-gradient-to-r ${config.gradient} text-white shadow-md hover:shadow-lg hover:scale-[1.02]`
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {subscribing === plan.name ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Memproses...
                      </span>
                    ) : (
                      getButtonLabel(plan.name)
                    )}
                  </button>

                  <ul className="mt-6 space-y-3">
                    {(plan.features as string[]).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check
                          size={16}
                          className="text-emerald-500 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ═══ Feature Comparison Toggle ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition"
          >
            {showComparison ? "Sembunyikan" : "Lihat"} Perbandingan Lengkap
            <motion.span
              animate={{ rotate: showComparison ? 180 : 0 }}
              className="inline-block"
            >
              ▼
            </motion.span>
          </button>
        </motion.div>

        {/* ═══ Feature Comparison Table ═══ */}
        {showComparison && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="max-w-5xl mx-auto overflow-hidden"
          >
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkCard shadow-lg overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Fitur
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Free
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-blue-600">
                      Pro
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-purple-600">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((group) => (
                    <React.Fragment key={group.category}>
                      <tr>
                        <td
                          colSpan={4}
                          className="py-3 px-6 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          {group.category}
                        </td>
                      </tr>
                      {group.items.map((item) => (
                        <tr
                          key={item.name}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-3 px-6 text-sm text-gray-700 dark:text-gray-300">
                            {item.name}
                          </td>
                          {(["free", "pro", "enterprise"] as const).map((p) => (
                            <td key={p} className="py-3 px-4 text-center">
                              {typeof item[p] === "boolean" ? (
                                item[p] ? (
                                  <Check
                                    size={16}
                                    className="text-emerald-500 mx-auto"
                                  />
                                ) : (
                                  <X
                                    size={16}
                                    className="text-gray-300 dark:text-gray-600 mx-auto"
                                  />
                                )
                              ) : (
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {item[p]}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ═══ Payment Methods ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Metode Pembayaran yang Didukung
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: "GoPay", icon: "💚" },
              { name: "OVO", icon: "💜" },
              { name: "QRIS", icon: "📱" },
              { name: "BCA VA", icon: "🏦" },
              { name: "BNI VA", icon: "🏦" },
              { name: "Mandiri VA", icon: "🏦" },
              { name: "Credit Card", icon: "💳" },
            ].map((method) => (
              <div
                key={method.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
              >
                <span>{method.icon}</span>
                {method.name}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
            <Lock size={12} />
            <span>Pembayaran aman diproses oleh Midtrans</span>
            <Shield size={12} />
            <span>PCI-DSS Level 1</span>
          </div>
        </motion.div>

        {/* ═══ FAQ ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-3xl mx-auto pb-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6 sm:mb-8">
            Pertanyaan Umum
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Apa itu Free Trial 15 hari?",
                a: "Setiap akun baru mendapat akses ke semua fitur premium selama 15 hari secara gratis. Setelah trial berakhir, Anda bisa upgrade atau tetap di plan Free dengan fitur terbatas.",
              },
              {
                q: "Bisakah saya cancel kapan saja?",
                a: "Ya! Tidak ada kontrak jangka panjang. Anda bisa cancel subscription kapan saja dari halaman Settings. Akses premium tetap berlaku sampai akhir periode yang sudah dibayar.",
              },
              {
                q: "Metode pembayaran apa yang diterima?",
                a: "Kami mendukung GoPay, OVO, QRIS, Virtual Account (BCA, BNI, Mandiri, BRI), dan Kartu Kredit/Debit (Visa, Mastercard). Semua diproses aman oleh Midtrans.",
              },
              {
                q: "Apakah data saya aman kalau downgrade?",
                a: "Tentu! Data Anda tetap tersimpan aman. Hanya akses ke fitur premium yang dibatasi. Anda bisa upgrade kembali kapan saja untuk mengakses semua data.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 p-5"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
