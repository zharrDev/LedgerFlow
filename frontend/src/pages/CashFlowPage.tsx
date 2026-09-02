import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  PieChart,
  Sparkles,
  Activity,
} from "lucide-react";

import { ScrollReveal } from "../components/ScrollReveal";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { useCashFlow, useReportPeriods } from "../hooks/useReports";
import { HoverDropdown } from "../components/HoverDropdown";
import { ExportMenu } from "../components/ExportMenu";
import { CashFlowChart, type CashFlowDatum } from "../components/CashFlowChart";
import {
  exportCashFlowPDF,
  exportCashFlowExcel,
  exportCashFlowWord,
} from "../utils/exportPDF";
import { formatCurrency } from "../utils/currency";
import type { CashFlowSection } from "../types/reports";
import { ReportSkeleton, ReportRefetchBar } from "../components/reports/ReportSkeleton";

// ─── Helpers ────────────────────────────────────────────────────────
const formatIDR = (amount: number) => formatCurrency(amount);

// ─── Section Config (satu keluarga warna — tint primary) ────────────
const SECTION_CONFIG = {
  operating: {
    labelKey: "operating",
    icon: <TrendingUp size={16} />,
  },
  investing: {
    labelKey: "investing",
    icon: <Building2 size={16} />,
  },
  financing: {
    labelKey: "financing",
    icon: <Banknote size={16} />,
  },
} as const;

// ─── Section Block (dalam SATU panel) ───────────────────────────────
// ─── ✅ Fix A3 done: wrapper div panel → divide-y bersih antar slice ───
function CashFlowSectionBlock({
  section,
  configKey,
  language,
}: {
  section: CashFlowSection;
  configKey: keyof typeof SECTION_CONFIG;
  language: "en" | "id";
}) {
  const cfg = SECTION_CONFIG[configKey];
  const labels: Record<string, { label: string; subtitle: string }> = {
    operating: {
      label: tx(language, "Operating Activities", "Aktivitas Operasi"),
      subtitle: tx(language, "Operating Activities — Core business cash flow", "Operating Activities — Arus kas utama bisnis"),
    },
    investing: {
      label: tx(language, "Investing Activities", "Aktivitas Investasi"),
      subtitle: tx(language, "Investing Activities — Assets & Investments", "Investing Activities — Aset & Investasi"),
    },
    financing: {
      label: tx(language, "Financing Activities", "Aktivitas Pendanaan"),
      subtitle: tx(language, "Financing Activities — Capital & Debt", "Financing Activities — Modal & Utang"),
    },
  };
  const sectionLabels = labels[configKey];

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 bg-primary-500/10 dark:bg-primary-500/15 border-b border-white/10 dark:border-white/5">
        <span className="text-primary-600 dark:text-primary-300">
          {cfg.icon}
        </span>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
            {sectionLabels.label}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {sectionLabels.subtitle}
          </p>
        </div>
      </div>

      <div>
        {section.items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-500/10 text-gray-400 mb-2">
              <Wallet size={18} />
            </div>
            <p className="text-sm text-gray-400">
              {tx(language, "No transactions in this period", "Tidak ada transaksi pada periode ini")}
            </p>
          </div>
        ) : (
          section.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/5 hover:bg-white/5 dark:hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    item.amount >= 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {item.amount >= 0 ? (
                    <ArrowUpCircle size={14} />
                  ) : (
                    <ArrowDownCircle size={14} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {item.label || item.accountName}
                  </p>
                  {item.accountCode && (
                    <span className="font-mono text-[10px] text-gray-400 tracking-wider">
                      {item.accountCode}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold tabular-nums text-right shrink-0 max-w-[42%] break-words ${
                  item.amount >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {item.amount >= 0 ? "+" : "-"}
                {formatIDR(Math.abs(item.amount))}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 dark:border-white/5">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Subtotal
        </span>
        <span
          className={`text-base font-bold tabular-nums ${
            section.subtotal >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {section.subtotal >= 0 ? "+" : "-"}
          {formatIDR(Math.abs(section.subtotal))}
        </span>
      </div>
    </>
  );
}

// ─── Summary Card (satu keluarga warna) ─────────────────────────────
function SummaryCard({
  label,
  value,
  icon,
  trend,
  language,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  language: "en" | "id";
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="relative rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg p-5 overflow-hidden group"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary-500/20 blur-2xl group-hover:opacity-60 transition-opacity duration-500" />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <div className="p-2.5 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300">
          {icon}
        </div>
      </div>
      <p
        className={`relative text-xl sm:text-2xl font-bold tabular-nums tracking-tight break-words ${
          value >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {value < 0 && "-"}
        {formatIDR(Math.abs(value))}
      </p>
      {trend && (
        <div className="relative flex items-center gap-1.5 mt-2">
          {trend === "up" ? (
            <TrendingUp size={12} className="text-emerald-500" />
          ) : trend === "down" ? (
            <TrendingDown size={12} className="text-rose-500" />
          ) : (
            <Sparkles size={12} className="text-primary-500" />
          )}
          <span
            className={`text-[11px] font-medium ${
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-primary-600 dark:text-primary-400"
            }`}
          >
            {trend === "up"
              ? tx(language, "Positive", "Positif")
              : trend === "down"
                ? tx(language, "Negative", "Negatif")
                : tx(language, "Stable", "Stabil")}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Net Change (footer dalam panel) ────────────────────────────────
function NetChangeFooter({
  value,
  periodName,
  language,
}: {
  value: number;
  periodName: string;
  language: "en" | "id";
}) {
  const isPositive = value >= 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-5 bg-primary-500/10 dark:bg-primary-500/15 border-t border-primary-500/20 dark:border-primary-500/25">
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-xl bg-white text-primary-600 shadow">
          <Activity size={16} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-white">
            {tx(language, "Net Cash Increase / Decrease", "Kenaikan / Penurunan Kas Bersih")}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {periodName}
          </p>
        </div>
      </div>
      <p
        className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight break-all sm:break-normal ${
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {isPositive ? "+" : "-"}
        {formatIDR(Math.abs(value))}
      </p>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function CashFlowPage() {
  const { language } = useLanguage();
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCashFlow(periodId);
  const { data: periods = [] } = useReportPeriods();

  const isInitialLoad = isLoading && !data;
  const isRefetching = isFetching && !!data;
  const pageTitle = tx(language, "Cash Flow Statement", "Laporan Arus Kas");

  // Hanya 3 baris (Operating/Investing/Financing) — TANPA "Total"
  // supaya CashFlowChart.reduce totMasuk/totKeluar/totNet tidak double-count.
  const chartData: CashFlowDatum[] = data
    ? [
        {
          name: tx(language, "Operating", "Operasi"),
          masuk: Math.max(0, data.operating.subtotal),
          keluar: Math.min(0, data.operating.subtotal),
          net: data.operating.subtotal,
        },
        {
          name: tx(language, "Investing", "Investasi"),
          masuk: Math.max(0, data.investing.subtotal),
          keluar: Math.min(0, data.investing.subtotal),
          net: data.investing.subtotal,
        },
        {
          name: tx(language, "Financing", "Pendanaan"),
          masuk: Math.max(0, data.financing.subtotal),
          keluar: Math.min(0, data.financing.subtotal),
          net: data.financing.subtotal,
        },
      ]
    : [];

  const handleExport = (format: "pdf" | "excel" | "word" | "csv") => {
    if (!data) return;
    const periodLabel = periodId
      ? periods.find((p) => p.id === periodId)?.name || ""
      : tx(language, "All Periods", "Semua Periode");
    if (format === "excel") exportCashFlowExcel(data, periodLabel);
    else if (format === "word") exportCashFlowWord(data, periodLabel);
    else exportCashFlowPDF(data, periodLabel);
  };

  return (
      <div className="max-w-5xl mx-auto space-y-8 py-6 min-w-0">
          {/* ── Page Header ── */}
          <ScrollReveal
            direction="left"
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shrink-0">
                  <Wallet size={20} />
                </div>
                <motion.h1
                  key={`${language}-${pageTitle}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight min-w-0 break-words"
                >
                  {pageTitle}
                </motion.h1>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                {tx(language, "Cash Flow Statement —", "Laporan Arus Kas —")}{" "}
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  {tx(language, "Indirect Method", "Metode Tidak Langsung")}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-auto">
                <HoverDropdown
                  value={periodId || ""}
                  onChange={(v) => setPeriodId(v || undefined)}
                  icon={<Wallet size={14} />}
                  minWidth={200}
                  options={[
                    { value: "", label: tx(language, "All Periods", "Semua Periode") },
                    ...periods.map((p) => ({ value: p.id, label: p.name ?? "" })),
                  ]}
                />
              </div>

              <ExportMenu
                disabled={!data || isFetching}
                formats={["pdf", "excel", "word"]}
                onExport={handleExport}
              />
            </div>
          </ScrollReveal>

          {/* ── Refetch indicator (data lama tetap terlihat) ── */}
          {isRefetching && (
            <ReportRefetchBar
              label={tx(language, "Loading report...", "Memuat laporan...")}
            />
          )}

          {/* ── First load skeleton ── */}
          {isInitialLoad && <ReportSkeleton cards={3} />}

          {/* ── Error ── */}
          {error && !isRefetching && (
            <div className="py-16 text-center">
              <p className="text-rose-500 text-sm mb-2">{error instanceof Error ? error.message : String(error)}</p>
              <button
                onClick={() => refetch()}
                className="text-primary-500 text-sm hover:underline font-medium"
              >
                {tx(language, "Try again", "Coba lagi")}
              </button>
            </div>
          )}

          {/* ── Data ── */}
          {data && !error && (
            <>
              <ScrollReveal direction="up" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <SummaryCard
                  label={tx(language, "Beginning Cash Balance", "Saldo Kas Awal")}
                  value={data.beginningCash}
                  icon={<Wallet size={16} />}
                  trend="neutral"
                  language={language}
                />
                <SummaryCard
                  label={tx(language, "Cash Change", "Perubahan Kas")}
                  value={data.netCashFlow}
                  icon={
                    data.netCashFlow >= 0 ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )
                  }
                  trend={data.netCashFlow >= 0 ? "up" : "down"}
                  language={language}
                />
                <SummaryCard
                  label={tx(language, "Ending Cash Balance", "Saldo Kas Akhir")}
                  value={data.endingCash}
                  icon={<PieChart size={16} />}
                  trend="up"
                  language={language}
                />
              </ScrollReveal>

              <ScrollReveal
                direction="scale"
                className="rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                      {tx(language, "Cash Flow Visualization", "Visualisasi Arus Kas")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tx(language, "Comparison between activities", "Perbandingan antar aktivitas")}
                    </p>
                  </div>
                </div>
                <CashFlowChart
                  data={chartData}
                  formatValue={formatIDR}
                  height={280}
                />
              </ScrollReveal>

              {/* Satu panel: Operasi → Investasi → Pendanaan → Net Change */}
              <ScrollReveal
                direction="up"
                className="rounded-2xl overflow-hidden bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg"
              >
                <div className="divide-y divide-white/10 dark:divide-white/5">
                  <CashFlowSectionBlock
                    section={data.operating}
                    configKey="operating"
                    language={language}
                  />
                  <CashFlowSectionBlock
                    section={data.investing}
                    configKey="investing"
                    language={language}
                  />
                  <CashFlowSectionBlock
                    section={data.financing}
                    configKey="financing"
                    language={language}
                  />
                  <NetChangeFooter
                    value={data.netCashFlow}
                    periodName={data.periodName}
                    language={language}
                  />
                </div>
              </ScrollReveal>
            </>
          )}

          {!data && !isInitialLoad && !error && (
            <div className="py-24 text-center text-gray-400">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 mb-4">
                <Wallet size={32} className="opacity-50" />
              </div>
              <p>{tx(language, "No data to display yet", "Belum ada data untuk ditampilkan")}</p>
            </div>
          )}
        </div>
  );
}