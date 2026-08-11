import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccounts } from "../hooks/useAccounts";
import { useDashboardData } from "../hooks/useDashboardData";
import { reportsService } from "../services/reportsService";
import { AppShell } from "../components/AppShell";
import { HoverDropdown } from "../components/HoverDropdown";
import { usePagination } from "../hooks/usePagination";
import { TablePagination } from "../components/TablePagination";
import { CashFlowChart } from "../components/CashFlowChart";
import type { CashFlowDatum } from "../components/CashFlowChart";
import {
  PlusCircle,
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Building2,
  Sparkles,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  BarChart3,
  MoreHorizontal,
  Zap,
  Landmark,
  CreditCard,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import type { Period } from "../types/reports";

// ─── Animation variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

// ─── Format helpers ─────────────────────────────────────────────────
const formatIDR = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

const formatCompact = (amount: number) => {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return formatIDR(amount);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [periodId, setPeriodId] = useState<string>("");
  const { summary, loading: summaryLoading } = useDashboardData(
    periodId || undefined,
  );
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    reportsService.getPeriods().then(setPeriods).catch(console.error);
  }, []);

  // Pagination untuk tabel "Akun Terbaru" (5 baris per halaman, bisa digeser)
  const accountsPagination = usePagination(accounts, 5);

  // Opsi periode untuk HoverDropdown
  const periodOptions = useMemo(
    () => [
      { value: "", label: "Semua Periode (YTD)" },
      ...periods.map((p) => ({ value: p.id, label: p.name })),
    ],
    [periods],
  );

  // Data untuk chart "Monitor Arus Kas" (grouped bar + garis tren).
  // Tiap kategori dipecah jadi bagian Masuk (positif) & Keluar (negatif).
  const cashFlowChartData: CashFlowDatum[] = useMemo(() => {
    if (!summary) return [];
    const rows = [
      { name: "Operasi", value: summary.operatingCash ?? 0 },
      { name: "Investasi", value: summary.investingCash ?? 0 },
      { name: "Pendanaan", value: summary.financingCash ?? 0 },
      { name: "Bersih", value: summary.netCashFlow ?? 0 },
    ];
    return rows.map((r) => ({
      name: r.name,
      masuk: r.value > 0 ? r.value : 0,
      keluar: r.value < 0 ? r.value : 0, // nilai negatif → bar turun
      net: r.value,
    }));
  }, [summary]);

  const stats = useMemo(() => {
    if (!accounts.length) return { total: 0, active: 0, byType: {} };
    const activeCount = accounts.filter((a) => a.isActive).length;
    const byType = accounts.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});
    return { total: accounts.length, active: activeCount, byType };
  }, [accounts]);

  const quickActions = [
    { label: "Jurnal Baru", icon: PlusCircle, href: "/journal-entries" },
    { label: "Kelola COA", icon: BookOpen, href: "/chart-of-accounts" },
    { label: "Laba Rugi", icon: FileText, href: "/income-statement" },
    { label: "Arus Kas", icon: Wallet, href: "/cash-flow" },
  ];

  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Financial Health Score (sederhana: berdasarkan rasio ekuitas terhadap aset)
  const healthScore = useMemo(() => {
    if (!summary || summary.totalAssets === 0) return 0;
    const ratio = summary.totalEquity / summary.totalAssets;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  }, [summary]);

  const healthLabel =
    healthScore >= 70
      ? "Sehat & Stabil"
      : healthScore >= 40
        ? "Cukup Baik"
        : "Perlu Perhatian";
  const healthColor =
    healthScore >= 70
      ? "from-emerald-500 to-cyan-500"
      : healthScore >= 40
        ? "from-amber-500 to-orange-500"
        : "from-rose-500 to-red-500";

  // SkeletonRow untuk tabel loading
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="py-3 px-6">
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </td>
      <td className="py-3 px-6">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </td>
      <td className="py-3 px-6">
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </td>
      <td className="py-3 px-6">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </td>
    </tr>
  );

  // ─── KPI Card Component ──────────────────────────────────────────
  const KPICard = ({
    label,
    value,
    icon,
    iconBg,
    valueColor,
    subtitle,
    subtitleColor,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    iconBg: string;
    valueColor?: string;
    subtitle?: React.ReactNode;
    subtitleColor?: string;
  }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div
        className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity ${iconBg}`}
      ></div>
      <div className="relative p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
              {label}
            </p>
            <p
              className={`text-2xl font-bold mt-1 tabular-nums ${valueColor || "text-gray-900 dark:text-white"}`}
            >
              {value}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
        </div>
        {subtitle && (
          <p
            className={`text-xs mt-3 flex items-center gap-1 ${subtitleColor || "text-gray-500"}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8"
      >
        {/* ═══ Hero Card (TIDAK BERUBAH) ═══ */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1120] via-[#111827] to-[#1F2937] border border-primary-500/30 shadow-2xl"
        >
          <div className="absolute top-0 -right-32 w-72 h-72 bg-primary-500/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] sm:text-xs font-mono text-primary-300 tracking-wider">
                    FINANCIAL COMMAND CENTER
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  <span className="font-script text-2xl sm:text-4xl lg:text-5xl font-semibold">
                    Good{" "}
                    {new Date().getHours() < 12
                      ? "Morning"
                      : new Date().getHours() < 18
                        ? "Afternoon"
                        : "Evening"}
                  </span>
                  ,{" "}
                  <span className="font-script text-2xl sm:text-4xl lg:text-5xl font-semibold text-primary-400">
                    {user?.name?.split(" ")[0] || "User"}
                  </span>
                </h1>
                <p className="text-primary-200/80 text-sm sm:text-base mt-2 max-w-lg">
                  Here's your financial overview. All systems operational and
                  ready for action.
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size="14" /> {formattedDate}
                  </span>
                  <span className="hidden sm:flex items-center gap-1.5">
                    <Building2 size="14" /> {user?.company || "LedgerFlow Corp"}
                  </span>
                  <span className="hidden sm:flex items-center gap-1.5">
                    <Zap size="14" /> Real-time Sync
                  </span>
                </div>
              </div>
              {/* Quick Actions — responsive grid */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className="group flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-primary-500/50 hover:bg-primary-500/20 text-xs sm:text-sm font-medium text-white transition-all duration-200 hover:scale-105"
                  >
                    <action.icon
                      size="14"
                      className="text-primary-300 group-hover:text-primary-200 shrink-0"
                    />
                    <span className="truncate">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="h-0.5 w-full bg-gradient-to-r from-primary-500 via-emerald-500 to-primary-500"></div>
        </motion.div>

        {/* ═══ Period Selector Row ═══ */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Ringkasan Keuangan
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-auto">
              <HoverDropdown
                value={periodId}
                onChange={setPeriodId}
                options={periodOptions}
                icon={<Calendar size={14} />}
                minWidth={210}
              />
            </div>
          </div>
        </motion.div>

        {/* ═══ KPI Cards Row ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {summaryLoading || !summary ? (
            // Skeleton cards
            [...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-5 animate-pulse"
              >
                <div className="h-20"></div>
              </motion.div>
            ))
          ) : (
            <>
              <KPICard
                label="Total Pendapatan"
                value={formatCompact(summary.totalRevenue)}
                icon={<TrendingUp size="20" className="text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                valueColor="text-emerald-500 dark:text-emerald-400"
                subtitle={
                  <>
                    <ArrowUpRight size="12" /> Periode berjalan
                  </>
                }
                subtitleColor="text-emerald-600 dark:text-emerald-400"
              />
              <KPICard
                label="Total Pengeluaran"
                value={formatCompact(summary.totalExpense)}
                icon={<TrendingDown size="20" className="text-rose-500" />}
                iconBg="bg-rose-500/10"
                valueColor="text-rose-500 dark:text-rose-400"
                subtitle={
                  <>
                    <ArrowDownRight size="12" /> Periode berjalan
                  </>
                }
                subtitleColor="text-rose-500"
              />
              <KPICard
                label="Laba Bersih"
                value={formatCompact(summary.netIncome)}
                icon={
                  <CircleDollarSign size="20" className="text-primary-500" />
                }
                iconBg="bg-primary-500/10"
                valueColor={
                  summary.netIncome >= 0
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-rose-500 dark:text-rose-400"
                }
                subtitle={
                  summary.netIncome >= 0 ? (
                    <>
                      <ArrowUpRight size="12" />{" "}
                      {(
                        (summary.netIncome / (summary.totalRevenue || 1)) *
                        100
                      ).toFixed(0)}
                      % margin
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size="12" /> Rugi periode ini
                    </>
                  )
                }
                subtitleColor={
                  summary.netIncome >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-500"
                }
              />
              <KPICard
                label="Saldo Kas"
                value={formatCompact(summary.endingCash)}
                icon={<Wallet size="20" className="text-blue-500" />}
                iconBg="bg-blue-500/10"
                valueColor="text-blue-500 dark:text-blue-400"
                subtitle={
                  summary.netCashFlow >= 0 ? (
                    <>
                      <ArrowUpRight size="12" className="text-emerald-500" /> +
                      {formatCompact(summary.netCashFlow)} periode ini
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size="12" className="text-rose-500" /> -
                      {formatCompact(summary.netCashFlow)} periode ini
                    </>
                  )
                }
                subtitleColor="text-gray-500"
              />
            </>
          )}
        </div>

        {/* ═══ Financial Health & Cash Flow Monitor ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Financial Health Score */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-1 rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Skor Kesehatan
              </h3>
              <BarChart3 size="16" className="text-gray-400" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    className="dark:opacity-20"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#gradientHealth)"
                    strokeWidth="8"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{
                      strokeDashoffset: 283 - (283 * healthScore) / 100,
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient
                      id="gradientHealth"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        stopColor={
                          healthScore >= 70
                            ? "#10B981"
                            : healthScore >= 40
                              ? "#F59E0B"
                              : "#EF4444"
                        }
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          healthScore >= 70
                            ? "#06B6D4"
                            : healthScore >= 40
                              ? "#F97316"
                              : "#DC2626"
                        }
                      />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                  >
                    {healthScore}
                  </motion.span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">
                {healthLabel}
              </p>
              <p className="text-xs text-gray-500 text-center mt-2 max-w-[200px]">
                Berdasarkan rasio ekuitas terhadap total aset perusahaan.
              </p>
            </div>
          </motion.div>

          {/* Cash Flow Monitor */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Monitor Arus Kas
              </h3>
              <div className="flex items-center gap-3 text-xs  text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div> Masuk
                </span>
                <span className="flex items-center gap-1  text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>{" "}
                  Keluar
                </span>
              </div>
            </div>
            {summaryLoading || !summary ? (
              <div className="animate-pulse">
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
              </div>
            ) : (
              <div>
                <CashFlowChart
                  data={cashFlowChartData}
                  formatValue={formatCompact}
                  height={260}
                />

                {/* Net summary */}
                <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Perubahan Kas Bersih
                  </span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      summary.netCashFlow >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500"
                    }`}
                  >
                    {summary.netCashFlow >= 0 ? "+" : "-"}
                    {formatIDR(summary.netCashFlow)}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ═══ Financial Position (Assets, Liabilities, Equity) ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              label: "Total Aset",
              value: summary?.totalAssets ?? 0,
              icon: <Landmark size="18" className="text-cyan-500" />,
              color: "cyan",
              link: "/balance-sheet",
            },
            {
              label: "Total Kewajiban",
              value: summary?.totalLiabilities ?? 0,
              icon: <CreditCard size="18" className="text-amber-500" />,
              color: "amber",
              link: "/balance-sheet",
            },
            {
              label: "Total Ekuitas",
              value: summary?.totalEquity ?? 0,
              icon: <Briefcase size="18" className="text-purple-500" />,
              color: "purple",
              link: "/balance-sheet",
            },
          ].map((item) => (
            <motion.div
              key={item.label}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="group rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md hover:shadow-lg transition-all p-5"
            >
              <Link to={item.link} className="block">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-${item.color}-500/10`}>
                    {item.icon}
                  </div>
                  <ArrowUpRight
                    size="16"
                    className="text-gray-300 group-hover:text-primary-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
                  {formatCompact(item.value)}
                </p>
                {item.label === "Total Ekuitas" && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {summary?.isBalanced ? (
                      <>
                        <CheckCircle size="12" className="text-emerald-500" />{" "}
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Neraca Seimbang
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-500">
                          ⚠ Neraca tidak seimbang
                        </span>
                      </>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ═══ Recent Accounts & Quick Report Access ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Accounts */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Akun Terbaru
              </h3>
              <Link
                to="/chart-of-accounts"
                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                Lihat Semua →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase min-w-[100px]">
                      Code
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase min-w-[180px]">
                      Nama Akun
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase min-w-[120px]">
                      Tipe
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase min-w-[120px]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {accountsLoading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-gray-500"
                      >
                        Belum ada akun. Buat akun pertama Anda!
                      </td>
                    </tr>
                  ) : (
                    accountsPagination.pageItems.map((acc) => (
                      <tr
                        key={acc.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-6 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {acc.code}
                        </td>
                        <td className="py-3 px-6 font-medium text-gray-800 dark:text-gray-200">
                          {acc.name}
                        </td>
                        <td className="py-3 px-6">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">
                            {acc.type || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                              acc.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${acc.isActive ? "bg-emerald-500" : "bg-gray-400"}`}
                            ></div>
                            {acc.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!accountsLoading && accounts.length > 0 && (
              <TablePagination
                page={accountsPagination.page}
                totalPages={accountsPagination.totalPages}
                totalItems={accountsPagination.totalItems}
                startIndex={accountsPagination.startIndex}
                endIndex={accountsPagination.endIndex}
                canPrev={accountsPagination.canPrev}
                canNext={accountsPagination.canNext}
                onPrev={accountsPagination.prev}
                onNext={accountsPagination.next}
                onGoTo={accountsPagination.setPage}
                itemLabel="akun"
              />
            )}
          </motion.div>

          {/* Quick Report Access */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Akses Cepat
              </h3>
              <Sparkles size="16" className="text-primary-500" />
            </div>
            <div className="space-y-3">
              <Link
                to="/income-statement"
                className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <FileText size="16" className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Laporan Laba Rugi
                    </p>
                    <p className="text-xs text-gray-500">Pendapatan & Beban</p>
                  </div>
                </div>
                <ArrowUpRight
                  size="14"
                  className="text-gray-300 group-hover:text-emerald-500 transition-colors"
                />
              </Link>

              <Link
                to="/balance-sheet"
                className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-cyan-500/5 to-transparent border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Landmark size="16" className="text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Neraca
                    </p>
                    <p className="text-xs text-gray-500">
                      Aset, Kewajiban & Ekuitas
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size="14"
                  className="text-gray-300 group-hover:text-cyan-500 transition-colors"
                />
              </Link>

              <Link
                to="/cash-flow"
                className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary-500/5 to-transparent border border-primary-500/10 hover:border-primary-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-500/10">
                    <Wallet size="16" className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Arus Kas
                    </p>
                    <p className="text-xs text-gray-500">
                      Metode tidak langsung
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size="14"
                  className="text-gray-300 group-hover:text-primary-500 transition-colors"
                />
              </Link>

              <Link
                to="/buku-besar"
                className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-violet-500/5 to-transparent border border-violet-500/10 hover:border-violet-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <BookOpen size="16" className="text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Buku Besar
                    </p>
                    <p className="text-xs text-gray-500">
                      Riwayat transaksi per akun
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size="14"
                  className="text-gray-300 group-hover:text-violet-500 transition-colors"
                />
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  );
}
