import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
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
import { AppShell } from "../components/AppShell";
import { reportsService } from "../services/reportsService";
import { useCashFlow } from "../hooks/useCashFlow";
import { HoverDropdown } from "../components/HoverDropdown";
import { ExportMenu } from "../components/ExportMenu";
import { CashFlowChart, type CashFlowDatum } from "../components/CashFlowChart";
import AuroraBackground from "../components/reports/AuroraBackground";
import {
  exportCashFlowPDF,
  exportCashFlowExcel,
  exportCashFlowWord,
} from "../utils/exportPDF";
import { formatCurrency } from "../utils/currency";
import type { Period, CashFlowSection } from "../types/reports";

// ─── Helpers ────────────────────────────────────────────────────────
const formatIDR = (amount: number) => formatCurrency(amount);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

// ─── Section Config (satu keluarga warna — tint primary) ────────────
const SECTION_CONFIG = {
  operating: {
    label: "Aktivitas Operasi",
    subtitle: "Operating Activities — Arus kas utama bisnis",
    icon: <TrendingUp size={16} />,
  },
  investing: {
    label: "Aktivitas Investasi",
    subtitle: "Investing Activities — Aset & Investasi",
    icon: <Building2 size={16} />,
  },
  financing: {
    label: "Aktivitas Pendanaan",
    subtitle: "Financing Activities — Modal & Utang",
    icon: <Banknote size={16} />,
  },
} as const;

// ─── Section Block (dalam SATU panel) ───────────────────────────────
// ─── ✅ Fix A3 done: wrapper div panel → divide-y bersih antar slice ───
function CashFlowSectionBlock({
  section,
  configKey,
}: {
  section: CashFlowSection;
  configKey: keyof typeof SECTION_CONFIG;
}) {
  const cfg = SECTION_CONFIG[configKey];

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 bg-primary-500/10 dark:bg-primary-500/15 border-b border-white/10 dark:border-white/5">
        <span className="text-primary-600 dark:text-primary-300">
          {cfg.icon}
        </span>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
            {cfg.label}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {cfg.subtitle}
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
              Tidak ada transaksi pada periode ini
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
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="relative rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg p-5 overflow-hidden group"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary-500/20 blur-2xl group-hover:opacity-60 transition-opacity duration-500" />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <div className="p-2.5 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 ring-1 ring-white/20">
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

// ─── Net Change (footer dalam panel) ────────────────────────────────
function NetChangeFooter({
  value,
  periodName,
}: {
  value: number;
  periodName: string;
}) {
  const isPositive = value >= 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-5 bg-primary-500/10 dark:bg-primary-500/15 border-t border-primary-500/20 dark:border-primary-500/25">
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-xl bg-white text-primary-600 shadow ring-1 ring-white/20">
          <Activity size={16} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-white">
            Kenaikan / Penurunan Kas Bersih
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
        className="relative max-w-5xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6"
      >
        <AuroraBackground />
        <div className="relative z-10 space-y-8">
          {/* ── Page Header ── */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg ring-1 ring-white/20">
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
                <span className="font-semibold text-primary-600 dark:text-primary-400">
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
                    ...periods.map((p) => ({ value: p.id, label: p.name ?? "" })),
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
                <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
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
                className="text-primary-500 text-sm hover:underline font-medium"
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
                  icon={<Wallet size={16} />}
                  trend="neutral"
                />
                <SummaryCard
                  label="Perubahan Kas"
                  value={data.netCashFlow}
                  icon={
                    data.netCashFlow >= 0 ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )
                  }
                  trend={data.netCashFlow >= 0 ? "up" : "down"}
                />
                <SummaryCard
                  label="Saldo Kas Akhir"
                  value={data.endingCash}
                  icon={<PieChart size={16} />}
                  trend="up"
                />
              </div>

              <motion.div
                variants={itemVariants}
                className="rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-lg p-4 sm:p-5"
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

              {/* Satu panel: Operasi → Investasi → Pendanaan → Net Change */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl overflow-hidden bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg"
              >
                <div className="divide-y divide-white/10 dark:divide-white/5">
                  <CashFlowSectionBlock
                    section={data.operating}
                    configKey="operating"
                  />
                  <CashFlowSectionBlock
                    section={data.investing}
                    configKey="investing"
                  />
                  <CashFlowSectionBlock
                    section={data.financing}
                    configKey="financing"
                  />
                  <NetChangeFooter
                    value={data.netCashFlow}
                    periodName={data.periodName}
                  />
                </div>
              </motion.div>
            </>
          )}

          {!data && !loading && !error && (
            <div className="py-24 text-center text-gray-400">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 mb-4">
                <Wallet size={32} className="opacity-50" />
              </div>
              <p>Belum ada data untuk ditampilkan</p>
            </div>
          )}
        </div>
      </motion.div>
    </AppShell>
  );
}