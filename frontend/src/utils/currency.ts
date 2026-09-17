// Helper format angka & mata uang dinamis.
//
// MODEL KEUANGAN:
//   - Seluruh nominal di database tersimpan dalam IDR (mata uang basis).
//   - `formatCurrency` dkk menerima nilai IDR lalu MENGKONVERSI ke mata uang
//     aktif sebelum diformat (bukan sekadar ganti simbol).
//   - Input user (form jurnal) dalam mata uang tampil dikonversi kembali ke
//     IDR via `convertToIDR` sebelum dikirim ke backend.
// Mata uang aktif dibaca dari localStorage (key "currency", di-set lewat
// halaman Settings), default "IDR". Semua halaman memakai fungsi ini
// sehingga angka otomatis mengikuti pilihan mata uang user.

export const BASE_CURRENCY = "IDR";

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

// Kurs acuan STATIS: nilai IDR per 1 satuan mata uang asing.
// Bukan kurs live — cukup untuk tampilan akuntansi demo. Ubah angka di sini
// bila ingin menyesuaikan (Acuan ± Sep 2026).
export const EXCHANGE_RATES: Record<string, number> = {
  IDR: 1,
  USD: 16500,
  EUR: 17800,
  SGD: 12200,
  MYR: 3500,
  GBP: 21000,
  JPY: 110,
  AUD: 10800,
  CNY: 2300,
  THB: 510,
  PHP: 280,
  BND: 12200,
  VND: 0.65,
  SAR: 4400,
  AED: 4500,
  INR: 190,
  KRW: 12,
};

// Mata uang tanpa satuan sen (tampil 0 desimal). Sisanya 2 desimal agar
// nominal kecil tetap bermakna (mis. $6.00, bukan $6).
const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "JPY", "KRW", "VND"]);

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

/** Kurs IDR per 1 satuan kode (fallback 1 untuk kode tak dikenal). */
export function getExchangeRate(code: string): number {
  const rate = EXCHANGE_RATES[code];
  return typeof rate === "number" && rate > 0 ? rate : 1;
}

/** Konversi nominal IDR → mata uang tujuan. */
export function convertFromIDR(valueIDR: number, target?: string): number {
  const code = target ?? getCurrency();
  if (code === BASE_CURRENCY) return valueIDR;
  return valueIDR / getExchangeRate(code);
}

/** Konversi nominal mata uang asal → IDR (untuk payload ke backend). */
export function convertToIDR(value: number, from?: string): number {
  const code = from ?? getCurrency();
  if (code === BASE_CURRENCY) return value;
  return Math.round(value * getExchangeRate(code) * 100) / 100;
}

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
  // Beri tahu subscriber (AppLayout me-remount konten agar angka terformat ulang).
  try {
    window.dispatchEvent(new CustomEvent("ledgerflow:currency", { detail: code }));
  } catch {
    // ignore — bukan browser.
  }
}

const CURRENCY_EVENT = "ledgerflow:currency";

/** Subscribe perubahan mata uang (untuk useSyncExternalStore). */
export function subscribeCurrency(callback: () => void): () => void {
  try {
    window.addEventListener(CURRENCY_EVENT, callback);
  } catch {
    return () => {};
  }
  return () => {
    try {
      window.removeEventListener(CURRENCY_EVENT, callback);
    } catch {
      // ignore
    }
  };
}

/** Snapshot kode mata uang aktif (untuk useSyncExternalStore). */
export function getCurrencySnapshot(): string {
  return getCurrency();
}

/** Locale untuk kode mata uang (fallback id-ID). */
function getLocale(code: string): string {
  return CURRENCY_LOCALE[code] || "id-ID";
}

/** Jumlah desimal tampil untuk kode mata uang. */
function getFractionDigits(code: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
}

// Format nominal IDR menjadi mata uang sesuai pilihan user, misal:
//   IDR → "Rp 99.000", USD → "$6.00" (99.000 ÷ 16.500)
// Dilindungi try/catch: kalau Intl.NumberFormat gagal di browser tertentu
// (locale/currency tidak didukung), fallback ke format manual — jangan
// sampai error render membuat halaman kosong.
export const formatCurrency = (value: number): string => {
  const code = getCurrency();
  const converted = convertFromIDR(value, code);
  const digits = getFractionDigits(code);
  try {
    return new Intl.NumberFormat(getLocale(code), {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(converted);
  } catch {
    return fallbackFormat(converted, code, digits);
  }
};

// Format angka biasa dengan pemisah ribuan (tanpa simbol mata uang).
// Catatan: ini BUKAN nilai uang — tidak dikonversi, hanya ikut locale.
export const formatNumber = (value: number): string => {
  const code = getCurrency();
  try {
    return new Intl.NumberFormat(getLocale(code), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return fallbackFormat(value, "", 2);
  }
};

// Fallback sederhana: pisahkan ribuan dengan titik dan tambahkan simbol
// mata uang jika diminta (dipakai bila Intl tidak tersedia/gagal).
function fallbackFormat(value: number, code: string, digits = 0): string {
  const factor = 10 ** digits;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [intPart, decPart] = String(rounded).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const num =
    digits > 0 ? `${grouped},${(decPart ?? "").padEnd(digits, "0")}` : grouped;
  const sign = value < 0 ? "-" : "";
  if (!code) return `${sign}${num}`;
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
  return `${sign}${symbol} ${num}`;
}

// Ambil nilai absolut lalu format sebagai mata uang
export const formatAbsCurrency = (value: number): string => {
  return formatCurrency(Math.abs(value));
};
