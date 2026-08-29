// frontend/src/data/companyContent.ts
// Content for /company/:slug pages.

import { Building, type LucideIcon } from "lucide-react";
import type { DetailPageContent } from "../components/DetailPageTemplate";

type CompanyContent = DetailPageContent & {
  icon: LucideIcon;
};

export const companyContent: Record<string, CompanyContent> = {
  "about": {
    icon: Building,
    heroIcon: Building,
    heroTitle: {
      en: "About LedgerFlow — Modern Accounting for Growing Businesses",
      id: "Tentang LedgerFlow — Akuntansi Modern untuk Bisnis Berkembang",
    },
    heroDescription: {
      en: "LedgerFlow was built with a simple mission: make professional-grade accounting accessible to small and mid-market businesses without the complexity and cost of enterprise software. We believe every business deserves clear financial visibility.",
      id: "LedgerFlow dibangun dengan misi sederhana: membuat akuntansi kelas profesional dapat diakses oleh bisnis kecil dan menengah tanpa kompleksitas dan biaya perangkat lunak enterprise. Kami percaya setiap bisnis berhak atas visibilitas keuangan yang jelas.",
    },
    painPoints: [
      {
        title: { en: "The Problem We're Solving", id: "Masalah yang Kami Selesaikan" },
        description: { en: "Most accounting tools are either too simple (spreadsheets that break at scale) or too complex (enterprise ERPs that require consultants to operate). Small and mid-market businesses fall in the gap — they need real double-entry accounting without the overhead.", id: "Kebanyakan alat akuntansi terlalu sederhana (spreadsheet yang rusak saat skalanya besar) atau terlalu kompleks (ERP enterprise yang membutuhkan konsultan untuk mengoperasikannya). Bisnis kecil dan menengah terjebak di tengah — mereka butuh akuntansi double-entry nyata tanpa biaya overhead." },
      },
      {
        title: { en: "What We Built", id: "Apa yang Kami Bangun" },
        description: { en: "A cloud-based financial platform that combines the rigor of double-entry bookkeeping with the simplicity of modern software design. Real-time dashboards, AI-powered insights, multi-entity support, and role-based access — all in one place.", id: "Platform keuangan berbasis cloud yang menggabungkan ketepatan pembukuan double-entry dengan kesederhanaan desain perangkat lunak modern. Dashboard real-time, insight berbasis AI, dukungan multi-entitas, dan akses berbasis peran — semua dalam satu tempat." },
      },
    ],
    keyCapabilities: [
      {
        title: { en: "Built for Real Businesses", id: "Dibangun untuk Bisnis Nyata" },
        description: { en: "Every feature in LedgerFlow is based on the real workflows of small and mid-market companies — from how journal entries are created to how period-end close works. We don't add features for press releases; we add them because businesses need them.", id: "Setiap fitur di LedgerFlow didasarkan pada alur kerja nyata perusahaan kecil dan menengah — dari cara entri jurnal dibuat hingga cara penutupan akhir periode bekerja. Kami tidak menambahkan fitur untuk siaran pers; kami menambahkannya karena bisnis membutuhkannya." },
      },
      {
        title: { en: "AI That Helps, Not Replaces", id: "AI yang Membantu, Bukan Menggantikan" },
        description: { en: "Our AI CFO assistant suggests accounts, analyzes trends, and answers natural language questions about your finances — but the final decision is always yours. We augment your expertise, we don't replace it.", id: "Asisten AI CFO kami menyarankan akun, menganalisis tren, dan menjawab pertanyaan bahasa alami tentang keuangan Anda — tapi keputusan akhir selalu milik Anda. Kami meningkatkan keahlian Anda, bukan menggantinya." },
      },
      {
        title: { en: "Security First", id: "Keamanan Utama" },
        description: { en: "Bank-grade encryption (256-bit AES), SOC 2 Type II compliance, GDPR-ready, and WhatsApp OTP for secure authentication. Your financial data is protected at every layer.", id: "Enkripsi kelas bank (256-bit AES), kepatuhan SOC 2 Type II, siap GDPR, dan WhatsApp OTP untuk autentikasi yang aman. Data keuangan Anda dilindungi di setiap lapisan." },
      },
      {
        title: { en: "Transparent & Honest", id: "Transparan & Jujur" },
        description: { en: "No hidden fees, no bait-and-switch pricing, no features that require expensive add-ons. What you see on the pricing page is what you get. We earn your loyalty by delivering value, not by locking you in.", id: "Tidak ada biaya tersembunyi, tidak ada harga bait-and-switch, tidak ada fitur yang membutuhkan add-on mahal. Yang Anda lihat di halaman harga adalah yang Anda dapatkan. Kami mendapatkan loyalitas Anda dengan memberikan nilai, bukan dengan mengunci Anda." },
      },
    ],
    ctaText: { en: "Join thousands of businesses using LedgerFlow", id: "Bergabung dengan ribuan bisnis yang menggunakan LedgerFlow" },
  },
};
