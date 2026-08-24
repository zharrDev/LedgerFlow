// Kalkulasi Neraca (Balance Sheet) — diekstrak dari routes/reports.ts sebagai
// fungsi murni agar bisa di-unit-test tanpa database. Route hanya bertugas
// mengambil baris jurnal dari Supabase lalu memanggil fungsi ini.
//
// Aturan yang dipertahankan identik dengan implementasi lama:
//   - Saldo akun mengikuti normal_balance: DEBIT → debit-kredit,
//     CREDIT → kredit-debit.
//   - REVENUE/EXPENSE tidak muncul di neraca; selisihnya menjadi
//     "Laba Bersih Periode Berjalan" di equity (hanya bila != 0).
//   - Akun ber saldo ~0 disembunyikan; net income selalu diurut paling bawah.

export interface ReportLine {
  debit: number | string | null;
  credit: number | string | null;
  accounts: {
    id: string;
    code: string;
    name: string;
    type: string;
    normal_balance: string;
  };
}

export interface BalanceSheetEntry {
  account_id: string | null;
  account_code: string;
  account_name: string;
  balance: number;
}

export interface BalanceSheetResult {
  assets: BalanceSheetEntry[];
  liabilities: BalanceSheetEntry[];
  equity: BalanceSheetEntry[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  net_income: number;
  is_balanced: boolean;
}

const EPSILON = 0.01;

/** Hitung ringkasan neraca dari baris jurnal posted (join akun). */
export function computeBalanceSheet(lines: ReportLine[]): BalanceSheetResult {
  const assetMap: Record<string, BalanceSheetEntry> = {};
  const liabilityMap: Record<string, BalanceSheetEntry> = {};
  const equityMap: Record<string, BalanceSheetEntry> = {};
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  let totalRevenue = 0;
  let totalExpense = 0;

  for (const line of lines || []) {
    const account = line.accounts;
    const accType = ((account as unknown as Record<string, unknown>)?.type as string || "").toUpperCase();
    const nb = ((account as unknown as Record<string, unknown>)?.normal_balance as string || "").toUpperCase();
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    const balance = nb === "DEBIT" ? debit - credit : credit - debit;

    const bucket =
      accType === "ASSET"
        ? assetMap
        : accType === "LIABILITY"
          ? liabilityMap
          : accType === "EQUITY"
            ? equityMap
            : null;

    if (bucket && account?.code) {
      if (!bucket[account.code]) {
        bucket[account.code] = {
          account_id: account.id,
          account_code: account.code,
          account_name: account.name,
          balance: 0,
        };
      }
      bucket[account.code].balance += balance;
      if (accType === "ASSET") totalAssets += balance;
      else if (accType === "LIABILITY") totalLiabilities += balance;
      else totalEquity += balance;
    } else if (accType === "REVENUE") {
      totalRevenue += credit - debit;
    } else if (accType === "EXPENSE") {
      totalExpense += debit - credit;
    }
  }

  const netIncome = totalRevenue - totalExpense;

  if (Math.abs(netIncome) > EPSILON) {
    equityMap["_net_income"] = {
      account_id: null,
      account_code: "",
      account_name: "Laba Bersih Periode Berjalan",
      balance: netIncome,
    };
    totalEquity += netIncome;
  }

  const mk = (m: Record<string, BalanceSheetEntry>) =>
    Object.values(m)
      .filter((a) => Math.abs(a.balance) > EPSILON)
      .sort((a, b) => {
        // Net income (tanpa kode) selalu di posisi terakhir.
        if (a.account_code === "") return 1;
        if (b.account_code === "") return -1;
        return a.account_code.localeCompare(b.account_code);
      });

  return {
    assets: mk(assetMap),
    liabilities: mk(liabilityMap),
    equity: mk(equityMap),
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    net_income: netIncome,
    is_balanced:
      Math.abs(totalAssets - (totalLiabilities + totalEquity)) < EPSILON,
  };
}
