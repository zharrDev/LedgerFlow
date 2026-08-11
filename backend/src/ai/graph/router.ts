// Router heuristic: tentukan agent spesialis dari pesan user.
// Deterministik & tanpa biaya LLM tambahan (model free tier flaky & ber-rate-limit).
// Kata kunci diurutkan dari yang paling spesifik ke umum.
export type AgentKind = "cashflow" | "forecast" | "report" | "risk";

const RULES: { kind: AgentKind; keywords: string[] }[] = [
  {
    kind: "forecast",
    keywords: [
      "forecast", "perkiraan", "proyeksi", "prediksi", "ramal", "estimasi",
      "future", "kedepan", "ke depan", "next month", "bulan depan",
      "berapa kira", "kira-kira", "akan berapa",
    ],
  },
  {
    kind: "risk",
    keywords: [
      "risk", "risiko", "berisiko", "bahaya", "waspada", "ancaman",
      "boros", "kritis", "bahaya likuiditas",
    ],
  },
  {
    kind: "cashflow",
    keywords: [
      "cash flow", "cashflow", "arus kas", "kas ", "kasnya", "likuiditas",
      "cash", "saldo kas", "uang masuk", "uang keluar", "modal kerja",
    ],
  },
  {
    kind: "report",
    keywords: [
      "laporan", "report", "laba", "rugi", "neraca", "transaksi", "jurnal",
      "pengeluaran", "beban", "pendapatan", "ringkas", "ringkasan",
      "summary", "kondisi", "keuangan", "hutang", "piutang", "asset", "ekuitas",
    ],
  },
];

// Klasifikasi pesan → agent. Tanpa kata kunci yang cocok, default ke report
// (agent laporan paling serbaguna dan prompt-nya menolak di luar lingkup).
export function routeMessage(message: string): AgentKind {
  const text = message.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.kind;
  }
  return "report";
}
