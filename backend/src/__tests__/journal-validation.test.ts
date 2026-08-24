// Unit test validasi baris jurnal (diekstrak dari routes/journal.ts).
import { describe, it, expect } from "vitest";
import {
  validateJournalLines,
  getJournalTotals,
  isJournalBalanced,
} from "../lib/journal-validation.js";

const line = (accountCode: string, debit: number, credit: number = 0) => ({
  accountCode,
  debit,
  credit,
});

describe("validateJournalLines", () => {
  it("menolak lines yang tidak ada / bukan array / kurang dari 2", () => {
    expect(validateJournalLines(undefined)).toMatch(/minimal 2 baris/i);
    expect(validateJournalLines(null)).toMatch(/minimal 2 baris/i);
    expect(validateJournalLines([])).toMatch(/minimal 2 baris/i);
    expect(validateJournalLines([line("101", 100)])).toMatch(
      /minimal 2 baris/i,
    );
  });

  it("menerima pasangan debit-kredit yang valid", () => {
    const lines = [line("101", 100_000), line("401", 0, 100_000)];
    expect(validateJournalLines(lines)).toBeNull();
  });

  it("menolak baris tanpa accountCode", () => {
    const lines = [
      { debit: 100, credit: 0 },
      line("101", 0, 100),
    ];
    expect(validateJournalLines(lines)).toMatch(/accountCode/);
  });

  it("menolak nominal bukan angka / negatif", () => {
    const nan = [
      { accountCode: "101", debit: "abc", credit: 0 },
      line("401", 0, 0),
    ];
    // Baris kedua invalid juga (kedua sisi 0) tapi pesan pertama yang muncul
    // adalah nominal tidak valid di baris pertama.
    expect(validateJournalLines(nan as never)).toMatch(/nominal tidak valid/i);

    const negative = [line("101", -5), line("401", 0, -5)];
    expect(validateJournalLines(negative)).toMatch(/nominal tidak valid/i);
  });

  it("menolak lebih dari 2 desimal", () => {
    const lines = [line("101", 10.999), line("401", 0, 10.999)];
    expect(validateJournalLines(lines)).toMatch(/2 angka di belakang koma/i);
  });

  it("menerima tepat 2 desimal", () => {
    const lines = [line("101", 10.99), line("401", 0, 10.99)];
    expect(validateJournalLines(lines)).toBeNull();
  });

  it("menolak baris dengan kedua sisi terisi", () => {
    const lines = [{ accountCode: "101", debit: 50, credit: 50 }, line("401", 0, 0)];
    expect(validateJournalLines(lines)).toMatch(/tepat satu sisi/i);
  });

  it("menolak baris dengan kedua sisi nol", () => {
    const lines = [line("101", 100), { accountCode: "401", debit: 0, credit: 0 }];
    expect(validateJournalLines(lines)).toMatch(/tepat satu sisi/i);
  });
});

describe("getJournalTotals & isJournalBalanced", () => {
  it("menghitung total debit dan kredit", () => {
    const lines = [line("101", 150), line("401", 0, 100), line("402", 0, 50)];
    expect(getJournalTotals(lines)).toEqual({
      totalDebit: 150,
      totalCredit: 150,
    });
  });

  it("menganggap nominal kosong sebagai 0", () => {
    const lines = [
      { accountCode: "101", debit: undefined, credit: undefined },
      line("401", 25),
    ];
    expect(getJournalTotals(lines as never)).toEqual({
      totalDebit: 25,
      totalCredit: 0,
    });
  });

  it("balanced ketika debit == kredit", () => {
    expect(isJournalBalanced([line("101", 99_000), line("401", 0, 99_000)])).toBe(
      true,
    );
  });

  it("tidak balanced ketika selisih melebihi toleransi", () => {
    expect(isJournalBalanced([line("101", 100), line("401", 0, 90)])).toBe(false);
  });

  it("toleransi 0.01 untuk rounding desimal", () => {
    // Selisih 0.01 masih dianggap balanced (perilaku lama: > 0.01 = error).
    expect(isJournalBalanced([line("101", 10.01), line("401", 0, 10.0)])).toBe(
      true,
    );
    expect(isJournalBalanced([line("101", 10.02), line("401", 0, 10.0)])).toBe(
      false,
    );
  });
});
