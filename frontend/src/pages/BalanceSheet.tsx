import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { MONTHS_FULL } from "../i18n/months";
import { useBalanceSheet, useReportPeriods } from "../hooks/useReports";
import type { BalanceSheetResponse, Period } from "../types/reports";
import { BalanceSheetCard } from "../components/reports/BalanceSheetCard";
import { BalanceSheetTable } from "../components/reports/BalanceSheetTable";
import { BalanceSheetStatus } from "../components/reports/BalanceSheetStatus";
import { HoverDropdown } from "../components/HoverDropdown";
import { ExportMenu } from "../components/ExportMenu";
import { ReportSkeleton, ReportRefetchBar } from "../components/reports/ReportSkeleton";
import {
  exportBalanceSheetPDF,
  exportBalanceSheetExcel,
  exportBalanceSheetWord,
  type BalanceSheetData,
} from "../utils/exportPDF";

function toExportData(bs: BalanceSheetResponse): BalanceSheetData {
  const map = (items: BalanceSheetResponse["assets"]) =>
    items.map((a) => ({
      accountCode: a.account_code,
      accountName: a.account_name,
      balance: a.balance,
    }));
  return {
    assets: map(bs.assets),
    liabilities: map(bs.liabilities),
    equity: map(bs.equity),
    total_assets: bs.total_assets,
    total_liabilities: bs.total_liabilities,
    total_equity: bs.total_equity,
    is_balanced: bs.is_balanced,
  };
}

const letterContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
  },
};
const letterVariants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

export default function BalanceSheet() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

  const { data: periods = [], isLoading: periodsLoading } = useReportPeriods();

  const companyId = user?.company_id ?? "";
  const {
    data: balanceSheet,
    isLoading,
    isFetching,
    error,
  } = useBalanceSheet(selectedPeriodId, companyId);

  const isInitialLoad = isLoading && !balanceSheet;
  const isRefetching = isFetching && !!balanceSheet;

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId],
  );

  const getPeriodLabel = (period: Period): string => {
    return `${MONTHS_FULL[language][period.month - 1]} ${period.year}`;
  };

  const periodOptions = useMemo(
    () => [
      { value: "", label: tx(language, "All Periods", "Semua Periode") },
      ...periods.map((period) => ({
        value: period.id,
        label: `${getPeriodLabel(period)}${
          period.status === "closed"
            ? ` ${tx(language, "(Closed)", "(Tutup)")}`
            : ""
        }`,
      })),
    ],
    [periods, language],
  );

  const handlePeriodChange = (id: string) => {
    setSelectedPeriodId(id);
  };

  const handleExport = (format: "pdf" | "excel" | "word" | "csv") => {
    if (!balanceSheet) return;
    const periodLabel = selectedPeriod
      ? getPeriodLabel(selectedPeriod)
      : tx(language, "All Periods", "Semua Periode");
    const exportData = toExportData(balanceSheet);
    if (format === "excel") exportBalanceSheetExcel(exportData, periodLabel);
    else if (format === "word") exportBalanceSheetWord(exportData, periodLabel);
    else exportBalanceSheetPDF(exportData, periodLabel);
  };

  const pageTitle = tx(language, "Balance Sheet", "Neraca");
  const headerTitle = pageTitle.split("");

  return (
    <div className="min-h-[80vh] overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-white/10 p-4 sm:p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex-shrink-0">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <motion.h1
                  key={`${language}-${pageTitle}`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  variants={letterContainerVariants}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center flex-wrap"
                  style={{ perspective: "600px" }}
                >
                  {headerTitle.map((char, i) => (
                    <motion.span
                      key={`${language}-${i}`}
                      variants={letterVariants}
                      className="inline-block"
                      style={{ transformOrigin: "bottom center" }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {tx(
                    language,
                    "Company Financial Position Report",
                    "Laporan Posisi Keuangan Perusahaan",
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-auto min-w-0">
                <HoverDropdown
                  value={selectedPeriodId}
                  onChange={handlePeriodChange}
                  disabled={periodsLoading}
                  placeholder={tx(language, "Select Period", "Pilih Periode")}
                  icon={<Calendar size={16} />}
                  minWidth={210}
                  options={periodOptions}
                />
              </div>
              <ExportMenu
                disabled={!balanceSheet || isFetching}
                formats={["pdf", "excel", "word"]}
                onExport={handleExport}
              />
            </div>
          </div>
        </motion.div>

        {/* Refetch indicator */}
        {isRefetching && (
          <ReportRefetchBar
            label={tx(language, "Loading report...", "Memuat laporan...")}
          />
        )}

        {/* Periods loading skeleton */}
        {periodsLoading && <ReportSkeleton cards={3} />}

        {/* Error */}
        {error && !isInitialLoad && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            className="bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-500/30 rounded-2xl p-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-1">
                  {tx(language, "An Error Occurred", "Terjadi Kesalahan")}
                </h3>
                <p className="text-rose-700 dark:text-rose-300">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!isInitialLoad && !error && !balanceSheet && selectedPeriodId && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            className="text-center py-20"
          >
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {tx(language, "No Data Yet", "Belum Ada Data")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {tx(
                language,
                "No balance sheet data for this period",
                "Belum ada data neraca untuk periode ini",
              )}
            </p>
          </motion.div>
        )}

        {/* Report data */}
        {balanceSheet && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BalanceSheetCard
                title={tx(language, "Total Assets", "Total Aset")}
                amount={balanceSheet.total_assets}
                icon={TrendingUp}
                index={0}
              />
              <BalanceSheetCard
                title={tx(language, "Total Liabilities", "Total Liabilitas")}
                amount={balanceSheet.total_liabilities}
                icon={TrendingDown}
                index={1}
              />
              <BalanceSheetCard
                title={tx(language, "Total Equity", "Total Ekuitas")}
                amount={balanceSheet.total_equity}
                icon={Wallet}
                index={2}
              />
            </div>

            <BalanceSheetStatus
              isBalanced={balanceSheet.is_balanced}
              totalAssets={balanceSheet.total_assets}
              totalLiabilitiesEquity={
                balanceSheet.total_liabilities + balanceSheet.total_equity
              }
            />

            {/* Komposisi Aset vs Liabilitas+Ekuitas */}
            {(() => {
              const lhs = Math.abs(balanceSheet.total_assets);
              const rhs = Math.abs(
                balanceSheet.total_liabilities + balanceSheet.total_equity,
              );
              const max = Math.max(lhs, rhs, 1);
              const assetsPct = Math.round((lhs / max) * 100);
              const lePct = Math.round((rhs / max) * 100);
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  className="rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    {tx(
                      language,
                      "Balance Sheet Composition",
                      "Komposisi Neraca",
                    )}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-1.5 gap-2">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          {tx(language, "Assets", "Aset")}
                        </span>
                        <span className="tabular-nums font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                          {assetsPct}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                          style={{ width: `${assetsPct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-1.5 gap-2">
                        <span className="text-gray-700 dark:text-gray-200 font-medium truncate">
                          {tx(
                            language,
                            "Liabilities + Equity",
                            "Liabilitas + Ekuitas",
                          )}
                        </span>
                        <span className="tabular-nums font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                          {lePct}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary-500/30 transition-all duration-500"
                          style={{ width: `${lePct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Tables */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="min-w-0 rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
                  <BalanceSheetTable
                    title={tx(language, "ASSETS", "ASET")}
                    accounts={balanceSheet.assets}
                    total={balanceSheet.total_assets}
                    emptyMessage={tx(
                      language,
                      "No asset data",
                      "Tidak ada data aset",
                    )}
                  />
                </div>
                <div className="min-w-0 rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
                  <BalanceSheetTable
                    title={tx(language, "LIABILITIES", "LIABILITAS")}
                    accounts={balanceSheet.liabilities}
                    total={balanceSheet.total_liabilities}
                    emptyMessage={tx(
                      language,
                      "No liability data",
                      "Tidak ada data liabilitas",
                    )}
                  />
                </div>
              </div>
              <div className="mx-auto w-full lg:w-[calc(50%-0.625rem)] min-w-0 rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
                <BalanceSheetTable
                  title={tx(language, "EQUITY", "EKUITAS")}
                  accounts={balanceSheet.equity}
                  total={balanceSheet.total_equity}
                  emptyMessage={tx(
                    language,
                    "No equity data",
                    "Tidak ada data ekuitas",
                  )}
                />
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
