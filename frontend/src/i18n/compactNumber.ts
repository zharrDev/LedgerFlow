import { getCurrency, CURRENCY_LOCALE, convertFromIDR } from "../utils/currency";

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

// Format ringkas untuk kartu KPI. `value` selalu dalam IDR lalu dikonversi
// ke mata uang aktif DULU — ambang jt/M/rb/K berlaku pada nilai hasil
// konversi (mis. Rp99 jt dalam mode USD → "$6K", bukan "$0.1M").
export function formatCompact(language: "en" | "id", value: number, currency?: string): string {
  const code = currency ?? getCurrency();
  const symbol = getCurrencySymbol(code);
  const converted = convertFromIDR(value, code);
  const abs = Math.abs(converted);
  const sign = converted < 0 ? "-" : "";

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
  const small = Number.isInteger(abs) ? String(abs) : String(Math.round(abs * 100) / 100);
  return `${sign}${symbol} ${small}`;
}
