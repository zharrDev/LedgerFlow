import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const accounts = new Hono();

// Semua endpoint accounts wajib user login
accounts.use("*", authMiddleware);

// Mapping tipe akun dari format frontend ke format enum database
const TYPE_MAP: Record<string, string> = {
  asset: "ASSET",
  liability: "LIABILITY",
  equity: "EQUITY",
  revenue: "REVENUE",
  expense: "EXPENSE",
};

// Mapping saldo normal akun berdasarkan jenis akun
const BALANCE_MAP: Record<string, string> = {
  asset: "DEBIT",
  liability: "CREDIT",
  equity: "CREDIT",
  revenue: "CREDIT",
  expense: "DEBIT",
};

accounts.get("/", async (c) => {
  const { company_id } = c.get("user");
  const { search, status, type, sort, page, limit } = c.req.query();

  let query = supabase
    .from("accounts")
    .select("*", { count: "exact" })
    .eq("company_id", company_id);

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }
  if (status === "active") query = query.eq("is_active", true);
  else if (status === "inactive") query = query.eq("is_active", false);
  if (type) query = query.eq("type", TYPE_MAP[type] || type);

  const sortField = sort?.startsWith("-") ? sort.slice(1) : sort || "code";
  const sortDir = sort?.startsWith("-") ? "desc" as const : "asc" as const;
  query = query.order(sortField, { ascending: sortDir === "asc" });

  const pageNum = Math.max(1, parseInt(page || "1"));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "50")));
  const offset = (pageNum - 1) * limitNum;
  query = query.range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ data, total: count || 0, page: pageNum, limit: limitNum });
});

// POST ACCOUNT
// Membuat akun baru dan otomatis menentukan normal balance dari type
accounts.post("/", requireRole("akuntan", "owner"), async (c) => {
  try {
    const { company_id } = c.get("user");
    const body = await c.req.json();

    console.log("BODY:", body);

    const { code, name, type, parent_id } = body;

    if (!code || !name || !type) {
      return c.json({ error: "missing fields" }, 400);
    }
    if (typeof code !== "string" || !/^\d{3,6}$/.test(code.trim())) {
      return c.json({ error: "Code akun harus 3-6 digit angka." }, 400);
    }
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return c.json({ error: "Nama akun harus 2-100 karakter." }, 400);
    }
    const mappedType = TYPE_MAP[type];
    if (!mappedType) {
      return c.json({ error: "Tipe akun tidak valid." }, 400);
    }

    const insertData = {
      company_id,
      code: code.trim(),
      name: name.trim(),
      type: mappedType,
      normal_balance: BALANCE_MAP[type],
      parent_id: parent_id ?? null,
      is_active: true,
    };

    console.log("INSERT DATA:", insertData);

    const { data, error } = await supabase
      .from("accounts")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      // Duplikat (company_id, code) → 409, bukan 500 dengan detail DB.
      if (error.code === "23505") {
        return c.json(
          { error: `Kode akun "${code}" sudah dipakai di perusahaan ini.` },
          409,
        );
      }
      console.error("INSERT ACCOUNT ERROR:", error);
      return c.json({ error: "Gagal menyimpan akun." }, 500);
    }

    return c.json(data, 201);
  } catch (err) {
    console.error("POST ACCOUNT CRASH:", err);
    return c.json({ error: "Gagal menyimpan akun." }, 500);
  }
});

// PUT ACCOUNT
// Update akun milik company yang sedang login
accounts.put("/:id", requireRole("akuntan", "owner"), async (c) => {
  try {
    const { company_id } = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();

    console.log("PUT DEBUG:", { id, company_id, body });

    const TYPE_MAP: Record<string, string> = {
      asset: "ASSET",
      liability: "LIABILITY",
      equity: "EQUITY",
      revenue: "REVENUE",
      expense: "EXPENSE",
    };

    // normal_balance harus selalu diturunkan dari type (tidak boleh independen)
    const BALANCE_MAP: Record<string, string> = {
      ASSET: "DEBIT",
      LIABILITY: "CREDIT",
      EQUITY: "CREDIT",
      REVENUE: "CREDIT",
      EXPENSE: "DEBIT",
    };

    // Validasi format field yang dikirim (hanya yang di-update)
    if (
      body.code !== undefined &&
      (typeof body.code !== "string" || !/^\d{3,6}$/.test(body.code.trim()))
    ) {
      return c.json({ error: "Code akun harus 3-6 digit angka." }, 400);
    }
    if (
      body.name !== undefined &&
      (typeof body.name !== "string" ||
        body.name.trim().length < 2 ||
        body.name.trim().length > 100)
    ) {
      return c.json({ error: "Nama akun harus 2-100 karakter." }, 400);
    }
    if (body.type !== undefined && !TYPE_MAP[body.type]) {
      return c.json({ error: "Tipe akun tidak valid." }, 400);
    }

    // Ambil akun lama untuk cek perubahan type & kepemilikan
    const { data: existing } = await supabase
      .from("accounts")
      .select("id, type, company_id")
      .eq("id", id)
      .eq("company_id", company_id)
      .single();

    if (!existing) {
      return c.json({ error: "Akun tidak ditemukan" }, 404);
    }

    const newType = body.type ? TYPE_MAP[body.type] : undefined;

    // Kalau type berubah, pastikan akun belum dipakai di jurnal manapun.
    // Mengubah type/normal_balance setelah ada transaksi akan merusak
    // perhitungan saldo & laporan yang sudah terlanjur ada.
    if (newType && newType !== existing.type) {
      const { count } = await supabase
        .from("journal_entry_lines")
        .select("id", { count: "exact", head: true })
        .eq("account_id", id);

      if (count && count > 0) {
        return c.json(
          {
            error:
              "Tipe akun tidak bisa diubah karena sudah dipakai di jurnal. Buat akun baru bila perlu tipe berbeda.",
          },
          400,
        );
      }
    }

    const updateData: any = {
      code: body.code,
      name: body.name,
      type: newType,
      // normal_balance selalu ikut type; abaikan body.normalBalance dari client
      normal_balance: newType ? BALANCE_MAP[newType] : undefined,
      is_active: body.is_active,
    };

    // Hapus field undefined agar tidak ikut diupdate
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    console.log("UPDATE DATA:", updateData);

    const { data, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", company_id)
      .select();

    console.log("SUPABASE RESPONSE:", { data, error });

    if (error) {
      if (error.code === "23505") {
        return c.json(
          { error: `Kode akun "${body.code}" sudah dipakai di perusahaan ini.` },
          409,
        );
      }
      console.error("SUPABASE ERROR FULL:", error);
      return c.json({ error: "Gagal memperbarui akun." }, 500);
    }

    if (!data || data.length === 0) {
      return c.json(
        {
          error: "No rows updated",
          hint: "cek id atau company_id tidak match",
        },
        404,
      );
    }

    return c.json(data[0]);
  } catch (err) {
    console.error("PUT CRASH:", err);
    return c.json({ error: "Gagal memperbarui akun." }, 500);
  }
});

// DELETE ACCOUNT
// Soft delete: akun tidak dihapus permanen, hanya dinonaktifkan.
// Hanya owner (role admin per-company sudah tidak ada).
accounts.delete("/:id", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { error } = await supabase
    .from("accounts")
    .update({ is_active: false })
    .eq("id", id)
    .eq("company_id", company_id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ message: "Account deactivated" });
});

export default accounts;
