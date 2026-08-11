import { supabase } from "../../lib/supabase.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// TRANSAKSI — daftar jurnal milik company dengan filter fleksibel.
// Semua filter bersifat opsional; companyId SELALU dari JWT (di-bind saat pembuatan).
export function createGetTransactionsTool(companyId: string) {
  return tool(
    async (filters: {
      periodId?: string;
      accountId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
    }) => {
      let query = supabase
        .from("journal_entries")
        .select(
          `
          id, entry_number, entry_date, description, status,
          journal_entry_lines (
            account_id, debit, credit, memo,
            accounts (code, name, type)
          )
        `,
        )
        .eq("company_id", companyId)
        .is("deleted_at", null);

      if (filters.periodId) query = query.eq("period_id", filters.periodId);
      if (filters.startDate) query = query.gte("entry_date", filters.startDate);
      if (filters.endDate) query = query.lte("entry_date", filters.endDate);
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,entry_number.ilike.%${filters.search}%`);
      }

      const limit = Math.min(100, Math.max(1, filters.limit || 20));
      query = query.order("entry_date", { ascending: false }).limit(limit);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });

      let rows = (data || []) as any[];

      // Filter sisi-klien oleh akun tertentu (line-level filter sulit di PostgREST)
      if (filters.accountId) {
        rows = rows.filter((r) =>
          (r.journal_entry_lines || []).some((l: any) => l.account_id === filters.accountId),
        ).slice(0, limit);
      }

      const compact = rows.map((r) => ({
        nomor: r.entry_number,
        tanggal: r.entry_date,
        deskripsi: r.description || "",
        status: r.status,
        totalDebit: (r.journal_entry_lines || []).reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0),
        totalKredit: (r.journal_entry_lines || []).reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0),
        garis: (r.journal_entry_lines || []).map((l: any) => ({
          kodeAkun: l.accounts?.code,
          namaAkun: l.accounts?.name,
          tipe: l.accounts?.type,
          debit: Number(l.debit) || 0,
          kredit: Number(l.credit) || 0,
          memo: l.memo || "",
        })),
      }));

      return JSON.stringify({ jumlah: compact.length, transaksi: compact });
    },
    {
      name: "get_transactions",
      description:
        "Mengambil daftar transaksi jurnal perusahaan dengan filter opsional: periode, akun, rentang tanggal (format YYYY-MM-DD), kata kunci deskripsi. Gunakan untuk melihat detail transaksi, mencari transaksi tertentu, atau bahan analisis.",
      schema: z.object({
        periodId: z.string().uuid().optional().describe("ID periode (opsional)."),
        accountId: z.string().uuid().optional().describe("ID akun (opsional) untuk filter transaksi yang menyentuh akun tersebut."),
        startDate: z.string().optional().describe("Tanggal awal (YYYY-MM-DD)."),
        endDate: z.string().optional().describe("Tanggal akhir (YYYY-MM-DD)."),
        search: z.string().optional().describe("Kata kunci deskripsi/nomor jurnal."),
        limit: z.number().int().min(1).max(100).optional().describe("Maksimal jumlah baris (default 20, maks 100)."),
      }),
    },
  );
}
