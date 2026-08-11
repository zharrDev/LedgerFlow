import { useState, useEffect } from "react";
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
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { reportsService } from "../services/reportsService";
import { useCashFlow } from "../hooks/useCashFlow";
import { HoverDropdown } from "../components/HoverDropdown";
import { ExportMenu } from "../components/ExportMenu";
import { CashFlowChart, type CashFlowDatum } from "../components/CashFlowChart";
import {
  exportCashFlowPDF,
  exportCashFlowExcel,
  exportCashFlowWord,
} from "../utils/exportPDF";
import type { Period, CashFlowSection } from "../types/reports";

// ─── Helpers ────────────────────────────────────────────────────────
const formatIDR = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

// ─── Section Config ─────────────────────────────────────────────────
const SECTION_CONFIG = {
  operating: {
    label: "Aktivitas Operasi",
    subtitle: "Operating Activities — Arus kas utama bisnis",
    icon: <TrendingUp size={20} className="text-white" />,
    gradient: "from-cyan-500 via-cyan-600 to-indigo-600",
    softBg:
      "bg-cyan-50 dark:bg-cyan-500/5 border-cyan-200/60 dark:border-cyan-500/20",
    accentText: "text-cyan-600 dark:text-cyan-400",
    ringColor: "ring-cyan-500/20",
  },
  investing: {
    label: "Aktivitas Investasi",
    subtitle: "Investing Activities — Aset & Investasi",
    icon: <Building2 size={20} className="text-white" />,
    gradient: "from-violet-500 via-violet-600 to-purple-600",
    softBg:
      "bg-violet-50 dark:bg-violet-500/5 border-violet-200/60 dark:border-violet-500/20",
    accentText: "text-violet-600 dark:text-violet-400",
    ringColor: "ring-violet-500/20",
  },
  financing: {
    label: "Aktivitas Pendanaan",
    subtitle: "Financing Activities — Modal & Utang",
    icon: <Banknote size={20} className="text-white" />,
    gradient: "from-emerald-500 via-emerald-600 to-teal-600",
    softBg:
      "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/60 dark:border-emerald-500/20",
    accentText: "text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-500/20",
  },
} as const;

// ─── Section Card Component ─────────────────────────────────────────
function CashFlowSectionCard({
  section,
  configKey,
  chartData,
  formatValue,
}: {
  section: CashFlowSection;
  configKey: keyof typeof SECTION_CONFIG;
  chartData: CashFlowDatum[];
  formatValue: (v: number) => string;
}) {
  const cfg = SECTION_CONFIG[configKey];

  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-2xl bg-white dark:bg-darkCard border shadow-sm overflow-hidden ring-1 ${cfg.ringColor}`}
    >
      <div
        className={`relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${cfg.gradient} overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
        />
        <div className="relative p-2.5 rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 shadow-lg">
          {cfg.icon}
        </div>
        <div className="relative">
          <h3 className="text-base font-bold text-white tracking-tight">
            {cfg.label}
          </h3>
          <p className="text-xs text-white/70 mt-0.5">{cfg.subtitle}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
        {section.items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${cfg.softBg} mb-2`}
            >
              <Wallet size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">
              Tidak ada transaksi pada periode ini
            </p>
          </div>
        ) : (
          section.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${item.amount >= 0 ? "bg-cyan-500/10 dark:bg-cyan-500/15" : "bg-rose-500/10 dark:bg-rose-500/15"}`}
                >
                  {item.amount >= 0 ? (
                    <ArrowUpCircle size={14} className="text-cyan-500" />
                  ) : (
                    <ArrowDownCircle size={14} className="text-rose-500" />
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
                className={`text-xs sm:text-sm font-semibold tabular-nums text-right shrink-0 max-w-[42%] break-words ${item.amount >= 0 ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {item.amount >= 0 ? "+" : ""}
                {formatIDR(item.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      <div
        className={`flex items-center justify-between px-5 py-3.5 bg-gradient-to-r ${cfg.softBg} border-t border-gray-200/60 dark:border-gray-700/50`}
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${cfg.accentText.replace("text-", "bg-")}`}
          />
          Subtotal
        </span>
        <span
          className={`text-base font-bold tabular-nums ${section.subtotal >= 0 ? cfg.accentText : "text-rose-600 dark:text-rose-400"}`}
        >
          {section.subtotal >= 0 ? "+" : ""}
          {formatIDR(section.subtotal)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  icon,
  gradient,
  glowColor,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="relative rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm p-5 overflow-hidden group"
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500 blur-2xl"
        style={{ background: glowColor }}
      />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ring-1 ring-white/20`}
        >
          {icon}
        </div>
      </div>
      <p
        className={`relative text-xl sm:text-2xl font-bold tabular-nums tracking-tight break-words ${value >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400"}`}
      >
        {value >= 0 ? "" : "-"}
        {formatIDR(Math.abs(value))}
      </p>
      {trend && (
        <div className="relative flex items-center gap-1.5 mt-2">
          {trend === "up" ? (
            <TrendingUp size={12} className="text-emerald-500" />
          ) : trend === "down" ? (
            <TrendingDown size={12} className="text-rose-500" />
          ) : (
            <Sparkles size={12} className="text-cyan-500" />
          )}
          <span
            className={`text-[11px] font-medium ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : trend === "down" ? "text-rose-600 dark:text-rose-400" : "text-cyan-600 dark:text-cyan-400"}`}
          >
            {trend === "up"
              ? "Positif"
              : trend === "down"
                ? "Negatif"
                : "Stabil"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Net Change Card ────────────────────────────────────────────────
function NetChangeCard({
  value,
  periodName,
}: {
  value: number;
  periodName: string;
}) {
  const isPositive = value >= 0;
  return (
    <motion.div
      variants={itemVariants}
      className="relative rounded-2xl p-6 shadow-2xl overflow-hidden"
      style={{
        background: isPositive
          ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)"
          : "linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)",
      }}
    >
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.463) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-white/80" />
            <p className="text-white/90 text-xs font-semibold uppercase tracking-wider">
              Kenaikan / Penurunan Kas Bersih
            </p>
          </div>
          <p className="text-white/70 text-sm">{periodName}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl sm:text-4xl font-black text-white tabular-nums tracking-tight break-all sm:break-normal">
            {isPositive ? "+" : "-"}
            {formatIDR(Math.abs(value))}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function CashFlowPage() {
  const { data, loading, error, periodId, setPeriodId } = useCashFlow();
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    reportsService.getPeriods().then(setPeriods).catch(console.error);
  }, []);

  const chartData: CashFlowDatum[] = data
    ? [
        {
          name: "Operasi",
          masuk: Math.max(0, data.operating.subtotal),
          keluar: Math.min(0, data.operating.subtotal),
          net: data.operating.subtotal,
        },
        {
          name: "Investasi",
          masuk: Math.max(0, data.investing.subtotal),
          keluar: Math.min(0, data.investing.subtotal),
          net: data.investing.subtotal,
        },
        {
          name: "Pendanaan",
          masuk: Math.max(0, data.financing.subtotal),
          keluar: Math.min(0, data.financing.subtotal),
          net: data.financing.subtotal,
        },
        {
          name: "Total",
          masuk: Math.max(0, data.netCashFlow),
          keluar: Math.min(0, data.netCashFlow),
          net: data.netCashFlow,
        },
      ]
    : [];

  const handleExport = (format: "pdf" | "excel" | "word" | "csv") => {
    if (!data) return;
    const periodLabel = periodId
      ? periods.find((p) => p.id === periodId)?.name || ""
      : "Semua Periode";
    if (format === "excel") exportCashFlowExcel(data, periodLabel);
    else if (format === "word") exportCashFlowWord(data, periodLabel);
    else exportCashFlowPDF(data, periodLabel);
  };

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8"
      >
        {/* ── Page Header ── */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg ring-1 ring-white/20">
                <Wallet size={20} />
              </div>
              <motion.h1
                variants={letterContainerVariants}
                initial="hidden"
                animate="visible"
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
                style={{ perspective: "600px" }}
              >
                {"Laporan Arus Kas".split("").map((char, i) => (
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
            <p className="text-gray-500 dark:text-gray-400 text-sm ml-1">
              Cash Flow Statement —{" "}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Metode Tidak Langsung
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
                  { value: "", label: "Semua Periode" },
                  ...periods.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <ExportMenu
              disabled={!data || loading}
              formats={["pdf", "excel", "word"]}
              onExport={handleExport}
            />
          </div>
        </motion.div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400">Memuat laporan...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="py-16 text-center">
            <p className="text-rose-500 text-sm mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-500 text-sm hover:underline font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Data ── */}
        {data && !loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <SummaryCard
                label="Saldo Kas Awal"
                value={data.beginningCash}
                icon={<Wallet size={16} className="text-white" />}
                gradient="from-cyan-500 to-indigo-500"
                glowColor="#06b6d4"
                trend="neutral"
              />
              <SummaryCard
                label="Perubahan Kas"
                value={data.netCashFlow}
                icon={
                  data.netCashFlow >= 0 ? (
                    <TrendingUp size={16} className="text-white" />
                  ) : (
                    <TrendingDown size={16} className="text-white" />
                  )
                }
                gradient={
                  data.netCashFlow >= 0
                    ? "from-emerald-500 to-teal-500"
                    : "from-rose-500 to-pink-500"
                }
                glowColor={data.netCashFlow >= 0 ? "#10b981" : "#f43f5e"}
                trend={data.netCashFlow >= 0 ? "up" : "down"}
              />
              <SummaryCard
                label="Saldo Kas Akhir"
                value={data.endingCash}
                icon={<PieChart size={16} className="text-white" />}
                gradient="from-violet-500 to-purple-500"
                glowColor="#8b5cf6"
                trend="up"
              />
            </div>

            <motion.div
              variants={itemVariants}
              className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                    Visualisasi Arus Kas
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Perbandingan antar aktivitas
                  </p>
                </div>
              </div>
              <CashFlowChart
                data={chartData}
                formatValue={formatIDR}
                height={280}
              />
            </motion.div>

            {/* Spacing antar section lebih lega di mobile */}
            <div className="space-y-5 sm:space-y-6">
              <CashFlowSectionCard
                section={data.operating}
                configKey="operating"
                chartData={chartData}
                formatValue={formatIDR}
              />
              <CashFlowSectionCard
                section={data.investing}
                configKey="investing"
                chartData={chartData}
                formatValue={formatIDR}
              />
              <CashFlowSectionCard
                section={data.financing}
                configKey="financing"
                chartData={chartData}
                formatValue={formatIDR}
              />
            </div>

            <NetChangeCard
              value={data.netCashFlow}
              periodName={data.periodName}
            />
          </>
        )}

        {!data && !loading && !error && (
          <div className="py-24 text-center text-gray-400">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 mb-4">
              <Wallet size={32} className="opacity-50" />
            </div>
            <p>Belum ada data untuk ditampilkan</p>
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}
