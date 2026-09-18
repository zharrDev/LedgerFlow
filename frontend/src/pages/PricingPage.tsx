// ============================================================================
// LEDGERFLOW - Pricing Page (with AppShell Header)
// ============================================================================

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  useSubscription,
  refreshSubscription,
  clearSubscriptionCache,
} from "../hooks/useSubscription";
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
import { TextFlipWords } from "../components/TextFlipWords";
import { TextFlipParagraph } from "../components/TextFlipParagraph";
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
  ChevronDown,
  Wallet,
  Smartphone,
  QrCode,
  Landmark,
  CreditCard,
} from "lucide-react";

type L = { en: string; id: string };

// Label baca-manusia untuk key fitur machine-readable di plans.features (DB).
// Key yang tak terdaftar di-fallback ke title-case otomatis saat render.
const FEATURE_LABELS: Record<string, L> = {
  chart_of_accounts: { en: "Chart of Accounts", id: "Chart of Accounts" },
  journal_entries: { en: "Journal Entries", id: "Jurnal Umum" },
  dashboard: { en: "Dashboard Analytics", id: "Analitik Dashboard" },
  general_ledger: { en: "General Ledger", id: "Buku Besar" },
  income_statement: { en: "Income Statement", id: "Laporan Laba Rugi" },
  balance_sheet: { en: "Balance Sheet", id: "Neraca" },
  cash_flow: { en: "Cash Flow Report", id: "Laporan Arus Kas" },
  export_pdf: { en: "PDF Export", id: "Ekspor PDF" },
  export_csv: { en: "CSV Export", id: "Ekspor CSV" },
  multi_company: { en: "Multi-Company", id: "Multi-Perusahaan" },
  multi_user: { en: "Multi-User & Roles", id: "Multi-Pengguna & Peran" },
  ai_cfo: { en: "AI CFO Assistant", id: "Asisten AI CFO" },
  api_access: { en: "API Access", id: "Akses API" },
  custom_reports: { en: "Custom Reports", id: "Laporan Kustom" },
  dedicated_support: { en: "Dedicated Account Manager", id: "Account Manager Khusus" },
  audit_trail: { en: "Audit Trail", id: "Jejak Audit" },
  priority_support: { en: "Priority Support", id: "Dukungan Prioritas" },
};

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
        pro: "3",
        enterprise: "Unlimited",
      },
      { name: { en: "Multi-User & Roles", id: "Multi-Pengguna & Peran" }, free: false, pro: false, enterprise: true },
      { name: { en: "Audit Trail", id: "Jejak Audit" }, free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: { en: "AI & Support", id: "AI & Dukungan" },
    items: [
      {
        name: { en: "AI CFO Assistant", id: "Asisten AI CFO" },
        free: false,
        pro: "30 chats/month",
        enterprise: "Unlimited",
      },
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

    setSubscribing("begin");
    const result = await subscribe(planName, billingCycle);
    // Checkout dimulai: buang cache subscription supaya badge plan & CTA
    // tidak menampilkan data basi setelah pembayaran selesai.
    clearSubscriptionCache();

    try {
      openSnapPayment(
        result.snap_token,
        {
          onSuccess: async () => {
            await refreshSubscription().catch(() => {});
            navigate("/payment/success?order_id=" + result.order_id);
          },
          onPending: () => {
            navigate("/payment/pending?order_id=" + result.order_id);
          },
          onError: () =>
            navigate("/payment/failed?order_id=" + result.order_id),
          onClose: () => setSubscribing(null),
        },
        result.redirect_url,
        // Client key dari backend — PASTI satu mode dengan snap_token.
        result.client_key,
      );
      // Fallback redirect (popup diblokir) tidak memicu onClose —
      // reset tombol otomatis supaya tidak selamanya disabled.
      setTimeout(
        () => setSubscribing((cur) => (cur === "begin" ? null : cur)),
        60_000,
      );
    } catch (err: any) {
      console.error("Subscribe error:", err);
      alert(getErrorMessage(err));
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
    <div className="relative min-h-screen flex flex-col bg-white dark:bg-darkBg overflow-x-hidden">
      <Navbar />
      {/* Dekorasi latar halus — mesh radial memudar, tidak mengganggu konten */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.12),transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto w-full space-y-10 sm:space-y-12 px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8">
        {/* ═══ Hero ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-darkCard border border-primary-200/70 dark:border-primary-800/50 shadow-sm text-primary-600 dark:text-primary-400 text-sm font-medium mb-5">
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
              <TextFlipWords
                text={language === "id" ? "Pilih Plan yang Tepat" : "Choose the Right Plan"}
                language={language}
              />
            </span>

            {/* Baris 2 — gradient */}
            <span className="block mt-2 bg-gradient-to-r from-primary-600 to-cyan-500 bg-clip-text text-transparent">
              <TextFlipWords
                text={language === "id" ? "untuk Bisnis Anda" : "for Your Business"}
                language={language}
                delay={0.08}
                wordClassName="bg-gradient-to-r from-primary-600 to-cyan-500 bg-clip-text text-transparent"
              />
            </span>
          </motion.h1>{" "}
          <ScrollReveal direction="left" className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            <TextFlipParagraph
              as="span"
              text={
                language === "id"
                  ? "Mulai gratis, upgrade kapan saja. Semua plan termasuk 15 hari free trial untuk fitur premium."
                  : "Start free, upgrade anytime. Every plan includes a 15-day free trial of premium features."
              }
              language={language}
              className="text-base sm:text-lg text-gray-600 dark:text-gray-400"
            />
          </ScrollReveal>
        </motion.div>

        {/* ═══ Billing Toggle ═══ */}
        <ScrollReveal direction="fade" className="flex justify-center">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/10 shadow-sm max-w-full">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {language === "id" ? "Bulanan" : "Monthly"}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {language === "id" ? "Tahunan" : "Yearly"}
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold whitespace-nowrap">
                {language === "id" ? "Hemat 15%" : "Save 15%"}
              </span>
            </button>
          </div>
        </ScrollReveal>

        {/* ═══ Pricing Cards ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-6 max-w-6xl mx-auto items-stretch pt-2">
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
                className={`relative flex flex-col rounded-3xl bg-white dark:bg-darkCard border transition-all duration-300 hover:-translate-y-1.5 ${
                  isPopular
                    ? "border-blue-500/50 dark:border-blue-500/40 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 ring-1 ring-blue-500/20 md:-translate-y-2"
                    : "border-gray-200 dark:border-gray-700/60 shadow-sm hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {config.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r ${config.gradient} text-white text-[11px] font-bold tracking-wider uppercase shadow-lg whitespace-nowrap`}
                    >
                      <Star size={11} strokeWidth={2.5} />
                      {config.badge?.[language]}
                    </span>
                  </div>
                )}

                <div className="flex flex-col flex-1 p-6 sm:p-7 pt-8">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ring-1 ring-inset ${config.iconBg} ${
                      plan.name === "pro" ? "ring-blue-500/20" : plan.name === "enterprise" ? "ring-purple-500/20" : "ring-gray-500/10"
                    }`}>
                      <Icon
                        size={22}
                        strokeWidth={2.25}
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
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                        {plan.display_name}
                      </h3>
                      {isCurrentPlan && (
                        <span className="inline-flex mt-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold">
                          {language === "id" ? "Plan Anda" : "Your Plan"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 mb-5 min-h-[3.5rem]">
                    {price === 0 ? (
                      <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">
                        {language === "id" ? "Gratis" : "Free"}
                      </span>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-[2rem] leading-none font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">
                            {formatPrice(price)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            /{billingCycle === "yearly" ? (language === "id" ? "tahun" : "year") : language === "id" ? "bulan" : "month"}
                          </span>
                        </div>
                        {billingCycle === "yearly" && savings > 0 && (
                          <p className="text-[13px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
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
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                      isCurrentPlan
                        ? "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed ring-1 ring-inset ring-gray-200 dark:ring-white/10"
                        : plan.name === "free"
                          ? "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-200 dark:ring-white/10 hover:bg-gray-200/70 dark:hover:bg-white/10"
                          : `bg-gradient-to-r ${config.gradient} text-white shadow-md hover:shadow-lg`
                    } disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100`}
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

                  <div className="border-t border-gray-100 dark:border-white/[0.06] mt-6 pt-6 flex-1">
                    <ul className="space-y-2.5">
                      {(plan.features as string[]).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 mt-0.5">
                            <Check
                              size={11}
                              strokeWidth={3}
                              className="text-emerald-600 dark:text-emerald-400"
                            />
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {/* Key fitur di DB machine-readable; tampilkan label
                                yang bisa dibaca manusia sesuai bahasa aktif. */}
                            {FEATURE_LABELS[feature]?.[language === "id" ? "id" : "en"] ??
                              feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
          className="text-center"
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/60 shadow-sm text-sm text-gray-700 dark:text-gray-200 font-medium hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400 transition"
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
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronDown size={16} />
            </motion.span>
          </button>
        </motion.div>

        {/* ═══ Feature Comparison Table ═══ */}
        <AnimatePresence initial={false}>
        {showComparison && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-5xl mx-auto"
          >
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-darkCard shadow-sm overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700/60 bg-gray-50/80 dark:bg-white/[0.03]">
                    <th className="text-left py-4 px-5 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {language === "id" ? "Fitur" : "Feature"}
                    </th>
                    <th className="py-4 px-3 sm:px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-500 dark:text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        Free
                      </span>
                    </th>
                    <th className="py-4 px-3 sm:px-4 text-center bg-blue-500/[0.04] dark:bg-blue-500/[0.06]">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Pro
                      </span>
                    </th>
                    <th className="py-4 px-3 sm:px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        Enterprise
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((group) => (
                    <React.Fragment key={group.category.en}>
                      <tr>
                        <td
                          colSpan={4}
                          className="py-2.5 px-5 sm:px-6 bg-gray-50/60 dark:bg-white/[0.02] text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em]"
                        >
                          {group.category[language]}
                        </td>
                      </tr>
                      {group.items.map((item, rowIdx) => (
                        <tr
                          key={item.name.en}
                          className={`border-t border-gray-100 dark:border-white/[0.05] transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03] ${rowIdx % 2 === 1 ? "bg-gray-50/40 dark:bg-white/[0.015]" : ""}`}
                        >
                          <td className="py-3 px-5 sm:px-6 text-gray-700 dark:text-gray-300">
                            {item.name[language]}
                          </td>
                          {(["free", "pro", "enterprise"] as const).map((p) => (
                            <td key={p} className={`py-3 px-3 sm:px-4 text-center ${p === "pro" ? "bg-blue-500/[0.04] dark:bg-blue-500/[0.06]" : ""}`}>
                              {typeof item[p] === "boolean" ? (
                                item[p] ? (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                                    <Check
                                      size={11}
                                      strokeWidth={3}
                                      className="text-emerald-600 dark:text-emerald-400"
                                    />
                                  </span>
                                ) : (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-500/[0.07] ring-1 ring-gray-500/10">
                                    <X
                                      size={11}
                                      strokeWidth={2.5}
                                      className="text-gray-300 dark:text-gray-600"
                                    />
                                  </span>
                                )
                              ) : (
                                <span className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap tabular-nums">
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
            <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500 sm:hidden">
              {language === "id" ? "← Geser untuk melihat semua kolom →" : "← Swipe to see all columns →"}
            </p>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ═══ Payment Methods ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-4">
            {language === "id"
              ? "Metode Pembayaran yang Didukung"
              : "Supported Payment Methods"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
            {[
              { name: "GoPay", Icon: Wallet, tint: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/20" },
              { name: "OVO", Icon: Smartphone, tint: "text-violet-600 dark:text-violet-400 bg-violet-500/10 ring-violet-500/20" },
              { name: "QRIS", Icon: QrCode, tint: "text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-rose-500/20" },
              { name: "BCA VA", Icon: Landmark, tint: "text-blue-600 dark:text-blue-400 bg-blue-500/10 ring-blue-500/20" },
              { name: "BNI VA", Icon: Landmark, tint: "text-orange-600 dark:text-orange-400 bg-orange-500/10 ring-orange-500/20" },
              { name: "Mandiri VA", Icon: Landmark, tint: "text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20" },
              { name: language === "id" ? "Kartu Kredit" : "Credit Card", Icon: CreditCard, tint: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 ring-cyan-500/20" },
            ].map(({ name, Icon, tint }) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/60 shadow-sm text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ring-1 ring-inset ${tint}`}>
                  <Icon size={13} strokeWidth={2.25} />
                </span>
                {name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-4 text-xs text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={12} />
              {language === "id"
                ? "Pembayaran aman diproses oleh Midtrans"
                : "Payments securely processed by Midtrans"}
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Shield size={12} />
              PCI-DSS Level 1
            </span>
          </div>
        </motion.div>

        {/* ═══ FAQ ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto w-full pb-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 text-center">
            FAQ
          </p>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center tracking-tight mb-6 sm:mb-8">
            {language === "id" ? "Pertanyaan Umum" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-3">
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
            ).map((faq, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl bg-white dark:bg-darkCard border transition-colors duration-200 overflow-hidden ${
                    open
                      ? "border-primary-300/70 dark:border-primary-700/50 shadow-sm"
                      : "border-gray-200 dark:border-gray-700/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-[15px] text-gray-900 dark:text-white">
                      <TextFlipWords text={faq.q} language={language} stagger={0.02} />
                    </span>
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      open
                        ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                        : "bg-gray-100 dark:bg-white/5 text-gray-400"
                    }`}>
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex"
                      >
                        <ChevronDown size={15} />
                      </motion.span>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <TextFlipParagraph
                          text={faq.a}
                          language={language}
                          className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
