// Unit test formatter mata uang (utils/currency.ts).
// JSDOM menyediakan localStorage yang dipakai getCurrency/setCurrency.
import { describe, it, expect, beforeEach } from "vitest";
import {
  CURRENCIES,
  getCurrency,
  setCurrency,
  formatCurrency,
  formatNumber,
  formatAbsCurrency,
} from "../utils/currency";

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
});

describe("formatCurrency", () => {
  it("memformat IDR dengan pemisah ribuan titik", () => {
    setCurrency("IDR");
    expect(norm(formatCurrency(99_000))).toContain("Rp");
    expect(norm(formatCurrency(99_000))).toContain("99.000");
  });

  it("tanpa desimal untuk nominal bulat", () => {
    setCurrency("IDR");
    expect(norm(formatCurrency(1_000_000))).not.toMatch(/,\d/);
  });

  it("memformat USD dengan simbol $ dan koma ribuan", () => {
    setCurrency("USD");
    const out = norm(formatCurrency(99_000));
    expect(out).toContain("$");
    expect(out).toContain("99,000");
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

  it("formatAbsCurrency membuang tanda negatif", () => {
    setCurrency("USD");
    const out = norm(formatAbsCurrency(-2_500));
    expect(out).not.toContain("-");
    expect(out).toContain("2,500");
  });
});
