// frontend/src/data/productContent.ts
// Content for /product/:slug pages — based on REAL features implemented in the app.

import { BookOpen, FileText, TrendingUp, type LucideIcon } from "lucide-react";
import type { DetailPageContent } from "../components/DetailPageTemplate";

type ProductContent = DetailPageContent & {
  icon: LucideIcon;
};

export const productContent: Record<string, ProductContent> = {
  "chart-of-accounts": {
    icon: BookOpen,
    heroIcon: BookOpen,
    heroTitle: {
      en: "Chart of Accounts — Your Financial Foundation",
      id: "Chart of Accounts — Fondasi Keuangan Anda",
    },
    heroDescription: {
      en: "A well-organized chart of accounts is the backbone of accurate bookkeeping. LedgerFlow lets you build a customizable account structure that fits your business — from simple small-business setups to complex multi-entity hierarchies.",
      id: "Susunan bagan akun yang terorganisir adalah tulang punggung pembukuan yang akurat. LedgerFlow memungkinkan Anda membangun struktur akun yang dapat disesuaikan sesuai bisnis Anda — dari pengaturan usaha kecil yang sederhana hingga hierarki multi-entitas yang kompleks.",
    },
    keyCapabilities: [
      {
        title: { en: "Customizable Account Hierarchy", id: "Hierarki Akun yang Disesuaikan" },
        description: { en: "Create parent-child account relationships with unlimited depth. Group related accounts for cleaner reporting.", id: "Buat relasi akun induk-anak dengan kedalaman tak terbatas. Kelompokkan akun terkait untuk pelaporan yang lebih rapi." },
      },
      {
        title: { en: "Pre-Built Templates", id: "Template Siap Pakai" },
        description: { en: "Start with industry-standard account templates or build your own from scratch. Choose what fits your business.", id: "Mulai dengan template akun standar industri atau bangun sendiri dari nol. Pilih yang sesuai dengan bisnis Anda." },
      },
      {
        title: { en: "Real-Time Balance Tracking", id: "Pelacakan Saldo Real-Time" },
        description: { en: "Every journal entry instantly updates account balances — see current balances at any time without running reports.", id: "Setiap entri jurnal langsung memperbarui saldo akun — lihat saldo saat ini kapan saja tanpa menjalankan laporan." },
      },
      {
        title: { en: "Multi-Company Support", id: "Dukungan Multi-Perusahaan" },
        description: { en: "Maintain separate charts of accounts for each entity while keeping a consolidated group view.", id: "Pertahankan bagan akun terpisah untuk setiap entitas sambil mempertahankan tampilan grup terkonsolidasi." },
      },
    ],
    ctaText: { en: "Set up your chart of accounts", id: "Siapkan bagan akun Anda" },
  },

  "journal-entries": {
    icon: FileText,
    heroIcon: FileText,
    heroTitle: {
      en: "Journal Entries — Double-Entry Made Simple",
      id: "Entri Jurnal — Double-Entry Jadi Sederhana",
    },
    heroDescription: {
      en: "Record every financial transaction with confidence. LedgerFlow's journal entry system enforces double-entry accounting with auto-balancing, audit trails, and collaborative review — so your books are always accurate.",
      id: "Catat setiap transaksi keuangan dengan percaya diri. Sistem entri jurnal LedgerFlow menerapkan akuntansi double-entry dengan auto-balancing, jejak audit, dan tinjauan kolaboratif — sehingga buku Anda selalu akurat.",
    },
    keyCapabilities: [
      {
        title: { en: "Auto-Balance Validation", id: "Validasi Auto-Balance" },
        description: { en: "Debits and credits must balance before submission — the system catches errors before they become problems.", id: "Debit dan kredit harus seimbang sebelum pengajuan — sistem menangkap kesalahan sebelum menjadi masalah." },
      },
      {
        title: { en: "Period Lock Management", id: "Manajemen Penguncian Periode" },
        description: { en: "Lock completed accounting periods to prevent accidental changes. Only owners can manage period locks.", id: "Kunci periode akuntansi yang selesai untuk mencegah perubahan yang tidak disengaja. Hanya owner yang dapat mengelola kunci periode." },
      },
      {
        title: { en: "AI-Assisted Entry", id: "Entri Terbantu AI" },
        description: { en: "Describe your transaction in plain language and let the AI CFO suggest the right accounts and amounts.", id: "Deskripsikan transaksi Anda dalam bahasa sederhana dan biarkan AI CFO menyarankan akun dan jumlah yang tepat." },
      },
      {
        title: { en: "Audit Trail & Status Tracking", id: "Jejak Audit & Pelacakan Status" },
        description: { en: "Every entry has a complete history — who created it, when, and its current status (draft/posted/archived).", id: "Setiap entri memiliki riwayat lengkap — siapa yang membuatnya, kapan, dan status saat ini (draft/diposting/diarsipkan)." },
      },
    ],
    ctaText: { en: "Start recording transactions", id: "Mulai mencatat transaksi" },
  },

  "financial-reports": {
    icon: TrendingUp,
    heroIcon: TrendingUp,
    heroTitle: {
      en: "Financial Reports — Your Numbers, Always Current",
      id: "Laporan Keuangan — Angka Anda, Selalu Terkini",
    },
    heroDescription: {
      en: "Get instant access to the three core financial statements — income statement, balance sheet, and cash flow — always generated from your latest data. No more waiting for month-end close to know where you stand.",
      id: "Akses instan ke tiga laporan keuangan inti — laba rugi, neraca, dan arus kas — selalu dihasilkan dari data terbaru Anda. Tidak perlu menunggu penutupan bulanan untuk mengetahui posisi Anda.",
    },
    keyCapabilities: [
      {
        title: { en: "Income Statement (P&L)", id: "Laporan Laba Rugi" },
        description: { en: "See revenue, expenses, and net income at a glance. Drill down into any line item for transaction details.", id: "Lihat pendapatan, pengeluaran, dan laba bersih secara sekilas. Telusuri detail transaksi di setiap item laporan." },
      },
      {
        title: { en: "Balance Sheet", id: "Neraca" },
        description: { en: "Real-time view of assets, liabilities, and equity. Always balanced thanks to double-entry enforcement.", id: "Tampilan real-time aset, liabilitas, dan ekuitas. Selalu seimbang berkat penerapan double-entry." },
      },
      {
        title: { en: "Cash Flow Statement", id: "Laporan Arus Kas" },
        description: { en: "Track operating, investing, and financing activities. Understand where cash comes from and where it goes.", id: "Lacak aktivitas operasi, investasi, dan pendanaan. Pahami dari mana kas berasal dan ke mana perginya." },
      },
      {
        title: { en: "PDF Export & Sharing", id: "Ekspor PDF & Berbagi" },
        description: { en: "Export any report as a professional PDF — ready to share with investors, banks, or your accountant.", id: "Ekspor laporan apa pun sebagai PDF profesional — siap dibagikan ke investor, bank, atau akuntan Anda." },
      },
    ],
    ctaText: { en: "Generate your first report", id: "Buat laporan pertama Anda" },
  },
};
