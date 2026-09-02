// ============================================================================
// LEDGERFLOW - Paywall Component
// ============================================================================
// Shows when user tries to access a premium feature without the right plan.
//
// Usage:
//   <Paywall
//     feature="export_pdf"
//     currentPlan="free"
//     requiredPlan="pro"
//     onUpgrade={() => navigate("/pricing")}
//   />
//
// Or as a wrapper:
//   <FeatureGate feature="income_statement" fallback={<Paywall />}>
//     <IncomeStatementPage />
//   </FeatureGate>
// ============================================================================

import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Lock,
  Crown,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "../hooks/useLanguage";

// ─── Dictionaries ───────────────────────────────────────────────────
const FEATURE_NAMES: Record<string, { en: string; id: string }> = {
  income_statement: { en: "Income Statement", id: "Laporan Laba Rugi" },
  balance_sheet: { en: "Balance Sheet", id: "Neraca" },
  cash_flow: { en: "Cash Flow Report", id: "Laporan Arus Kas" },
  export_pdf: { en: "Export PDF", id: "Export PDF" },
  export_csv: { en: "Export CSV", id: "Export CSV" },
  unlimited_journals: { en: "Unlimited Journal Entries", id: "Jurnal Tanpa Batas" },
  multi_company: { en: "Multi-Company", id: "Multi-Perusahaan" },
  multi_user: { en: "Multi-User & Roles", id: "Multi-Pengguna & Role" },
  api_access: { en: "API Access", id: "Akses API" },
  custom_reports: { en: "Custom Reports", id: "Laporan Kustom" },
};

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  pro: "from-blue-600 to-cyan-500",
  enterprise: "from-purple-600 to-pink-500",
};

// ─── Default Highlights ─────────────────────────────────────────────
const DEFAULT_HIGHLIGHTS = [
  {
    icon: Zap,
    label: { en: "Unlimited Journals", id: "Jurnal Tanpa Batas" },
    desc: { en: "No limits", id: "Tanpa batasan" },
  },
  {
    icon: Shield,
    label: { en: "All Reports", id: "Semua Laporan" },
    desc: {
      en: "Income Statement, Balance Sheet, etc.",
      id: "Laba Rugi, Neraca, dll",
    },
  },
  {
    icon: Sparkles,
    label: { en: "Export PDF", id: "Export PDF" },
    desc: { en: "Download reports", id: "Download laporan" },
  },
];

// ─── Props ──────────────────────────────────────────────────────────
interface PaywallProps {
  feature?: string;
  currentPlan?: string;
  requiredPlan?: string;
  title?: string;
  description?: ReactNode;
  onUpgrade?: () => void;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// FULL PAYWALL
// ═══════════════════════════════════════════════════════════════════════
export function Paywall({
  feature,
  currentPlan = "free",
  requiredPlan = "pro",
  title,
  description,
  onUpgrade,
  compact = false,
}: PaywallProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const location = useLocation();

  const featureName = feature
    ? (FEATURE_NAMES[feature]?.[language] ?? feature)
    : "";
  const planName = PLAN_NAMES[requiredPlan] ?? requiredPlan;
  const gradientClass =
    PLAN_COLORS[requiredPlan] ?? "from-primary-600 to-primary-500";

  const handleUpgrade = () => {
    if (onUpgrade) onUpgrade();
    else navigate("/pricing");
  };

  const resolvedTitle =
    title ??
    (language === "id"
      ? "Upgrade untuk Membuka Fitur Ini"
      : "Upgrade to Unlock This Feature");

  // ─── Compact variant ───────────────────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-600/50 bg-amber-50/50 dark:bg-amber-900/10 p-6 text-center"
      >
        <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title ??
            (language === "id" ? `Fitur ${planName}` : `${planName} Feature`)}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {description ?? (
            <>
              {featureName && <strong>{featureName}</strong>}
              {featureName && " "}
              {language === "id" ? (
                <>
                  {!featureName && "Fitur ini "}
                  memerlukan plan {planName} atau lebih tinggi.
                </>
              ) : (
                <>
                  {!featureName && "This feature "}
                  requires the {planName} plan or higher.
                </>
              )}
            </>
          )}
        </p>
        <button
          onClick={handleUpgrade}
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${gradientClass} text-white text-sm font-semibold hover:shadow-lg transition-all`}
        >
          <Crown size={14} />{" "}
          {language === "id" ? `Upgrade ke ${planName}` : `Upgrade to ${planName}`}
        </button>
      </motion.div>
    );
  }

  // ─── Full-page variant ─────────────────────────────────────────────
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      {/* `key={location.pathname}` → every route navigation remounts this subtree
          and Framer Motion re-runs the entrance animation from scratch. */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg w-full text-center"
      >
        {/* Lock Icon with Glow */}
        <div className="relative inline-block mb-6">
          <div
            className={`absolute inset-0 bg-gradient-to-r ${gradientClass} blur-2xl opacity-30 rounded-full scale-150`}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
            className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-xl`}
          >
            <Lock className="w-10 h-10 text-white" />
          </motion.div>
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
        >
          {resolvedTitle}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-3 text-gray-600 dark:text-gray-400 max-w-md mx-auto"
        >
          {description ?? (
            <>
              {featureName && <strong>{featureName}</strong>}
              {featureName && " "}
              {language === "id" ? (
                <>
                  {!featureName && "Fitur ini "}
                  tersedia pada plan {planName}. Upgrade sekarang untuk akses
                  penuh ke semua fitur premium LedgerFlow.
                </>
              ) : (
                <>
                  {!featureName && "This feature is "}
                  available on the {planName} plan. Upgrade now for full access
                  to all premium LedgerFlow features.
                </>
              )}
            </>
          )}
        </motion.p>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {DEFAULT_HIGHLIGHTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50"
              >
                <Icon className="w-5 h-5 text-primary-500 mx-auto mb-1" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {item.label[language]}
                </p>
                <p className="text-xs text-gray-500">{item.desc[language]}</p>
              </div>
            );
          })}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button
            onClick={handleUpgrade}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r ${gradientClass} text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all`}
          >
            <Crown size={18} />
            {language === "id" ? `Upgrade ke ${planName}` : `Upgrade to ${planName}`}
            <ArrowRight size={16} />
          </button>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {language === "id" ? "Lihat Semua Plan" : "View All Plans"}
            <ChevronRight size={16} />
          </Link>
        </motion.div>

        {/* Current Plan Badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-xs text-gray-500 dark:text-gray-400"
        >
          {language === "id" ? "Plan saat ini:" : "Current plan:"}{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {PLAN_NAMES[currentPlan] ?? currentPlan}
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FEATURE GATE - Wrapper component
// ═══════════════════════════════════════════════════════════════════════
interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  // These come from useSubscription hook
  canAccess: (feature: string) => boolean;
  currentPlan: string;
  getRequiredPlan: (feature: string) => string | null;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  canAccess,
  currentPlan,
  getRequiredPlan,
}: FeatureGateProps) {
  if (canAccess(feature)) return children;

  if (fallback) return fallback;

  return (
    <Paywall
      feature={feature}
      currentPlan={currentPlan}
      requiredPlan={getRequiredPlan(feature) ?? "pro"}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRIAL BANNER - Shows remaining trial days
// ═══════════════════════════════════════════════════════════════════════
interface TrialBannerProps {
  daysLeft: number;
  onUpgrade?: () => void;
}

export function TrialBanner({ daysLeft, onUpgrade }: TrialBannerProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const id = language === "id";

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 5;
  const bgClass = isUrgent
    ? "bg-gradient-to-r from-rose-500 to-orange-500"
    : "bg-gradient-to-r from-primary-600 to-cyan-500";

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${bgClass} text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm`}
    >
      <Sparkles size={16} />
      <span>
        {isUrgent ? "⚡" : "🎉"}{" "}
        {id ? (
          <>
            Trial Anda tersisa <strong>{daysLeft} hari</strong>
          </>
        ) : (
          <>
            Your trial has <strong>{daysLeft} days</strong> left
          </>
        )}
        {isUrgent
          ? id
            ? " lagi! Upgrade sekarang agar tidak kehilangan akses."
            : "! Upgrade now to keep your access."
          : id
          ? ". Nikmati semua fitur premium LedgerFlow!"
          : ". Enjoy all LedgerFlow premium features!"}
      </span>
      <button
        onClick={() => (onUpgrade ? onUpgrade() : navigate("/pricing"))}
        className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-semibold text-xs transition-colors"
      >
        {id ? "Upgrade Sekarang →" : "Upgrade Now →"}
      </button>
    </motion.div>
  );
}

export default Paywall;
