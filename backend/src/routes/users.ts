import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const users = new Hono();

// Semua route users wajib login
users.use("*", authMiddleware);

function sanitizeAvatarUrl(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const expectedPrefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/`;
    if (url.origin !== new URL(process.env.SUPABASE_URL!).origin) return null;
    if (!url.pathname.startsWith("/storage/v1/object/public/avatars/")) return null;
    return trimmed;
  } catch {
    return null;
  }
}

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
  if (body.avatar_url !== undefined) {
    const sanitized = sanitizeAvatarUrl(body.avatar_url);
    if (body.avatar_url !== null && sanitized === null) {
      return c.json({ error: "URL avatar tidak valid." }, 400);
    }
    updates.avatar_url = sanitized;
  }

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
