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

// Daftar mata uang yang didukung (sama dengan daftar di frontend
// utils/currency.ts). Update di dua tempat sekaligus bila menambah mata uang.
const SUPPORTED_CURRENCIES = [
  "IDR", "USD", "EUR", "SGD", "MYR", "GBP", "JPY", "AUD", "CNY",
  "THB", "PHP", "BND", "VND", "SAR", "AED", "INR", "KRW",
];

// PATCH /api/companies/currency — simpan mata uang default company.
// Disimpan per-company di database, bukan per-browser, sehingga konsisten
// di semua perangkat anggota company.
companies.patch("/currency", async (c) => {
  const user = c.get("user");
  const { currency } = await c.req.json();

  if (typeof currency !== "string" || !SUPPORTED_CURRENCIES.includes(currency)) {
    return c.json(
      { error: "Mata uang tidak valid. Pilih dari daftar mata uang yang tersedia." },
      400,
    );
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ currency })
    .eq("id", user.company_id)
    .select("id, name, currency")
    .single();

  if (error) {
    return c.json({ error: "Gagal menyimpan mata uang." }, 500);
  }

  return c.json(data);
});

export default companies;
