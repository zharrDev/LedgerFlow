import { getCurrency, CURRENCY_LOCALE } from "../utils/currency";

// Ambil simbol mata uang asli (Rp, $, €, ¥, dst) lewat Intl.NumberFormat —
// bukan kode 3-huruf mentah (IDR, USD, EUR).
function getCurrencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat(
      CURRENCY_LOCALE[code] || "id-ID",
      { style: "currency", currency: code, minimumFractionDigits: 0 },
    ).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || code;
  } catch {
    return code; // fallback ke kode mentah kalau benar-benar gagal
  }
}

export function formatCompact(language: "en" | "id", value: number, currency?: string): string {
  const code = currency ?? getCurrency();
  const symbol = getCurrencySymbol(code);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const num = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${symbol} ${num}${language === "id" ? "M" : "B"}`;
  }
  if (abs >= 1_000_000) {
    const num = (abs / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${symbol} ${num}${language === "id" ? "jt" : "M"}`;
  }
  if (abs >= 1_000) {
    const num = (abs / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${symbol} ${num}${language === "id" ? "rb" : "K"}`;
  }
  return `${sign}${symbol} ${abs}`;
}
