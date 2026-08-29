import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { useIncomeStatement } from "../hooks/useIncomeStatement";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { formatCompact } from "../i18n/compactNumber";
import { reportsService } from "../services/reportsService";
import { AppShell } from "../components/AppShell";
import { HoverDropdown } from "../components/HoverDropdown";
import { ExportMenu } from "../components/ExportMenu";
import {
  exportIncomeStatementPDF,
  exportIncomeStatementExcel,
  exportIncomeStatementWord,
} from "../utils/exportPDF";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
} from "lucide-react";
import type { Period } from "../types/reports";
import { formatCurrency } from "../utils/currency";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
const letterContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
  },
};
const letterVariants: Variants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

// Format uang mengikuti mata uang aktif user (Settings → Regional).
const formatRupiah = (val: number) => formatCurrency(val);

export function IncomeStatementPage() {
  const { language } = useLanguage();
  const { data, loading, error, periodId, setPeriodId, refetch } =
    useIncomeStatement("");
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    reportsService.getPeriods().then(setPeriods).catch(console.error);
  }, []);

  const handleExport = (format: "pdf" | "excel" | "word" | "csv") => {
    if (!data) return;
    const periodLabel = periodId
      ? periods.find((p) => p.id === periodId)?.name || ""
      : tx(language, "All Periods", "Semua Periode");
    if (format === "excel") exportIncomeStatementExcel(data, periodLabel);
    else if (format === "word") exportIncomeStatementWord(data, periodLabel);
    else exportIncomeStatementPDF(data, periodLabel);
  };

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* ── Page Header ── */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                <FileText size={20} />
              </div>
              <motion.h1
                variants={letterContainerVariants}
                initial="hidden"
                animate="visible"
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
                style={{ perspective: "600px" }}
              >
                {tx(language, "Income Statement", "Laporan Laba Rugi").split("").map((char, i) => (
                  <motion.span
                    key={i}
                    variants={letterVariants}
                    className="inline-block"
                    style={{ transformOrigin: "bottom center" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {tx(language, "Revenue and expenses from posted journals", "Pendapatan dan beban dari jurnal yang sudah di-post")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <HoverDropdown
                value={periodId || ""}
                onChange={setPeriodId}
                icon={<Calendar size={14} />}
                minWidth={210}
                options={[
                  { value: "", label: tx(language, "All Periods (YTD)", "Semua Periode (YTD)") },
                  ...periods.map((p) => ({ value: p.id, label: p.name ?? "" })),
                ]}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ExportMenu
                disabled={!data || loading}
                formats={["pdf", "excel", "word"]}
                onExport={handleExport}
              />
              <button
                onClick={refetch}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-500 hover:border-primary-500/50 transition-colors bg-white dark:bg-darkCard shadow-sm"
                title={tx(language, "Refresh", "Refresh")}
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="text-sm font-medium sm:hidden">{tx(language, "Refresh", "Refresh")}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">{tx(language, "Loading report...", "Memuat laporan...")}</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <motion.div variants={itemVariants} className="py-16 text-center">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button
              onClick={refetch}
              className="text-primary-500 text-sm hover:underline"
            >
              {tx(language, "Try again", "Coba lagi")}
            </button>
          </motion.div>
        )}

        {/* ── Report ── */}
        {data && !loading && !error && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {tx(language, "Revenue", "Pendapatan")}
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <TrendingUp size={16} className="text-emerald-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCompact(language, data.totalRevenue)}
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {tx(language, "Expenses", "Beban")}
                  </span>
                  <div className="p-1.5 rounded-lg bg-rose-500/10">
                    <TrendingDown size={16} className="text-rose-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCompact(language, data.totalExpense)}
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {tx(language, "Net Income", "Laba Bersih")}
                  </span>
                  <div className="p-1.5 rounded-lg bg-primary-500/10">
                    <FileText size={16} className="text-primary-500" />
                  </div>
                </div>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    data.netIncome >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCompact(language, data.netIncome)}
                </p>
              </motion.div>
            </div>

            {/* Detail Report */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 px-6 py-5 border-b border-gray-200 dark:border-gray-700/50 text-center">
                <h2 className="font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest text-sm">
                  LedgerFlow
                </h2>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mt-1">
                  {tx(language, "Income Statement", "Laporan Laba Rugi")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tx(language, "For Period:", "Untuk Periode:")}{" "}
                  {periodId
                    ? periods.find((p) => p.id === periodId)?.name
                    : tx(language, "Year to Date", "Sampai Saat Ini (YTD)")}
                </p>
              </div>

              <div className="p-6 space-y-8">
                {/* PENDAPATAN */}
                <div>
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500/20 pb-2 mb-3 flex items-center gap-2">
                    <TrendingUp size={16} /> {tx(language, "REVENUE", "PENDAPATAN")}
                  </h4>
                  {data.revenue.length === 0 ? (
                    <p className="text-sm text-gray-400 italic px-2 py-4 text-center">
                      {tx(language, "No revenue transactions", "Tidak ada transaksi pendapatan")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {data.revenue.map((item) => (
                        <div
                          key={item.accountCode}
                          className="flex justify-between text-sm px-2 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 rounded-lg transition-colors"
                        >
                          <span className="min-w-0 text-gray-700 dark:text-gray-300">
                            <span className="font-mono text-xs text-gray-400 mr-2">
                              {item.accountCode}
                            </span>
                            {item.accountName}
                          </span>
                          <span className="shrink-0 font-medium text-gray-900 dark:text-white tabular-nums">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm px-2 py-2.5 mt-2 bg-emerald-50/70 dark:bg-emerald-500/10 font-bold border-t border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                        <span className="min-w-0 text-emerald-800 dark:text-emerald-300">
                          {tx(language, "Total Revenue", "Total Pendapatan")}
                        </span>
                        <span className="shrink-0 text-emerald-800 dark:text-emerald-300 tabular-nums">
                          {formatRupiah(data.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* BEBAN */}
                <div>
                  <h4 className="font-bold text-rose-700 dark:text-rose-400 border-b-2 border-rose-500/20 pb-2 mb-3 flex items-center gap-2">
                    <TrendingDown size={16} /> {tx(language, "EXPENSES", "BEBAN")}
                  </h4>
                  {data.expense.length === 0 ? (
                    <p className="text-sm text-gray-400 italic px-2 py-4 text-center">
                      {tx(language, "No expense transactions", "Tidak ada transaksi beban")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {data.expense.map((item) => (
                        <div
                          key={item.accountCode}
                          className="flex justify-between text-sm px-2 py-1.5 hover:bg-rose-50/50 dark:hover:bg-rose-500/5 rounded-lg transition-colors"
                        >
                          <span className="min-w-0 text-gray-700 dark:text-gray-300">
                            <span className="font-mono text-xs text-gray-400 mr-2">
                              {item.accountCode}
                            </span>
                            {item.accountName}
                          </span>
                          <span className="shrink-0 font-medium text-gray-900 dark:text-white tabular-nums">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm px-2 py-2.5 mt-2 bg-rose-50/70 dark:bg-rose-500/10 font-bold border-t border-rose-200 dark:border-rose-500/20 rounded-lg">
                        <span className="min-w-0 text-rose-800 dark:text-rose-300">
                          {tx(language, "Total Expenses", "Total Beban")}
                        </span>
                        <span className="shrink-0 text-rose-800 dark:text-rose-300 tabular-nums">
                          {formatRupiah(data.totalExpense)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* NET INCOME */}
                <motion.div
                  variants={itemVariants}
                  className={`mt-6 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-base sm:text-lg font-bold border-2 ${
                    data.netIncome >= 0
                      ? "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-gradient-to-r from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  <span>
                    {data.netIncome >= 0
                      ? tx(language, "Net Income", "Laba Bersih")
                      : tx(language, "Net Loss", "Rugi Bersih")}
                  </span>
                  <span className="text-xl sm:text-2xl tabular-nums break-all sm:break-normal w-full sm:w-auto text-left sm:text-right">
                    {formatRupiah(data.netIncome)}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}

        {/* ── Empty ── */}
        {!data && !loading && !error && (
          <div className="py-24 text-center text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-40" />
            <p>{tx(language, "No report data.", "Tidak ada data laporan.")}</p>
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}
