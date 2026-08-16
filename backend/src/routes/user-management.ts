import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { sendAccountCreatedEmail } from "../lib/email.js";
import crypto from "node:crypto";

const userMgmt = new Hono();

userMgmt.use("*", authMiddleware);

const ALLOWED_ROLES = ["admin", "akuntan", "owner"] as const;

// Hitung jumlah owner di sebuah perusahaan (untuk proteksi owner terakhir)
async function countOwners(companyId: string): Promise<number> {
  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "owner");
  return count || 0;
}

async function getCompanyName(companyId: string): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  return data?.name || "";
}

// POST /api/users-management
// Tambah anggota baru ke perusahaan (owner/admin).
// Saat ini hanya boleh membuat role admin / akuntan — owner hanya bisa
// diberikan lewat route ganti role oleh owner.
userMgmt.post("/", requireRole("admin", "owner"), async (c) => {
  try {
    const { company_id: companyId, sub: myId } = c.get("user");
    const { name, email, role } = await c.req.json();

    if (!name || !email || !role) {
      return c.json({ error: "Nama, email, dan role wajib diisi." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: "Format email tidak valid." }, 400);
    }
    if (!["admin", "akuntan"].includes(role)) {
      return c.json({ error: "Role anggota hanya bisa admin atau akuntan." }, 400);
    }

    const { data: existing, error: findErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (findErr) return c.json({ error: "Gagal memeriksa email." }, 500);
    if (existing) {
      return c.json(
        { error: "Email sudah terdaftar di sistem. Pilih email lain." },
        400,
      );
    }

    const tempPassword = crypto.randomBytes(16).toString("hex");

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authError) {
      // Jangan bocorkan detail Supabase Auth; pesan generik saja.
      return c.json(
        { error: "Gagal membuat akun. Periksa kembali email yang dimasukkan." },
        400,
      );
    }

    const companyName = await getCompanyName(companyId);

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        company_id: companyId,
        email,
        name,
        role,
        email_verified: true,
      })
      .select("id, name, email, role, avatar_url, created_at")
      .single();

    if (userError) {
      return c.json({ error: "Gagal menyimpan anggota." }, 500);
    }

    await supabase.from("company_members").insert({
      user_id: user.id,
      company_id: companyId,
      role,
    });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await supabase.from("password_resets").insert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt.toISOString(),
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    sendAccountCreatedEmail(
      user.email,
      user.name,
      companyName,
      resetLink,
    ).catch(console.error);

    console.log(
      `[user-mgmt] Member added by ${myId}: ${user.email} (role=${role}) company=${companyId}`,
    );

    return c.json(user, 201);
  } catch (err) {
    console.error("ADD MEMBER CRASH:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET / (list)
userMgmt.get("/", requireRole("admin", "owner"), async (c) => {
  const { company_id } = c.get("user");
  const { search, sort, role, page, limit } = c.req.query();

  let query = supabase
    .from("users")
    .select("id, name, email, role, avatar_url, created_at", { count: "exact" })
    .eq("company_id", company_id);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role) query = query.eq("role", role);

  const sortField = sort?.startsWith("-") ? sort.slice(1) : sort || "created_at";
  const sortDir = sort?.startsWith("-") ? ("desc" as const) : ("asc" as const);
  query = query.order(sortField, { ascending: sortDir === "asc" });

  const pageNum = Math.max(1, parseInt(page || "1"));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20")));
  const offset = (pageNum - 1) * limitNum;
  query = query.range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data, total: count || 0, page: pageNum, limit: limitNum });
});

// PUT /:id/role
// Standar RBAC:
// - Owner: boleh mengubah role siapa pun (kecuali aturannya sendiri tetap diproteksi owner terakhir).
// - Admin: TIDAK boleh menyentuh role owner (tidak bisa mengubah/memberi role owner).
// - Owner terakhir tidak boleh didemote.
userMgmt.put("/:id/role", requireRole("admin", "owner"), async (c) => {
  const { company_id, role: myRole } = c.get("user");
  const id = c.req.param("id");
  const { role } = await c.req.json();

  if (!ALLOWED_ROLES.includes(role)) {
    return c.json(
      { error: "Role tidak valid. Pilih: admin, akuntan, atau owner." },
      400,
    );
  }

  const { data: targetUser } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("id", id)
    .single();

  if (!targetUser) return c.json({ error: "User tidak ditemukan" }, 404);
  if (targetUser.company_id !== company_id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (myRole === "admin") {
    if (targetUser.role === "owner" || role === "owner") {
      return c.json(
        { error: "Hanya owner yang bisa mengubah role owner." },
        403,
      );
    }
  }

  if (targetUser.role === "owner" && role !== "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json(
        { error: "Tidak bisa menurunkan role owner terakhir." },
        400,
      );
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: "Role berhasil diubah" });
});

// DELETE /:id
userMgmt.delete("/:id", requireRole("admin", "owner"), async (c) => {
  const { company_id, role: myRole, sub: myId } = c.get("user");
  const id = c.req.param("id");

  if (id === myId) {
    return c.json({ error: "Tidak bisa menghapus akun sendiri." }, 400);
  }

  const { data: targetUser } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("id", id)
    .single();

  if (!targetUser) return c.json({ error: "User tidak ditemukan" }, 404);
  if (targetUser.company_id !== company_id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (myRole === "admin" && targetUser.role === "owner") {
    return c.json({ error: "Hanya owner yang bisa menghapus owner." }, 403);
  }

  if (targetUser.role === "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json({ error: "Tidak bisa menghapus owner terakhir." }, 400);
    }
  }

  const { error: authErr } = await supabase.auth.admin.deleteUser(id);
  if (authErr) {
    return c.json({ error: authErr.message }, 500);
  }

  return c.json({ message: "User berhasil dihapus" });
});

export default userMgmt;