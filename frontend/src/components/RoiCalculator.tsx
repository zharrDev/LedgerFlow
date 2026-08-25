import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, DollarSign, TrendingDown } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { SCROLL_REVEAL } from "../lib/scrollAnimations";

export default function RoiCalculator() {
  const { language } = useLanguage();
  const id = language === "id";

  const [transactions, setTransactions] = useState(200);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(50);

  const monthlyManualHours = hoursPerWeek * 4.33;
  const ledgerflowHours = monthlyManualHours * 0.3; // ~70% reduction
  const hoursSaved = monthlyManualHours - ledgerflowHours;
  const monthlyManualCost = monthlyManualHours * hourlyRate;
  const ledgerflowCost = 29; // Pro plan approximate
  const monthlySavings = monthlyManualCost - ledgerflowCost;
  const yearlySavings = monthlySavings * 12;

  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <motion.div
      {...SCROLL_REVEAL}
      className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-lg p-6 sm:p-8"
    >
      <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">
        {id ? "Kalkulator Penghematan" : "Savings Calculator"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {id ? "Transaksi / bulan" : "Transactions / month"}
          </label>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={transactions}
            onChange={(e) => setTransactions(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <p className="text-sm text-gray-900 dark:text-white font-semibold mt-1">{fmt(transactions)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {id ? "Jam pembukuan / minggu" : "Bookkeeping hours / week"}
          </label>
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <p className="text-sm text-gray-900 dark:text-white font-semibold mt-1">{hoursPerWeek} {id ? "jam" : "hrs"}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {id ? "Tarif per jam ($)" : "Hourly rate ($)"}
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <p className="text-sm text-gray-900 dark:text-white font-semibold mt-1">${hourlyRate}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 text-center">
          <Clock size={20} className="mx-auto text-primary-500 mb-2" />
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{fmt(hoursSaved)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{id ? "jam/bulan dihemat" : "hrs/mo saved"}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
          <DollarSign size={20} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${fmt(monthlySavings)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{id ? "penghematan/bulan" : "savings/mo"}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <TrendingDown size={20} className="mx-auto text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${fmt(yearlySavings)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{id ? "penghematan/tahun" : "savings/yr"}</p>
        </div>
      </div>
    </motion.div>
  );
}
