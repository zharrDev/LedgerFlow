import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const journal = new Hono();

// Semua endpoint journal wajib login
journal.use("*", authMiddleware);

// GET /api/journal — list entries
journal.get("/", async (c) => {
  const { company_id } = c.get("user");
  const { period_id, status } = c.req.query();

  let query = supabase
    .from("journal_entries")
    .select(
      `
      *,
      journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        memo,
        accounts (
          code,
          name
        )
      )
    `,
    )
    .eq("company_id", company_id)
    .order("entry_number", { ascending: true });

  if (period_id) query = query.eq("period_id", period_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// GET /api/journal/:id — ambil detail satu jurnal
journal.get("/:id", async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      `
      *,
      journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        memo,
        accounts (
          code,
          name
        )
      )
    `,
    )
    .eq("id", id)
    .eq("company_id", company_id)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// POST /api/journal
// Membuat jurnal baru dengan validasi periode dan double-entry
journal.post("/", requireRole("owner", "akuntan"), async (c) => {
  const { company_id, sub: created_by } = c.get("user");
  const body = await c.req.json();
  const {
    period_id,
    entry_date,
    description,
    lines,
    status: requestedStatus,
  } = body;

  // Auto-detect period dari entry_date jika period_id tidak dikirim
  let actualPeriodId = period_id;

  if (!actualPeriodId && entry_date) {
    const date = new Date(entry_date);
    const { data: foundPeriod } = await supabase
      .from("periods")
      .select("id, status")
      .eq("company_id", company_id)
      .eq("year", date.getFullYear())
      .eq("month", date.getMonth() + 1)
      .single();

    if (foundPeriod) {
      actualPeriodId = foundPeriod.id;
    }
  }

  // Validasi periode: harus ada dan belum ditutup
  const { data: period } = await supabase
    .from("periods")
    .select("status")
    .eq("id", actualPeriodId)
    .single();

  if (!period)
    return c.json(
      {
        error:
          "Periode tidak ditemukan. Pastikan periode untuk bulan ini sudah dibuat.",
      },
      404,
    );
  if (period.status === "closed") {
    return c.json(
      {
        error:
          "Gagal! Periode ini sudah ditutup. Tidak bisa menambah jurnal baru.",
      },
      400,
    );
  }

  if (!lines || lines.length < 2) {
    return c.json({ error: "Minimal 2 baris required (debit + kredit)" }, 400);
  }

  // Validasi double-entry: total debit harus sama dengan total kredit
  const totalDebit = lines.reduce(
    (s: number, l: any) => s + (Number(l.debit) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (s: number, l: any) => s + (Number(l.credit) || 0),
    0,
  );

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return c.json(
      {
        error: `Debit (${totalDebit}) harus sama dengan Kredit (${totalCredit})`,
      },
      400,
    );
  }

  // Generate nomor jurnal otomatis per bulan
  const now = new Date();
  const prefix = `JE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: last } = await supabase
    .from("journal_entries")
    .select("entry_number")
    .eq("company_id", company_id)
    .like("entry_number", `${prefix}%`)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (last?.entry_number) {
    const lastNum = parseInt(last.entry_number.split("-").pop() || "0");
    nextNumber = lastNum + 1;
  }
  const entry_number = `${prefix}-${String(nextNumber).padStart(4, "0")}`;

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      company_id,
      period_id: actualPeriodId,
      created_by,
      entry_date,
      description,
      entry_number,
      status: requestedStatus === "posted" ? "posted" : "draft",
    })
    .select()
    .single();

  if (entryError) return c.json({ error: entryError.message }, 500);

  // Ubah accountCode dari frontend menjadi account_id dari database
  const accountCodes = lines.map((l: any) => l.accountCode);
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, code")
    .eq("company_id", company_id)
    .in("code", accountCodes);

  const accountMap = new Map(accounts?.map((a) => [a.code, a.id]));

  const linesData = lines.map((l: any) => ({
    journal_entry_id: entry.id,
    account_id: accountMap.get(l.accountCode),
    debit: l.debit ?? 0,
    credit: l.credit ?? 0,
    memo: l.memo || l.description || null,
  }));

  const { error: linesError } = await supabase
    .from("journal_entry_lines")
    .insert(linesData);
  if (linesError) return c.json({ error: linesError.message }, 500);

  return c.json(entry, 201);
});

// POST /api/journal/:id/post
// Mengubah jurnal draft menjadi posted jika periodenya masih open
journal.post("/:id/post", requireRole("owner", "akuntan"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data: entry, error: fetchError } = await supabase
    .from("journal_entries")
    .select("*, periods(status)")
    .eq("id", id)
    .eq("company_id", company_id)
    .single();

  if (fetchError || !entry)
    return c.json({ error: "Entry tidak ditemukan" }, 404);
  if (entry.status === "posted")
    return c.json({ error: "Entry sudah diposting" }, 400);

  const periodStatus = (entry.periods as any)?.status;
  if (periodStatus === "closed") {
    return c.json(
      {
        error:
          "Gagal! Periode ini sudah ditutup. Anda tidak bisa memposting transaksi lagi.",
      },
      400,
    );
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .update({ status: "posted" })
    .eq("id", id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json(data);
});

// DELETE /api/journal/:id
// Hapus jurnal hanya jika periodenya belum ditutup
journal.delete("/:id", authMiddleware, async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("*, periods(status)")
    .eq("id", id)
    .single();

  if ((entry?.periods as any)?.status === "closed") {
    return c.json(
      {
        error:
          "Data pada periode yang sudah ditutup tidak boleh dihapus demi integritas data.",
      },
      400,
    );
  }

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("company_id", company_id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, message: "Entry berhasil dihapus" });
});

export default journal;
