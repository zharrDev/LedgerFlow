import { supabase } from "../../lib/supabase.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Helper bersama: deteksi akun kas/bank (sama dengan logika reports.ts)
export function isCashAccount(code: string, name: string, type: string): boolean {
  if ((type || "").toUpperCase() !== "ASSET") return false;
  const haystack = `${code} ${name}`.toLowerCase();
  return ["kas", "cash", "bank", "rekening", "petty"].some((k) =>
    haystack.includes(k),
  );
}

export function formatPeriodName(year: number, month: number): string {
  const MONTH_NAMES_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${MONTH_NAMES_ID[month - 1] || month} ${year}`;
}

// Ambil periode terakhir N bulan (ascending: paling lama dulu)
async function getRecentPeriods(
  companyId: string,
  months: number,
): Promise<{ id: string; year: number; month: number }[]> {
  const { data } = await supabase
    .from("periods")
    .select("id, year, month")
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(months);
  return ((data || []) as any[]).reverse();
}

interface CashLine {
  account: { id: string; code: string; name: string; type: string };
  debit: number;
  credit: number;
}

// Query dasar garis jurnal posted milik company (pola reports.ts)
async function getPostedLines(
  companyId: string,
  periodIds?: string[],
): Promise<{ lines: CashLine[]; error?: string }> {
  let query = supabase
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
    .is("journal_entries.deleted_at", null)
    .is("journal_entries.voided_at", null);

  if (periodIds && periodIds.length > 0) {
    query = query.in("journal_entries.period_id", periodIds);
  }

  const { data, error } = await query;
  if (error) return { lines: [], error: error.message };
  return {
    lines: ((data || []) as any[]).map((l) => ({
      account: l.accounts as any,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    })),
  };
}

// ARUS KAS — metode tidak langsung (setara endpoint GET /api/reports/cash-flow)
export function createGetCashFlowTool(companyId: string) {
  return tool(
    async ({ periodId }: { periodId?: string }) => {
      const { lines, error } = await getPostedLines(companyId, periodId ? [periodId] : undefined);
      if (error) return JSON.stringify({ error });

      let periodName = "Semua Periode";
      let netIncome = 0;
      const investing: { accountCode: string; accountName: string; amount: number }[] = [];
      const financing: { accountCode: string; accountName: string; amount: number }[] = [];

      for (const line of lines) {
        const accType = (line.account.type || "").toUpperCase();
        const netMovement = line.debit - line.credit;
        if (isCashAccount(line.account.code, line.account.name, line.account.type)) continue;
        if (accType === "REVENUE") netIncome += line.credit - line.debit;
        else if (accType === "EXPENSE") netIncome -= line.debit - line.credit;
        else if (accType === "ASSET") {
          const cf = -netMovement;
          if (Math.abs(cf) > 0.01) {
            investing.push({ accountCode: line.account.code, accountName: line.account.name, amount: cf });
          }
        } else if (accType === "LIABILITY" || accType === "EQUITY") {
          const cf = -netMovement;
          if (Math.abs(cf) > 0.01) {
            financing.push({ accountCode: line.account.code, accountName: line.account.name, amount: cf });
          }
        }
      }

      if (periodId) {
        const { data: period } = await supabase
          .from("periods")
          .select("year, month")
          .eq("id", periodId)
          .eq("company_id", companyId)
          .single();
        if (period) periodName = formatPeriodName(Number(period.year), Number(period.month));
      }

      const operatingTotal = netIncome;
      const investingTotal = investing.reduce((s, i) => s + i.amount, 0);
      const financingTotal = financing.reduce((s, i) => s + i.amount, 0);
      const netCashFlow = operatingTotal + investingTotal + financingTotal;

      return JSON.stringify({
        periodName,
        operating: { description: "Arus Kas dari Aktivitas Operasi", subtotal: operatingTotal },
        investing: { description: "Arus Kas dari Aktivitas Investasi", items: investing, subtotal: investingTotal },
        financing: { description: "Arus Kas dari Aktivitas Pendanaan", items: financing, subtotal: financingTotal },
        netCashFlow,
      });
    },
    {
      name: "get_cash_flow",
      description:
        "Menghitung laporan arus kas (metode tidak langsung) untuk perusahaan: arus kas operasi, investasi, pendanaan, dan net cash flow. Wajib dipakai untuk pertanyaan tentang kondisi kas/arus kas.",
      schema: z.object({
        periodId: z.string().uuid().optional().describe("ID periode (opsional). Kosongkan untuk semua periode (YTD)."),
      }),
    },
  );
}
