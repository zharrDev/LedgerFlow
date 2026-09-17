// Unit test formatter mata uang (utils/currency.ts).
// Model: nominal tersimpan IDR; formatCurrency mengkonversi ke mata uang aktif.
// JSDOM menyediakan localStorage yang dipakai getCurrency/setCurrency.
import { describe, it, expect, beforeEach } from "vitest";
import {
  CURRENCIES,
  EXCHANGE_RATES,
  getCurrency,
  setCurrency,
  formatCurrency,
  formatNumber,
  formatAbsCurrency,
  convertFromIDR,
  convertToIDR,
  getExchangeRate,
} from "../utils/currency";
import { formatCompact } from "../i18n/compactNumber";

// Normalisasi NBSP (U+00A0) hasil Intl ke spasi biasa supaya assert stabil.
const norm = (s: string) => s.replace(/\u00A0/g, " ");

beforeEach(() => {
  localStorage.clear();
});

describe("getCurrency / setCurrency", () => {
  it("default IDR saat belum ada pilihan", () => {
    expect(getCurrency()).toBe("IDR");
  });

  it("menyimpan dan membaca pilihan dari localStorage", () => {
    setCurrency("USD");
    expect(getCurrency()).toBe("USD");
    expect(localStorage.getItem("currency")).toBe("USD");
  });

  it("menolak kode yang tidak terdaftar", () => {
    setCurrency("XXX");
    expect(getCurrency()).toBe("IDR");
  });

  it("mengabaikan nilai rusak di localStorage", () => {
    localStorage.setItem("currency", "BROKEN");
    expect(getCurrency()).toBe("IDR");
  });

  it("daftar CURRENCIES unik dan berisi kode standar", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const expected of ["IDR", "USD", "EUR", "JPY"]) {
      expect(codes).toContain(expected);
    }
  });

  it("semua 17 mata uang punya kurs positif", () => {
    for (const { code } of CURRENCIES) {
      expect(EXCHANGE_RATES[code]).toBeGreaterThan(0);
      expect(getExchangeRate(code)).toBe(EXCHANGE_RATES[code]);
    }
    expect(getExchangeRate("XXX")).toBe(1);
  });
});

describe("convertFromIDR / convertToIDR", () => {
  it("IDR identitas (tanpa konversi)", () => {
    expect(convertFromIDR(99_000, "IDR")).toBe(99_000);
    expect(convertToIDR(99_000, "IDR")).toBe(99_000);
  });

  it("99.000 IDR ≈ $6.00 (kurs 16.500)", () => {
    expect(convertFromIDR(99_000, "USD")).toBeCloseTo(6, 5);
  });

  it("round-trip USD → IDR → USD konsisten", () => {
    const idr = convertToIDR(100, "USD");
    expect(idr).toBe(1_650_000);
    expect(convertFromIDR(idr, "USD")).toBeCloseTo(100, 5);
  });

  it("VND kecil (kurs < 1) tidak nol", () => {
    expect(convertFromIDR(99_000, "VND")).toBeGreaterThan(100_000);
  });
});

describe("formatCurrency", () => {
  it("memformat IDR dengan pemisah ribuan titik", () => {
    setCurrency("IDR");
    expect(norm(formatCurrency(99_000))).toContain("Rp");
    expect(norm(formatCurrency(99_000))).toContain("99.000");
  });

  it("tanpa desimal untuk IDR bulat", () => {
    setCurrency("IDR");
    expect(norm(formatCurrency(1_000_000))).not.toMatch(/,\d/);
  });

  it("USD dikonversi (99.000 IDR → $6.00), bukan sekadar ganti simbol", () => {
    setCurrency("USD");
    const out = norm(formatCurrency(99_000));
    expect(out).toContain("$");
    expect(out).toContain("6.00");
    expect(out).not.toContain("99,000");
  });

  it("JPY 0 desimal (99.000 IDR → ±¥900)", () => {
    setCurrency("JPY");
    const out = norm(formatCurrency(99_000));
    expect(out).toMatch(/[¥￥]/);
    expect(out).toContain("900");
  });

  it("nilai negatif ditandai minus", () => {
    setCurrency("USD");
    expect(norm(formatCurrency(-500))).toContain("-");
  });
});

describe("formatNumber & formatAbsCurrency", () => {
  it("formatNumber memakai locale sesuai mata uang aktif", () => {
    setCurrency("USD");
    expect(norm(formatNumber(1234.5))).toContain(",");
    setCurrency("IDR");
    expect(norm(formatNumber(1234.5))).toMatch(/1\.234,5/);
  });

  it("formatAbsCurrency membuang tanda negatif (dengan konversi)", () => {
    setCurrency("IDR");
    const out = norm(formatAbsCurrency(-2_500));
    expect(out).not.toContain("-");
    expect(out).toContain("2.500");
  });
});

describe("formatCompact — konversi dulu, lalu ambang jt/M", () => {
  it("IDR memakai simbol Rp, bukan kode IDR", () => {
    setCurrency("IDR");
    expect(norm(formatCompact("id", 20_000_000))).toContain("Rp");
    expect(norm(formatCompact("id", 20_000_000))).not.toContain("IDR");
    expect(norm(formatCompact("id", 20_000_000))).toContain("jt");
  });

  it("USD 99jt IDR → skala K ($6K), bukan M", () => {
    setCurrency("USD");
    const out = norm(formatCompact("en", 99_000_000));
    expect(out).toContain("$");
    expect(out).toContain("6K");
    expect(out).not.toContain("USD");
  });

  it("EUR memakai simbol € (dengan konversi)", () => {
    setCurrency("EUR");
    const out = norm(formatCompact("en", 3_000_000));
    expect(out).toContain("€");
    expect(out).not.toContain("EUR");
  });

  it("JPY memakai simbol yen (bukan kode JPY)", () => {
    setCurrency("JPY");
    // Locale ja-JP menghasilkan yen lebar ￥ (U+FFE5), bukan ¥ (U+00A5).
    const out = norm(formatCompact("en", 8_000_000));
    expect(out).toMatch(/[¥￥]/);
    expect(out).not.toContain("JPY");
  });

  it("GBP memakai simbol £ (bukan kode GBP)", () => {
    setCurrency("GBP");
    const out = norm(formatCompact("en", 4_000_000));
    expect(out).toContain("£");
    expect(out).not.toContain("GBP");
  });

  it("skala ribuan (K/rb) juga memakai simbol", () => {
    setCurrency("IDR");
    expect(norm(formatCompact("id", 50_000))).toContain("50rb");
    expect(norm(formatCompact("id", 50_000))).toContain("Rp");
    setCurrency("USD");
    // 50.000 IDR ≈ $3.03 → di bawah ambang K, tampil satuan dolar
    expect(norm(formatCompact("en", 50_000))).toContain("$");
  });

  it("semua 17 mata uang terformat tanpa throw", () => {
    for (const { code } of CURRENCIES) {
      setCurrency(code);
      expect(() => formatCurrency(1_000_000)).not.toThrow();
      expect(() => formatCompact("en", 1_000_000)).not.toThrow();
    }
  });
});
