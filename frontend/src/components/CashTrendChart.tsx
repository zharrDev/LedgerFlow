// ============================================================================
// LEDGERFLOW - CashTrendChart (multi-line: inflow / outflow / net balance)
// ============================================================================
// Data: 12 bulan terakhir dari GET /api/reports/cash-trend.
//   • Total Inflow  (emerald)  — penerimaan kas per bulan
//   • Total Outflow (rose)     — pengeluaran kas per bulan
//   • Net Balance   (cyan)     — kas bersih kumulatif (area lembut di bawah)
// Responsif: ResponsiveContainer + margin kecil di mobile; label sumbu-X
// dipangkas saat layar sempit supaya tidak bertumpuk.
// ============================================================================

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { CashTrendPoint } from "../services/reportsService";

interface CashTrendChartProps {
  data: CashTrendPoint[];
  formatValue: (v: number) => string;
  height?: number;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function shortMonth(ym: string): string {
  const m = Number(ym.slice(5, 7));
  return MONTHS_SHORT[m - 1] ?? ym;
}

/** Tick sumbu-X: tampilkan tiap-2 label bila data ≥ 10 titik (anti-tumpuk). */
function xTickStrategy(count: number) {
  return count >= 10 ? 1 : 0; // interval index
}

export function CashTrendChart({
  data,
  formatValue,
  height = 260,
}: CashTrendChartProps) {
  const chartData = data.map((d) => ({ ...d, label: shortMonth(d.month) }));
  const skipEvery = xTickStrategy(chartData.length);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
        >
          <defs>
            <linearGradient id="cashTrendNetFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="stroke-gray-200 dark:stroke-gray-700/60"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={skipEvery}
            minTickGap={4}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v: number) => formatValue(v)}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              formatValue(Number(value)),
              name as string,
            ]}
            labelFormatter={(label: any) => String(label)}
            contentStyle={{
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(6,182,212,0.2)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
          />

          {/* Net Balance: area lembut di bawah garis — pusat visual */}
          <Area
            type="monotone"
            dataKey="balance"
            name="Net Balance"
            stroke="#06B6D4"
            strokeWidth={2.5}
            fill="url(#cashTrendNetFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="inflow"
            name="Total Inflow"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="outflow"
            name="Total Outflow"
            stroke="#F43F5E"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CashTrendChart;
