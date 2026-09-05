import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { sendAccountCreatedEmail } from "../lib/email.js";
import {
  createNotification,
  createNotificationsForUsers,
} from "../lib/notify.js";
import crypto from "node:crypto";

const userMgmt = new Hono();

userMgmt.use("*", authMiddleware);

// Model role baru: per company hanya ada owner & akuntan.
// (Role "admin" per-company dihapus — admin aplikasi sekarang adalah
// pemilik aplikasi yang masuk lewat gerbang terpisah, read-only + moderasi.)
const ALLOWED_ROLES = ["akuntan", "owner"] as const;

// Hitung jumlah owner AKTIF di sebuah perusahaan (untuk proteksi owner
// terakhir). Sumber tunggal: company_members — tabel users tidak lagi
// dihitung (kolom users.role kini legacy; company_members satu-satunya
// sumber kebenaran role & keanggotaan).
async function countOwners(companyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) {
    console.error("[user-management] countOwners error:", error);
    return 0;
  }
  return count ?? 0;
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
// Tambah anggota baru ke perusahaan (owner only).
// Anggota baru selalu dibuat sebagai akuntan — role owner hanya bisa
// diberikan lewat route ganti role oleh owner.
userMgmt.post("/", requireRole("owner"), async (c) => {
  try {
    const { company_id: companyId, sub: myId } = c.get("user");
    const { name, email, role } = await c.req.json();

    if (!name || !email || !role) {
      return c.json({ error: "Nama, email, dan role wajib diisi." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: "Format email tidak valid." }, 400);
    }
    if (role !== "akuntan") {
      return c.json({ error: "Anggota baru hanya bisa dibuat dengan role akuntan." }, 400);
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

    // Notifikasi in-app (fire-and-forget):
    //   1. Anggota baru → sambutan agar notifikasi pertamanya relevan.
    //   2. Owner lain (kecuali yang melakukan invite) → info anggota baru.
    createNotification({
      userId: user.id,
      companyId,
      type: "member_invited",
      title: "Selamat Datang di LedgerFlow",
      message: `Anda ditambahkan sebagai ${role} di ${companyName || "perusahaan baru"}. Periksa email untuk mengatur password Anda.`,
      link: "/dashboard",
    }).catch(console.error);

    const { data: otherOwners } = await supabase
      .from("users")
      .select("id")
      .eq("company_id", companyId)
      .eq("role", "owner")
      .neq("id", myId);

    if (otherOwners?.length) {
      createNotificationsForUsers(
        otherOwners.map((o) => o.id),
        {
          companyId,
          type: "member_invited",
          title: "Anggota Baru Ditambahkan",
          message: `${name} (${email}) telah ditambahkan sebagai ${role}.`,
          link: "/settings",
        },
      ).catch(console.error);
    }

    console.log(
      `[user-mgmt] Member added by ${myId}: ${user.email} (role=${role}) company=${companyId}`,
    );

    return c.json(user, 201);
  } catch (err) {
    console.error("ADD MEMBER CRASH:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET / (list) — hanya owner
// Sumber data: company_members (sumber kebenaran keanggotaan) + profil user
// dari users. company_members.user_id menunjuk auth.users (bukan public.users)
// sehingga join via PostgREST tidak bisa — profil diambil query terpisah lalu
// digabung manual (pola sama dengan admin-gate).
userMgmt.get("/", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const { search, sort, role, status, page, limit } = c.req.query();

  // Search (nama/email/telepon) butuh id profil dulu — ilike hanya ada di
  // tabel users. Batasi 1000 id agar query .in tetap ringan.
  let searchIds: string[] | null = null;
  if (search) {
    const { data: matched, error: searchErr } = await supabase
      .from("users")
      .select("id")
      .or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
      )
      .limit(1000);
    if (searchErr) return dbErrorResponse(c, searchErr);
    searchIds = (matched ?? []).map((u) => u.id);
    if (searchIds.length === 0) {
      return c.json({ data: [], total: 0, page: 1, limit: parseInt(limit || "20") });
    }
  }

  let query = supabase
    .from("company_members")
    .select("user_id, role, status, created_at", { count: "exact" })
    .eq("company_id", company_id);

  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);
  if (searchIds) query = query.in("user_id", searchIds);

  // Sort di level membership: created_at & role. Sort by name dilakukan di
  // JS setelah profil digabung (halaman maks 100 baris, tetap ringan).
  const sortFieldRaw = sort?.startsWith("-") ? sort.slice(1) : sort || "created_at";
  const sortDir = sort?.startsWith("-") ? ("desc" as const) : ("asc" as const);
  const jsSort = sortFieldRaw === "name";
  const dbSortField = jsSort ? "created_at" : sortFieldRaw;
  query = query.order(dbSortField, { ascending: sortDir === "asc" });

  const pageNum = Math.max(1, parseInt(page || "1"));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20")));
  const offset = (pageNum - 1) * limitNum;
  query = query.range(offset, offset + limitNum - 1);

  const { data: memberships, error, count } = await query;
  if (error) return dbErrorResponse(c, error);

  const memberRows = memberships ?? [];
  const userIds = memberRows.map((m) => m.user_id);

  const { data: profiles } = userIds.length
    ? await supabase
        .from("users")
        .select("id, name, email, phone, avatar_url, created_at")
        .in("id", userIds)
    : { data: [] };
  const profileMap = new Map<string, any>(
    (profiles ?? []).map((p) => [(p as any).id, p]),
  );

  let data = memberRows.map((m) => {
    const p = (profileMap.get(m.user_id) ?? {}) as any;
    return {
      id: m.user_id,
      name: p.name ?? "",
      email: p.email ?? null,
      phone: p.phone ?? null,
      role: m.role,
      status: m.status,
      avatar_url: p.avatar_url ?? null,
      member_since: m.created_at,
      created_at: p.created_at ?? m.created_at,
    };
  });

  if (jsSort) {
    data.sort((a, b) =>
      sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
  }

  return c.json({ data, total: count || 0, page: pageNum, limit: limitNum });
});

// PUT /:id/role — hanya owner
// Owner boleh mengubah role siapa pun antara akuntan <-> owner,
// dengan proteksi: owner terakhir tidak boleh didemote.
// Target & penulisan role murni di company_members (sumber kebenaran),
// untuk kombinasi (user_id, company_id) milik owner yang login.
userMgmt.put("/:id/role", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");
  const { role } = await c.req.json();

  if (!ALLOWED_ROLES.includes(role)) {
    return c.json(
      { error: "Role tidak valid. Pilih: akuntan atau owner." },
      400,
    );
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("user_id, role")
    .eq("user_id", id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (!membership) {
    return c.json(
      { error: "User bukan anggota perusahaan ini" },
      404,
    );
  }

  if (membership.role === "owner" && role !== "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json(
        { error: "Tidak bisa menurunkan role owner terakhir." },
        400,
      );
    }
  }

  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("user_id", id)
    .eq("company_id", company_id);

  if (error) return dbErrorResponse(c, error);

  return c.json({ message: "Role berhasil diubah" });
});

// DELETE /:id — hanya owner
userMgmt.delete("/:id", requireRole("owner"), async (c) => {
  const { company_id, sub: myId } = c.get("user");
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

  if (targetUser.role === "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json({ error: "Tidak bisa menghapus owner terakhir." }, 400);
    }
  }

  const { error: authErr } = await supabase.auth.admin.deleteUser(id);
  if (authErr) {
    return dbErrorResponse(c, authErr);
  }

  return c.json({ message: "User berhasil dihapus" });
});

export default userMgmt;