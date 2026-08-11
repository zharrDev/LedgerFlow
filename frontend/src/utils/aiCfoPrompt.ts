import type { DashboardSummary } from "../hooks/useDashboardData";

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function buildInitialPrompt(
  summary: DashboardSummary | null,
  periodLabel?: string,
): string {
  const periode = periodLabel || "YTD (semua periode)";
  if (!summary) {
    return `Berikan ringkasan kondisi keuangan perusahaan saya untuk ${periode}. Jelaskan pendapatan, beban, laba bersih, arus kas, dan risiko utama — gunakan data dari sistem.`;
  }
  return [
    `Berikan ringkasan CFO untuk ${periode} berdasarkan data LedgerFlow:`,
    `- Pendapatan: Rp ${summary.totalRevenue.toLocaleString("id-ID")}`,
    `- Beban: Rp ${summary.totalExpense.toLocaleString("id-ID")}`,
    `- Laba bersih: Rp ${summary.netIncome.toLocaleString("id-ID")}`,
    `- Arus kas bersih: Rp ${summary.netCashFlow.toLocaleString("id-ID")}`,
    `- Kas akhir: Rp ${summary.endingCash.toLocaleString("id-ID")}`,
    `- Total aset: Rp ${summary.totalAssets.toLocaleString("id-ID")}`,
    `- Ekuitas: Rp ${summary.totalEquity.toLocaleString("id-ID")}`,
    "",
    "Verifikasi dengan tool, jelaskan kondisi keuangan, tren, dan 2-3 rekomendasi praktis.",
  ].join("\n");
}

export interface QuickAction {
  id: string;
  label: string;
  displayText: string;
  prompt: string;
}

export function getQuickActions(summary: DashboardSummary | null): QuickAction[] {
  return [
    {
      id: "summary",
      label: "Ringkasan keuangan",
      displayText: "Tolong analisis ringkasan keuangan perusahaan saya.",
      prompt: buildInitialPrompt(summary),
    },
    {
      id: "cashflow",
      label: "Analisis arus kas",
      displayText: "Bagaimana kondisi arus kas perusahaan saya?",
      prompt:
        "Analisis arus kas perusahaan saya: operasi, investasi, pendanaan, dan apakah likuiditas sehat. Gunakan data dari sistem.",
    },
    {
      id: "expense",
      label: "Beban terbesar",
      displayText: "Apa saja beban terbesar perusahaan saya?",
      prompt:
        "Tampilkan akun beban (EXPENSE) terbesar beserta proporsinya. Jelaskan apakah ada konsentrasi beban yang perlu diwaspadai.",
    },
    {
      id: "risk",
      label: "Cek risiko keuangan",
      displayText: "Ada risiko keuangan yang perlu saya waspadai?",
      prompt:
        "Evaluasi risiko keuangan perusahaan saya (likuiditas, konsentrasi beban, tren negatif). Urutkan dari yang paling kritis.",
    },
  ];
}
