import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  validateJournalLines,
  getJournalTotals,
  isJournalBalanced,
} from "../lib/journal-validation.js";

const journal = new Hono();

// Semua endpoint journal wajib login
journal.use("*", authMiddleware);

// ── Schema zod: validasi STRUKTUR & TIPE body request ────────────────
// Business rule (balance, periode, akun aktif) tetap divalidasi terpisah
// di handler SETELAH shape/tipe lolos dari zod.

const journalLineSchema = z.object({
  accountCode: z.string().min(1, "accountCode wajib diisi"),
  debit: z.number("debit harus angka").min(0, "debit tidak boleh negatif"),
  credit: z
    .number("credit harus angka")
    .min(0, "credit tidak boleh negatif"),
  memo: z.string().nullish(),
});

const entryDateSchema = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: "entry_date harus tanggal yang valid",
  });

// POST /api/journal — semua field wajib (kecuali period_id & status)
const journalEntryCreateSchema = z.object({
  period_id: z.string().uuid().optional(),
  entry_date: entryDateSchema,
  description: z
    .string()
    .trim()
    .min(1, "description wajib diisi"),
  lines: z.array(journalLineSchema).min(2, "Jurnal minimal memiliki 2 baris"),
  // Perilaku sama seperti sebelumnya: selain "posted" dianggap draft
  status: z.string().optional(),
});

// PUT /api/journal/:id — semua field opsional (partial update)
const journalEntryUpdateSchema = z.object({
  entry_date: entryDateSchema.optional(),
  description: z
    .string()
    .trim()
    .min(1, "description wajib diisi")
    .optional(),
  lines: z
    .array(journalLineSchema)
    .min(2, "Jurnal minimal memiliki 2 baris")
    .optional(),
});

// Deteksi error "fungsi RPC belum ada" (mis. migrasi DB belum dijalankan).
// Kalau ini yang terjadi, kita fallback ke jalur non-atomik lama supaya app
// tetap jalan meski urutan deploy backend mendahului migrasi SQL.
function isMissingFunction(err: any): boolean {
  const code = err?.code;
  const msg = String(err?.message || "").toLowerCase();
  return (
    code === "PGRST202" ||
    code === "42883" ||
    msg.includes("could not find the function") ||
    (msg.includes("function") && msg.includes("does not exist"))
  );
}

// ── Kuota jurnal bulanan (plan Free: 50 jurnal/bulan) ────────────────
// Ambil max_journals dari plan subscription user. Kalau null (unlimited)
// atau 0, tidak ada kuota. Hitung jurnal yang SUDAH dibuat di bulan yang
// diminta (termasuk draft & posted, tidak termasuk yang soft-delete).
async function getJournalQuota(
  userId: string,
  companyId: string,
  year: number,
  month: number,
): Promise<{ max: number | null; used: number; left: number | null; planName?: string }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(name, max_journals)")
    .eq("user_id", userId)
    .maybeSingle();

  // Relasi plans bisa berbentuk objek (single) atau array tergantung hasil
  // query; normalisasi agar aman terhadap keduanya.
  const plans = Array.isArray(sub?.plans) ? sub.plans[0] : sub?.plans;
  const maxJournals = plans?.max_journals;
  if (!maxJournals || maxJournals <= 0) {
    return { max: null, used: 0, left: null, planName: plans?.name }; // unlimited
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const endDate = `${nextMonth}-${String(nextMonthNum).padStart(2, "0")}-01`;

  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .gte("entry_date", startDate)
    .lt("entry_date", endDate);

  const used = count || 0;
  return {
    max: maxJournals,
    used,
    left: Math.max(0, maxJournals - used),
    planName: plans?.name,
  };
}

// GET /api/journal/quota — sisa kuota jurnal bulan ini (buat banner di
// halaman jurnal). WAJIB didaftarkan sebelum GET /:id agar "quota" tidak
// ditangkap sebagai parameter id.
journal.get("/quota", async (c) => {
  const { company_id, sub } = c.get("user");
  const now = new Date();
  const quota = await getJournalQuota(
    sub,
    company_id,
    now.getFullYear(),
    now.getMonth() + 1,
  );
  return c.json(quota);
});

// GET /api/journal — list entries (dengan search, filter, sort, pagination)
journal.get("/", async (c) => {
  const { company_id } = c.get("user");
  const { period_id, status, search, sort, page, limit } = c.req.query();

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
      { count: "exact" },
    )
    .eq("company_id", company_id)
    .is("deleted_at", null);

  if (period_id) query = query.eq("period_id", period_id);
  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(
      `description.ilike.%${search}%,entry_number.ilike.%${search}%`,
    );
  }

  const sortField = sort?.startsWith("-") ? sort.slice(1) : sort || "entry_number";
  const sortDir = sort?.startsWith("-") ? ("desc" as const) : ("asc" as const);
  query = query.order(sortField, { ascending: sortDir === "asc" });

  const pageNum = Math.max(1, parseInt(page || "1"));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20")));
  const offset = (pageNum - 1) * limitNum;
  query = query.range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;
  if (error) return dbErrorResponse(c, error);
  return c.json({ data, total: count || 0, page: pageNum, limit: limitNum });
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
    .is("deleted_at", null)
    .single();

  if (error) return dbErrorResponse(c, error);
  return c.json(data);
});

// POST /api/journal
journal.post("/", validateBody(journalEntryCreateSchema), requireRole("owner", "akuntan"), async (c) => {
  const { company_id, sub: created_by } = c.get("user");
  const {
    period_id,
    entry_date,
    description,
    lines,
    status: requestedStatus,
  } = c.get("validatedBody") as z.infer<typeof journalEntryCreateSchema>;

  // (entry_date, description & shape lines sudah divalidasi zod di atas.)

  // Validasi baris (business rule): nominal valid, maks 2 desimal,
  // tepat satu sisi debit/kredit (lib/journal-validation.ts).
  const linesValidationError = validateJournalLines(lines);
  if (linesValidationError) {
    return c.json({ error: linesValidationError }, 400);
  }

  let actualPeriodId = period_id;

  // Auto-detect period dari entry_date jika period_id tidak dikirim
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
  if (!actualPeriodId) {
    return c.json(
      {
        error:
          "Periode tidak ditemukan. Pastikan periode untuk bulan ini sudah dibuat di settings.",
      },
      400,
    );
  }

  const { data: period } = await supabase
    .from("periods")
    .select("status, year, month")
    .eq("id", actualPeriodId)
    .eq("company_id", company_id)
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

  // entry_date harus berada dalam bulan periode yang dipilih.
  // Tanpa ini, jurnal bisa masuk periode yang salah lalu merusak laporan.
  const entryDate = new Date(entry_date);
  if (
    Number.isNaN(entryDate.getTime()) ||
    entryDate.getFullYear() !== Number(period.year) ||
    entryDate.getMonth() + 1 !== Number(period.month)
  ) {
    return c.json(
      {
        error: `entry_date (${entry_date}) tidak berada dalam periode yang dipilih (${period.year}-${String(period.month).padStart(2, "0")}).`,
      },
      400,
    );
  }

  // ── Kuota jurnal bulanan ──
  // Plan Free hanya 50 jurnal per bulan (draft + posted). Upgrade ke Pro
  // untuk unlimited. Dihitung dari bulan entry_date, bukan bulan kalender
  // berjalan, supaya konsisten dengan periode yang dipilih.
  const { left: quotaLeft, planName } = await getJournalQuota(
    created_by,
    company_id,
    entryDate.getFullYear(),
    entryDate.getMonth() + 1,
  );
  if (quotaLeft !== null && quotaLeft <= 0) {
    return c.json(
      {
        error:
          planName === "free"
            ? "Kuota jurnal bulan ini sudah habis (50 jurnal untuk plan Free). Upgrade ke Pro untuk jurnal tanpa batas."
            : "Kuota jurnal bulan ini sudah habis. Upgrade plan Anda untuk jurnal tanpa batas.",
      },
      403,
    );
  }

  // Validasi double-entry: total debit harus sama dengan total kredit
  const { totalDebit, totalCredit } = getJournalTotals(lines);

  if (!isJournalBalanced(lines)) {
    return c.json(
      {
        error: `Debit (${totalDebit.toFixed(2)}) harus sama dengan Kredit (${totalCredit.toFixed(2)})`,
      },
      400,
    );
  }

  // Validasi akun SEBELUM insert: semua accountCode harus ada & aktif.
  const accountCodes = lines.map((l: any) => l.accountCode);
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, code, is_active")
    .eq("company_id", company_id)
    .in("code", accountCodes);

  for (const code of accountCodes) {
    const acc = (accounts ?? []).find((a) => a.code === code);
    if (!acc) {
      return c.json({ error: `Akun dengan kode ${code} tidak ditemukan` }, 400);
    }
    if (!acc.is_active) {
      return c.json(
        {
          error: `Akun dengan kode ${code} sedang nonaktif. Aktifkan dulu atau pilih akun lain.`,
        },
        400,
      );
    }
  }

  const accountMap = new Map((accounts ?? []).map((a) => [a.code, a.id]));
  const status = requestedStatus === "posted" ? "posted" : "draft";

  // Payload baris dengan account_id yang sudah di-resolve
  const rpcLines = lines.map((l: any) => ({
    account_id: accountMap.get(l.accountCode),
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
    memo: l.memo || null,
  }));

  // Jalur UTAMA: RPC atomik. Header + semua baris masuk dalam satu transaksi
  // dan nomor jurnal diambil race-safe via journal_counters. Bila salah satu
  // baris gagal, seluruhnya di-rollback otomatis (tidak ada header tanpa baris).
  const { data: rpcEntry, error: rpcError } = await supabase.rpc(
    "create_journal_entry",
    {
      p_company_id: company_id,
      p_period_id: actualPeriodId,
      p_created_by: created_by,
      p_entry_date: entry_date,
      p_description: description,
      p_status: status,
      p_lines: rpcLines,
    },
  );

  if (!rpcError) {
    return c.json(rpcEntry, 201);
  }

  // Kalau RPC-nya ADA tapi tetap error (mis. balance check gagal), jangan
  // fallback — kembalikan errornya. Fallback HANYA untuk kasus fungsi belum ada.
  if (!isMissingFunction(rpcError)) {
    console.error("create_journal_entry RPC error:", rpcError);
    return c.json({ error: "Gagal menyimpan jurnal." }, 500);
  }

  // ── Fallback non-atomik (dipakai hanya bila migrasi RPC belum dijalankan) ──
  // Penomoran pakai entry_date (bukan now()) agar konsisten dengan RPC.
  const dt = new Date(entry_date);
  const prefix = `JE-${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const { data: last } = await supabase
    .from("journal_entries")
    .select("entry_number")
    .eq("company_id", company_id)
    .like("entry_number", `${prefix}%`)
    .order("entry_number", { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (last && last.length > 0 && last[0]?.entry_number) {
    const lastNum = parseInt(last[0].entry_number.split("-").pop() || "0");
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
      status,
    })
    .select()
    .single();

  if (entryError) {
    console.error("Entry insert error:", entryError);
    return c.json({ error: "Gagal menyimpan jurnal." }, 500);
  }

  const linesData = rpcLines.map((l: any) => ({
    journal_entry_id: entry.id,
    ...l,
  }));

  const { error: linesError } = await supabase
    .from("journal_entry_lines")
    .insert(linesData);

  if (linesError) {
    console.error("Lines insert error:", linesError);
    // Rollback manual: hapus entry yang sudah dibuat
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return c.json({ error: "Gagal menyimpan jurnal." }, 500);
  }

  return c.json(entry, 201);
});

// PUT /api/journal/:id — update jurnal (hanya status draft)
journal.put("/:id", validateBody(journalEntryUpdateSchema), requireRole("owner", "akuntan"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");
  const { entry_date, description, lines } = c.get("validatedBody") as z.infer<
    typeof journalEntryUpdateSchema
  >;

  const { data: existing } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .eq("company_id", company_id)
    .is("deleted_at", null)
    .single();

  if (!existing) return c.json({ error: "Entry tidak ditemukan" }, 404);
  if (existing.status === "posted") {
    return c.json(
      { error: "Entry yang sudah diposting tidak bisa diedit." },
      400,
    );
  }

  // (entry_date, description & shape lines sudah divalidasi zod di atas.)

  // Validasi baris (business rule) bila dikirim: nominal valid, maks 2
  // desimal, tepat satu sisi debit/kredit (lib/journal-validation.ts).
  if (lines) {
    const linesError = validateJournalLines(lines);
    if (linesError) {
      return c.json({ error: linesError }, 400);
    }
  }

  const { data: period } = await supabase
    .from("periods")
    .select("status, year, month")
    .eq("id", existing.period_id)
    .single();

  if (period?.status === "closed") {
    return c.json(
      { error: "Periode sudah ditutup. Tidak bisa mengedit jurnal." },
      400,
    );
  }

  // entry_date baru wajib tetap berada dalam bulan periode jurnal ini.
  // Tanpa ini, jurnal bisa dipindah ke bulan lain tanpa mengubah period_id,
  // membuat buku besar (berbasis entry_date) tidak konsisten dengan laporan
  // (berbasis period_id) — saldo awal periode ikut salah.
  if (entry_date) {
    const entryDate = new Date(entry_date);
    if (
      Number.isNaN(entryDate.getTime()) ||
      !period ||
      entryDate.getFullYear() !== Number(period.year) ||
      entryDate.getMonth() + 1 !== Number(period.month)
    ) {
      return c.json(
        {
          error: `entry_date (${entry_date}) tidak berada dalam periode jurnal ini (${period ? `${period.year}-${String(period.month).padStart(2, "0")}` : "tidak ditemukan"}).`,
        },
        400,
      );
    }
  }

  if (lines) {
    const { totalDebit, totalCredit } = getJournalTotals(lines);
    if (!isJournalBalanced(lines)) {
      return c.json(
        {
          error: `Debit (${totalDebit.toFixed(2)}) harus sama dengan Kredit (${totalCredit.toFixed(2)})`,
        },
        400,
      );
    }
  }

  // Update header
  const headerUpdates: Record<string, any> = {};
  if (entry_date !== undefined) headerUpdates.entry_date = entry_date;
  if (description !== undefined) headerUpdates.description = description;

  if (Object.keys(headerUpdates).length > 0) {
    const { error: updErr } = await supabase
      .from("journal_entries")
      .update(headerUpdates)
      .eq("id", id);
    if (updErr) return dbErrorResponse(c, updErr);
  }

  // Update lines: map accountCode -> account_id, replace semua line lama
  if (lines) {
    const accountCodes = lines.map((l: any) => l.accountCode);
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, code, is_active")
      .eq("company_id", company_id)
      .in("code", accountCodes);

    for (const code of accountCodes) {
      const acc = (accounts ?? []).find((a) => a.code === code);
      if (!acc) {
        return c.json({ error: `Akun dengan kode ${code} tidak ditemukan` }, 400);
      }
      if (!acc.is_active) {
        return c.json(
          {
            error: `Akun dengan kode ${code} sedang nonaktif. Aktifkan dulu atau pilih akun lain.`,
          },
          400,
        );
      }
    }

    const accountMap = new Map((accounts ?? []).map((a) => [a.code, a.id]));

    const rpcLines = lines.map((l: any) => ({
      account_id: accountMap.get(l.accountCode),
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      memo: l.memo || null,
    }));

    // Jalur UTAMA: replace baris secara atomik (delete + insert dalam satu
    // transaksi + balance check di DB). Kalau gagal di tengah, tidak akan ada
    // kondisi "baris lama terhapus tapi baris baru gagal masuk".
    const { error: rpcError } = await supabase.rpc(
      "replace_journal_entry_lines",
      { p_entry_id: id, p_lines: rpcLines },
    );

    if (rpcError) {
      if (!isMissingFunction(rpcError)) {
        console.error("replace_journal_entry_lines RPC error:", rpcError);
        return c.json({ error: "Gagal memperbarui jurnal." }, 500);
      }

      // ── Fallback non-atomik (hanya bila migrasi RPC belum dijalankan) ──
      const { error: delErr } = await supabase
        .from("journal_entry_lines")
        .delete()
        .eq("journal_entry_id", id);
      if (delErr) return c.json({ error: "Gagal memperbarui jurnal." }, 500);

      const linesData = rpcLines.map((l: any) => ({
        journal_entry_id: id,
        ...l,
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(linesData);
      if (linesError)
        return c.json({ error: "Gagal memperbarui jurnal." }, 500);
    }
  }

  const { data: updated } = await supabase
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
    .single();

  return c.json(updated);
});

// POST /api/journal/:id/post
journal.post("/:id/post", requireRole("owner", "akuntan"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data: entry, error: fetchError } = await supabase
    .from("journal_entries")
    .select("*, periods(status)")
    .eq("id", id)
    .eq("company_id", company_id)
    .is("deleted_at", null)
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

  if (error) return dbErrorResponse(c, error);

  return c.json(data);
});

// DELETE /api/journal/:id — soft delete (set deleted_at, tidak hapus permanen)
journal.delete("/:id", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("*, periods(status)")
    .eq("id", id)
    .eq("company_id", company_id)
    .is("deleted_at", null)
    .single();

  if (!entry) return c.json({ error: "Entry tidak ditemukan" }, 404);

  // Jurnal yang sudah diposting tidak boleh dihapus — demi integritas laporan.
  // Koreksi harus lewat jurnal koreksi (reversal), bukan menghapus riwayat.
  if (entry.status === "posted") {
    return c.json(
      {
        error:
          "Jurnal yang sudah diposting tidak bisa dihapus. Buat jurnal koreksi (reversal) untuk membatalkannya.",
      },
      400,
    );
  }

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
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", company_id);

  if (error) return dbErrorResponse(c, error);
  return c.json({ success: true, message: "Entry berhasil dihapus" });
});

export default journal;
