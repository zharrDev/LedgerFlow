// Unit test kalkulasi neraca (diekstrak dari routes/reports.ts).
import { describe, it, expect } from "vitest";
import {
  computeBalanceSheet,
  type ReportLine,
} from "../lib/balance-sheet.js";

// Helper: buat baris jurnal posted ala hasil query Supabase.
const row = (
  code: string,
  type: string,
  normalBalance: "DEBIT" | "CREDIT",
  opts: { debit?: number; credit?: number; name?: string } = {},
): ReportLine => ({
  debit: opts.debit ?? 0,
  credit: opts.credit ?? 0,
  accounts: {
    id: `acc-${code}`,
    code,
    name: opts.name ?? `Akun ${code}`,
    type,
    normal_balance: normalBalance,
  },
});

describe("computeBalanceSheet", () => {
  it("neraca dasar: aset = liabilitas + ekuitas", () => {
    const result = computeBalanceSheet([
      row("101", "ASSET", "DEBIT", { debit: 5_000_000, name: "Kas" }),
      row("201", "LIABILITY", "CREDIT", { credit: 2_000_000, name: "Utang" }),
      row("301", "EQUITY", "CREDIT", { credit: 3_000_000, name: "Modal" }),
    ]);

    expect(result.total_assets).toBe(5_000_000);
    expect(result.total_liabilities).toBe(2_000_000);
    expect(result.total_equity).toBe(3_000_000);
    expect(result.net_income).toBe(0);
    expect(result.is_balanced).toBe(true);
    expect(result.equity.find((e) => e.account_code === "_net_income")).toBeUndefined();
  });

  it("laba bersih masuk ke ekuitas dan membuat neraca tetap seimbang", () => {
    // Pendapatan 1jt, beban 400rb → laba 600rb.
    const result = computeBalanceSheet([
      row("101", "ASSET", "DEBIT", { debit: 1_600_000 }), // kas bertambah dari laba
      row("401", "REVENUE", "CREDIT", { credit: 1_000_000 }),
      row("501", "EXPENSE", "DEBIT", { debit: 400_000 }),
      row("301", "EQUITY", "CREDIT", { credit: 1_000_000 }),
    ]);

    expect(result.net_income).toBe(600_000);
    expect(result.total_equity).toBe(1_600_000); // modal 1jt + laba 600rb
    expect(result.is_balanced).toBe(true);

    const netIncomeRow = result.equity.find(
      (e) => e.account_name === "Laba Bersih Periode Berjalan",
    );
    expect(netIncomeRow).toBeDefined();
    expect(netIncomeRow?.balance).toBe(600_000);
  });

  it("rugi bersih (beban > pendapatan) mengurangi ekuitas", () => {
    const result = computeBalanceSheet([
      row("401", "REVENUE", "CREDIT", { credit: 100_000 }),
      row("501", "EXPENSE", "DEBIT", { debit: 300_000 }),
    ]);

    expect(result.net_income).toBe(-200_000);
    expect(result.total_equity).toBe(-200_000);
  });

  it("saldo akun mengikuti normal_balance", () => {
    // Akun CREDIT dengan debit melebihi kredit → saldo negatif
    // (mis. utang dibayar berlebih).
    const result = computeBalanceSheet([
      row("201", "LIABILITY", "CREDIT", { debit: 500, credit: 300 }),
    ]);

    expect(result.liabilities[0].balance).toBe(-200);
    expect(result.total_liabilities).toBe(-200);
  });

  it("akun ber saldo ~0 disembunyikan dari daftar", () => {
    const result = computeBalanceSheet([
      row("102", "ASSET", "DEBIT", { debit: 100, credit: 100 }), // netto 0
      row("101", "ASSET", "DEBIT", { debit: 100 }),
    ]);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].account_code).toBe("101");
    // Total TETAP menghitung semua baris (termasuk yang netto 0 → 0).
    expect(result.total_assets).toBe(100);
  });

  it("menggabungkan banyak baris akun sama dan mengurutkan per kode", () => {
    const result = computeBalanceSheet([
      row("110", "ASSET", "DEBIT", { debit: 300 }),
      row("101", "ASSET", "DEBIT", { debit: 100 }),
      row("101", "ASSET", "DEBIT", { debit: 50 }),
    ]);

    expect(result.assets.map((a) => a.account_code)).toEqual(["101", "110"]);
    expect(result.assets[0].balance).toBe(150);
  });

  it("laba bersih selalu di posisi terakhir daftar equity", () => {
    const result = computeBalanceSheet([
      row("301", "EQUITY", "CREDIT", { credit: 1000 }),
      row("401", "REVENUE", "CREDIT", { credit: 250 }),
    ]);

    const codes = result.equity.map((e) => e.account_code);
    expect(codes[codes.length - 1]).toBe(""); // net income tanpa kode
  });

  it("data tidak seimbang terdeteksi via is_balanced=false", () => {
    const result = computeBalanceSheet([
      row("101", "ASSET", "DEBIT", { debit: 900 }),
      row("301", "EQUITY", "CREDIT", { credit: 700 }),
    ]);

    expect(result.is_balanced).toBe(false);
  });

  it("array kosong menghasilkan neraca kosong yang seimbang", () => {
    const result = computeBalanceSheet([]);
    expect(result.total_assets).toBe(0);
    expect(result.is_balanced).toBe(true);
    expect(result.assets).toHaveLength(0);
  });
});
