// routes/reports.ts (FIXED — Balance Sheet includes Net Income in Equity)
import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

const reports = new Hono();

// Helper: membuat client Supabase khusus route laporan
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );
};

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
  const companyId = c.req.query("company_id") || c.req.header("x-company-id");

  if (!companyId) return c.json({ error: "company_id is required" }, 400);

  const supabase = getSupabase();

  try {
    let query = supabase
      .from("journal_entry_lines")
      .select(
        `
        debit, credit,
        accounts!inner (code, name, type),
        journal_entries!inner (company_id, status, period_id)
      `,
      )
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted");

    if (periodId) query = query.eq("journal_entries.period_id", periodId);

    const { data: lines, error } = await query;
    if (error) return c.json({ error: error.message }, 500);

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
    return c.json({ error: err?.message || "Internal Server Error" }, 500);
  }
});

// BALANCE SHEET
// Menghitung aset, liabilitas, ekuitas, lalu memasukkan laba bersih ke equity
reports.get("/balance-sheet", async (c) => {
  const periodId = c.req.query("period_id");
  const companyId = c.req.query("company_id") || c.req.header("x-company-id");

  if (!companyId) return c.json({ error: "company_id is required" }, 400);

  const supabase = getSupabase();

  try {
    let query = supabase
      .from("journal_entry_lines")
      .select(
        `
        debit, credit,
        accounts!inner (id, code, name, type, normal_balance),
        journal_entries!inner (company_id, status, period_id)
      `,
      )
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted");

    if (periodId) query = query.eq("journal_entries.period_id", periodId);

    const { data: lines, error } = await query;
    if (error) return c.json({ error: error.message }, 500);

    const assetMap: any = {};
    const liabilityMap: any = {};
    const equityMap: any = {};
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    let totalRevenue = 0;
    let totalExpense = 0;

    for (const line of lines || []) {
      const account = line.accounts as any;
      const accType = (account.type || "").toUpperCase();
      const nb = (account.normal_balance || "").toUpperCase();
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const balance = nb === "DEBIT" ? debit - credit : credit - debit;

      if (accType === "ASSET") {
        if (!assetMap[account.code]) {
          assetMap[account.code] = {
            account_id: account.id,
            account_code: account.code,
            account_name: account.name,
            balance: 0,
          };
        }
        assetMap[account.code].balance += balance;
        totalAssets += balance;
      } else if (accType === "LIABILITY") {
        if (!liabilityMap[account.code]) {
          liabilityMap[account.code] = {
            account_id: account.id,
            account_code: account.code,
            account_name: account.name,
            balance: 0,
          };
        }
        liabilityMap[account.code].balance += balance;
        totalLiabilities += balance;
      } else if (accType === "EQUITY") {
        if (!equityMap[account.code]) {
          equityMap[account.code] = {
            account_id: account.id,
            account_code: account.code,
            account_name: account.name,
            balance: 0,
          };
        }
        equityMap[account.code].balance += balance;
        totalEquity += balance;
      } else if (accType === "REVENUE") {
        totalRevenue += credit - debit;
      } else if (accType === "EXPENSE") {
        totalExpense += debit - credit;
      }
    }

    const netIncome = totalRevenue - totalExpense;

    if (Math.abs(netIncome) > 0.01) {
      equityMap["_net_income"] = {
        account_id: null,
        account_code: "",
        account_name: "Laba Bersih Periode Berjalan",
        balance: netIncome,
      };
      totalEquity += netIncome;
    }

    const mk = (m: any) =>
      Object.values(m)
        .filter((a: any) => Math.abs(a.balance) > 0.01)
        .sort((a: any, b: any) => {
          if (a.account_code === "") return 1;
          if (b.account_code === "") return -1;
          return a.account_code.localeCompare(b.account_code);
        });

    return c.json({
      assets: mk(assetMap),
      liabilities: mk(liabilityMap),
      equity: mk(equityMap),
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      net_income: netIncome,
      is_balanced:
        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  } catch (err: any) {
    console.error("[Balance Sheet] Error:", err);
    return c.json({ error: err?.message || "Internal Server Error" }, 500);
  }
});

// CASH FLOW (INDIRECT METHOD)
// Menghitung arus kas operasi, investasi, dan pendanaan
reports.get("/cash-flow", async (c) => {
  const periodId = c.req.query("period_id");
  const companyId = c.req.query("company_id") || c.req.header("x-company-id");

  console.log("[Cash Flow] Request:", { periodId, companyId });

  if (!companyId) return c.json({ error: "company_id is required" }, 400);

  const supabase = getSupabase();

  try {
    let periodYear: number | null = null;
    let periodMonth: number | null = null;
    let periodName = "Semua Periode";

    if (periodId) {
      const { data: period } = await supabase
        .from("periods")
        .select("id, year, month")
        .eq("id", periodId)
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
        journal_entries!inner (company_id, status, period_id)
      `,
      )
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted");

    if (periodId)
      periodQuery = periodQuery.eq("journal_entries.period_id", periodId);

    const { data: periodLines, error: periodError } = await periodQuery;

    if (periodError) {
      console.error("[Cash Flow] Period query error:", periodError);
      return c.json({ error: periodError.message }, 500);
    }

    console.log("[Cash Flow] Period lines:", periodLines?.length);

    let beginningCash = 0;

    // Hitung kas awal dari periode-periode sebelum periode aktif
    if (beforePeriodIds.length > 0) {
      const { data: beforeLines } = await supabase
        .from("journal_entry_lines")
        .select(
          `
          debit, credit,
          accounts!inner (id, code, name, type),
          journal_entries!inner (company_id, status, period_id)
        `,
        )
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "posted")
        .in("journal_entries.period_id", beforePeriodIds);

      for (const line of beforeLines || []) {
        const account = line.accounts as any;
        if (isCashAccount(account.code, account.name, account.type)) {
          beginningCash += Number(line.debit) || 0;
          beginningCash -= Number(line.credit) || 0;
        }
      }
    }

    let netIncome = 0;

    const operatingItems: { label: string; amount: number }[] = [];
    const investingItems: {
      accountCode: string;
      accountName: string;
      amount: number;
    }[] = [];
    const financingItems: {
      accountCode: string;
      accountName: string;
      amount: number;
    }[] = [];

    let operatingTotal = 0;
    let investingTotal = 0;
    let financingTotal = 0;

    for (const line of periodLines || []) {
      const account = line.accounts as any;
      const accType = (account.type || "").toUpperCase();
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const netMovement = debit - credit;

      if (isCashAccount(account.code, account.name, account.type)) {
        continue;
      }

      if (accType === "REVENUE") {
        netIncome += credit - debit;
      } else if (accType === "EXPENSE") {
        netIncome -= debit - credit;
      } else if (accType === "ASSET") {
        const cashFlow = -netMovement;
        if (Math.abs(cashFlow) > 0.01) {
          investingItems.push({
            accountCode: account.code,
            accountName: account.name,
            amount: cashFlow,
          });
          investingTotal += cashFlow;
        }
      } else if (accType === "LIABILITY" || accType === "EQUITY") {
        const cashFlow = -netMovement;
        if (Math.abs(cashFlow) > 0.01) {
          financingItems.push({
            accountCode: account.code,
            accountName: account.name,
            amount: cashFlow,
          });
          financingTotal += cashFlow;
        }
      }
    }

    operatingItems.push({
      label: "Laba Bersih (Net Income)",
      amount: netIncome,
    });
    operatingTotal = netIncome;

    const netCashFlow = operatingTotal + investingTotal + financingTotal;
    const endingCash = beginningCash + netCashFlow;

    investingItems.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    financingItems.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    console.log("[Cash Flow] Success:", {
      operating: operatingTotal,
      investing: investingTotal,
      financing: financingTotal,
      netCashFlow,
      beginningCash,
      endingCash,
    });

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
    return c.json({ error: err?.message || "Internal Server Error" }, 500);
  }
});

// PERIODS
// Mengambil daftar periode milik company untuk filter laporan
reports.get("/periods", async (c) => {
  const companyId = c.req.query("company_id") || c.req.header("x-company-id");

  if (!companyId) return c.json({ error: "company_id is required" }, 400);

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("periods")
    .select("id, year, month, status")
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

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
