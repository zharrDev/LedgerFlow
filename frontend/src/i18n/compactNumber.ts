import { getCurrency } from "../utils/currency";

export function formatCompact(language: "en" | "id", value: number, currency?: string): string {
  const cur = currency ?? getCurrency();
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const num = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${cur} ${num}${language === "id" ? "M" : "B"}`;
  }
  if (abs >= 1_000_000) {
    const num = (abs / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${cur} ${num}${language === "id" ? "jt" : "M"}`;
  }
  if (abs >= 1_000) {
    const num = (abs / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${cur} ${num}${language === "id" ? "rb" : "K"}`;
  }
  return `${sign}${cur} ${abs}`;
}
