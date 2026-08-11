import { supabase } from "../../lib/supabase.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// AKUN BEBAN TERATAS — konsentrasi pengeluaran per akun EXPENSE.
// (Analisis "supplier/vendor" tidak dipakai: tidak ada tabel tersebut;
//  pendekatan resmi adalah per akun EXPENSE, lihat laporan laba rugi.)
export function createGetTopExpenseAccountsTool(companyId: string) {
  return tool(
    async ({ periodId, topN }: { periodId?: string; topN?: number }) => {
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

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });

      const n = Math.min(20, Math.max(1, topN || 10));
      const expenseMap: Record<string, { accountCode: string; accountName: string; amount: number }> = {};

      for (const line of (data || []) as any[]) {
        const account = line.accounts as any;
        if ((account.type || "").toUpperCase() !== "EXPENSE") continue;
        const net = (Number(line.debit) || 0) - (Number(line.credit) || 0);
        if (!expenseMap[account.code]) {
          expenseMap[account.code] = { accountCode: account.code, accountName: account.name, amount: 0 };
        }
        expenseMap[account.code].amount += net;
      }

      const items = Object.values(expenseMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, n);
      const total = items.reduce((s, i) => s + i.amount, 0);
      const grandTotal = Object.values(expenseMap).reduce((s, i) => s + i.amount, 0);

      return JSON.stringify({
        totalBebanPeriode: grandTotal,
        teratas: items,
        proporsi: grandTotal > 0 ? items.map((i) => ({ ...i, persen: Number(((i.amount / grandTotal) * 100).toFixed(1)) })) : items,
      });
    },
    {
      name: "get_top_expense_accounts",
      description:
        "Akun beban (EXPENSE) dengan nilai terbesar beserta proporsinya terhadap total beban. Dipakai untuk analisis pengeluaran terbesar, efisiensi biaya, dan risiko konsentrasi beban.",
      schema: z.object({
        periodId: z.string().uuid().optional().describe("ID periode (opsional). Kosongkan untuk semua periode."),
        topN: z.number().int().min(1).max(20).optional().describe("Jumlah akun teratas yang diminta (default 10)."),
      }),
    },
  );
}
