import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const users = new Hono();

// Semua route users wajib login
users.use("*", authMiddleware);

// GET /api/users/:id
// Ambil profil user. Hanya boleh mengambil profil DIRI SENDIRI.
// (Daftar anggota tim ditangani oleh /api/users-management.)
users.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (id !== user.sub) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, avatar_url, created_at")
    .eq("id", user.sub)
    .single();

  if (error) {
    console.error("[Users] GET error:", error);
    return c.json({ error: "User tidak ditemukan" }, 404);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", data.company_id)
    .single();

  return c.json({
    ...data,
    avatar_url: data.avatar_url || null,
    company_name: company?.name || "",
  });
});

// PUT /api/users/:id
// Update profil publik user (name, avatar). Hanya boleh mengubah DIRI SENDIRI.
users.put("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (id !== user.sub) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.sub);

    if (updErr) {
      console.error("[Users] PUT error:", updErr);
      return c.json({ error: "Gagal memperbarui profil" }, 500);
    }
  }

  const { data: freshData, error: freshErr } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, avatar_url")
    .eq("id", user.sub)
    .single();

  if (freshErr) {
    console.error("[Users] PUT fresh fetch error:", freshErr);
    return c.json({ error: "Gagal memuat profil" }, 500);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", freshData.company_id)
    .single();

  return c.json({
    ...freshData,
    avatar_url: freshData.avatar_url || null,
    company_name: company?.name || "",
  });
});

export default users;
