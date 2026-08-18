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
import AuroraBackground from "../components/reports/AuroraBackground";
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

  const handlePeriodChange = (id: string) => {
    setSelectedPeriodId(id);
    if (!id) fetchBalanceSheet(id);
  };

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
      <div className="relative max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <AuroraBackground />
        <div className="relative z-10 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-white/10 p-4 sm:p-6"
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
                  onChange={handlePeriodChange}
                  disabled={isLoadingReport}
                  placeholder="Pilih Periode"
                  icon={<Calendar size={16} />}
                  minWidth={210}
                  options={[
                    { value: "", label: "Semua Periode" },
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
                index={0}
              />
              <BalanceSheetCard
                title="Total Liabilitas"
                amount={balanceSheet.total_liabilities}
                icon={TrendingDown}
                index={1}
              />
              <BalanceSheetCard
                title="Total Ekuitas"
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
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    Komposisi Neraca
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-1.5 gap-2">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          Aset
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
                          Liabilitas + Ekuitas
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

            {/* 3 card terpisah: ASET & LIABILITAS sampingan, EKUITAS di bawah tengah */}
            {/* ─── ✅ Fix A4 done: per section jadi card sendiri (grid 2 kolom + EKUITAS center) ─── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="min-w-0 rounded-2xl overflow-hidden bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
                  <BalanceSheetTable
                    title="ASET"
                    accounts={balanceSheet.assets}
                    total={balanceSheet.total_assets}
                    emptyMessage="Tidak ada data aset"
                  />
                </div>
                <div className="min-w-0 rounded-2xl overflow-hidden bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
                  <BalanceSheetTable
                    title="LIABILITAS"
                    accounts={balanceSheet.liabilities}
                    total={balanceSheet.total_liabilities}
                    emptyMessage="Tidak ada data liabilitas"
                  />
                </div>
              </div>
              <div className="mx-auto w-full lg:w-[calc(50%-0.625rem)] min-w-0 rounded-2xl overflow-hidden bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
                <BalanceSheetTable
                  title="EKUITAS"
                  accounts={balanceSheet.equity}
                  total={balanceSheet.total_equity}
                  emptyMessage="Tidak ada data ekuitas"
                />
              </div>
            </motion.div>
          </>
        )}
        </div>
      </div>
    </AppShell>
  );
}
