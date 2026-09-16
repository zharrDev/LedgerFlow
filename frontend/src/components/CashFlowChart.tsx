import { useEffect, useRef, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { formatCompact } from "../i18n/compactNumber";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface CashFlowDatum {
  name: string;
  masuk: number;
  keluar: number;
  net: number;
}

interface CashFlowChartProps {
  data: CashFlowDatum[];
  formatValue: (v: number) => string;
  height?: number;
}

// ─────────────────────────────────────────────
// Palette — Emerald (in) / Rose (out) / Indigo (net)
// ─────────────────────────────────────────────
const P = {
  emerald: "#10b981",
  emeraldLight: "#6ee7b7",
  indigo: "#6366f1",
  indigoLight: "#a5b4fc",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  rose: "#f43f5e",
  amber: "#f59e0b",
  slate600: "#475569",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
};

type View = "all" | "in" | "out";

// ─────────────────────────────────────────────
// Dark-mode hook
// ─────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setIsDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ─────────────────────────────────────────────
// Animated Number (count-up effect)
// ─────────────────────────────────────────────
function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (v: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = value;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return <span>{format(Math.round(display))}</span>;
}

// ─────────────────────────────────────────────
// Summary Card (di bawah grafik)
// ─────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  colorClass,
  icon,
  format,
  gradFrom,
  gradTo,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
  format: (v: number) => string;
  gradFrom: string;
  gradTo: string;
}) {
  return (
    <div className="relative flex items-center gap-3 rounded-2xl px-4 py-3 overflow-hidden flex-1 min-w-0">
      <div
        className="absolute inset-0 opacity-[0.07] dark:opacity-[0.1] rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
        }}
      />
      <span
        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${gradFrom}1f`, color: gradFrom }}
      >
        {icon}
      </span>
      <span className="relative z-10 min-w-0">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
        <span
          className={`block text-base font-bold tabular-nums leading-tight ${colorClass}`}
        >
          <AnimatedNumber value={Math.abs(value)} format={format} />
        </span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Tooltip (gelap, ringkas)
// ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatValue, isDark }: any) {
  const { language } = useLanguage();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CashFlowDatum;

  const rows = [
    {
      key: "masuk",
      label: language === "id" ? "Arus Masuk" : "Cash In",
      color: P.emerald,
      sign: "+",
    },
    {
      key: "keluar",
      label: language === "id" ? "Arus Keluar" : "Cash Out",
      color: P.rose,
      sign: "-",
    },
    {
      key: "net",
      label: language === "id" ? "Saldo Bersih" : "Net",
      color: d.net >= 0 ? P.indigo : P.rose,
      sign: d.net >= 0 ? "+" : "-",
      bold: true,
    },
  ];

  return (
    <div
      className="rounded-xl shadow-2xl p-3.5 min-w-[180px] text-xs border"
      style={{
        background: isDark ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.97)",
        borderColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{
            background: `linear-gradient(180deg, ${P.indigoLight}, ${P.violet})`,
          }}
        />
        <span
          className="font-bold text-sm"
          style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}
        >
          {label}
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => {
          const rawVal = d[r.key as keyof CashFlowDatum] as number;
          return (
            <div key={r.key} className="flex justify-between items-center">
              <span
                className="flex items-center gap-2"
                style={{ color: isDark ? P.slate400 : P.slate600 }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: r.color }}
                />
                {r.label}
              </span>
              <span
                className={r.bold ? "font-bold text-sm" : "font-semibold"}
                style={{ color: r.color }}
              >
                {r.sign}
                {formatValue(Math.abs(rawVal))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Chart — ala "Money Flow": toggle segmented + bar besar rounded
// ─────────────────────────────────────────────
export function CashFlowChart({
  data,
  formatValue,
  height = 300,
}: CashFlowChartProps) {
  const isDark = useIsDark();
  const { language } = useLanguage();
  const id = language === "id";
  const [view, setView] = useState<View>("all");

  const totMasuk = data.reduce((s, d) => s + d.masuk, 0);
  const totKeluar = data.reduce((s, d) => s + Math.abs(d.keluar), 0);
  const totNet = data.reduce((s, d) => s + d.net, 0);

  const axisColor = isDark ? P.slate400 : P.slate600;
  const gridColor = isDark ? "rgba(148,163,184,0.08)" : "rgba(226,232,240,0.9)";

  const viewOptions: { key: View; label: string }[] = [
    { key: "all", label: id ? "Semua" : "All" },
    { key: "in", label: id ? "Masuk" : "Cash In" },
    { key: "out", label: id ? "Keluar" : "Cash Out" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Baris kontrol: toggle segmented + legend chips ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className="inline-flex rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/80 dark:bg-white/[0.04] p-1"
          role="tablist"
          aria-label={id ? "Filter arus kas" : "Cash flow filter"}
        >
          {viewOptions.map((o) => (
            <button
              key={o.key}
              role="tab"
              aria-selected={view === o.key}
              onClick={() => setView(o.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                view === o.key
                  ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Legend chips — hanya tampil yang relevan dengan view */}
        <div className="flex items-center gap-2 flex-wrap">
          {view !== "out" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {id ? "Masuk" : "In"}
            </span>
          )}
          {view !== "in" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {id ? "Keluar" : "Out"}
            </span>
          )}
          {view === "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {id ? "Bersih" : "Net"}
            </span>
          )}
        </div>
      </div>

      {/* ── Chart — 3 garis (masuk/keluar/net) + area jaring, grid halus ── */}
      <div
        className="relative rounded-2xl overflow-x-hidden w-full min-w-0"
        style={{ height: height ?? 300 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="areaMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.emerald} stopOpacity={0.28} />
                <stop offset="100%" stopColor={P.emerald} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="areaKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.rose} stopOpacity={0.28} />
                <stop offset="100%" stopColor={P.rose} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="areaNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.indigo} stopOpacity={0.3} />
                <stop offset="100%" stopColor={P.indigo} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 6"
              vertical={false}
              stroke={gridColor}
            />

            <ReferenceLine
              y={0}
              stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
              strokeWidth={1}
            />

            <XAxis
              dataKey="name"
              tick={{ fill: axisColor, fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompact(language, v)}
              tick={{ fill: axisColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />

            <Tooltip
              cursor={{
                stroke: isDark
                  ? "rgba(165,180,252,0.5)"
                  : "rgba(99,102,241,0.4)",
                strokeDasharray: "4 4",
              }}
              content={
                <CustomTooltip formatValue={formatValue} isDark={isDark} />
              }
            />

            {/* Area jaring di belakang garis — inflow */}
            {(view === "all" || view === "in") && (
              <Area
                type="monotone"
                dataKey="masuk"
                name={id ? "Arus Masuk" : "Cash In"}
                fill="url(#areaMasuk)"
                stroke="none"
                animationDuration={900}
              />
            )}

            {/* Area jaring di belakang garis — outflow */}
            {(view === "all" || view === "out") && (
              <Area
                type="monotone"
                dataKey="keluar"
                name={id ? "Arus Keluar" : "Cash Out"}
                fill="url(#areaKeluar)"
                stroke="none"
                animationDuration={1000}
              />
            )}

            {/* Area jaring di belakang garis — net */}
            {view === "all" && (
              <Area
                type="monotone"
                dataKey="net"
                name={id ? "Saldo Bersih" : "Net"}
                fill="url(#areaNet)"
                stroke="none"
                animationDuration={1100}
              />
            )}

            {/* Garis Inflow */}
            {(view === "all" || view === "in") && (
              <Line
                type="monotone"
                dataKey="masuk"
                name={id ? "Arus Masuk" : "Cash In"}
                stroke={P.emerald}
                strokeWidth={2}
                dot={{ r: 3, fill: P.emerald, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: P.emerald, strokeWidth: 0 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            )}

            {/* Garis Outflow */}
            {(view === "all" || view === "out") && (
              <Line
                type="monotone"
                dataKey="keluar"
                name={id ? "Arus Keluar" : "Cash Out"}
                stroke={P.rose}
                strokeWidth={2}
                dot={{ r: 3, fill: P.rose, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: P.rose, strokeWidth: 0 }}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            )}

            {/* Garis Net — paling tebal */}
            {view === "all" && (
              <Line
                type="monotone"
                dataKey="net"
                name={id ? "Saldo Bersih" : "Net"}
                stroke={P.indigo}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: P.indigo, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: P.indigo, strokeWidth: 0 }}
                animationDuration={1100}
                animationEasing="ease-out"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Summary — di bawah chart, chip ikon ala kartu referensi ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SummaryCard
          label={id ? "Total Masuk" : "Total Inflow"}
          value={totMasuk}
          format={formatValue}
          colorClass="text-emerald-600 dark:text-emerald-400"
          icon={<ArrowDownLeft size={15} />}
          gradFrom={P.emerald}
          gradTo={P.emeraldLight}
        />
        <SummaryCard
          label={id ? "Total Keluar" : "Total Outflow"}
          value={totKeluar}
          format={formatValue}
          colorClass="text-rose-600 dark:text-rose-400"
          icon={<ArrowUpRight size={15} />}
          gradFrom={P.rose}
          gradTo="#fb923c"
        />
        <SummaryCard
          label={id ? "Saldo Bersih" : "Net Balance"}
          value={totNet}
          format={formatValue}
          colorClass={
            totNet >= 0
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-rose-600 dark:text-rose-400"
          }
          icon={<span className="text-[13px] font-bold">Σ</span>}
          gradFrom={P.indigo}
          gradTo={P.violet}
        />
      </div>
    </div>
  );
}

export default CashFlowChart;
