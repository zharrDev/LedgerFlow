import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { getBalanceSheet, getPeriods } from "../services/reportsService";
import type { BalanceSheetResponse, Period } from "../types/reports";
import { BalanceSheetCard } from "../components/reports/BalanceSheetCard";
import { BalanceSheetTable } from "../components/reports/BalanceSheetTable";
import { BalanceSheetStatus } from "../components/reports/BalanceSheetStatus";
import { HoverDropdown } from "../components/HoverDropdown";
import { ExportMenu } from "../components/ExportMenu";
import {
  exportBalanceSheetPDF,
  exportBalanceSheetExcel,
  exportBalanceSheetWord,
} from "../utils/exportPDF";

export default function BalanceSheet() {
  const { user } = useAuth();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(
    null,
  );
  const [isLoadingPeriods, setIsLoadingPeriods] = useState<boolean>(true);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId && user?.company_id) {
      fetchBalanceSheet(selectedPeriodId);
    }
  }, [selectedPeriodId, user?.company_id]);

  const fetchPeriods = async () => {
    try {
      setIsLoadingPeriods(true);
      setError(null);
      const data = await getPeriods();
      setPeriods(data);
      const openPeriod = data.find((p) => p.status === "open");
      if (openPeriod) {
        setSelectedPeriodId(openPeriod.id);
      } else if (data.length > 0) {
        setSelectedPeriodId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching periods:", err);
      setError("Gagal memuat data periode");
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  const fetchBalanceSheet = async (periodId: string) => {
    if (!user?.company_id) return;
    try {
      setIsLoadingReport(true);
      setError(null);
      const data = await getBalanceSheet(periodId, user.company_id);
      setBalanceSheet(data);
    } catch (err) {
      console.error("Error fetching balance sheet:", err);
      setError("Gagal memuat data neraca");
      setBalanceSheet(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const getPeriodLabel = (period: Period): string => {
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${monthNames[period.month - 1]} ${period.year}`;
  };

  const handleExport = (format: "pdf" | "excel" | "word" | "csv") => {
    if (!balanceSheet) return;
    const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
    const periodLabel = selectedPeriod
      ? getPeriodLabel(selectedPeriod)
      : "Semua Periode";
    if (format === "excel") exportBalanceSheetExcel(balanceSheet, periodLabel);
    else if (format === "word") exportBalanceSheetWord(balanceSheet, periodLabel);
    else exportBalanceSheetPDF(balanceSheet, periodLabel);
  };

  if (isLoadingPeriods) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Memuat data periode...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 p-4 sm:p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex-shrink-0">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <motion.h1
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: { staggerChildren: 0.04, delayChildren: 0.3 },
                    },
                  }}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center flex-wrap"
                  style={{ perspective: "600px" }}
                >
                  {"Neraca (Balance Sheet)".split("").map((char, i) => (
                    <motion.span
                      key={i}
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
                </motion.h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Laporan Posisi Keuangan Perusahaan
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-auto">
                <HoverDropdown
                  value={selectedPeriodId}
                  onChange={setSelectedPeriodId}
                  disabled={isLoadingReport}
                  placeholder="Pilih Periode"
                  icon={<Calendar size={16} />}
                  minWidth={210}
                  options={[
                    { value: "", label: "Pilih Periode" },
                    ...periods.map((period) => ({
                      value: period.id,
                      label: `${getPeriodLabel(period)}${
                        period.status === "closed" ? " (Tutup)" : ""
                      }`,
                    })),
                  ]}
                />
              </div>
              <ExportMenu
                disabled={!balanceSheet || isLoadingReport}
                formats={["pdf", "excel", "word"]}
                onExport={handleExport}
              />
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-500 rounded-2xl p-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-1">
                  Terjadi Kesalahan
                </h3>
                <p className="text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {isLoadingReport && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Memuat laporan neraca...
              </p>
            </div>
          </div>
        )}

        {!isLoadingReport && !error && !balanceSheet && selectedPeriodId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Belum Ada Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Belum ada data neraca untuk periode ini
            </p>
          </motion.div>
        )}

        {!isLoadingReport && !error && balanceSheet && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BalanceSheetCard
                title="Total Aset"
                amount={balanceSheet.total_assets}
                icon={TrendingUp}
                colorClass="text-cyan-600 dark:text-cyan-400"
                bgColorClass="bg-cyan-100 dark:bg-cyan-900"
                index={0}
              />
              <BalanceSheetCard
                title="Total Liabilitas"
                amount={balanceSheet.total_liabilities}
                icon={TrendingDown}
                colorClass="text-amber-600 dark:text-amber-400"
                bgColorClass="bg-amber-100 dark:bg-amber-900"
                index={1}
              />
              <BalanceSheetCard
                title="Total Ekuitas"
                amount={balanceSheet.total_equity}
                icon={Wallet}
                colorClass="text-purple-600 dark:text-purple-400"
                bgColorClass="bg-purple-100 dark:bg-purple-900"
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
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm p-4 sm:p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    Komposisi Neraca
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-1.5 gap-2">
                        <span className="text-cyan-700 dark:text-cyan-400 font-medium">
                          Aset
                        </span>
                        <span className="tabular-nums font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                          {assetsPct}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${assetsPct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-1.5 gap-2">
                        <span className="text-amber-700 dark:text-amber-400 font-medium truncate">
                          Liabilitas + Ekuitas
                        </span>
                        <span className="tabular-nums font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                          {lePct}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-purple-500 transition-all duration-500"
                          style={{ width: `${lePct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Stack vertikal di mobile; 2 kolom dari lg ke atas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <BalanceSheetTable
                title="ASET"
                accounts={balanceSheet.assets}
                total={balanceSheet.total_assets}
                colorClass="text-cyan-600 dark:text-cyan-400"
                accentColor="from-cyan-500 to-indigo-600"
                emptyMessage="Tidak ada data aset"
              />
              <div className="space-y-4 sm:space-y-6">
                <BalanceSheetTable
                  title="LIABILITAS"
                  accounts={balanceSheet.liabilities}
                  total={balanceSheet.total_liabilities}
                  colorClass="text-amber-600 dark:text-amber-400"
                  accentColor="from-amber-500 to-orange-600"
                  emptyMessage="Tidak ada data liabilitas"
                />
                <BalanceSheetTable
                  title="EKUITAS"
                  accounts={balanceSheet.equity}
                  total={balanceSheet.total_equity}
                  colorClass="text-purple-600 dark:text-purple-400"
                  accentColor="from-purple-500 to-violet-600"
                  emptyMessage="Tidak ada data ekuitas"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
