import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const companies = new Hono();

// Semua route companies wajib login
companies.use("*", authMiddleware);

// GET /api/companies/:id — ambil satu company
// Hanya boleh mengakses company milik sendiri (company_id dari JWT).
companies.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  // Cegah IDOR lintas-tenant: id yang diminta harus == company user
  if (id !== user.company_id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, currency")
    .eq("id", user.company_id)
    .single();

  if (error) {
    return c.json({ error: "Company tidak ditemukan" }, 404);
  }

  return c.json(data);
});

// GET /api/companies — kembalikan HANYA company milik user yang login.
// (Dulu route ini membocorkan seluruh company semua tenant.)
companies.get("/", async (c) => {
  const user = c.get("user");

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, currency")
    .eq("id", user.company_id)
    .single();

  if (error) {
    return c.json({ error: "Company tidak ditemukan" }, 404);
  }

  return c.json(data ? [data] : []);
});

export default companies;
