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

  console.log("GET COMPANY_ID:", company_id);

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("company_id", company_id)
    .order("code", { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

// POST ACCOUNT
// Membuat akun baru dan otomatis menentukan normal balance dari type
accounts.post("/", requireRole("admin", "owner"), async (c) => {
  try {
    const { company_id } = c.get("user");
    const body = await c.req.json();

    console.log("BODY:", body);

    const { code, name, type, parent_id } = body;

    if (!code || !name || !type) {
      return c.json({ error: "missing fields" }, 400);
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

    console.log("INSERT DATA:", insertData);

    const { data, error } = await supabase
      .from("accounts")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      return c.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        500,
      );
    }

    return c.json(data, 201);
  } catch (err) {
    return c.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});

// PUT ACCOUNT
// Update akun milik company yang sedang login
accounts.put("/:id", requireRole("admin", "akuntan", "owner"), async (c) => {
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

    const updateData: any = {
      code: body.code,
      name: body.name,
      type: body.type ? TYPE_MAP[body.type] : undefined,
      normal_balance: body.normalBalance
        ? body.normalBalance.toUpperCase()
        : undefined,
      is_active: body.isActive,
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
      console.error("SUPABASE ERROR FULL:", error);
      return c.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        500,
      );
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
    return c.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});

// DELETE ACCOUNT
// Soft delete: akun tidak dihapus permanen, hanya dinonaktifkan
accounts.delete("/:id", requireRole("admin"), async (c) => {
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
