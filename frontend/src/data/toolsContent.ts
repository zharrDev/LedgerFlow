// frontend/src/data/toolsContent.ts
// Content for /tools/:slug pages.

import { Calculator, Receipt, type LucideIcon } from "lucide-react";
import type { DetailPageContent } from "../components/DetailPageTemplate";

type L = { en: string; id: string };

type ToolContent = DetailPageContent & {
  icon: LucideIcon;
};

export const toolsContent: Record<string, ToolContent> = {
  "roi-calculator": {
    icon: Calculator,
    heroIcon: Calculator,
    heroTitle: {
      en: "ROI Calculator — See How Much LedgerFlow Saves You",
      id: "Kalkulator ROI — Lihat Berapa Banyak LedgerFlow Menghemat Anda",
    },
    heroDescription: {
      en: "Manual bookkeeping costs more than you think. Use this calculator to see how much time and money your business can save by switching to LedgerFlow's automated platform.",
      id: "Pembukuan manual biayanya lebih dari yang Anda kira. Gunakan kalkulator ini untuk melihat berapa banyak waktu dan uang bisnis Anda bisa hemat dengan beralih ke platform otomatis LedgerFlow.",
    },
    keyCapabilities: [
      {
        title: { en: "Time Savings Estimation", id: "Estimasi Penghematan Waktu" },
        description: { en: "Input your monthly transactions and current hours spent on bookkeeping — see how many hours LedgerFlow can save you each month.", id: "Masukkan transaksi bulanan Anda dan jam yang dihabiskan untuk pembukuan — lihat berapa jam LedgerFlow bisa menghemat Anda setiap bulan." },
      },
      {
        title: { en: "Cost Reduction Analysis", id: "Analisis Pengurangan Biaya" },
        description: { en: "Compare the cost of manual bookkeeping (time × hourly rate) vs. LedgerFlow subscription — see the break-even point.", id: "Bandingkan biaya pembukuan manual (waktu × tarif per jam) dengan langganan LedgerFlow — lihat titik impas." },
      },
      {
        title: { en: "Error Reduction Impact", id: "Dampak Pengurangan Kesalahan" },
        description: { en: "Manual data entry leads to costly errors. Auto-balancing and validation in LedgerFlow reduce mistakes that could result in tax penalties.", id: "Input data manual menyebabkan kesalahan mahal. Auto-balancing dan validasi di LedgerFlow mengurangi kesalahan yang bisa mengakibatkan denda pajak." },
      },
      {
        title: { en: "Scalability Benefits", id: "Manfaat Skalabilitas" },
        description: { en: "As your transaction volume grows, manual costs scale linearly — but LedgerFlow handles increased volume at the same flat rate.", id: "Seiring pertumbuhan volume transaksi, biaya manual meningkat sebanding — tapi LedgerFlow menangani peningkatan volume dengan tarif tetap yang sama." },
      },
    ],
    interactiveContent: <RoiCalculator />,
    ctaText: { en: "Start saving time today", id: "Mulai menghemat waktu hari ini" },
  },

  "tax-strategist": {
    icon: Receipt,
    heroIcon: Receipt,
    heroTitle: {
      en: "Tax Strategist — Financial Reports Ready for Tax Season",
      id: "Strategi Pajak — Laporan Keuangan Siap untuk Musim Pajak",
    },
    heroDescription: {
      en: "Tax preparation doesn't have to be a nightmare. LedgerFlow generates accurate, up-to-date financial reports that your accountant or tax consultant can use directly — saving time and reducing the risk of errors.",
      id: "Persiapan pajak tidak harus menjadi mimpi buruk. LedgerFlow menghasilkan laporan keuangan yang akurat dan terkini yang bisa langsung digunakan akuntan atau konsultan pajak Anda — menghemat waktu dan mengurangi risiko kesalahan.",
    },
    keyCapabilities: [
      {
        title: { en: "Income Statement for Tax Filing", id: "Laporan Laba Rugi untuk Pelaporan Pajak" },
        description: { en: "Generate a complete income statement (P&L) showing all revenue and deductible expenses — exactly what your tax consultant needs.", id: "Buat laporan laba rugi lengkap yang menunjukkan semua pendapatan dan pengeluaran yang dapat dikurangkan — persis yang dibutuhkan konsultan pajak Anda." },
      },
      {
        title: { en: "Balance Sheet Snapshot", id: "Snapshoot Neraca" },
        description: { en: "A current balance sheet with accurate asset, liability, and equity figures — essential for year-end tax reporting.", id: "Neraca terkini dengan angka aset, liabilitas, dan ekuitas yang akurat — penting untuk pelaporan pajak akhir tahun." },
      },
      {
        title: { en: "Period-Locked Historical Data", id: "Data Historis Terkunci Periode" },
        description: { en: "Lock completed periods to ensure your historical financial data is immutable and audit-ready — no surprises during tax review.", id: "Kunci periode yang selesai untuk memastikan data keuangan historis Anda tidak berubah dan siap audit — tidak ada kejutan saat review pajak." },
      },
      {
        title: { en: "Exportable Reports", id: "Laporan yang Dapat Diekspor" },
        description: { en: "Export income statement, balance sheet, and cash flow as PDF files — send directly to your accountant without reformatting.", id: "Ekspor laba rugi, neraca, dan arus kas sebagai file PDF — kirim langsung ke akuntan Anda tanpa perlu format ulang." },
      },
    ],
    ctaText: { en: "Get your reports ready", id: "Siapkan laporan Anda" },
  },
};

// ─── Interactive ROI Calculator Component ──────────────────────────────
import { useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { motion } from "framer-motion";
import { Clock, DollarSign, TrendingDown } from "lucide-react";

function RoiCalculator() {
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
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
