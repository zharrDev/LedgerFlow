// routes/periods.ts
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const periods = new Hono();

// Semua route periods wajib login
periods.use("*", authMiddleware);

// GET ALL PERIODS
// Selalu discope ke company milik user (dari JWT), bukan dari query yang bisa dipalsukan.
periods.get("/", async (c) => {
  const user = c.get("user");

  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .eq("company_id", user.company_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return dbErrorResponse(c, error);
  return c.json(data ?? []);
});

// OPEN NEW PERIOD (POST)
// company_id diambil dari JWT, bukan dari body (cegah bikin periode untuk company lain).
periods.post("/", requireRole("owner"), async (c) => {
  const user = c.get("user");
  const { year, month } = await c.req.json();

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return c.json({ error: "year/month tidak valid" }, 400);
  }

  const { data: existing } = await supabase
    .from("periods")
    .select("id")
    .match({ company_id: user.company_id, year, month })
    .maybeSingle();

  if (existing) return c.json({ error: "Periode ini sudah ada!" }, 400);

  const { data, error } = await supabase
    .from("periods")
    .insert([{ company_id: user.company_id, year, month, status: "open" }])
    .select()
    .single();

  if (error) return dbErrorResponse(c, error);
  return c.json(data, 201);
});

// CLOSE PERIOD (PATCH)
// Menutup periode agar tidak bisa dipakai input transaksi lagi.
periods.patch("/:id/close", requireRole("owner"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  // Pastikan periode milik company user sebelum ditutup
  const { data: period } = await supabase
    .from("periods")
    .select("id, status, company_id")
    .eq("id", id)
    .single();

  if (!period || period.company_id !== user.company_id) {
    return c.json({ error: "Periode tidak ditemukan" }, 404);
  }

  if (period.status === "closed") {
    return c.json({ error: "Periode sudah ditutup." }, 400);
  }

  const { data, error } = await supabase
    .from("periods")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", user.company_id)
    .select()
    .single();

  if (error) return dbErrorResponse(c, error);
  return c.json({ message: "Periode berhasil ditutup", data });
});

// DELETE PERIOD (DELETE)
// Hanya periode yang masih open & belum punya jurnal (non-deleted) yang bisa dihapus.
periods.delete("/:id", requireRole("owner"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const { data: period } = await supabase
    .from("periods")
    .select("id, status, company_id")
    .eq("id", id)
    .single();

  if (!period || period.company_id !== user.company_id) {
    return c.json({ error: "Periode tidak ditemukan" }, 404);
  }

  if (period.status === "closed") {
    return c.json(
      { error: "Periode yang sudah ditutup tidak bisa dihapus." },
      400,
    );
  }

  // Hanya hitung jurnal yang belum dihapus (soft-delete)
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("period_id", id)
    .eq("company_id", user.company_id)
    .is("deleted_at", null);

  if (count && count > 0) {
    return c.json(
      { error: "Periode memiliki jurnal. Hapus jurnal terlebih dahulu." },
      400,
    );
  }

  const { error } = await supabase
    .from("periods")
    .delete()
    .eq("id", id)
    .eq("company_id", user.company_id);

  if (error) return dbErrorResponse(c, error);
  return c.json({ success: true, message: "Periode berhasil dihapus" });
});

export default periods;
