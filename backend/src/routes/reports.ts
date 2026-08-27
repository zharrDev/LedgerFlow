// routes/reports.ts (FIXED — Balance Sheet includes Net Income in Equity)
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";
import { computeBalanceSheet } from "../lib/balance-sheet.js";

const reports = new Hono();

// Semua route laporan wajib login; company_id SELALU dari JWT (bukan query/header
// yang bisa dipalsukan). Ini mencegah user melihat laporan tenant lain.
reports.use("*", authMiddleware);

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatPeriodName(year: number, month: number): string {
  return `${MONTH_NAMES_ID[month - 1] || month} ${year}`;
}

// Helper: mendeteksi apakah akun termasuk akun kas/bank
function isCashAccount(code: string, name: string, type: string): boolean {
  if ((type || "").toUpperCase() !== "ASSET") return false;
  const haystack = `${code} ${name}`.toLowerCase();
  return ["kas", "cash", "bank", "rekening", "petty"].some((k) =>
    haystack.includes(k),
  );
}

// INCOME STATEMENT
// Menghitung pendapatan, beban, dan laba bersih dari jurnal posted
reports.get("/income-statement", async (c) => {
  const periodId = c.req.query("period_id");
  const companyId = c.get("user").company_id;

  try {
    let query = supabase
      .from("journal_entry_lines")
      .select(
        `
        debit, credit,
        accounts!inner (code, name, type),
        journal_entries!inner (company_id, status, period_id, deleted_at)
      `,
      )
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted")
      .is("journal_entries.deleted_at", null);

    if (periodId) query = query.eq("journal_entries.period_id", periodId);

    const { data: lines, error } = await query;
    if (error) return dbErrorResponse(c, error);

    const revenueMap: Record<
      string,
      { code: string; name: string; amount: number }
    > = {};
    const expenseMap: Record<
      string,
      { code: string; name: string; amount: number }
    > = {};
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const line of lines || []) {
      const account = line.accounts as any;
      const accType = (account.type || "").toUpperCase();
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (accType === "REVENUE") {
        const net = credit - debit;
        if (!revenueMap[account.code])
          revenueMap[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        revenueMap[account.code].amount += net;
        totalRevenue += net;
      } else if (accType === "EXPENSE") {
        const net = debit - credit;
        if (!expenseMap[account.code])
          expenseMap[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        expenseMap[account.code].amount += net;
        totalExpense += net;
      }
    }

    const revenue = Object.values(revenueMap)
      .map((r) => ({
        accountCode: r.code,
        accountName: r.name,
        amount: r.amount,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const expense = Object.values(expenseMap)
      .map((e) => ({
        accountCode: e.code,
        accountName: e.name,
        amount: e.amount,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return c.json({
      periodId: periodId || null,
      revenue,
      totalRevenue,
      expense,
      totalExpense,
      netIncome: totalRevenue - totalExpense,
    });
  } catch (err: any) {
    console.error("[Income Statement] Error:", err);
    return c.json({ error: "Terjadi kesalahan saat memuat laporan. Coba lagi beberapa saat." }, 500);
  }
});
// BALANCE SHEET
// Menghitung aset, liabilitas, ekuitas, lalu memasukkan laba bersih ke equity
reports.get("/balance-sheet", async (c) => {
  const periodId = c.req.query("period_id");
  const companyId = c.get("user").company_id;

  try {
    let query = supabase
      .from("journal_entry_lines")
      .select(
        `
        debit, credit,
        accounts!inner (id, code, name, type, normal_balance),
        journal_entries!inner (company_id, status, period_id, deleted_at)
      `,
      )
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted")
      .is("journal_entries.deleted_at", null);

    if (periodId) query = query.eq("journal_entries.period_id", periodId);

    const { data: lines, error } = await query;
    if (error) return dbErrorResponse(c, error);

    // Kalkulasi neraca dipindah ke lib/balance-sheet.ts (murni & teruji).
    return c.json(computeBalanceSheet((lines as unknown as never[]) || []));
  } catch (err: any) {
    console.error("[Balance Sheet] Error:", err);
    return c.json({ error: "Terjadi kesalahan saat memuat laporan. Coba lagi beberapa saat." }, 500);
  }
});

// CASH FLOW (INDIRECT METHOD)
// Menghitung arus kas operasi, investasi, dan pendanaan
reports.get("/cash-flow", async (c) => {
  const periodId = c.req.query("period_id");
  const companyId = c.get("user").company_id;

  try {
    let periodYear: number | null = null;
    let periodMonth: number | null = null;
    let periodName = "Semua Periode";

    if (periodId) {
      const { data: period } = await supabase
        .from("periods")
        .select("id, year, month")
        .eq("id", periodId)
        .eq("company_id", companyId)
        .single();

      if (period) {
        periodYear = Number(period.year);
        periodMonth = Number(period.month);
        periodName = formatPeriodName(periodYear, periodMonth);
      }
    }

    let beforePeriodIds: string[] = [];
    if (periodYear !== null && periodMonth !== null) {
      const { data: allPeriods } = await supabase
        .from("periods")
        .select("id, year, month")
        .eq("company_id", companyId);

      beforePeriodIds = (allPeriods || [])
        .filter((p) => {
          const py = Number(p.year);
          const pm = Number(p.month);
          return py < periodYear! || (py === periodYear! && pm < periodMonth!);
        })
        .map((p) => p.id);
    }

    let periodQuery = supabase
      .from("journal_entry_lines")
      .select(
        `
        debit, credit,
        accounts!inner (id, code, name, type),
        journal_entries!inner (company_id, status, period_id, deleted_at)
      `,
      )
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted")
      .is("journal_entries.deleted_at", null);

    if (periodId)
      periodQuery = periodQuery.eq("journal_entries.period_id", periodId);

    const { data: periodLines, error: periodError } = await periodQuery;

    if (periodError) {
      console.error("[Cash Flow] Period query error:", periodError);
      return dbErrorResponse(c, periodError);
    }

    let beginningCash = 0;

    // Hitung kas awal dari periode-periode sebelum periode aktif
    if (beforePeriodIds.length > 0) {
      const { data: beforeLines } = await supabase
        .from("journal_entry_lines")
        .select(
          `
          debit, credit,
          accounts!inner (id, code, name, type),
          journal_entries!inner (company_id, status, period_id, deleted_at)
        `,
        )
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "posted")
        .in("journal_entries.period_id", beforePeriodIds)
        .is("journal_entries.deleted_at", null);

      for (const line of beforeLines || []) {
        const account = line.accounts as any;
        if (isCashAccount(account.code, account.name, account.type)) {
          beginningCash += Number(line.debit) || 0;
          beginningCash -= Number(line.credit) || 0;
        }
      }
    }

    // ── Klasifikasi arus kas (metode tidak langsung / indirect method) ──
    // Aturan:
    //   * Pendapatan/Beban → naik/turunkan laba bersih.
    //   * Perubahan modal kerja (aset lancar & utang lancar, selain kas)
    //     → penyesuaian OPERASI pada laba bersih.
    //   * Aset tidak lancar (aset tetap, investasi) → INVESTASI.
    //   * Utang jangka panjang & ekuitas → PENDANAAN.
    // Setiap akun diagregasi (Map per kode akun) supaya tiap akun muncul
    // satu baris, bukan muncul berkali-kali per jurnal.

    interface FlowAcc {
      accountCode: string;
      accountName: string;
      amount: number;
    }

    // Keyword penentu kategori (nama akun/code, lowercase)
    const KW_OPERATING_ASSET = [
      "piutang", "persediaan", "perlengkapan", "biaya dibayar di muka",
      "biaya dibayar dimuka", "prepaid", "receivable", "inventory",
      "supplies", "ppn masukan", "pajak dibayar di muka", "uang muka",
      "akumulasi", "accumulated", "depreciation",
    ];
    const KW_OPERATING_LIABILITY = [
      "hutang usaha", "utang usaha", "hutang dagang", "utang dagang",
      "hutang gaji", "utang gaji", "hutang sewa", "utang sewa",
      "hutang bunga", "utang bunga", "hutang akrual", "utang akrual",
      "ppn keluaran", "ppn", "pajak", "tax", "accrual", "voucher",
    ];
    const KW_LONG_TERM_LIABILITY = [
      "hutang bank", "utang bank", "hutang jangka panjang",
      "utang jangka panjang", "pinjaman", "bank loan", "long-term",
      "long term", "lease",
    ];
    // Tentukan kategori akun: "operating" | "investing" | "financing"
    const classify = (account: any): "operating" | "investing" | "financing" | null => {
      const accType = (account.type || "").toUpperCase();
      const hay = `${account.name || ""} ${account.code || ""}`.toLowerCase();
      const match = (kws: string[]) => kws.some((k) => hay.includes(k));

      if (accType === "REVENUE" || accType === "EXPENSE") return null;
      if (isCashAccount(account.code, account.name, account.type)) return null;

      if (accType === "ASSET") {
        if (match(KW_OPERATING_ASSET)) return "operating";
        return "investing";
      }
      if (accType === "LIABILITY") {
        if (match(KW_LONG_TERM_LIABILITY)) return "financing";
        if (match(KW_OPERATING_LIABILITY)) return "operating";
        return "financing";
      }
      if (accType === "EQUITY") return "financing";
      return null;
    };

    let netIncome = 0;

    const operatingAdjust: Map<string, FlowAcc> = new Map();
    const investingItemsMap: Map<string, FlowAcc> = new Map();
    const financingItemsMap: Map<string, FlowAcc> = new Map();

    for (const line of periodLines || []) {
      const account = line.accounts as any;
      const accType = (account.type || "").toUpperCase();
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const netMovement = debit - credit;

      if (isCashAccount(account.code, account.name, account.type)) continue;

      if (accType === "REVENUE") {
        netIncome += credit - debit;
        continue;
      }
      if (accType === "EXPENSE") {
        netIncome -= debit - credit;
        continue;
      }

      const bucket = classify(account);
      if (!bucket) continue;

      // Perubahan akun → arus kas: kenaikan aset/penurunan utang mengurangi kas, dst.
      const cashFlow = -netMovement;
      const target =
        bucket === "operating"
          ? operatingAdjust
          : bucket === "investing"
            ? investingItemsMap
            : financingItemsMap;

      const existing = target.get(account.code);
      if (existing) {
        existing.amount += cashFlow;
      } else {
        target.set(account.code, {
          accountCode: account.code,
          accountName: account.name,
          amount: cashFlow,
        });
      }
    }

    // Buat daftar item per kategori (agregat, hanya yang non-nol)
    const toSortedList = (m: Map<string, FlowAcc>) =>
      [...m.values()]
        .filter((x) => Math.abs(x.amount) > 0.01)
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const operatingItems: { label: string; amount: number }[] = [
      { label: "Laba Bersih (Net Income)", amount: netIncome },
      ...toSortedList(operatingAdjust).map((x) => ({
        label: `Perubahan ${x.accountName} (${x.accountCode})`,
        amount: x.amount,
      })),
    ];
    const investingItems = toSortedList(investingItemsMap);
    const financingItems = toSortedList(financingItemsMap);

    // Total = laba bersih + seluruh penyesuaian modal kerja
    let operatingTotal = netIncome;
    for (const x of operatingAdjust.values()) operatingTotal += x.amount;
    const investingTotal = investingItems.reduce((s, x) => s + x.amount, 0);
    const financingTotal = financingItems.reduce((s, x) => s + x.amount, 0);

    const netCashFlow = operatingTotal + investingTotal + financingTotal;
    const endingCash = beginningCash + netCashFlow;

    return c.json({
      periodId: periodId || null,
      periodName,
      operating: {
        description: "Arus Kas dari Aktivitas Operasi",
        items: operatingItems,
        subtotal: operatingTotal,
      },
      investing: {
        description: "Arus Kas dari Aktivitas Investasi",
        items: investingItems,
        subtotal: investingTotal,
      },
      financing: {
        description: "Arus Kas dari Aktivitas Pendanaan",
        items: financingItems,
        subtotal: financingTotal,
      },
      netCashFlow,
      beginningCash,
      endingCash,
    });
  } catch (err: any) {
    console.error("[Cash Flow] Fatal error:", err);
    return c.json({ error: "Terjadi kesalahan saat memuat laporan. Coba lagi beberapa saat." }, 500);
  }
});

// PERIODS
// Mengambil daftar periode milik company untuk filter laporan
reports.get("/periods", async (c) => {
  const companyId = c.get("user").company_id;

  const { data, error } = await supabase
    .from("periods")
    .select("id, year, month, status")
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return dbErrorResponse(c, error);

  const formatted = (data || []).map((p: any) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    status: p.status,
    name: formatPeriodName(Number(p.year), Number(p.month)),
  }));

  return c.json(formatted);
});

export default reports;
