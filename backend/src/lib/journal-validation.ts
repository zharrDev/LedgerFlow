// Validasi input baris jurnal (double-entry) — diekstrak dari routes/journal.ts
// sebagai fungsi murni agar bisa di-unit-test tanpa mock database.
// Dipakai oleh POST (create) dan PUT (update) jurnal; pesan error HARUS
// tetap sama persis dengan perilaku lama karena ditampilkan ke user.

export interface JournalLineInput {
  accountCode?: unknown;
  debit?: unknown;
  credit?: unknown;
  memo?: unknown;
}

/**
 * Validasi struktur baris jurnal: minimal 2 baris, tiap baris punya
 * accountCode, nominal valid (>=0, maks 2 desimal), dan tepat satu sisi
 * (debit ATAU kredit). Return pesan error, atau null bila valid.
 */
export function validateJournalLines(
  lines: unknown,
): string | null {
  if (!Array.isArray(lines) || lines.length < 2) {
    return "Minimal 2 baris required (debit + kredit)";
  }

  for (const line of lines as JournalLineInput[]) {
    if (!line.accountCode) {
      return "Semua baris harus memiliki accountCode";
    }

    const debit = Number(line.debit);
    const credit = Number(line.credit);
    if (
      !Number.isFinite(debit) ||
      !Number.isFinite(credit) ||
      debit < 0 ||
      credit < 0
    ) {
      return `Nominal tidak valid di baris ${line.accountCode}`;
    }

    // Maksimal 2 angka desimal (kolom DB NUMERIC(18,2))
    const debitDecimals = (String(line.debit).split(".")[1] || "").length;
    const creditDecimals = (String(line.credit).split(".")[1] || "").length;
    if (debitDecimals > 2 || creditDecimals > 2) {
      return "Nominal maksimal 2 angka di belakang koma";
    }

    // Tepat satu sisi: debit ATAU kredit, tidak boleh keduanya / keduanya kosong
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      return `Baris ${line.accountCode}: isi tepat satu sisi (debit ATAU kredit)`;
    }
  }

  return null;
}

/** Total debit & kredit seluruh baris (baris tanpa nominal dihitung 0). */
export function getJournalTotals(lines: JournalLineInput[]): {
  totalDebit: number;
  totalCredit: number;
} {
  const totalDebit = lines.reduce(
    (s: number, l) => s + (Number(l.debit) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (s: number, l) => s + (Number(l.credit) || 0),
    0,
  );
  return { totalDebit, totalCredit };
}

/**
 * Cek keseimbangan double-entry: total debit == total kredit (toleransi
 * 0.01 untuk rounding desimal).
 */
export function isJournalBalanced(lines: JournalLineInput[]): boolean {
  const { totalDebit, totalCredit } = getJournalTotals(lines);
  return Math.abs(totalDebit - totalCredit) <= 0.01;
}
