import type { DashboardSummary } from "../hooks/useDashboardData";
import { tx } from "../i18n/tx";

export function getTimeGreeting(language: "en" | "id"): string {
  const hour = new Date().getHours();
  if (hour < 11) return tx(language, "Good morning", "Selamat pagi");
  if (hour < 15) return tx(language, "Good afternoon", "Selamat siang");
  if (hour < 18) return tx(language, "Good evening", "Selamat sore");
  return tx(language, "Good night", "Selamat malam");
}

export function buildInitialPrompt(
  summary: DashboardSummary | null,
  language: "en" | "id",
  periodLabel?: string,
): string {
  const locale = language === "id" ? "id-ID" : "en-US";
  const periode = periodLabel || tx(language, "YTD (all periods)", "YTD (semua periode)");
  if (!summary) {
    return tx(language,
      `Provide a summary of my company's financial condition for ${periode}. Explain revenue, expenses, net income, cash flow, and key risks — use data from the system.`,
      `Berikan ringkasan kondisi keuangan perusahaan saya untuk ${periode}. Jelaskan pendapatan, beban, laba bersih, arus kas, dan risiko utama — gunakan data dari sistem.`
    );
  }
  const fmt = (v: number) => v.toLocaleString(locale);
  return [
    tx(language,
      `Provide a CFO summary for ${periode} based on LedgerFlow data:`,
      `Berikan ringkasan CFO untuk ${periode} berdasarkan data LedgerFlow:`
    ),
    tx(language,
      `- Revenue: Rp ${fmt(summary.totalRevenue)}`,
      `- Pendapatan: Rp ${fmt(summary.totalRevenue)}`
    ),
    tx(language,
      `- Expenses: Rp ${fmt(summary.totalExpense)}`,
      `- Beban: Rp ${fmt(summary.totalExpense)}`
    ),
    tx(language,
      `- Net income: Rp ${fmt(summary.netIncome)}`,
      `- Laba bersih: Rp ${fmt(summary.netIncome)}`
    ),
    tx(language,
      `- Net cash flow: Rp ${fmt(summary.netCashFlow)}`,
      `- Arus kas bersih: Rp ${fmt(summary.netCashFlow)}`
    ),
    tx(language,
      `- Ending cash: Rp ${fmt(summary.endingCash)}`,
      `- Kas akhir: Rp ${fmt(summary.endingCash)}`
    ),
    tx(language,
      `- Total assets: Rp ${fmt(summary.totalAssets)}`,
      `- Total aset: Rp ${fmt(summary.totalAssets)}`
    ),
    tx(language,
      `- Equity: Rp ${fmt(summary.totalEquity)}`,
      `- Ekuitas: Rp ${fmt(summary.totalEquity)}`
    ),
    "",
    tx(language,
      "Verify with tools, explain the financial condition, trends, and 2-3 practical recommendations.",
      "Verifikasi dengan tool, jelaskan kondisi keuangan, tren, dan 2-3 rekomendasi praktis."
    ),
  ].join("\n");
}

export interface QuickAction {
  id: string;
  label: string;
  displayText: string;
  prompt: string;
}

export function getQuickActions(summary: DashboardSummary | null, language: "en" | "id"): QuickAction[] {
  return [
    {
      id: "summary",
      label: tx(language, "Financial summary", "Ringkasan keuangan"),
      displayText: tx(language, "Please analyze my company's financial summary.", "Tolong analisis ringkasan keuangan perusahaan saya."),
      prompt: buildInitialPrompt(summary, language),
    },
    {
      id: "cashflow",
      label: tx(language, "Cash flow analysis", "Analisis arus kas"),
      displayText: tx(language, "How is my company's cash flow?", "Bagaimana kondisi arus kas perusahaan saya?"),
      prompt: tx(language,
        "Analyze my company's cash flow: operations, investing, financing, and whether liquidity is healthy. Use data from the system.",
        "Analisis arus kas perusahaan saya: operasi, investasi, pendanaan, dan apakah likuiditas sehat. Gunakan data dari sistem."
      ),
    },
    {
      id: "expense",
      label: tx(language, "Largest expenses", "Beban terbesar"),
      displayText: tx(language, "What are my company's largest expenses?", "Apa saja beban terbesar perusahaan saya?"),
      prompt: tx(language,
        "Show the largest expense (EXPENSE) accounts along with their proportions. Explain if there is expense concentration that needs attention.",
        "Tampilkan akun beban (EXPENSE) terbesar beserta proporsinya. Jelaskan apakah ada konsentrasi beban yang perlu diwaspadai."
      ),
    },
    {
      id: "risk",
      label: tx(language, "Financial risk check", "Cek risiko keuangan"),
      displayText: tx(language, "Are there financial risks I should be aware of?", "Ada risiko keuangan yang perlu saya waspadai?"),
      prompt: tx(language,
        "Evaluate my company's financial risks (liquidity, expense concentration, negative trends). Sort from most critical.",
        "Evaluasi risiko keuangan perusahaan saya (likuiditas, konsentrasi beban, tren negatif). Urutkan dari yang paling kritis."
      ),
    },
  ];
}
