import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

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

// Validasi parent akun (hierarki): pastikan parent ada di company yang sama
// dan tidak membentuk siklus / merujuk diri sendiri. Mengembalikan pesan error
// bila tidak valid, atau null bila aman.
async function validateParentId(
  parentId: string | null | undefined,
  companyId: string,
  selfId?: string,
): Promise<string | null> {
  if (!parentId) return null;

  // 1. Parent tidak boleh merujuk akun itu sendiri
  if (selfId && parentId === selfId) {
    return "Akun tidak bisa dijadikan parent untuk dirinya sendiri.";
  }

  // 2. Parent harus ada & milik company yang sama (cegah cross-tenant)
  const { data: parent, error } = await supabase
    .from("accounts")
    .select("id, parent_id")
    .eq("id", parentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error || !parent) {
    return "Parent akun tidak ditemukan di perusahaan ini.";
  }

  // 3. Cegah siklus: bila parent_id (atau leluhurnya) menunjuk ke selfId
  if (selfId) {
    type NodeRef = { id: string; parent_id: string | null };
    let current: NodeRef | null = parent as NodeRef | null;
    const seen = new Set<string>([parent.id]);
    let depth = 0;
    while (current?.parent_id && depth < 20) {
      if (current.parent_id === selfId) {
        return "Hierarki akun tidak boleh membentuk siklus.";
      }
      if (seen.has(current.parent_id)) break; // hindari loop antar parent
      seen.add(current.parent_id);
      const { data: p } = await supabase
        .from("accounts")
        .select("id, parent_id")
        .eq("id", current.parent_id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (!p) break;
      current = p as NodeRef | null;
      depth++;
    }
  }

  return null;
}

// ── Schema zod: validasi STRUKTUR & TIPE body request ────────────────
// Business rule (type-change guard, duplikasi code di DB) tetap di handler.

const ACCOUNT_TYPES = Object.keys(TYPE_MAP) as [string, ...string[]];

const accountCodeSchema = z
  .string("code harus string")
  .regex(/^\d{3,6}$/, "Code akun harus 3-6 digit angka.")
  .transform((v) => v.trim());

const accountNameSchema = z
  .string("name harus string")
  .trim()
  .min(2, "Nama akun harus 2-100 karakter.")
  .max(100, "Nama akun harus 2-100 karakter.");

const accountTypeSchema = z.enum(ACCOUNT_TYPES, {
  message: "Tipe akun tidak valid.",
});

// POST /api/accounts — semua field wajib
const accountCreateSchema = z.object({
  code: accountCodeSchema,
  name: accountNameSchema,
  type: accountTypeSchema,
  parent_id: z.string().uuid().nullish(),
});

// PUT /api/accounts/:id — semua field opsional (partial update)
const accountUpdateSchema = z.object({
  code: accountCodeSchema.optional(),
  name: accountNameSchema.optional(),
  type: accountTypeSchema.optional(),
  parent_id: z.string().uuid().nullish(),
  is_active: z.boolean().optional(),
});

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
    return dbErrorResponse(c, error);
  }

  return c.json({ data, total: count || 0, page: pageNum, limit: limitNum });
});

// GET /api/accounts/:id — ambil satu akun milik company yang login
accounts.get("/:id", async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (error) {
    return dbErrorResponse(c, error);
  }
  if (!data) {
    return c.json({ error: "Akun tidak ditemukan" }, 404);
  }

  return c.json(data);
});

// POST ACCOUNT
// Membuat akun baru dan otomatis menentukan normal balance dari type
accounts.post("/", validateBody(accountCreateSchema), requireRole("akuntan", "owner"), async (c) => {
  try {
    const { company_id } = c.get("user");
    const { code, name, type, parent_id } = c.get("validatedBody") as z.infer<
      typeof accountCreateSchema
    >;

    // (code, name & type sudah divalidasi + di-trim oleh zod di atas.)
    // Validasi parent: harus ada, milik company yang sama, dan tidak siklus.
    const parentError = await validateParentId(parent_id, company_id);
    if (parentError) {
      return c.json({ error: parentError }, 400);
    }

    const insertData = {
      company_id,
      code,
      name,
      type: TYPE_MAP[type],
      normal_balance: BALANCE_MAP[type],
      parent_id: parent_id ?? null,
      is_active: true,
    };

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
accounts.put("/:id", validateBody(accountUpdateSchema), requireRole("akuntan", "owner"), async (c) => {
  try {
    const { company_id } = c.get("user");
    const id = c.req.param("id");
    const body = c.get("validatedBody") as z.infer<typeof accountUpdateSchema>;

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

    // (code, name & type sudah divalidasi zod bila dikirim.)

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

    // Validasi parent bila dikirim: harus ada, milik company yang sama,
    // tidak merujuk diri sendiri, dan tidak membentuk siklus.
    if (body.parent_id !== undefined) {
      const parentError = await validateParentId(body.parent_id, company_id, id);
      if (parentError) {
        return c.json({ error: parentError }, 400);
      }
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
    // parent_id hanya diubah bila dikirim (undefined = jangan sentuh);
    // null = hapus parent.
    if (body.parent_id !== undefined) {
      updateData.parent_id = body.parent_id;
    }

    // Hapus field undefined agar tidak ikut diupdate
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", company_id)
      .select();

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

  const { data, error } = await supabase
    .from("accounts")
    .update({ is_active: false })
    .eq("id", id)
    .eq("company_id", company_id)
    .select("id");

  if (error) {
    return dbErrorResponse(c, error);
  }

  // Tidak ada baris yang diupdate → akun tidak dimiliki company ini /
  // tidak ada → harus 404, bukan 200 sukses palsu.
  if (!data || data.length === 0) {
    return c.json({ error: "Akun tidak ditemukan" }, 404);
  }

  return c.json({ message: "Account deactivated" });
});

export default accounts;
