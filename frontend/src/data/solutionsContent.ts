// frontend/src/data/solutionsContent.ts
// Content for /solutions/:slug pages — real problems & real features per segment.

import { Building, Landmark, Users, Receipt, type LucideIcon } from "lucide-react";
import type { DetailPageContent } from "../components/DetailPageTemplate";

type SolutionContent = DetailPageContent & {
  icon: LucideIcon;
};

export const solutionsContent: Record<string, SolutionContent> = {
  "small-business": {
    icon: Building,
    heroIcon: Building,
    heroTitle: {
      en: "Financial Clarity for Small Businesses",
      id: "Kejelasan Keuangan untuk Usaha Kecil",
    },
    heroDescription: {
      en: "Stop wrestling with spreadsheets and shoebox receipts. LedgerFlow gives you automated bookkeeping, real-time cash flow visibility, and tax-ready reports — so you can focus on growing your business, not your paperwork.",
      id: "Berhenti berjuang dengan spreadsheet dan struk kotak sepatu. LedgerFlow memberi Anda pembukuan otomatis, visibilitas arus kas real-time, dan laporan siap pajak — sehingga Anda bisa fokus mengembangkan bisnis, bukan urusan kertas.",
    },
    painPoints: [
      {
        title: { en: "Manual Bookkeeping", id: "Pembukuan Manual" },
        description: { en: "Hours wasted each week typing transactions into spreadsheets, leading to errors and inconsistent records.", id: "Berjam-jam terbuang setiap minggu mengetik transaksi ke spreadsheet, mengakibatkan kesalahan dan catatan yang tidak konsisten." },
      },
      {
        title: { en: "No Cash Flow Visibility", id: "Tanpa Visibilitas Arus Kas" },
        description: { en: "You don't know if you can afford next month's rent until it's too late.", id: "Anda tidak tahu apakah bisa membayar sewa bulan depan sampai terlambat." },
      },
      {
        title: { en: "Tax Season Panic", id: "Panik Saat Musim Pajak" },
        description: { en: "Scrambling to organize a year's worth of financial data into something your accountant can file.", id: "Berusaha keras mengorganisir data keuangan setahun agar bisa diajukan akuntan Anda." },
      },
    ],
    keyCapabilities: [
      {
        title: { en: "Automatic Transaction Recording", id: "Pencatatan Transaksi Otomatis" },
        description: { en: "Connect your bank and LedgerFlow auto-imports and categorizes every transaction — no manual data entry.", id: "Hubungkan bank Anda dan LedgerFlow otomatis mengimpor dan mengkategorikan setiap transaksi — tanpa input manual." },
      },
      {
        title: { en: "Real-Time Cash Flow Dashboard", id: "Dashboard Arus Kas Real-Time" },
        description: { en: "See exactly where your money is going with live charts and cash flow projections.", id: "Lihat persis ke mana uang Anda pergi dengan grafik live dan proyeksi arus kas." },
      },
      {
        title: { en: "Tax-Ready Financial Reports", id: "Laporan Keuangan Siap Pajak" },
        description: { en: "One-click income statement, balance sheet, and cash flow — export as PDF for your accountant.", id: "Laporan laba rugi, neraca, dan arus kas dengan satu klik — ekspor sebagai PDF untuk akuntan Anda." },
      },
      {
        title: { en: "Multi-User with Role Access", id: "Multi-Pengguna dengan Akses Peran" },
        description: { en: "Invite your bookkeeper or accountant with controlled permissions — Owner and Accountant roles built in.", id: "Undang pembukuan atau akuntan Anda dengan izin terkontrol — peran Owner dan Akuntan sudah tersedia." },
      },
    ],
    ctaText: { en: "Start managing your finances today", id: "Mulai kelola keuangan Anda hari ini" },
  },

  "mid-market": {
    icon: Landmark,
    heroIcon: Landmark,
    heroTitle: {
      en: "Multi-Entity Financial Control for Growing Companies",
      id: "Kontrol Keuangan Multi-Entitas untuk Perusahaan Berkembang",
    },
    heroDescription: {
      en: "Managing multiple entities across currencies shouldn't require an enterprise ERP. LedgerFlow gives mid-market companies consolidated reporting, inter-entity tracking, and real-time dashboards without the complexity.",
      id: "Mengelola banyak entitas lintas mata uang tidak seharusnya membutuhkan ERP enterprise. LedgerFlow memberi perusahaan berkembang laporan terkonsolidasi, pelacakan antar-entitas, dan dashboard real-time tanpa kompleksitas.",
    },
    painPoints: [
      {
        title: { en: "Fragmented Data Across Entities", id: "Data Terfragmentasi Antar Entitas" },
        description: { en: "Each subsidiary maintains separate books with no consolidated view — making group reporting a nightmare.", id: "Setiap anak perusahaan memelihara buku terpisah tanpa tampilan terkonsolidasi — membuat pelaporan grup menjadi mimpi buruk." },
      },
      {
        title: { en: "Currency Conversion Headaches", id: "Sakit Kepala Konversi Mata Uang" },
        description: { en: "Manual forex calculations and reconciliations eat up days at month-end.", id: "Perhitungan valas manual dan rekonsiliasi memakan waktu berhari-hari di akhir bulan." },
      },
      {
        title: { en: "Delayed Consolidated Reporting", id: "Pelaporan Terkonsolidasi Tertunda" },
        description: { en: "Group-level financial statements take weeks to prepare because data must be gathered from multiple systems.", id: "Pernyataan keuangan tingkat grup membutuhkan waktu berminggu-minggu karena data harus dikumpulkan dari berbagai sistem." },
      },
    ],
    keyCapabilities: [
      {
        title: { en: "Multi-Company Management", id: "Manajemen Multi-Perusahaan" },
        description: { en: "Manage unlimited entities under one LedgerFlow account with separate books and a consolidated view.", id: "Kelola entitas tanpa batas dalam satu akun LedgerFlow dengan buku terpisah dan tampilan terkonsolidasi." },
      },
      {
        title: { en: "Multi-Currency Support", id: "Dukungan Multi-Mata Uang" },
        description: { en: "Record transactions in any currency with automatic exchange rate conversion and unrealized gain/loss tracking.", id: "Catat transaksi dalam mata uang apa pun dengan konversi kurs otomatis dan pelacakan laba/rugi belum direalisasi." },
      },
      {
        title: { en: "Consolidated Financial Reports", id: "Laporan Keuangan Terkonsolidasi" },
        description: { en: "Generate group-level income statements, balance sheets, and cash flow with inter-entity eliminations.", id: "Buat laporan laba rugi, neraca, dan arus kas tingkat grup dengan eliminasi antar-entitas." },
      },
      {
        title: { en: "AI CFO Assistant", id: "Asisten AI CFO" },
        description: { en: "Ask natural language questions about your consolidated financials and get instant insights.", id: "Ajukan pertanyaan dalam bahasa alami tentang keuangan terkonsolidasi Anda dan dapatkan insight instan." },
      },
    ],
    ctaText: { en: "Streamline your multi-entity operations", id: "Rasionalisasi operasi multi-entitas Anda" },
  },

  "accountants-firms": {
    icon: Users,
    heroIcon: Users,
    heroTitle: {
      en: "Manage All Your Clients from One Platform",
      id: "Kelola Semua Klien Anda dari Satu Platform",
    },
    heroDescription: {
      en: "Accounting firms juggle dozens of client books across different systems. LedgerFlow lets you manage all clients in one place with role-based access, so you can deliver more value in less time.",
      id: "Firma akuntan mengelola puluhan buku klien lintas sistem berbeda. LedgerFlow memungkinkan Anda mengelola semua klien dalam satu tempat dengan akses berbasis peran, sehingga Anda bisa memberikan lebih banyak nilai dalam waktu lebih singkat.",
    },
    painPoints: [
      {
        title: { en: "Switching Between Client Systems", id: "Beralih Antar Sistem Klien" },
        description: { en: "Each client uses different software — QuickBooks, Xero, Excel — requiring constant context-switching.", id: "Setiap klien menggunakan perangkat lunak berbeda — QuickBooks, Xero, Excel — membutuhkan peralihan konteks terus-menerus." },
      },
      {
        title: { en: "No Unified Client Overview", id: "Tanpa Ikhtisar Klien Terpadu" },
        description: { en: "You can't see all your clients' financial health at a glance — it's buried in separate login sessions.", id: "Anda tidak bisa melihat kesehatan keuangan semua klien secara sekilas — tersembunyi di sesi login terpisah." },
      },
      {
        title: { en: "Permission and Access Control", id: "Kontrol Izin dan Akses" },
        description: { en: "Managing who can see what across multiple client accounts is error-prone and tedious.", id: "Mengelola siapa yang bisa melihat apa di banyak akun klien penuh kesalahan dan membosankan." },
      },
    ],
    keyCapabilities: [
      {
        title: { en: "Multi-Client Management", id: "Manajemen Multi-Klien" },
        description: { en: "One dashboard for all your clients — switch between client books without logging in and out.", id: "Satu dashboard untuk semua klien Anda — beralih antara buku klien tanpa login dan logout." },
      },
      {
        title: { en: "Role-Based Access Control", id: "Kontrol Akses Berbasis Peran" },
        description: { en: "Assign Owner or Accountant roles per client — give your staff exactly the access they need, nothing more.", id: "Tetapkan peran Owner atau Akuntan per klien — berikan staf Anda akses yang tepat, tidak lebih." },
      },
      {
        title: { en: "Collaborative Journal Entries", id: "Entri Jurnal Kolaboratif" },
        description: { en: "Create and review journal entries together with your team — auto-balance ensures accuracy every time.", id: "Buat dan tinjau entri jurnal bersama tim Anda — auto-balance memastikan akurasi setiap kali." },
      },
      {
        title: { en: "Export & Reporting", id: "Ekspor & Pelaporan" },
        description: { en: "Export financial reports as PDF for each client — ready to deliver or file with authorities.", id: "Ekspor laporan keuangan sebagai PDF untuk setiap klien — siap diserahkan atau diajukan ke otoritas." },
      },
    ],
    ctaText: { en: "Elevate your practice with LedgerFlow", id: "Tingkatkan praktik Anda dengan LedgerFlow" },
  },

  "startups": {
    icon: Receipt,
    heroIcon: Receipt,
    heroTitle: {
      en: "Built-Finance Infrastructure from Day One",
      id: "Infrastruktur Keuangan yang Dibangun Sejak Hari Pertama",
    },
    heroDescription: {
      en: "Don't wait until Series A to get your financial house in order. LedgerFlow gives startups professional-grade bookkeeping, investor-ready reports, and AI-powered insights from the moment you incorporate.",
      id: "Jangan tunggu sampai Series A untuk menata keuangan Anda. LedgerFlow memberi startup pembukuan kelas profesional, laporan siap investor, dan insight berbasis AI sejak Anda mendirikan perusahaan.",
    },
    painPoints: [
      {
        title: { en: "Financial Chaos Early On", id: "Kekacauan Keuangan di Awal" },
        description: { en: "Founders wear every hat — bookkeeping gets deprioritized until investors ask for clean financials.", id: "Pendiri memakai banyak topi — pembukuan menjadi prioritas rendah sampai investor meminta keuangan yang rapi." },
      },
      {
        title: { en: "Investor-Grade Reporting Gap", id: "Kesenjangan Pelaporan Kelas Investor" },
        description: { en: "Spreadsheet-based books don't inspire confidence when fundraising — investors expect professional reporting.", id: "Buku berbasis spreadsheet tidak menginspirasi kepercayaan saat penggalangan dana — investor mengharapkan pelaporan profesional." },
      },
      {
        title: { en: "Tracking Burn Rate", id: "Melacak Burn Rate" },
        description: { en: "Without real-time visibility into runway and expenses, you're flying blind on cash management.", id: "Tanpa visibilitas real-time ke runway dan pengeluaran, Anda terbang tanpa panduan dalam pengelolaan kas." },
      },
    ],
    keyCapabilities: [
      {
        title: { en: "Quick Setup, Zero Learning Curve", id: "Pengaturan Cepat, Tanpa Kurva Belajar" },
        description: { en: "Onboard in minutes with guided setup — no accounting degree required.", id: "Onboard dalam hitungan menit dengan pengaturan terpandu — tidak membutuhkan gelar akuntansi." },
      },
      {
        title: { en: "Investor-Ready Financial Reports", id: "Laporan Keuangan Siap Investor" },
        description: { en: "Professional income statements, balance sheets, and cash flow reports that look great in your pitch deck.", id: "Laporan laba rugi, neraca, dan arus kas profesional yang terlihat bagus di pitch deck Anda." },
      },
      {
        title: { en: "Real-Time Burn Rate & Runway", id: "Burn Rate & Runway Real-Time" },
        description: { en: "Track your cash runway, monthly burn, and expense trends in a live dashboard.", id: "Lacak runway kas, burn bulanan, dan tren pengeluaran di dashboard live." },
      },
      {
        title: { en: "AI CFO for Strategic Insights", id: "AI CFO untuk Insight Strategis" },
        description: { en: "Ask your AI assistant about financial trends, cost optimization, and growth projections.", id: "Tanya asisten AI Anda tentang tren keuangan, optimasi biaya, dan proyeksi pertumbuhan." },
      },
    ],
    ctaText: { en: "Set up your startup's financials today", id: "Siapkan keuangan startup Anda hari ini" },
  },
};
