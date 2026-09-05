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

// Helper: role & company_name di-resolve dari JWT company. Role dibaca dari
// company_members (sumber kebenaran), BUKAN dari users.role (kolom legacy).
// authMiddleware sudah menjamin membership aktif ada, jadi cukup .single().
async function buildProfilePayload(userId: string, companyId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, name, email, phone, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("[Users] profile error:", profileError);
    return null;
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .single();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  return {
    ...profile,
    avatar_url: profile.avatar_url || null,
    role: membership?.role ?? null,
    company_id: companyId,
    company_name: company?.name || "",
  };
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

  const payload = await buildProfilePayload(user.sub, user.company_id);
  if (!payload) {
    return c.json({ error: "User tidak ditemukan" }, 404);
  }
  return c.json(payload);
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

  const payload = await buildProfilePayload(user.sub, user.company_id);
  if (!payload) {
    return c.json({ error: "Gagal memuat profil" }, 500);
  }
  return c.json(payload);
});

export default users;
