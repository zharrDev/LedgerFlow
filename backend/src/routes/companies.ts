import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

const companies = new Hono();

// Helper: membuat client Supabase untuk route companies
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );
};

// GET /api/companies/:id — ambil satu company berdasarkan id
companies.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, currency")
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 404);
  }

  return c.json(data);
});

// GET /api/companies — ambil daftar semua company
companies.get("/", async (c) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, currency")
    .order("name", { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data ?? []);
});

export default companies;
