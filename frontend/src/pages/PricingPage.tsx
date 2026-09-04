// ============================================================================
// LEDGERFLOW - Pricing Page (with AppShell Header)
// ============================================================================

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { getErrorMessage } from "../lib/errorMessage";
import {
  getPlans,
  subscribe,
  openSnapPayment,
  formatPrice,
  type Plan,
} from "../services/paymentService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ScrollReveal } from "../components/ScrollReveal";
import { useLanguage } from "../hooks/useLanguage";
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

type L = { en: string; id: string };

// ─── Plan Icon & Color Config ───────────────────────────────────────
const PLAN_CONFIG: Record<
  string,
  {
    icon: typeof Crown;
    gradient: string;
    border: string;
    badge?: L;
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
    badge: { en: "Most Popular", id: "Paling Populer" },
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
const FEATURE_COMPARISON: Array<{
  category: L;
  items: Array<{ name: L; free: boolean | string; pro: boolean | string; enterprise: boolean | string }>;
}> = [
  {
    category: { en: "Basic Features", id: "Fitur Dasar" },
    items: [
      { name: { en: "Chart of Accounts", id: "Chart of Accounts" }, free: true, pro: true, enterprise: true },
      { name: { en: "Dashboard Analytics", id: "Analitik Dashboard" }, free: true, pro: true, enterprise: true },
      { name: { en: "General Ledger", id: "Buku Besar" }, free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: { en: "Journal Entries", id: "Jurnal Umum" },
    items: [
      {
        name: { en: "Manual Journals", id: "Jurnal Manual" },
        free: "50/bulan",
        pro: "Unlimited",
        enterprise: "Unlimited",
      },
      { name: { en: "Auto-Balance", id: "Auto-Balance" }, free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: { en: "Financial Reports", id: "Laporan Keuangan" },
    items: [
      { name: { en: "Income Statement", id: "Laporan Laba Rugi" }, free: false, pro: true, enterprise: true },
      {
        name: { en: "Balance Sheet", id: "Neraca (Balance Sheet)" },
        free: false,
        pro: true,
        enterprise: true,
      },
      { name: { en: "Cash Flow Report", id: "Laporan Arus Kas" }, free: false, pro: true, enterprise: true },
      { name: { en: "Custom Reports", id: "Laporan Kustom" }, free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: { en: "Export & Integration", id: "Ekspor & Integrasi" },
    items: [
      { name: { en: "PDF Export", id: "Ekspor PDF" }, free: false, pro: true, enterprise: true },
      { name: { en: "CSV Export", id: "Ekspor CSV" }, free: false, pro: false, enterprise: true },
      { name: { en: "API Access", id: "Akses API" }, free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: { en: "Management", id: "Manajemen" },
    items: [
      {
        name: { en: "Number of Companies", id: "Jumlah Perusahaan" },
        free: "1",
        pro: "1",
        enterprise: "1",
      },
      { name: { en: "Multi-User & Roles", id: "Multi-Pengguna & Peran" }, free: false, pro: false, enterprise: true },
      { name: { en: "Audit Trail", id: "Jejak Audit" }, free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: { en: "Support", id: "Dukungan" },
    items: [
      { name: { en: "Community Support", id: "Dukungan Komunitas" }, free: true, pro: true, enterprise: true },
      { name: { en: "Priority Support", id: "Dukungan Prioritas" }, free: false, pro: true, enterprise: true },
      {
        name: { en: "Dedicated Account Manager", id: "Account Manager Khusus" },
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
  const { planName: currentPlan } = useSubscription();
  const { language } = useLanguage();

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

      openSnapPayment(result.snap_token, {
        onSuccess: () =>
          navigate("/payment/success?order_id=" + result.order_id),
        onPending: () => {
          navigate("/payment/pending?order_id=" + result.order_id);
        },
        onError: () =>
          navigate("/payment/failed?order_id=" + result.order_id),
        onClose: () => setSubscribing(null),
      }, result.redirect_url);
    } catch (err: any) {
      console.error("Subscribe error:", err);
      alert(getErrorMessage(err));
    } finally {
      setSubscribing(null);
    }
  };

  const getButtonLabel = (planName: string) => {
    if (!user)
      return language === "id" ? "Mulai Free Trial" : "Start Free Trial";
    if (planName === currentPlan)
      return language === "id" ? "Plan Saat Ini" : "Current Plan";
    if (planName === "free") return language === "id" ? "Turun Paket" : "Downgrade";
    return language === "id" ? "Upgrade Sekarang" : "Upgrade Now";
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
      <div className="min-h-screen bg-white dark:bg-darkBg">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-darkBg">
      <Navbar />
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* ═══ Hero ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-600 text-sm font-medium mb-4">
            <Sparkles size={16} />
            {language === "id" ? "Harga yang Transparan" : "Transparent Pricing"}
          </div>
          <motion.h1
            key={`pricing-hero-${language}`}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center min-w-0 break-words"
          >
            {/* Baris 1 */}
            <span className="block text-gray-900 dark:text-white">
              {language === "id" ? "Pilih Plan yang Tepat" : "Choose the Right Plan"}
            </span>

            {/* Baris 2 — gradient */}
            <span className="block mt-2 bg-gradient-to-r from-primary-600 to-cyan-500 bg-clip-text text-transparent">
              {language === "id" ? "untuk Bisnis Anda" : "for Your Business"}
            </span>
          </motion.h1>{" "}
          <ScrollReveal direction="left" className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {language === "id"
              ? "Mulai gratis, upgrade kapan saja. Semua plan termasuk 15 hari free trial untuk fitur premium."
              : "Start free, upgrade anytime. Every plan includes a 15-day free trial of premium features."}
          </ScrollReveal>
        </motion.div>

        {/* ═══ Billing Toggle ═══ */}
        <ScrollReveal direction="left" className="flex justify-center">
          <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 max-w-full">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-darkCard shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {language === "id" ? "Bulanan" : "Monthly"}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-darkCard shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {language === "id" ? "Tahunan" : "Yearly"}
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold whitespace-nowrap">
                {language === "id" ? "Hemat 15%" : "Save 15%"}
              </span>
            </button>
          </div>
        </ScrollReveal>

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
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
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
                    {config.badge?.[language]}
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
                          {language === "id" ? "Plan Anda" : "Your Plan"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    {price === 0 ? (
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        {language === "id" ? "Gratis" : "Free"}
                      </span>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                            {formatPrice(price)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            /{billingCycle === "yearly" ? (language === "id" ? "tahun" : "year") : language === "id" ? "bulan" : "month"}
                          </span>
                        </div>
                        {billingCycle === "yearly" && savings > 0 && (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                            {language === "id"
                              ? `Hemat ${savings}% — setara ${formatPrice(monthlyPrice)}/bulan`
                              : `Save ${savings}% — equivalent to ${formatPrice(monthlyPrice)}/mo`}
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
                        {language === "id" ? "Memproses..." : "Processing..."}
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
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.15 }}
          className="text-center mt-8"
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition"
          >
            {showComparison
              ? language === "id"
                ? "Sembunyikan Perbandingan Lengkap"
                : "Hide Full Comparison"
              : language === "id"
                ? "Lihat Perbandingan Lengkap"
                : "View Full Comparison"}
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
                      {language === "id" ? "Fitur" : "Feature"}
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
                    <React.Fragment key={group.category.en}>
                      <tr>
                        <td
                          colSpan={4}
                          className="py-3 px-6 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          {group.category[language]}
                        </td>
                      </tr>
                      {group.items.map((item) => (
                        <tr
                          key={item.name.en}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-3 px-6 text-sm text-gray-700 dark:text-gray-300">
                            {item.name[language]}
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {language === "id"
              ? "Metode Pembayaran yang Didukung"
              : "Supported Payment Methods"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: "GoPay", icon: "💚" },
              { name: "OVO", icon: "💜" },
              { name: "QRIS", icon: "📱" },
              { name: "BCA VA", icon: "🏦" },
              { name: "BNI VA", icon: "🏦" },
              { name: "Mandiri VA", icon: "🏦" },
              { name: language === "id" ? "Kartu Kredit" : "Credit Card", icon: "💳" },
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
            <span>
              {language === "id"
                ? "Pembayaran aman diproses oleh Midtrans"
                : "Payments securely processed by Midtrans"}
            </span>
            <Shield size={12} />
            <span>PCI-DSS Level 1</span>
          </div>
        </motion.div>

        {/* ═══ FAQ ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto pb-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6 sm:mb-8">
            {language === "id" ? "Pertanyaan Umum" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-4">
            {(language === "id"
              ? [
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
                ]
              : [
                  {
                    q: "What is the 15-day free trial?",
                    a: "Every new account gets access to all premium features free for 15 days. When the trial ends, you can upgrade or stay on the Free plan with limited features.",
                  },
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes! There are no long-term contracts. You can cancel your subscription anytime from the Settings page. Premium access remains active until the end of the period you already paid for.",
                  },
                  {
                    q: "Which payment methods are accepted?",
                    a: "We support GoPay, OVO, QRIS, Virtual Accounts (BCA, BNI, Mandiri, BRI), and Credit/Debit Cards (Visa, Mastercard). Everything is securely processed by Midtrans.",
                  },
                  {
                    q: "Is my data safe if I downgrade?",
                    a: "Absolutely! Your data stays safely stored. Only access to premium features is limited. You can upgrade again anytime to regain full access to your data.",
                  },
                ]
            ).map((faq, i) => (
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
      <Footer />
    </div>
  );
}
