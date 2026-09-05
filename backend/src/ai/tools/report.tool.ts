import { supabase } from "../../lib/supabase.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { isCashAccount } from "./cashflow.tool.js";

// ARUS KAS BULANAN — pergerakan kas bersih per bulan untuk tren & forecasting.
export function createGetMonthlyCashFlowTool(companyId: string) {
  return tool(
    async ({ months }: { months?: number }) => {
      const n = Math.min(24, Math.max(1, months || 6));

      const { data: periods } = await supabase
        .from("periods")
        .select("id, year, month")
        .eq("company_id", companyId)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(1000);

      const all = (periods || []) as any[];
      const recent = all.slice(-n);

      const MONTH = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      const rows: {
        periode: string;
        masukKas: number;
        keluarKas: number;
        netCashMovement: number;
        saldoKasAkhir: number;
      }[] = [];

      let saldo = 0;

      for (const p of recent) {
        const { data: lines } = await supabase
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
          .eq("journal_entries.period_id", p.id)
          .is("journal_entries.deleted_at", null)
          .is("journal_entries.voided_at", null);

        let masuk = 0;
        let keluar = 0;
        for (const l of (lines || []) as any[]) {
          const acc = l.accounts as any;
          if (!isCashAccount(acc.code, acc.name, acc.type)) continue;
          masuk += Number(l.debit) || 0;
          keluar += Number(l.credit) || 0;
        }
        const net = masuk - keluar;
        saldo += net;

        rows.push({
          periode: `${MONTH[Number(p.month) - 1]} ${p.year}`,
          masukKas: masuk,
          keluarKas: keluar,
          netCashMovement: net,
          saldoKasAkhir: saldo,
        });
      }

      return JSON.stringify({ jumlahBulan: rows.length, bulanan: rows });
    },
    {
      name: "get_monthly_cash_flow",
      description:
        "Arus kas bersih per bulan (masuk, keluar, net movement, saldo kas kumulatif) untuk N bulan terakhir (default 6). Dipakai untuk analisis tren arus kas dan dasar perkiraan/forecast.",
      schema: z.object({
        months: z.number().int().min(1).max(24).optional().describe("Jumlah bulan yang diminta (default 6)."),
      }),
    },
  );
}
