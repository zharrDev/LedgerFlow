// Helper format angka & mata uang dinamis.
// Mata uang aktif dibaca dari localStorage (key "currency", di-set lewat
// halaman Settings), default "IDR". Semua halaman memakai fungsi ini
// sehingga angka otomatis mengikuti pilihan mata uang user.

export const CURRENCIES: { code: string; label: string }[] = [
  { code: "IDR", label: "🇮🇩 IDR — Rupiah Indonesia" },
  { code: "USD", label: "🇺🇸 USD — US Dollar" },
  { code: "EUR", label: "🇪🇺 EUR — Euro" },
  { code: "SGD", label: "🇸🇬 SGD — Singapore Dollar" },
  { code: "MYR", label: "🇲🇾 MYR — Malaysian Ringgit" },
  { code: "GBP", label: "🇬🇧 GBP — British Pound" },
  { code: "JPY", label: "🇯🇵 JPY — Japanese Yen" },
  { code: "AUD", label: "🇦🇺 AUD — Australian Dollar" },
  { code: "CNY", label: "🇨🇳 CNY — Chinese Yuan" },
  { code: "THB", label: "🇹🇭 THB — Thai Baht" },
  { code: "PHP", label: "🇵🇭 PHP — Philippine Peso" },
  { code: "BND", label: "🇧🇳 BND — Brunei Dollar" },
  { code: "VND", label: "🇻🇳 VND — Vietnamese Dong" },
  { code: "SAR", label: "🇸🇦 SAR — Saudi Riyal" },
  { code: "AED", label: "🇦🇪 AED — UAE Dirham" },
  { code: "INR", label: "🇮🇳 INR — Indian Rupee" },
  { code: "KRW", label: "🇰🇷 KRW — South Korean Won" },
];

// Locale yang cocok untuk tiap mata uang (agar simbol & format angka sesuai).
export const CURRENCY_LOCALE: Record<string, string> = {
  IDR: "id-ID",
  USD: "en-US",
  EUR: "de-DE",
  SGD: "en-SG",
  MYR: "ms-MY",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CNY: "zh-CN",
  THB: "th-TH",
  PHP: "en-PH",
  BND: "ms-BN",
  VND: "vi-VN",
  SAR: "ar-SA",
  AED: "ar-AE",
  INR: "en-IN",
  KRW: "ko-KR",
};

/** Kode mata uang aktif (dari localStorage, fallback IDR). */
export function getCurrency(): string {
  try {
    const saved = localStorage.getItem("currency");
    if (saved && CURRENCIES.some((c) => c.code === saved)) return saved;
  } catch {
    // localStorage tidak tersedia (SSR/test) — pakai default.
  }
  return "IDR";
}

/** Set mata uang aktif (hanya menerima kode yang ada di daftar). */
export function setCurrency(code: string): void {
  if (!CURRENCIES.some((c) => c.code === code)) return;
  try {
    localStorage.setItem("currency", code);
  } catch {
    // ignore — localStorage tidak tersedia.
  }
}

/** Locale untuk kode mata uang (fallback id-ID). */
function getLocale(code: string): string {
  return CURRENCY_LOCALE[code] || "id-ID";
}

// Format number menjadi mata uang sesuai pilihan user, misal:
//   IDR → "Rp 99.000", USD → "$99,000", EUR → "99.000 €"
// Dilindungi try/catch: kalau Intl.NumberFormat gagal di browser tertentu
// (locale/currency tidak didukung), fallback ke format manual — jangan
// sampai error render membuat halaman kosong.
export const formatCurrency = (value: number): string => {
  const code = getCurrency();
  try {
    return new Intl.NumberFormat(getLocale(code), {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return fallbackFormat(value, code);
  }
};

// Format angka biasa dengan pemisah ribuan (tanpa simbol mata uang)
export const formatNumber = (value: number): string => {
  const code = getCurrency();
  try {
    return new Intl.NumberFormat(getLocale(code), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return fallbackFormat(value, "");
  }
};

// Fallback sederhana: pisahkan ribuan dengan titik dan tambahkan simbol
// mata uang jika diminta (dipakai bila Intl tidak tersedia/gagal).
function fallbackFormat(value: number, code: string): string {
  const rounded = Math.round(Math.abs(value));
  const str = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 ? "-" : "";
  if (!code) return `${sign}${str}`;
  const symbol =
    code === "IDR"
      ? "Rp"
      : code === "USD"
        ? "$"
        : code === "EUR"
          ? "€"
          : code === "GBP"
            ? "£"
            : code === "JPY"
              ? "¥"
              : `${code} `;
  return `${sign}${symbol} ${str}`;
}

// Ambil nilai absolut lalu format sebagai mata uang
export const formatAbsCurrency = (value: number): string => {
  return formatCurrency(Math.abs(value));
};
