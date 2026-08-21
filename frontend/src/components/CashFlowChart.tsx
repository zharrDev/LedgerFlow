import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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
// Palette — selaras Indigo / Violet / Cyan
// ─────────────────────────────────────────────
const P = {
  indigo: "#6366f1",
  indigoLight: "#a5b4fc",
  violet: "#8b5cf6",
  violetLight: "#c4b5fd",
  cyan: "#06b6d4",
  cyanLight: "#67e8f9",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate600: "#475569",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate800: "#1e293b",
  slate900: "#0f172a",
};

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
      const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
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
// Summary Card (di atas grafik)
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
  icon: string;
  format: (v: number) => string;
  gradFrom: string;
  gradTo: string;
}) {
  return (
    <div className="relative flex flex-col gap-1 rounded-2xl px-4 py-3 overflow-hidden flex-1 min-w-0">
      {/* background gradient blob */}
      <div
        className="absolute inset-0 opacity-[0.12] dark:opacity-[0.18]"
        style={{
          background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
        }}
      />
      <div
        className="absolute inset-0 rounded-2xl ring-1 ring-inset"
      />
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 relative z-10">
        {label}
      </span>
      <span
        className={`text-base font-bold tabular-nums leading-tight relative z-10 ${colorClass}`}
      >
        <AnimatedNumber value={Math.abs(value)} format={format} />
      </span>
      <span
        className="absolute right-3 top-3 text-xl opacity-20 select-none"
        aria-hidden
      >
        {icon}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatValue, isDark }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CashFlowDatum;

  const rows = [
    {
      key: "masuk",
      label: "Arus Masuk",
      color: P.cyan,
      sign: "+"
    },
    {
      key: "keluar",
      label: "Arus Keluar",
      color: P.rose,
      sign: "-",
      abs: true,
    },
    {
      key: "net",
      label: "Saldo Bersih",
      color: d.net >= 0 ? P.indigo : P.rose,
      sign: d.net >= 0 ? "+" : "-",
      bold: true,
    },
  ];

  return (
    <div
      className="rounded-2xl shadow-2xl p-4 min-w-[190px] text-xs border"
      style={{
        background: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)",
        borderColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-1.5 h-5 rounded-full"
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

      <div className="space-y-2">
        {rows.map((r) => {
          const rawVal = d[r.key as keyof CashFlowDatum] as number;
          const absVal = Math.abs(rawVal);
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
                {formatValue(absVal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer shimmer bar */}
      <div
        className="mt-3 h-0.5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${P.indigo}, ${P.violet}, ${P.cyan})`,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Dot untuk Area Line
// ─────────────────────────────────────────────
function CustomDot(props: any) {
  const { cx, cy, stroke } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={stroke} opacity={0.25} />
      <circle cx={cx} cy={cy} r={3} fill={stroke} />
      <circle cx={cx} cy={cy} r={1.5} fill="#fff" />
    </g>
  );
}

function CustomActiveDot(props: any) {
  const { cx, cy, stroke } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={stroke} opacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill={stroke} opacity={0.35} />
      <circle cx={cx} cy={cy} r={3.5} fill={stroke} />
      <circle cx={cx} cy={cy} r={1.5} fill="#fff" />
    </g>
  );
}

// ─────────────────────────────────────────────
// Main Chart
// ─────────────────────────────────────────────
export function CashFlowChart({
  data,
  formatValue,
  height = 300,
}: CashFlowChartProps) {
  const isDark = useIsDark();

  // Derived totals untuk summary cards
  const totMasuk = data.reduce((s, d) => s + d.masuk, 0);
  const totKeluar = data.reduce((s, d) => s + Math.abs(d.keluar), 0);
  const totNet = data.reduce((s, d) => s + d.net, 0);

  const axisColor = isDark ? P.slate400 : P.slate600;
  const gridColor = isDark ? "rgba(148,163,184,0.08)" : "rgba(226,232,240,0.9)";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SummaryCard
          label="Total Masuk"
          value={totMasuk}
          format={formatValue}
          colorClass="text-cyan-500 dark:text-cyan-400"
          icon="↑"
          gradFrom={P.cyan}
          gradTo={P.cyanLight}
        />
        <SummaryCard
          label="Total Keluar"
          value={totKeluar}
          format={formatValue}
          colorClass="text-rose-500 dark:text-rose-400"
          icon="↓"
          gradFrom={P.rose}
          gradTo="#fb923c"
        />
        <SummaryCard
          label="Saldo Bersih"
          value={totNet}
          format={formatValue}
          colorClass={
            totNet >= 0
              ? "text-violet-600 dark:text-violet-400"
              : "text-rose-500 dark:text-rose-400"
          }
          icon="≈"
          gradFrom={P.indigo}
          gradTo={P.violet}
        />
      </div>

      {/* ── Chart ── */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Subtle background gradient untuk container chart */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "linear-gradient(160deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.06) 50%, rgba(6,182,212,0.04) 100%)"
              : "linear-gradient(160deg, rgba(99,102,241,0.03) 0%, rgba(139,92,246,0.04) 50%, rgba(6,182,212,0.03) 100%)",
          }}
        />

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 20, right: 16, left: -8, bottom: 0 }}
          >
            <defs>
              {/* ── Masuk: Cyan → Indigo ── */}
              <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.cyan} stopOpacity={0.5} />
                <stop offset="60%" stopColor={P.cyanLight} stopOpacity={0.15} />
                <stop offset="100%" stopColor={P.cyan} stopOpacity={0.02} />
              </linearGradient>

              {/* ── Keluar: Rose → Violet ── */}
              <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.rose} stopOpacity={0} />
                <stop offset="40%" stopColor={P.rose} stopOpacity={0.15} />
                <stop offset="100%" stopColor={P.rose} stopOpacity={0.45} />
              </linearGradient>

              {/* ── Net: Indigo → Violet ── */}
              <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.indigo} stopOpacity={0.4} />
                <stop offset="55%" stopColor={P.violet} stopOpacity={0.1} />
                <stop offset="100%" stopColor={P.violet} stopOpacity={0} />
              </linearGradient>

              {/* Glow filter untuk stroke */}
              <filter
                id="glowCyan"
                x="-20%"
                y="-40%"
                width="140%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="glowIndigo"
                x="-20%"
                y="-40%"
                width="140%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 5"
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
              tickFormatter={formatValue}
              tick={{ fill: axisColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />

            <Tooltip
              cursor={{
                stroke: isDark
                  ? "rgba(99,102,241,0.3)"
                  : "rgba(99,102,241,0.15)",
                strokeWidth: 1.5,
                strokeDasharray: "4 3",
              }}
              content={
                <CustomTooltip formatValue={formatValue} isDark={isDark} />
              }
            />

            {/* ── Area Masuk ── */}
            <Area
              type="monotone"
              dataKey="masuk"
              name="Arus Masuk"
              stroke={P.cyan}
              strokeWidth={2.5}
              fill="url(#gradMasuk)"
              dot={<CustomDot stroke={P.cyan} />}
              activeDot={<CustomActiveDot stroke={P.cyan} />}
              filter="url(#glowCyan)"
              animationDuration={1200}
              animationEasing="ease-out"
            />

            {/* ── Area Keluar (mirror ke bawah) ── */}
            <Area
              type="monotone"
              dataKey="keluar"
              name="Arus Keluar"
              stroke={P.rose}
              strokeWidth={2.5}
              fill="url(#gradKeluar)"
              dot={<CustomDot stroke={P.rose} />}
              activeDot={<CustomActiveDot stroke={P.rose} />}
              animationDuration={1400}
              animationEasing="ease-out"
            />

            {/* ── Area Net ── */}
            <Area
              type="monotone"
              dataKey="net"
              name="Saldo Bersih"
              stroke={P.indigo}
              strokeWidth={3}
              fill="url(#gradNet)"
              dot={<CustomDot stroke={P.indigo} />}
              activeDot={<CustomActiveDot stroke={P.indigo} />}
              filter="url(#glowIndigo)"
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {[
          { color: P.cyan, label: "Arus Masuk" },
          { color: P.rose, label: "Arus Keluar" },
          { color: P.indigo, label: "Saldo Bersih" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="relative flex items-center justify-center"
              style={{ width: 28, height: 12 }}
            >
              {/* Line */}
              <span
                className="absolute inset-y-1/2 left-0 right-0 h-0.5 rounded-full"
                style={{
                  background: item.color,
                  transform: "translateY(-50%)",
                  opacity: 0.8,
                }}
              />
              {/* Dot center */}
              <span
                className="absolute w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: isDark ? P.slate900 : "#fff",
                  borderColor: item.color,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CashFlowChart;
