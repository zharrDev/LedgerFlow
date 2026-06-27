// routes/periods.ts
import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

const periods = new Hono();

// Helper: membuat client Supabase khusus route periods
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};

// GET ALL PERIODS
// company_id opsional: jika dikirim, hanya ambil periode milik company tersebut
periods.get("/", async (c) => {
  const companyId = c.req.query("company_id");
  const supabase = getSupabase();

  let query = supabase.from("periods").select("*");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data ?? []);
});

// OPEN NEW PERIOD (POST)
// Membuat periode baru jika kombinasi company + year + month belum ada
periods.post("/", async (c) => {
  const { company_id, year, month } = await c.req.json();
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("periods")
    .select("id")
    .match({ company_id, year, month })
    .single();

  if (existing) return c.json({ error: "Periode ini sudah ada!" }, 400);

  const { data, error } = await supabase
    .from("periods")
    .insert([{ company_id, year, month, status: "open" }])
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// CLOSE PERIOD (PATCH)
// Menutup periode agar tidak bisa dipakai input transaksi lagi
periods.patch("/:id/close", async (c) => {
  const id = c.req.param("id");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("periods")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: "Periode berhasil ditutup", data });
});

export default periods;
