// frontend/src/data/resourcesContent.ts
// Content for /resources/:slug pages.

import { Newspaper, GraduationCap, FileSpreadsheet, type LucideIcon } from "lucide-react";
import type { DetailPageContent } from "../components/DetailPageTemplate";

type L = { en: string; id: string };

type ResourceContent = DetailPageContent & {
  icon: LucideIcon;
};

export const resourcesContent: Record<string, ResourceContent> = {
  "blog": {
    icon: Newspaper,
    heroIcon: Newspaper,
    heroTitle: {
      en: "LedgerFlow Blog — Accounting Insights & Tips",
      id: "Blog LedgerFlow — Insight & Tips Akuntansi",
    },
    heroDescription: {
      en: "Practical advice on bookkeeping, financial reporting, and growing your business — written by finance professionals who understand the challenges of small and mid-market companies.",
      id: "Saran praktis tentang pembukuan, pelaporan keuangan, dan mengembangkan bisnis Anda — ditulis oleh profesional keuangan yang memahami tantangan perusahaan kecil dan menengah.",
    },
    keyCapabilities: [
      {
        title: { en: "5 Signs Your Business Needs a Digital Bookkeeping System", id: "5 Tanda Bisnis Anda Butuh Sistem Pembukuan Digital" },
        description: { en: "Still using spreadsheets for your books? Here are the warning signs that manual bookkeeping is costing you more than you think — from missed deductions to cash flow blind spots, and how a modern platform like LedgerFlow can fix each one.", id: "Masih pakai spreadsheet untuk pembukuan? Berikut tanda-tanda peringatan bahwa pembukuan manual biayanya lebih dari yang Anda bayangkan — dari potongan pajak yang terlewat hingga titik buta arus kas, dan bagaimana platform modern seperti LedgerFlow bisa memperbaiki masing-masing." },
      },
      {
        title: { en: "How to Read a Cash Flow Statement (Beginner's Guide)", id: "Cara Membaca Laporan Arus Kas (Panduan Pemula)" },
        description: { en: "Your cash flow statement tells you where money comes from and where it goes. Learn to interpret operating, investing, and financing activities — and why cash flow is more important than profit for business survival.", id: "Laporan arus kas memberitahu Anda dari mana uang berasal dan ke mana perginya. Pelajari cara menginterpretasikan aktivitas operasi, investasi, dan pendanaan — dan mengapa arus kas lebih penting daripada laba untuk kelangsungan bisnis." },
      },
      {
        title: { en: "Month-End Close Checklist for Small Businesses", id: "Checklist Penutupan Bulanan untuk Usaha Kecil" },
        description: { en: "Closing your books each month doesn't have to be stressful. Follow this step-by-step checklist — from reconciling bank statements to generating your income statement — to close your books faster and with fewer errors.", id: "Menutup buku setiap bulan tidak harus menegangkan. Ikuti checklist langkah demi langkah ini — dari merekonsiliasi mutasi bank hingga menghasilkan laporan laba rugi — untuk menutup buku lebih cepat dan dengan lebih sedikit kesalahan." },
      },
    ],
    ctaText: { en: "Start tracking your finances", id: "Mulai melacak keuangan Anda" },
  },

  "guides": {
    icon: GraduationCap,
    heroIcon: GraduationCap,
    heroTitle: {
      en: "Guides & Tutorials — Learn LedgerFlow Step by Step",
      id: "Panduan & Tutorial — Pelajari LedgerFlow Langkah demi Langkah",
    },
    heroDescription: {
      en: "New to LedgerFlow? These hands-on guides walk you through the most important features — from setting up your chart of accounts to creating your first journal entry and inviting your team.",
      id: "Baru mengenal LedgerFlow? Panduan praktis ini memandu Anda melalui fitur-fitur terpenting — dari menyiapkan bagan akun hingga membuat entri jurnal pertama dan mengundang tim Anda.",
    },
    keyCapabilities: [
      {
        title: { en: "How to Set Up Your First Chart of Accounts", id: "Cara Menyiapkan Chart of Accounts Pertama Kali" },
        description: { en: "Step 1: Navigate to Chart of Accounts from the sidebar. Step 2: Choose whether to start from a template or build from scratch. Step 3: Create parent accounts (Assets, Liabilities, Equity, Revenue, Expenses) and sub-accounts for each category. Step 4: Assign account types and codes. Your chart of accounts is the foundation — get it right from the start.", id: "Langkah 1: Navigasi ke Chart of Accounts dari sidebar. Langkah 2: Pilih mulai dari template atau bangun dari nol. Langkah 3: Buat akun induk (Aset, Liabilitas, Ekuitas, Pendapatan, Pengeluaran) dan akun sub untuk setiap kategori. Langkah 4: Tetapkan tipe akun dan kode. Bagan akun Anda adalah fondasi — mulai dengan benar dari awal." },
      },
      {
        title: { en: "How to Create a Journal Entry", id: "Cara Membuat Entri Jurnal" },
        description: { en: "Step 1: Go to Journal Entries and click \"New Entry\". Step 2: Select the date and add a description. Step 3: Add debit lines (select account + amount) and credit lines — the system auto-validates that debits equal credits. Step 4: Save as Draft or post immediately. The auto-balance feature ensures your books stay accurate.", id: "Langkah 1: Buka Journal Entries dan klik \"New Entry\". Langkah 2: Pilih tanggal dan tambahkan deskripsi. Langkah 3: Tambahkan baris debit (pilih akun + jumlah) dan baris kredit — sistem memvalidasi otomatis bahwa debit sama dengan kredit. Langkah 4: Simpan sebagai Draft atau posting langsung. Fitur auto-balance memastikan buku Anda tetap akurat." },
      },
      {
        title: { en: "How to Invite Team Members", id: "Cara Mengundang Anggota Tim" },
        description: { en: "Step 1: Go to User Management (Owner role required). Step 2: Click \"Invite Member\" and enter their name, email, and phone number. Step 3: Assign a role — Owner (full access) or Accountant (view & create entries). Step 4: They'll receive an invitation via WhatsApp or email. Role-based access ensures each team member sees only what they need.", id: "Langkah 1: Buka User Management (peran Owner diperlukan). Langkah 2: Klik \"Invite Member\" dan masukkan nama, email, dan nomor telepon mereka. Langkah 3: Tetapkan peran — Owner (akses penuh) atau Accountant (lihat & buat entri). Langkah 4: Mereka akan menerima undangan via WhatsApp atau email. Akses berbasis peran memastikan setiap anggota tim hanya melihat yang mereka butuhkan." },
      },
    ],
    ctaText: { en: "Try these features now", id: "Coba fitur ini sekarang" },
  },

  "templates": {
    icon: FileSpreadsheet,
    heroIcon: FileSpreadsheet,
    heroTitle: {
      en: "Templates — Ready-to-Use Financial Spreadsheets",
      id: "Template — Spreadsheet Keuangan Siap Pakai",
    },
    heroDescription: {
      en: "Download free financial templates to complement your LedgerFlow account. These spreadsheets are designed for quick analysis, custom reporting, and sharing data with stakeholders outside your team.",
      id: "Unduh template keuangan gratis untuk melengkapi akun LedgerFlow Anda. Spreadsheet ini dirancang untuk analisis cepat, pelaporan kustom, dan berbagi data dengan pemangku kepentingan di luar tim Anda.",
    },
    keyCapabilities: [
      {
        title: { en: "Cash Flow Forecast Template", id: "Template Proyeksi Arus Kas" },
        description: { en: "A 12-month cash flow projection spreadsheet. Input your expected income and expenses to forecast your cash position month by month — great for planning and investor presentations.", id: "Spreadsheet proyeksi arus kas 12 bulan. Masukkan pendapatan dan pengeluaran yang diharapkan untuk memproyeksikan posisi kas Anda bulan demi bulan — bagus untuk perencanaan dan presentasi investor." },
      },
      {
        title: { en: "Budget vs Actual Report", id: "Laporan Anggaran vs Aktual" },
        description: { en: "Compare your planned budget against actual spending. Export your LedgerFlow financial data and paste it into this template to see where you're over or under budget at a glance.", id: "Bandingkan anggaran rencana Anda dengan pengeluaran aktual. Ekspor data keuangan LedgerFlow Anda dan tempel ke template ini untuk melihat di mana Anda di atas atau di bawah anggaran secara sekilas." },
      },
      {
        title: { en: "Year-End Closing Checklist", id: "Checklist Penutupan Akhir Tahun" },
        description: { en: "A comprehensive checklist for closing your books at year-end. Covers account reconciliation, depreciation entries, accrual adjustments, and document preparation for your accountant.", id: "Checklist lengkap untuk menutup buku di akhir tahun. Mencakup rekonsiliasi akun, entri depresiasi, penyesuaian akrual, dan persiapan dokumen untuk akuntan Anda." },
      },
    ],
    ctaText: { en: "Import data directly from LedgerFlow", id: "Impor data langsung dari LedgerFlow" },
  },
};
