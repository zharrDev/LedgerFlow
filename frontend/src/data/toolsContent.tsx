// frontend/src/data/toolsContent.tsx
// Content for /tools/:slug pages.

import { Calculator, Receipt, type LucideIcon } from "lucide-react";
import type { DetailPageContent } from "../components/DetailPageTemplate";
import RoiCalculator from "../components/RoiCalculator";

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

